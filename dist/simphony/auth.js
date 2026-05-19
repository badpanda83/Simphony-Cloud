import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { config, assertSimphonyHost } from "../config.js";
import { generatePkce } from "./pkce.js";
import { getTokens, setTokens } from "./token-store.js";
const authSessions = new Map();
const SESSION_TTL_MS = 15 * 60 * 1000;
function purgeSessions() {
    const now = Date.now();
    for (const [id, s] of authSessions) {
        if (now - s.createdAt > SESSION_TTL_MS)
            authSessions.delete(id);
    }
}
function buildCookieHeader(jar) {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function storeCookies(jar, setCookieHeaders) {
    for (const line of setCookieHeaders) {
        const part = line.split(";")[0]?.trim();
        if (!part)
            continue;
        const eq = part.indexOf("=");
        if (eq > 0)
            jar.set(part.slice(0, eq), part.slice(eq + 1));
    }
}
async function oidcFetch(path, init) {
    const host = assertSimphonyHost();
    const headers = new Headers(init.headers);
    const cookie = buildCookieHeader(init.jar);
    if (cookie)
        headers.set("Cookie", cookie);
    const res = await fetch(`${host}${path}`, { ...init, headers });
    const setCookies = typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : res.headers.get("set-cookie")
            ? [res.headers.get("set-cookie")]
            : [];
    storeCookies(init.jar, setCookies);
    return res;
}
function codeChallengeFromVerifier(codeVerifier) {
    return createHash("sha256")
        .update(codeVerifier, "ascii")
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}
/** Start OIDC authorize and return session id for sign-in. */
export async function startAuthorization() {
    purgeSessions();
    const host = assertSimphonyHost();
    const clientId = config.simphony.clientId;
    if (!clientId) {
        throw new Error("SIMPHONY_CLIENT_ID is required for authorization");
    }
    const { codeVerifier, codeChallenge } = generatePkce();
    const jar = new Map();
    const authSessionId = randomUUID();
    const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        scope: "openid",
        redirect_uri: "apiaccount://callback",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
    });
    const res = await oidcFetch(`/oidc-provider/v1/oauth2/authorize?${params}`, {
        method: "GET",
        jar,
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Authorize failed (${res.status}): ${err}`);
    }
    authSessions.set(authSessionId, {
        jar,
        codeVerifier,
        createdAt: Date.now(),
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
export async function signIn(input) {
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
    const res = await oidcFetch("/oidc-provider/v1/oauth2/signin", {
        method: "POST",
        jar: session.jar,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
    const json = (await res.json());
    if (!res.ok || !json.success || !json.redirectUrl) {
        throw new Error(json.message ?? `Sign-in failed (${res.status})`);
    }
    const match = json.redirectUrl.match(/[?&]code=([^&]+)/);
    const authCode = match?.[1];
    if (!authCode) {
        throw new Error("No authorization code in sign-in response");
    }
    return { authCode };
}
export function getCodeVerifier(authSessionId) {
    const session = authSessions.get(authSessionId);
    if (!session) {
        throw new Error("Invalid or expired authSessionId");
    }
    return session.codeVerifier;
}
export async function exchangeToken(grantType, params) {
    const host = assertSimphonyHost();
    const clientId = config.simphony.clientId;
    if (!clientId)
        throw new Error("SIMPHONY_CLIENT_ID is required");
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
    }
    else {
        const refresh = params.refreshToken ?? getTokens()?.refreshToken;
        if (!refresh)
            throw new Error("No refresh token available");
        body.set("refresh_token", refresh);
    }
    const res = await fetch(`${host}/oidc-provider/v1/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
    const json = (await res.json());
    if (!res.ok || !json.id_token || !json.refresh_token) {
        throw new Error(json.message ?? `Token exchange failed (${res.status})`);
    }
    const expiresIn = Number(json.expires_in ?? 1209600);
    const tokens = {
        idToken: json.id_token,
        refreshToken: json.refresh_token,
        expiresAt: Date.now() + expiresIn * 1000,
    };
    setTokens(tokens);
    return tokens;
}
export async function ensureIdToken() {
    const tokens = getTokens();
    if (!tokens?.idToken) {
        throw new Error("Not authenticated. Set SIMPHONY_ID_TOKEN / SIMPHONY_REFRESH_TOKEN or complete /auth flow.");
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
export async function authenticateFromEnv() {
    const started = await startAuthorization();
    const { authCode } = await signIn({
        authSessionId: started.authSessionId,
        username: config.simphony.apiUsername,
        password: config.simphony.apiPassword,
        orgname: config.simphony.orgName,
    });
    return exchangeToken("authorization_code", {
        code: authCode,
        codeVerifier: started.codeVerifier,
    });
}
//# sourceMappingURL=auth.js.map