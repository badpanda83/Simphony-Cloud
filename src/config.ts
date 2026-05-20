import "dotenv/config";

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function optionalBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function optionalNumber(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalApprovalChannel(
  value: string | undefined,
  fallback: "email" | "slack"
): "email" | "slack" {
  const trimmed = value?.trim().toLowerCase();
  if (trimmed === "email" || trimmed === "slack") return trimmed;
  return fallback;
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
    forwardUrl:
      optional(process.env.WEBHOOK_FORWARD_URL) ??
      "https://webhook.site/283f6329-4f7a-4a97-bb56-5b1b065d4bef",
  },

  publicBaseUrl: optional(process.env.PUBLIC_BASE_URL),

  passwordResetApproval: {
    enabled: optionalBoolean(process.env.PASSWORD_RESET_APPROVAL_ENABLED, false),
    executionEnabled: optionalBoolean(
      process.env.PASSWORD_RESET_EXECUTION_ENABLED,
      false
    ),
    defaultApprovalChannel: optionalApprovalChannel(
      process.env.PASSWORD_RESET_DEFAULT_APPROVAL_CHANNEL,
      "email"
    ),
    approvalEmailTo: optional(process.env.PASSWORD_RESET_APPROVAL_EMAIL_TO),
    mailboxProvider:
      optional(process.env.PASSWORD_RESET_MAILBOX_PROVIDER) ?? "gmail",
    gmail: {
      inboxAddress: optional(process.env.PASSWORD_RESET_GMAIL_INBOX_ADDRESS),
      label: optional(process.env.PASSWORD_RESET_GMAIL_LABEL) ?? "INBOX",
      pollIntervalMs: optionalNumber(
        process.env.PASSWORD_RESET_GMAIL_POLL_INTERVAL_MS,
        30000
      ),
    },
    slack: {
      botToken: optional(process.env.PASSWORD_RESET_SLACK_BOT_TOKEN),
      channelId: optional(process.env.PASSWORD_RESET_SLACK_CHANNEL_ID),
    },
    approvalTokenSecret: optional(process.env.PASSWORD_RESET_APPROVAL_TOKEN_SECRET),
    approvalTokenTtlSeconds: optionalNumber(
      process.env.PASSWORD_RESET_APPROVAL_TOKEN_TTL_SECONDS,
      900
    ),
  },
};

export function assertSimphonyHost(): string {
  return required("SIMPHONY_HOST", config.simphony.host);
}
