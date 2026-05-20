import { config } from "../config.js";
import type {
  ApprovalNotificationPayload,
  ApprovalProvider,
  InboundResetProvider,
  ResetApprovalRequest,
  ResetExecutionPipeline,
} from "./types.js";

export class EmailApprovalProvider implements ApprovalProvider {
  readonly channel = "email" as const;

  async sendApprovalRequest(payload: ApprovalNotificationPayload): Promise<void> {
    const recipient = config.passwordResetApproval.approvalEmailTo;
    if (!recipient) {
      throw new Error("PASSWORD_RESET_APPROVAL_EMAIL_TO is required for email approvals");
    }
    console.info(
      "[password-reset] email approval scaffold: to=%s requestId=%s approveUrl=%s denyUrl=%s",
      recipient,
      payload.request.id,
      payload.approveUrl,
      payload.denyUrl
    );
  }
}

export class SlackApprovalProvider implements ApprovalProvider {
  readonly channel = "slack" as const;

  async sendApprovalRequest(payload: ApprovalNotificationPayload): Promise<void> {
    const channelId = config.passwordResetApproval.slack.channelId;
    if (!channelId) {
      throw new Error("PASSWORD_RESET_SLACK_CHANNEL_ID is required for Slack approvals");
    }
    console.info(
      "[password-reset] slack approval scaffold: channel=%s requestId=%s",
      channelId,
      payload.request.id
    );
  }
}

export class GmailInboundResetProvider implements InboundResetProvider {
  readonly source = "gmail" as const;

  async start(): Promise<void> {
    console.info(
      "[password-reset] gmail inbound provider scaffold active: inbox=%s label=%s pollIntervalMs=%d",
      config.passwordResetApproval.gmail.inboxAddress ?? "unset",
      config.passwordResetApproval.gmail.label,
      config.passwordResetApproval.gmail.pollIntervalMs
    );
  }

  async stop(): Promise<void> {
    console.info("[password-reset] gmail inbound provider scaffold stopped");
  }
}

export class GuardedResetExecutionPipeline implements ResetExecutionPipeline {
  async executeApprovedReset(request: ResetApprovalRequest): Promise<void> {
    if (!config.passwordResetApproval.executionEnabled) {
      console.info(
        "[password-reset] execution skipped (PASSWORD_RESET_EXECUTION_ENABLED=false) requestId=%s",
        request.id
      );
      return;
    }
    throw new Error(
      "Password reset execution is not implemented in scaffolding. Keep PASSWORD_RESET_EXECUTION_ENABLED=false until explicitly implemented."
    );
  }
}
