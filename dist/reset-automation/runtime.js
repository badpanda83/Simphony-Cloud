import { config } from "../config.js";
import { GmailInboundResetProvider } from "./providers.js";
function getInboundProvider() {
    if (config.passwordResetApproval.mailboxProvider === "gmail") {
        return new GmailInboundResetProvider();
    }
    throw new Error(`Unsupported mailbox provider: ${config.passwordResetApproval.mailboxProvider}`);
}
export async function startPasswordResetAutomationScaffolding() {
    if (!config.passwordResetApproval.enabled)
        return;
    const provider = getInboundProvider();
    await provider.start();
}
//# sourceMappingURL=runtime.js.map