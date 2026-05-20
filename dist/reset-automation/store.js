import { randomUUID } from "node:crypto";
const requests = new Map();
const requestIdByExternalMessage = new Map();
const consumedApprovalTokenIds = new Set();
function nowIso() {
    return new Date().toISOString();
}
function appendAudit(request, event, detail) {
    request.auditLog.push({ at: nowIso(), event, detail });
}
export function consumeApprovalTokenId(jti) {
    if (consumedApprovalTokenIds.has(jti)) {
        throw new Error(`Approval token already used: jti=${jti}`);
    }
    consumedApprovalTokenIds.add(jti);
}
export function createOrGetResetRequest(message, approvalChannel) {
    const existingId = requestIdByExternalMessage.get(message.externalMessageId);
    if (existingId) {
        const existing = requests.get(existingId);
        if (!existing)
            throw new Error("Corrupt reset request store");
        appendAudit(existing, "duplicate_inbound_ignored");
        return { request: existing, duplicate: true };
    }
    const createdAt = nowIso();
    const request = {
        id: randomUUID(),
        status: "pending",
        source: message.source,
        externalMessageId: message.externalMessageId,
        sender: message.sender,
        subject: message.subject,
        resetLink: message.resetLink,
        createdAt,
        updatedAt: createdAt,
        approvalChannel,
        auditLog: [{ at: createdAt, event: "inbound_message_received" }],
    };
    appendAudit(request, "approval_pending", `channel=${approvalChannel}`);
    requests.set(request.id, request);
    requestIdByExternalMessage.set(message.externalMessageId, request.id);
    return { request, duplicate: false };
}
export function getResetRequest(id) {
    return requests.get(id);
}
export function updateResetRequest(id, updater) {
    const request = requests.get(id);
    if (!request)
        throw new Error("Reset approval request not found");
    updater(request);
    request.updatedAt = nowIso();
    requests.set(id, request);
    return request;
}
export function toPublicResetApprovalRequest(request) {
    return {
        id: request.id,
        status: request.status,
        source: request.source,
        sender: request.sender,
        subject: request.subject,
        externalMessageId: request.externalMessageId,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        approvedAt: request.approvedAt,
        deniedAt: request.deniedAt,
        executedAt: request.executedAt,
        lastError: request.lastError,
        approvalChannel: request.approvalChannel,
        hasResetLink: Boolean(request.resetLink),
        auditLog: request.auditLog,
    };
}
export function appendResetAuditEvent(id, event, detail) {
    return updateResetRequest(id, (request) => appendAudit(request, event, detail));
}
//# sourceMappingURL=store.js.map