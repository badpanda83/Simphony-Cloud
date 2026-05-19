import { Router } from "express";
import { config } from "../config.js";
import { asyncHandler } from "../middleware/async.js";
import type { WebhookPayload } from "../types.js";
import { verifySimphonyHmac } from "../utils/webhook-hmac.js";

export const webhooksRouter = Router();

/** Simphony POSTs check/org/config/employee notifications here (TLS 443 on Railway). */
webhooksRouter.post(
  "/webhooks/simphony",
  asyncHandler(async (req, res) => {
    const rawBody = JSON.stringify(req.body);
    const signature =
      req.header("x-signature") ??
      req.header("X-Signature") ??
      req.header("simphony-signature");

    if (config.webhook.hmacKey) {
      const valid = verifySimphonyHmac(
        rawBody,
        signature,
        config.webhook.hmacKey
      );
      if (!valid) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
    }

    const payload = req.body as WebhookPayload;

    if (config.webhook.forwardUrl) {
      fetch(config.webhook.forwardUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-From": "simphony-integration",
        },
        body: rawBody,
      }).catch(() => {
        /* best-effort forward to webhook.site */
      });
    }

    console.info(
      "[webhook]",
      payload.messages?.map((m) => m.messageType?.id).join(", ") ?? "empty"
    );

    res.status(200).json({ received: true, count: payload.messages?.length ?? 0 });
  })
);

/** Manual test — forwards sample payload to webhook.site */
webhooksRouter.post(
  "/webhooks/test-forward",
  asyncHandler(async (req, res) => {
    const body = req.body ?? {
      messages: [
        {
          id: "test",
          creationDate: new Date().toISOString(),
          messageType: { id: "CheckNotification" },
          data: { status: "Submitted" },
        },
      ],
    };

    const forward = await fetch(config.webhook.forwardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    res.json({
      ok: forward.ok,
      forwardStatus: forward.status,
      forwardUrl: config.webhook.forwardUrl,
    });
  })
);
