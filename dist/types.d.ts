export interface TokenSet {
    idToken: string;
    refreshToken: string;
    expiresAt?: number;
}
export interface SimphonyContext {
    orgShortName: string;
    locRef: string;
    rvcRef: string;
}
export interface SimphonyRequestOptions {
    method: string;
    path: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
    context?: Partial<SimphonyContext>;
}
export interface AuthSignInBody {
    username: string;
    password: string;
    orgname: string;
}
export interface WebhookMessage {
    id: string;
    creationDate: string;
    messageType: {
        id: string;
    };
    resource?: Record<string, string>;
    data?: Record<string, unknown>;
}
export interface WebhookPayload {
    messages: WebhookMessage[];
}
//# sourceMappingURL=types.d.ts.map