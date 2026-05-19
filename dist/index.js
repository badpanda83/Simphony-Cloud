import express from "express";
import cors from "cors";
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
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(healthRouter);
app.use(webhooksRouter);
app.use(apiKeyMiddleware);
app.use(authRouter);
app.use(organizationsRouter);
app.use(configurationRouter);
app.use(checksRouter);
app.use(employeesRouter);
app.use(notificationsRouter);
app.use(proxyRouter);
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
            notifications: "POST /workflows/notifications/setup",
            webhooks: "POST /webhooks/simphony",
            proxy: "GET /proxy/api/v1/organizations (prefix path after /proxy/)",
        },
    });
});
app.use(errorHandler);
app.listen(config.port, () => {
    console.info(`Simphony integration listening on port ${config.port}`);
});
//# sourceMappingURL=index.js.map