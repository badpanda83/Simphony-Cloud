import type { InboundResetMessage, PublicResetApprovalRequest, ResetApprovalRequest } from "./types.js";
export declare function consumeApprovalTokenId(jti: string): void;
export declare function createOrGetResetRequest(message: InboundResetMessage, approvalChannel: ResetApprovalRequest["approvalChannel"]): {
    request: ResetApprovalRequest;
    duplicate: boolean;
};
export declare function getResetRequest(id: string): ResetApprovalRequest | undefined;
export declare function updateResetRequest(id: string, updater: (request: ResetApprovalRequest) => void): ResetApprovalRequest;
export declare function toPublicResetApprovalRequest(request: ResetApprovalRequest): PublicResetApprovalRequest;
export declare function appendResetAuditEvent(id: string, event: string, detail?: string): ResetApprovalRequest;
//# sourceMappingURL=store.d.ts.map