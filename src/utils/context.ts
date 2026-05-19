import type { Request } from "express";
import { config } from "../config.js";
import { resolveContext } from "../simphony/client.js";
import type { SimphonyContext } from "../types.js";

export function contextFromRequest(req: Request): SimphonyContext {
  return resolveContext(
    {
      orgShortName:
        (req.query.orgShortName as string) ??
        (req.body?.orgShortName as string) ??
        config.simphony.orgShortName,
      locRef:
        (req.query.locRef as string) ??
        (req.body?.locRef as string) ??
        config.simphony.locRef,
      rvcRef:
        (req.query.rvcRef as string) ??
        (req.body?.rvcRef as string) ??
        config.simphony.rvcRef,
    },
    req.headers as Record<string, string | undefined>
  );
}

export function simphonyHeaders(ctx: SimphonyContext): Record<string, string> {
  return {
    "Simphony-OrgShortName": ctx.orgShortName,
    "Simphony-LocRef": ctx.locRef,
    "Simphony-RvcRef": ctx.rvcRef,
  };
}
