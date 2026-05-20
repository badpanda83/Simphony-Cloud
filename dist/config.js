import "dotenv/config";
function required(name, value) {
    if (!value?.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value.trim();
}
function optional(value) {
    const trimmed = value?.trim();
    return trimmed || undefined;
}
export const config = {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? "development",
    integrationApiKey: optional(process.env.INTEGRATION_API_KEY),
    simphony: {
        host: optional(process.env.SIMPHONY_HOST)?.replace(/\/$/, ""),
        clientId: optional(process.env.SIMPHONY_CLIENT_ID),
        orgName: optional(process.env.SIMPHONY_ORG_NAME),
        apiUsername: optional(process.env.SIMPHONY_API_USERNAME),
        apiPassword: optional(process.env.SIMPHONY_API_PASSWORD),
        idToken: optional(process.env.SIMPHONY_ID_TOKEN),
        refreshToken: optional(process.env.SIMPHONY_REFRESH_TOKEN),
        orgShortName: optional(process.env.SIMPHONY_ORG_SHORT_NAME),
        locRef: optional(process.env.SIMPHONY_LOC_REF),
        rvcRef: optional(process.env.SIMPHONY_RVC_REF),
    },
    webhook: {
        hmacKeyId: optional(process.env.WEBHOOK_HMAC_KEY_ID),
        hmacKey: optional(process.env.WEBHOOK_HMAC_KEY),
        forwardUrl: optional(process.env.WEBHOOK_FORWARD_URL) ??
            "https://webhook.site/283f6329-4f7a-4a97-bb56-5b1b065d4bef",
    },
    publicBaseUrl: optional(process.env.PUBLIC_BASE_URL),
};
export function assertSimphonyHost() {
    return required("SIMPHONY_HOST", config.simphony.host);
}
//# sourceMappingURL=config.js.map