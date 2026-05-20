import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { apiKeyMiddleware } from "./middleware/api-key.js";
import { errorHandler } from "./middleware/error.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { organizationsRouter } from "./routes/organizations.js";
import { configurationRouter } from "./routes/configuration.js";
import { checksRouter } from "./routes/checks.js";
import { employeesRouter } from "./routes/employees.js";
import { notificationsRouter } from "./routes/notifications.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { proxyRouter } from "./routes/proxy.js";
import { validateRouter } from "./routes/validate.js";
import { passwordResetApprovalRouter } from "./routes/password-reset-approval.js";
import { startPasswordResetAutomationScaffolding } from "./reset-automation/runtime.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, "..", "docs");
const app = express();
app.use(cors({
    origin: (origin, callback) => {
        if (!origin ||
            origin.includes("localhost") ||
            origin.endsWith(".github.io") ||
            origin === "https://badpanda83.github.io") {
            callback(null, true);
            return;
        }
        callback(null, true);
    },
}));
app.use(express.json({ limit: "2mb" }));
app.use(healthRouter);
app.use(webhooksRouter);
app.use(validateRouter);
app.use("/setup", express.static(docsDir));
app.get("/setup", (_req, res) => {
    res.sendFile(path.join(docsDir, "index.html"));
});
app.use(apiKeyMiddleware);
app.use(authRouter);
app.use(organizationsRouter);
app.use(configurationRouter);
app.use(checksRouter);
app.use(employeesRouter);
app.use(notificationsRouter);
app.use(proxyRouter);
app.use(passwordResetApprovalRouter);
app.get("/", (_req, res) => {
    res.json({
        name: "simphony-cloud",
        repository: "https://github.com/badpanda83/Simphony-Cloud",
        docs: "https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/index.html",
        endpoints: {
            health: "GET /health",
            auth: "GET /auth/authorize, POST /auth/signin, POST /auth/token, POST /auth/login",
            organizations: "GET /api/v1/organizations/...",
            configuration: "GET /api/v1/menus/..., /api/v1/tenders/collection, ...",
            checks: "GET|POST /api/v1/checks, POST /workflows/checks/open|items|pay",
            validate: "POST /workflows/setup/validate",
            setupUi: "GET /setup (also GitHub Pages /docs)",
            notifications: "POST /workflows/notifications/setup",
            webhooks: "POST /webhooks/simphony",
            proxy: "GET /proxy/api/v1/organizations (prefix path after /proxy/)",
            passwordReset: "POST /workflows/password-reset/inbound, GET /workflows/password-reset/approve|deny, GET /workflows/password-reset/status/:requestId",
        },
    });
});
app.use(errorHandler);
startPasswordResetAutomationScaffolding().catch(() => {
    console.warn("[password-reset] inbox provider scaffolding failed to initialize");
});
app.listen(config.port, () => {
    console.info(`Simphony integration listening on port ${config.port}`);
});
//# sourceMappingURL=index.js.map