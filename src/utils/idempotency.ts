import { randomUUID } from "node:crypto";

/** UUID v4 without dashes — required by Simphony check idempotencyId. */
export function newIdempotencyId(): string {
  return randomUUID().replace(/-/g, "");
}
