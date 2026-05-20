export interface PkcePair {
    codeVerifier: string;
    codeChallenge: string;
}
/** Generate PKCE code_verifier and code_challenge per Oracle STS Gen2 docs. */
export declare function generatePkce(): PkcePair;
//# sourceMappingURL=pkce.d.ts.map