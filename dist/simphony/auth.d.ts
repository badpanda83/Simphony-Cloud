import type { TokenSet } from "../types.js";
export interface AuthorizeStartResult {
    authSessionId: string;
    codeVerifier: string;
    codeChallenge: string;
    authorizeUrl: string;
    instructions: string[];
}
/** Start OIDC authorize and return session id for sign-in. */
export declare function startAuthorization(): Promise<AuthorizeStartResult>;
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
export declare function exchangeToken(grantType: "authorization_code" | "refresh_token", params: {
    code?: string;
    codeVerifier?: string;
    refreshToken?: string;
}): Promise<TokenSet>;
export declare function ensureIdToken(): Promise<string>;
/** Convenience: full auth using env credentials (for Postman / automation). */
export declare function authenticateFromEnv(): Promise<TokenSet>;
//# sourceMappingURL=auth.d.ts.map