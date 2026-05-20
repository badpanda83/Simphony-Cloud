import { Router } from "express";
import { config } from "../config.js";
import { getTokens } from "../simphony/token-store.js";
export const healthRouter = Router();
healthRouter.get("/health", (_req, res) => {
    const tokens = getTokens();
    res.json({
        status: "ok",
        simphonyHostConfigured: Boolean(config.simphony.host),
        authenticated: Boolean(tokens?.idToken),
        publicBaseUrl: config.publicBaseUrl ?? null,
        webhookForwardUrl: config.webhook.forwardUrl,
    });
});
//# sourceMappingURL=health.js.map