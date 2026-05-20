import { config } from "../config.js";
import { GmailInboundResetProvider } from "./providers.js";
import type { InboundResetProvider } from "./types.js";

function getInboundProvider(): InboundResetProvider {
  if (config.passwordResetApproval.mailboxProvider === "gmail") {
    return new GmailInboundResetProvider();
  }
  throw new Error(
    `Unsupported mailbox provider: ${config.passwordResetApproval.mailboxProvider}`
  );
}

export async function startPasswordResetAutomationScaffolding(): Promise<void> {
  if (!config.passwordResetApproval.enabled) return;
  const provider = getInboundProvider();
  await provider.start();
}
