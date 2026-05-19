import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySimphonyHmac(
  payload: string,
  signature: string | undefined,
  hmacKeyBase64: string
): boolean {
  if (!signature) return false;

  const key = Buffer.from(hmacKeyBase64, "base64");
  const expected = createHmac("sha256", key).update(payload, "utf8").digest("base64");

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
