import type { ApprovalDecision, ApprovalProvider, InboundResetMessage, PublicResetApprovalRequest, ResetExecutionPipeline } from "./types.js";
export declare class PasswordResetApprovalOrchestrator {
    private readonly approvalProviders;
    private readonly executionPipeline;
    constructor(approvalProviders: Record<"email" | "slack", ApprovalProvider>, executionPipeline: ResetExecutionPipeline);
    receiveInboundResetEmail(message: InboundResetMessage, baseUrl: string): Promise<{
        request: PublicResetApprovalRequest;
        duplicate: boolean;
    }>;
    getStatus(id: string): PublicResetApprovalRequest;
    resolveDecision(token: string, expectedAction: ApprovalDecision): Promise<PublicResetApprovalRequest>;
    private approve;
    private deny;
    private sendApprovalRequest;
}
//# sourceMappingURL=orchestrator.d.ts.map