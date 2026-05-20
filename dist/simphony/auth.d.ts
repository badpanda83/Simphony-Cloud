import type { TokenSet } from "../types.js";
export interface AuthorizeStartResult {
    authSessionId: string;
    codeVerifier: string;
    codeChallenge: string;
    authorizeUrl: string;
    instructions: string[];
}
/** Start OIDC authorize and return session id for sign-in. */
export declare function startAuthorization(overrides?: {
    host?: string;
    clientId?: string;
}): Promise<AuthorizeStartResult>;
export interface SignInInput {
    authSessionId: string;
    username: string;
    password: string;
    orgname: string;
}
export declare function signIn(input: SignInInput): Promise<{
    authCode: string;
}>;
export declare function getCodeVerifier(authSessionId: string): string;
/** Return the cookie jar for an active auth session (for token exchange). */
export declare function getSessionJar(authSessionId: string): Map<string, string> | undefined;
export declare function exchangeToken(grantType: "authorization_code" | "refresh_token", params: {
    code?: string;
    codeVerifier?: string;
    refreshToken?: string;
    host?: string;
    clientId?: string;
    persist?: boolean;
    /** Cookie jar from the authorize/signin session – required for session continuity. */
    jar?: Map<string, string>;
}): Promise<TokenSet>;
export declare function ensureIdToken(): Promise<string>;
/** Convenience: full auth using env credentials (for Postman / automation). */
export declare function authenticateFromEnv(): Promise<TokenSet>;
/** Full PKCE auth with explicit credentials (setup wizard / validate). */
export declare function authenticateWithCredentials(creds: {
    host: string;
    clientId: string;
    username: string;
    password: string;
    orgName: string;
}, options?: {
    persist?: boolean;
}): Promise<TokenSet>;
//# sourceMappingURL=auth.d.ts.map