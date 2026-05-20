import type { ApprovalNotificationPayload, ApprovalProvider, InboundResetProvider, ResetApprovalRequest, ResetExecutionPipeline } from "./types.js";
export declare class EmailApprovalProvider implements ApprovalProvider {
    readonly channel: "email";
    sendApprovalRequest(payload: ApprovalNotificationPayload): Promise<void>;
}
export declare class SlackApprovalProvider implements ApprovalProvider {
    readonly channel: "slack";
    sendApprovalRequest(payload: ApprovalNotificationPayload): Promise<void>;
}
export declare class GmailInboundResetProvider implements InboundResetProvider {
    readonly source: "gmail";
    start(): Promise<void>;
    stop(): Promise<void>;
}
export declare class GuardedResetExecutionPipeline implements ResetExecutionPipeline {
    executeApprovedReset(request: ResetApprovalRequest): Promise<void>;
}
//# sourceMappingURL=providers.d.ts.map