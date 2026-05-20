export type ApprovalDecision = "approve" | "deny";
export type ApprovalChannel = "email" | "slack";
export type ResetRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "completed"
  | "failed";

export interface InboundResetMessage {
  source: "gmail";
  externalMessageId: string;
  sender: string;
  subject: string;
  receivedAt: string;
  resetLink?: string;
}

export interface ResetApprovalRequest {
  id: string;
  status: ResetRequestStatus;
  source: InboundResetMessage["source"];
  externalMessageId: string;
  sender: string;
  subject: string;
  resetLink?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  executedAt?: string;
  lastError?: string;
  approvalChannel: ApprovalChannel;
  auditLog: Array<{
    at: string;
    event: string;
    detail?: string;
  }>;
}

export interface ApprovalNotificationPayload {
  request: ResetApprovalRequest;
  approveUrl: string;
  denyUrl: string;
}

export interface ApprovalProvider {
  readonly channel: ApprovalChannel;
  sendApprovalRequest(payload: ApprovalNotificationPayload): Promise<void>;
}

export interface InboundResetProvider {
  readonly source: InboundResetMessage["source"];
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface ResetExecutionPipeline {
  executeApprovedReset(request: ResetApprovalRequest): Promise<void>;
}

export interface ApprovalTokenPayload {
  jti: string;
  sub: string;
  action: ApprovalDecision;
  exp: number;
}

export interface PublicResetApprovalRequest {
  id: string;
  status: ResetRequestStatus;
  source: InboundResetMessage["source"];
  sender: string;
  subject: string;
  externalMessageId: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  deniedAt?: string;
  executedAt?: string;
  lastError?: string;
  approvalChannel: ApprovalChannel;
  hasResetLink: boolean;
  auditLog: ResetApprovalRequest["auditLog"];
}
