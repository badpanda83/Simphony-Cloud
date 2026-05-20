import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
function base64UrlEncode(input) {
    return Buffer.from(input)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}
function base64UrlDecode(input) {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    return Buffer.from(`${normalized}${padding}`, "base64");
}
function sign(data, secret) {
    return base64UrlEncode(createHmac("sha256", secret).update(data).digest());
}
export function createApprovalToken(input, secret, now = Date.now()) {
    const payload = {
        jti: randomBytes(16).toString("hex"),
        sub: input.requestId,
        action: input.action,
        exp: Math.floor(now / 1000) + input.ttlSeconds,
    };
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = sign(encodedPayload, secret);
    return `${encodedPayload}.${signature}`;
}
export function verifyApprovalToken(token, secret, expectedAction, now = Date.now()) {
    const [encodedPayload, providedSignature] = token.split(".");
    if (!encodedPayload || !providedSignature) {
        throw new Error("Invalid approval token format");
    }
    const expectedSignature = sign(encodedPayload, secret);
    const expectedBytes = Buffer.from(expectedSignature);
    const providedBytes = Buffer.from(providedSignature);
    if (expectedBytes.length !== providedBytes.length ||
        !timingSafeEqual(expectedBytes, providedBytes)) {
        throw new Error("Invalid approval token signature");
    }
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8"));
    if (!payload.sub || !payload.jti || !payload.action || !payload.exp) {
        throw new Error("Invalid approval token payload");
    }
    if (payload.action !== expectedAction) {
        throw new Error("Approval token action mismatch");
    }
    if (payload.exp <= Math.floor(now / 1000)) {
        throw new Error("Approval token has expired");
    }
    return payload;
}
//# sourceMappingURL=approval-token.js.map