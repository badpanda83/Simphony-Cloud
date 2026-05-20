import { Router } from "express";
import { config } from "../config.js";
import { asyncHandler } from "../middleware/async.js";
import { PasswordResetApprovalOrchestrator } from "../reset-automation/orchestrator.js";
import {
  EmailApprovalProvider,
  GuardedResetExecutionPipeline,
  SlackApprovalProvider,
} from "../reset-automation/providers.js";
import type { InboundResetMessage } from "../reset-automation/types.js";

const orchestrator = new PasswordResetApprovalOrchestrator(
  {
    email: new EmailApprovalProvider(),
    slack: new SlackApprovalProvider(),
  },
  new GuardedResetExecutionPipeline()
);

function requireFeatureEnabled(): void {
  if (!config.passwordResetApproval.enabled) {
    throw new Error(
      "Password reset approval workflow is disabled. Set PASSWORD_RESET_APPROVAL_ENABLED=true to enable scaffolding endpoints."
    );
  }
}

function resolveBaseUrl(req: { protocol: string; get(name: string): string | undefined }): string {
  return config.publicBaseUrl ?? `${req.protocol}://${req.get("host") ?? "localhost:3000"}`;
}

export const passwordResetApprovalRouter = Router();

passwordResetApprovalRouter.post(
  "/workflows/password-reset/inbound",
  asyncHandler(async (req, res) => {
    requireFeatureEnabled();
    const {
      externalMessageId,
      sender,
      subject,
      resetLink,
      receivedAt,
      source,
    } = req.body ?? {};

    if (!externalMessageId || !sender || !subject) {
      res
        .status(400)
        .json({ error: "externalMessageId, sender, and subject are required" });
      return;
    }

    if (source && source !== "gmail") {
      res.status(400).json({ error: "Only source='gmail' is supported in scaffolding" });
      return;
    }

    const message: InboundResetMessage = {
      source: "gmail",
      externalMessageId: String(externalMessageId),
      sender: String(sender),
      subject: String(subject),
      receivedAt: String(receivedAt ?? new Date().toISOString()),
      resetLink: resetLink ? String(resetLink) : undefined,
    };

    const result = await orchestrator.receiveInboundResetEmail(
      message,
      resolveBaseUrl(req)
    );
    res.status(result.duplicate ? 200 : 202).json({
      ok: true,
      duplicate: result.duplicate,
      request: result.request,
    });
  })
);

passwordResetApprovalRouter.get(
  "/workflows/password-reset/approve",
  asyncHandler(async (req, res) => {
    requireFeatureEnabled();
    const token = String(req.query.token ?? "");
    if (!token) {
      res.status(400).json({ error: "token query parameter is required" });
      return;
    }
    const request = await orchestrator.resolveDecision(token, "approve");
    res.json({ ok: true, request });
  })
);

passwordResetApprovalRouter.get(
  "/workflows/password-reset/deny",
  asyncHandler(async (req, res) => {
    requireFeatureEnabled();
    const token = String(req.query.token ?? "");
    if (!token) {
      res.status(400).json({ error: "token query parameter is required" });
      return;
    }
    const request = await orchestrator.resolveDecision(token, "deny");
    res.json({ ok: true, request });
  })
);

passwordResetApprovalRouter.get(
  "/workflows/password-reset/status/:requestId",
  asyncHandler(async (req, res) => {
    requireFeatureEnabled();
    const request = orchestrator.getStatus(String(req.params.requestId));
    res.json({ ok: true, request });
  })
);
