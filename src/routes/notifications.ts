import { randomUUID } from "node:crypto";
import { Router } from "express";
import { asyncHandler } from "../middleware/async.js";
import { simphonyRequest } from "../simphony/client.js";
import { config } from "../config.js";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/api/v1/notifications/discovery",
  asyncHandler(async (_req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: "/api/v1/notifications/discovery",
    });
    res.status(status).json(data);
  })
);

notificationsRouter.get(
  "/api/v1/notifications/subscriptions",
  asyncHandler(async (_req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: "/api/v1/notifications/subscriptions",
    });
    res.status(status).json(data);
  })
);

notificationsRouter.get(
  "/api/v1/notifications/subscriptions/:subscriptionId",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: `/api/v1/notifications/subscriptions/${req.params.subscriptionId}`,
    });
    res.status(status).json(data);
  })
);

notificationsRouter.post(
  "/api/v1/notifications/registration",
  asyncHandler(async (req, res) => {
    const body = req.body ?? buildRegistrationBody();
    const { data, status } = await simphonyRequest({
      method: "POST",
      path: "/api/v1/notifications/registration",
      body,
    });
    res.status(status).json(data ?? { ok: true });
  })
);

notificationsRouter.put(
  "/api/v1/notifications/registration",
  asyncHandler(async (req, res) => {
    const body = req.body ?? buildRegistrationBody();
    const { data, status } = await simphonyRequest({
      method: "PUT",
      path: "/api/v1/notifications/registration",
      body,
    });
    res.status(status).json(data ?? { ok: true });
  })
);

notificationsRouter.delete(
  "/api/v1/notifications/registration",
  asyncHandler(async (_req, res) => {
    const { data, status } = await simphonyRequest({
      method: "DELETE",
      path: "/api/v1/notifications/registration",
    });
    res.status(status).json(data ?? { ok: true });
  })
);

notificationsRouter.post(
  "/api/v1/notifications/subscriptions",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "POST",
      path: "/api/v1/notifications/subscriptions",
      body: req.body,
    });
    res.status(status).json(data);
  })
);

notificationsRouter.delete(
  "/api/v1/notifications/subscriptions/:subscriptionId",
  asyncHandler(async (req, res) => {
    const { data, status } = await simphonyRequest({
      method: "DELETE",
      path: `/api/v1/notifications/subscriptions/${req.params.subscriptionId}`,
    });
    res.status(status).json(data ?? { ok: true });
  })
);

/**
 * Register HMAC + subscribe all notification types to PUBLIC_BASE_URL/webhooks/simphony
 * and optionally forward copies to WEBHOOK_FORWARD_URL (webhook.site).
 */
notificationsRouter.post(
  "/workflows/notifications/setup",
  asyncHandler(async (req, res) => {
    const {
      orgShortName,
      locRef,
      rvcRef,
      callbackUri,
      messageTypes,
    } = req.body ?? {};

    if (!orgShortName) {
      res.status(400).json({ error: "orgShortName is required" });
      return;
    }

    const webhookUrl =
      callbackUri ??
      (config.publicBaseUrl
        ? `${config.publicBaseUrl.replace(/\/$/, "")}/webhooks/simphony`
        : null);

    if (!webhookUrl) {
      res.status(400).json({
        error:
          "callbackUri or PUBLIC_BASE_URL required. For dev you can subscribe directly to webhook.site in the body.",
      });
      return;
    }

    const regBody = buildRegistrationBody(req.body);
    await simphonyRequest({
      method: "PUT",
      path: "/api/v1/notifications/registration",
      body: regBody,
    });

    const types: string[] =
      messageTypes ?? [
        "CheckNotification",
        "OrganizationsNotification",
        "ConfigurationNotification",
        "EmployeesNotification",
      ];

    const subscriptions = [];
    for (const id of types) {
      const sub = {
        callbackUri: webhookUrl,
        messageType: { id },
        postOfficeOptions: { PostOfficeType: "PushOnePostOffice" },
        orgShortName,
        locRef,
        rvcRef: id === "EmployeesNotification" ? undefined : rvcRef,
      };
      const { data } = await simphonyRequest({
        method: "POST",
        path: "/api/v1/notifications/subscriptions",
        body: sub,
      });
      subscriptions.push(data);
    }

    res.json({
      ok: true,
      webhookUrl,
      forwardUrl: config.webhook.forwardUrl,
      subscriptions,
    });
  })
);

function buildRegistrationBody(override?: Record<string, unknown>) {
  const keyId =
    (override?.keyId as string) ?? config.webhook.hmacKeyId ?? randomUUID();
  const hmacKey =
    (override?.hmacKey as string) ??
    config.webhook.hmacKey ??
    Buffer.from(randomUUID() + randomUUID()).toString("base64");

  return {
    keyId,
    hmacKey,
    keyType: "hmac-sha256",
  };
}
