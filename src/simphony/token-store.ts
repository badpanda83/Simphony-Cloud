import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { TokenSet } from "../types.js";
import { config } from "../config.js";

const TOKEN_FILE = join(process.cwd(), ".tokens.json");

let memoryTokens: TokenSet | null = null;

function loadFromFile(): TokenSet | null {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    const raw = JSON.parse(readFileSync(TOKEN_FILE, "utf8")) as TokenSet;
    if (raw.idToken && raw.refreshToken) return raw;
  } catch {
    /* ignore corrupt file */
  }
  return null;
}

function saveToFile(tokens: TokenSet): void {
  if (config.nodeEnv === "production") return;
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
  } catch {
    /* read-only filesystem on some PaaS — memory only */
  }
}

export function getTokens(): TokenSet | null {
  if (memoryTokens) return memoryTokens;

  if (config.simphony.idToken && config.simphony.refreshToken) {
    memoryTokens = {
      idToken: config.simphony.idToken,
      refreshToken: config.simphony.refreshToken,
    };
    return memoryTokens;
  }

  memoryTokens = loadFromFile();
  return memoryTokens;
}

export function setTokens(tokens: TokenSet): void {
  memoryTokens = tokens;
  saveToFile(tokens);
}

export function clearTokens(): void {
  memoryTokens = null;
}
