import { randomBytes } from "node:crypto";
import { config } from "../config.js";
import { createApprovalToken, verifyApprovalToken, } from "./approval-token.js";
import { appendResetAuditEvent, consumeApprovalTokenId, createOrGetResetRequest, getResetRequest, toPublicResetApprovalRequest, updateResetRequest, } from "./store.js";
function runtimeTokenSecret() {
    return (config.passwordResetApproval.approvalTokenSecret ??
        randomBytes(32).toString("hex"));
}
const approvalTokenSecret = runtimeTokenSecret();
export class PasswordResetApprovalOrchestrator {
    approvalProviders;
    executionPipeline;
    constructor(approvalProviders, executionPipeline) {
        this.approvalProviders = approvalProviders;
        this.executionPipeline = executionPipeline;
    }
    async receiveInboundResetEmail(message, baseUrl) {
        const approvalChannel = config.passwordResetApproval.defaultApprovalChannel;
        if (!this.approvalProviders[approvalChannel]) {
            throw new Error(`Unsupported approval channel: ${approvalChannel}`);
        }
        const { request, duplicate } = createOrGetResetRequest(message, approvalChannel);
        if (!duplicate) {
            await this.sendApprovalRequest(request, baseUrl);
        }
        return { request: toPublicResetApprovalRequest(request), duplicate };
    }
    getStatus(id) {
        const request = getResetRequest(id);
        if (!request)
            throw new Error("Reset approval request not found");
        return toPublicResetApprovalRequest(request);
    }
    async resolveDecision(token, expectedAction) {
        const payload = verifyApprovalToken(token, approvalTokenSecret, expectedAction);
        consumeApprovalTokenId(payload.jti);
        const resolved = expectedAction === "approve"
            ? await this.approve(payload.sub)
            : this.deny(payload.sub);
        return toPublicResetApprovalRequest(resolved);
    }
    async approve(requestId) {
        const request = updateResetRequest(requestId, (item) => {
            if (item.status !== "pending") {
                throw new Error("Only pending reset requests can be approved");
            }
            const now = new Date().toISOString();
            item.status = "approved";
            item.approvedAt = now;
            item.auditLog.push({ at: now, event: "approval_granted" });
        });
        try {
            await this.executionPipeline.executeApprovedReset(request);
            return updateResetRequest(request.id, (item) => {
                const now = new Date().toISOString();
                item.status = "completed";
                item.executedAt = now;
                item.auditLog.push({
                    at: now,
                    event: "execution_pipeline_completed",
                    detail: config.passwordResetApproval.executionEnabled
                        ? "execution_enabled"
                        : "execution_disabled_scaffold_only",
                });
            });
        }
        catch (error) {
            return updateResetRequest(request.id, (item) => {
                const now = new Date().toISOString();
                item.status = "failed";
                item.lastError = error instanceof Error ? error.message : "Unknown error";
                item.auditLog.push({
                    at: now,
                    event: "execution_pipeline_failed",
                    detail: item.lastError,
                });
            });
        }
    }
    deny(requestId) {
        return updateResetRequest(requestId, (item) => {
            if (item.status !== "pending") {
                throw new Error("Only pending reset requests can be denied");
            }
            const now = new Date().toISOString();
            item.status = "denied";
            item.deniedAt = now;
            item.auditLog.push({ at: now, event: "approval_denied" });
        });
    }
    async sendApprovalRequest(request, baseUrl) {
        const ttlSeconds = config.passwordResetApproval.approvalTokenTtlSeconds;
        const approveToken = createApprovalToken({ requestId: request.id, action: "approve", ttlSeconds }, approvalTokenSecret);
        const denyToken = createApprovalToken({ requestId: request.id, action: "deny", ttlSeconds }, approvalTokenSecret);
        const provider = this.approvalProviders[request.approvalChannel];
        await provider.sendApprovalRequest({
            request,
            approveUrl: `${baseUrl}/workflows/password-reset/approve?token=${encodeURIComponent(approveToken)}`,
            denyUrl: `${baseUrl}/workflows/password-reset/deny?token=${encodeURIComponent(denyToken)}`,
        });
        appendResetAuditEvent(request.id, "approval_request_sent", `channel=${provider.channel}`);
    }
}
//# sourceMappingURL=orchestrator.js.map