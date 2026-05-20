import type { ApprovalDecision, ApprovalTokenPayload } from "./types.js";
export interface CreateApprovalTokenInput {
    requestId: string;
    action: ApprovalDecision;
    ttlSeconds: number;
}
export declare function createApprovalToken(input: CreateApprovalTokenInput, secret: string, now?: number): string;
export declare function verifyApprovalToken(token: string, secret: string, expectedAction: ApprovalDecision, now?: number): ApprovalTokenPayload;
//# sourceMappingURL=approval-token.d.ts.map