import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "../config.js";
const TOKEN_FILE = join(process.cwd(), ".tokens.json");
let memoryTokens = null;
function loadFromFile() {
    if (!existsSync(TOKEN_FILE))
        return null;
    try {
        const raw = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
        if (raw.idToken && raw.refreshToken)
            return raw;
    }
    catch {
        /* ignore corrupt file */
    }
    return null;
}
function saveToFile(tokens) {
    if (config.nodeEnv === "production")
        return;
    try {
        writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
    }
    catch {
        /* read-only filesystem on some PaaS — memory only */
    }
}
export function getTokens() {
    if (memoryTokens)
        return memoryTokens;
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
export function setTokens(tokens) {
    memoryTokens = tokens;
    saveToFile(tokens);
}
export function clearTokens() {
    memoryTokens = null;
}
//# sourceMappingURL=token-store.js.map