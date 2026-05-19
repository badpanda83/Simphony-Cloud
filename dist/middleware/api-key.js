import { config } from "../config.js";
/** Optional API key guard for Postman / public deployment. */
export function apiKeyMiddleware(req, res, next) {
    if (!config.integrationApiKey) {
        next();
        return;
    }
    const key = req.header("x-api-key") ??
        req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (key !== config.integrationApiKey) {
        res.status(401).json({ error: "Invalid or missing API key" });
        return;
    }
    next();
}
//# sourceMappingURL=api-key.js.map