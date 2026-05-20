import "dotenv/config";
export declare const config: {
    port: number;
    nodeEnv: string;
    integrationApiKey: string | undefined;
    simphony: {
        host: string | undefined;
        clientId: string | undefined;
        orgName: string | undefined;
        apiUsername: string | undefined;
        apiPassword: string | undefined;
        idToken: string | undefined;
        refreshToken: string | undefined;
        orgShortName: string | undefined;
        locRef: string | undefined;
        rvcRef: string | undefined;
    };
    webhook: {
        hmacKeyId: string | undefined;
        hmacKey: string | undefined;
        forwardUrl: string;
    };
    publicBaseUrl: string | undefined;
    passwordResetApproval: {
        enabled: boolean;
        executionEnabled: boolean;
        defaultApprovalChannel: "email" | "slack";
        approvalEmailTo: string | undefined;
        mailboxProvider: string;
        gmail: {
            inboxAddress: string | undefined;
            label: string;
            pollIntervalMs: number;
        };
        slack: {
            botToken: string | undefined;
            channelId: string | undefined;
        };
        approvalTokenSecret: string | undefined;
        approvalTokenTtlSeconds: number;
    };
};
export declare function assertSimphonyHost(): string;
//# sourceMappingURL=config.d.ts.map