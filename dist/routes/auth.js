import { Router } from "express";
import { asyncHandler } from "../middleware/async.js";
import { authenticateFromEnv, exchangeToken, getCodeVerifier, signIn, startAuthorization, } from "../simphony/auth.js";
import { getTokens, setTokens } from "../simphony/token-store.js";
import { config } from "../config.js";
export const authRouter = Router();
authRouter.get("/auth/authorize", asyncHandler(async (_req, res) => {
    const result = await startAuthorization();
    res.json(result);
}));
authRouter.post("/auth/signin", asyncHandler(async (req, res) => {
    const { authSessionId, username, password, orgname } = req.body ?? {};
    if (!authSessionId || !username || !password || !orgname) {
        res.status(400).json({
            error: "authSessionId, username, password, orgname are required",
        });
        return;
    }
    const result = await signIn({ authSessionId, username, password, orgname });
    res.json(result);
}));
authRouter.post("/auth/token", asyncHandler(async (req, res) => {
    const { authSessionId, authCode, refreshOnly } = req.body ?? {};
    if (refreshOnly) {
        const tokens = await exchangeToken("refresh_token", {});
        res.json({ ok: true, expiresAt: tokens.expiresAt });
        return;
    }
    if (!authSessionId || !authCode) {
        res.status(400).json({ error: "authSessionId and authCode are required" });
        return;
    }
    const codeVerifier = getCodeVerifier(authSessionId);
    const tokens = await exchangeToken("authorization_code", {
        code: authCode,
        codeVerifier,
    });
    res.json({
        ok: true,
        expiresAt: tokens.expiresAt,
        message: "Store id_token and refresh_token from GET /auth/status or env vars",
    });
}));
authRouter.post("/auth/login", asyncHandler(async (_req, res) => {
    if (!config.simphony.apiUsername ||
        !config.simphony.apiPassword ||
        !config.simphony.orgName) {
        res.status(400).json({
            error: "Set SIMPHONY_API_USERNAME, SIMPHONY_API_PASSWORD, SIMPHONY_ORG_NAME",
        });
        return;
    }
    const tokens = await authenticateFromEnv();
    res.json({ ok: true, expiresAt: tokens.expiresAt });
}));
authRouter.get("/auth/status", (_req, res) => {
    const tokens = getTokens();
    res.json({
        authenticated: Boolean(tokens?.idToken),
        expiresAt: tokens?.expiresAt ?? null,
        hasRefreshToken: Boolean(tokens?.refreshToken),
    });
});
authRouter.post("/auth/tokens", asyncHandler(async (req, res) => {
    const { idToken, refreshToken } = req.body ?? {};
    if (!idToken || !refreshToken) {
        res.status(400).json({ error: "idToken and refreshToken are required" });
        return;
    }
    setTokens({ idToken, refreshToken });
    res.json({ ok: true });
}));
//# sourceMappingURL=auth.js.map