import { createHash, randomBytes } from "node:crypto";

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

/** Generate PKCE code_verifier and code_challenge per Oracle STS Gen2 docs. */
export function generatePkce(): PkcePair {
  const codeVerifier = randomBytes(32)
    .toString("base64url")
    .replace(/=/g, "");

  const codeChallenge = createHash("sha256")
    .update(codeVerifier, "ascii")
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return { codeVerifier, codeChallenge };
}
