import { randomUUID } from "node:crypto";
import { config, assertSimphonyHost } from "../config.js";
import { generatePkce } from "./pkce.js";
import { getTokens, setTokens } from "./token-store.js";
import type { TokenSet } from "../types.js";

type CookieJar = Map<string, string>;

const authSessions = new Map<
  string,
  { jar: CookieJar; codeVerifier: string; createdAt: number; host: string }
>();

const SESSION_TTL_MS = 15 * 60 * 1000;

function purgeSessions(): void {
  const now = Date.now();
  for (const [id, s] of authSessions) {
    if (now - s.createdAt > SESSION_TTL_MS) authSessions.delete(id);
  }
}

function buildCookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(jar: CookieJar, setCookieHeaders: string[]): void {
  for (const line of setCookieHeaders) {
    const part = line.split(";")[0]?.trim();
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
}

async function oidcFetch(
  host: string,
  path: string,
  init: RequestInit & { jar: CookieJar }
): Promise<Response> {
  const MAX_REDIRECTS = 10;
  let url = `${host}${path}`;

  // Enforce HTTPS to prevent unintended access to non-TLS or internal endpoints.
  if (!url.startsWith("https://")) {
    throw new Error(`oidcFetch: only HTTPS endpoints are supported (received: ${host})`);
  }

  let method = (init.method ?? "GET") as string;
  let body: BodyInit | null | undefined = init.body;

  // Compute the trusted origin from the initial URL; only follow redirects within it.
  const initialOrigin = new URL(url).origin;

  for (let attempt = 0; attempt < MAX_REDIRECTS; attempt++) {
    const headers = new Headers(init.headers);
    const cookie = buildCookieHeader(init.jar);
    if (cookie) headers.set("Cookie", cookie);

    const res = await fetch(url, {
      method,
      headers,
      body: body ?? null,
      redirect: "manual",
    });

    // Capture cookies from every response, including intermediate redirects
    const setCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie")!]
          : [];
    storeCookies(init.jar, setCookies);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      if (location.startsWith("https://") || location.startsWith("http://")) {
        // Only follow same-origin redirects to avoid SSRF via server-controlled Location headers
        try {
          if (new URL(location).origin !== initialOrigin) return res;
        } catch {
          return res;
        }
        url = location;
      } else if (location.startsWith("/")) {
        url = `${initialOrigin}${location}`;
      } else {
        // Non-HTTP scheme (e.g. apiaccount://) – stop following
        return res;
      }
      // For 302/303, switch to GET and drop request body/Content-Type
      if (res.status === 302 || res.status === 303) {
        method = "GET";
        body = undefined;
      }
      continue;
    }

    return res;
  }

  throw new Error("oidcFetch: too many redirects");
}

export interface AuthorizeStartResult {
  authSessionId: string;
  codeVerifier: string;
  codeChallenge: string;
  authorizeUrl: string;
  instructions: string[];
}

/** Start OIDC authorize and return session id for sign-in. */
export async function startAuthorization(
  overrides?: { host?: string; clientId?: string }
): Promise<AuthorizeStartResult> {
  purgeSessions();
  const host = overrides?.host ?? assertSimphonyHost();
  const clientId = overrides?.clientId ?? config.simphony.clientId;
  if (!clientId) {
    throw new Error("SIMPHONY_CLIENT_ID is required for authorization");
  }

  const { codeVerifier, codeChallenge } = generatePkce();
  const jar: CookieJar = new Map();
  const authSessionId = randomUUID();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "openid",
    redirect_uri: "apiaccount://callback",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  console.debug("[auth] authorize -> GET %s/oidc-provider/v1/oauth2/authorize", host);
  const res = await oidcFetch(host, `/oidc-provider/v1/oauth2/authorize?${params}`, {
    method: "GET",
    jar,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[auth] authorize failed (%d): %s", res.status, err);
    throw new Error(`Authorize failed (${res.status}): ${err}`);
  }

  console.debug("[auth] authorize OK (%d), cookies captured: %d", res.status, jar.size);
  authSessions.set(authSessionId, {
    jar,
    codeVerifier,
    createdAt: Date.now(),
    host,
  });

  return {
    authSessionId,
    codeVerifier,
    codeChallenge,
    authorizeUrl: `${host}/oidc-provider/v1/oauth2/authorize?${params}`,
    instructions: [
      "POST /auth/signin with authSessionId, username, password, orgname.",
      "POST /auth/token with authSessionId and authCode from signin.",
    ],
  };
}

export interface SignInInput {
  authSessionId: string;
  username: string;
  password: string;
  orgname: string;
}

export async function signIn(input: SignInInput): Promise<{ authCode: string }> {
  purgeSessions();
  const session = authSessions.get(input.authSessionId);
  if (!session) {
    throw new Error("Invalid or expired authSessionId. Call GET /auth/authorize first.");
  }

  const body = new URLSearchParams({
    username: input.username,
    password: input.password,
    orgname: input.orgname,
  });

  const host = session.host ?? assertSimphonyHost();
  console.debug("[auth] signin -> POST %s/oidc-provider/v1/oauth2/signin", host);
  const res = await oidcFetch(host, "/oidc-provider/v1/oauth2/signin", {
    method: "POST",
    jar: session.jar,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await res.json()) as {
    success?: boolean;
    redirectUrl?: string;
    message?: string;
  };

  if (!res.ok || !json.success || !json.redirectUrl) {
    console.error("[auth] signin failed (%d): %s", res.status, json.message);
    throw new Error(json.message ?? `Sign-in failed (${res.status})`);
  }

  const match = json.redirectUrl.match(/[?&]code=([^&]+)/);
  const authCode = match?.[1];
  if (!authCode) {
    throw new Error("No authorization code in sign-in response");
  }

  console.debug("[auth] signin OK – authorization code received");
  return { authCode };
}

export function getCodeVerifier(authSessionId: string): string {
  const session = authSessions.get(authSessionId);
  if (!session) {
    throw new Error("Invalid or expired authSessionId");
  }
  return session.codeVerifier;
}

/** Return the cookie jar for an active auth session (for token exchange). */
export function getSessionJar(authSessionId: string): Map<string, string> | undefined {
  return authSessions.get(authSessionId)?.jar;
}

export async function exchangeToken(
  grantType: "authorization_code" | "refresh_token",
  params: {
    code?: string;
    codeVerifier?: string;
    refreshToken?: string;
    host?: string;
    clientId?: string;
    persist?: boolean;
    /** Cookie jar from the authorize/signin session – required for session continuity. */
    jar?: Map<string, string>;
  }
): Promise<TokenSet> {
  const host = params.host ?? assertSimphonyHost();
  const clientId = params.clientId ?? config.simphony.clientId;
  if (!clientId) throw new Error("SIMPHONY_CLIENT_ID is required");

  const body = new URLSearchParams({
    scope: "openid",
    grant_type: grantType,
    client_id: clientId,
    redirect_uri: "apiaccount://callback",
  });

  if (grantType === "authorization_code") {
    if (!params.code || !params.codeVerifier) {
      throw new Error("code and codeVerifier are required");
    }
    body.set("code", params.code);
    body.set("code_verifier", params.codeVerifier);
  } else {
    const refresh = params.refreshToken ?? getTokens()?.refreshToken;
    if (!refresh) throw new Error("No refresh token available");
    body.set("refresh_token", refresh);
  }

  // For authorization_code grants, pass the session jar so Oracle's STS receives
  // the same cookies established during authorize and sign-in (mirrors Postman flow).
  // For refresh_token grants, a fresh empty jar is acceptable.
  const tokenJar: CookieJar = params.jar ?? new Map();
  console.debug("[auth] token exchange -> POST %s/oidc-provider/v1/oauth2/token (grant=%s)", host, grantType);
  const res = await oidcFetch(host, "/oidc-provider/v1/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    jar: tokenJar,
  });

  const json = (await res.json()) as {
    id_token?: string;
    refresh_token?: string;
    expires_in?: string;
    message?: string;
  };

  if (!res.ok || !json.id_token || !json.refresh_token) {
    console.error("[auth] token exchange failed (%d): %s", res.status, json.message);
    throw new Error(json.message ?? `Token exchange failed (${res.status})`);
  }

  console.debug("[auth] token exchange OK – id_token and refresh_token received");
  const expiresIn = Number(json.expires_in ?? 1209600);
  const tokens: TokenSet = {
    idToken: json.id_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  if (params.persist !== false) {
    setTokens(tokens);
  }
  return tokens;
}

export async function ensureIdToken(): Promise<string> {
  const tokens = getTokens();
  if (!tokens?.idToken) {
    throw new Error(
      "Not authenticated. Set SIMPHONY_ID_TOKEN / SIMPHONY_REFRESH_TOKEN or complete /auth flow."
    );
  }

  const bufferMs = 3 * 24 * 60 * 60 * 1000;
  if (tokens.expiresAt && tokens.expiresAt - Date.now() < bufferMs) {
    const refreshed = await exchangeToken("refresh_token", {
      refreshToken: tokens.refreshToken,
    });
    return refreshed.idToken;
  }

  return tokens.idToken;
}

/** Convenience: full auth using env credentials (for Postman / automation). */
export async function authenticateFromEnv(): Promise<TokenSet> {
  const host = assertSimphonyHost();
  const clientId = config.simphony.clientId!;
  return authenticateWithCredentials(
    {
      host,
      clientId,
      username: config.simphony.apiUsername!,
      password: config.simphony.apiPassword!,
      orgName: config.simphony.orgName!,
    },
    { persist: true }
  );
}

/** Full PKCE auth with explicit credentials (setup wizard / validate). */
export async function authenticateWithCredentials(
  creds: {
    host: string;
    clientId: string;
    username: string;
    password: string;
    orgName: string;
  },
  options?: { persist?: boolean }
): Promise<TokenSet> {
  const host = creds.host.replace(/\/$/, "");
  const started = await startAuthorization({
    host,
    clientId: creds.clientId,
  });
  // Capture the session jar before signIn (which calls purgeSessions internally)
  // to guarantee the reference is obtained while the session is known to exist.
  const sessionJar = authSessions.get(started.authSessionId)?.jar;
  const { authCode } = await signIn({
    authSessionId: started.authSessionId,
    username: creds.username,
    password: creds.password,
    orgname: creds.orgName,
  });
  // Pass the session jar so Oracle's token endpoint receives the same cookies
  // that were established during authorize and sign-in (mirrors the Postman flow).
  return exchangeToken("authorization_code", {
    code: authCode,
    codeVerifier: started.codeVerifier,
    host,
    clientId: creds.clientId,
    persist: options?.persist ?? false,
    jar: sessionJar,
  });
}
