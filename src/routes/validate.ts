import { Router } from "express";
import { asyncHandler } from "../middleware/async.js";
import { authenticateWithCredentials } from "../simphony/auth.js";
import {
  simphonyRequestWithSession,
  type SimphonySession,
} from "../simphony/client.js";
import { simphonyHeaders } from "../utils/context.js";
import type { SimphonyContext } from "../types.js";

export const validateRouter = Router();

interface ValidateBody {
  simphonyHost: string;
  clientId: string;
  username: string;
  password: string;
  orgName: string;
  orgShortName: string;
  locRef: string;
  rvcRef: string | number;
  menuId?: string | number;
}

interface StepResult {
  ok: boolean;
  label: string;
  count?: number;
  message: string;
  sample?: unknown;
}

function sevenDaysAgoUtc(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function asArray<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    for (const key of keys) {
      const nested = (value as Record<string, unknown>)[key];
      if (Array.isArray(nested)) return nested as T[];
    }
  }
  return [];
}

function checkOpenTimeWithinDays(openTime: string | undefined, days: number): boolean {
  if (!openTime) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(openTime).getTime() >= cutoff;
}

validateRouter.post(
  "/workflows/setup/validate",
  asyncHandler(async (req, res) => {
    const body = req.body as ValidateBody;
    const required: (keyof ValidateBody)[] = [
      "simphonyHost",
      "clientId",
      "username",
      "password",
      "orgName",
      "orgShortName",
      "locRef",
      "rvcRef",
    ];

    for (const key of required) {
      if (!body[key]) {
        res.status(400).json({ error: `${key} is required` });
        return;
      }
    }

    const ctx: SimphonyContext = {
      orgShortName: String(body.orgShortName).toLowerCase(),
      locRef: String(body.locRef).toLowerCase(),
      rvcRef: String(body.rvcRef),
    };

    const steps: StepResult[] = [];
    const startedAt = Date.now();

    let session: SimphonySession;
    try {
      const tokens = await authenticateWithCredentials({
        host: body.simphonyHost,
        clientId: body.clientId,
        username: body.username,
        password: body.password,
        orgName: body.orgName,
      });
      session = { host: body.simphonyHost.replace(/\/$/, ""), idToken: tokens.idToken };
      steps.push({
        ok: true,
        label: "Authentication",
        message: "OIDC sign-in and token exchange succeeded",
      });
    } catch (err) {
      res.status(401).json({
        ok: false,
        steps: [
          {
            ok: false,
            label: "Authentication",
            message: err instanceof Error ? err.message : "Authentication failed",
          },
        ],
      });
      return;
    }

    const headers = simphonyHeaders(ctx);
    const request = <T,>(opts: Parameters<typeof simphonyRequestWithSession<T>>[1]) =>
      simphonyRequestWithSession<T>(session, {
        ...opts,
        headers: { ...headers, ...opts.headers },
        context: ctx,
      });

    // Revenue centers
    try {
      const { data } = await request<unknown>({
        method: "GET",
        path: `/api/v1/organizations/${ctx.orgShortName}/locations/${ctx.locRef}/revenueCenters`,
      });
      const centers = asArray<Record<string, unknown>>(data, [
        "items",
        "revenueCenters",
      ]);
      steps.push({
        ok: centers.length > 0,
        label: "Revenue centers",
        count: centers.length,
        message:
          centers.length > 0
            ? `Found ${centers.length} revenue center(s)`
            : "No revenue centers returned",
        sample: centers.slice(0, 3).map((c) => ({
          rvcRef: c.rvcRef ?? c.ref,
          name: c.name,
        })),
      });
    } catch (err) {
      steps.push({
        ok: false,
        label: "Revenue centers",
        message: err instanceof Error ? err.message : "Request failed",
      });
    }

    // Tables (from revenue center detail)
    try {
      const { data } = await request<Record<string, unknown>>({
        method: "GET",
        path: `/api/v1/organizations/${ctx.orgShortName}/locations/${ctx.locRef}/revenueCenters/${ctx.rvcRef}`,
      });
      const tables = Array.isArray(data.tables)
        ? (data.tables as Record<string, unknown>[])
        : asArray<Record<string, unknown>>(data, ["tables"]);
      steps.push({
        ok: tables.length > 0,
        label: "Tables",
        count: tables.length,
        message:
          tables.length > 0
            ? `Found ${tables.length} table(s) on revenue center ${ctx.rvcRef}`
            : "No tables on revenue center (empty array)",
        sample: tables.slice(0, 5).map((t) => ({
          name: t.name ?? t.tableName,
          number: t.number,
        })),
      });
    } catch (err) {
      steps.push({
        ok: false,
        label: "Tables",
        message: err instanceof Error ? err.message : "Request failed",
      });
    }

    // Categories (menu family groups)
    try {
      let menuId = body.menuId;
      if (!menuId) {
        const summary = await request<{ items?: { menuId?: number; name?: string }[] }>({
          method: "GET",
          path: "/api/v1/menus/summary",
        });
        menuId = summary.data.items?.[0]?.menuId;
      }
      if (!menuId) {
        steps.push({
          ok: false,
          label: "Categories",
          message: "No menuId provided and menus/summary returned no menus",
        });
      } else {
        const { data } = await request<{ familyGroups?: unknown[] }>({
          method: "GET",
          path: `/api/v2/menus/${menuId}`,
        });
        const categories = asArray<Record<string, unknown>>(data.familyGroups, [
          "familyGroups",
        ]);
        steps.push({
          ok: categories.length > 0,
          label: "Categories",
          count: categories.length,
          message:
            categories.length > 0
              ? `Found ${categories.length} family group(s) on menu ${menuId}`
              : "Menu loaded but no family groups (categories)",
          sample: categories.slice(0, 5).map((g) => ({
            id: g.familyGroupItemId ?? g.id,
            name: g.name,
          })),
        });
      }
    } catch (err) {
      steps.push({
        ok: false,
        label: "Categories",
        message: err instanceof Error ? err.message : "Request failed",
      });
    }

    // Tickets (checks) — must have activity in last 7 days
    try {
      const sinceTime = sevenDaysAgoUtc();
      const { data } = await request<{ items?: { header?: { openTime?: string; checkNumber?: number } }[] }>({
        method: "GET",
        path: "/api/v1/checks",
        query: {
          sinceTime,
          includeClosed: true,
        },
      });
      const allChecks = data.items ?? [];
      const recentChecks = allChecks.filter((c) =>
        checkOpenTimeWithinDays(c.header?.openTime, 7)
      );
      const ticketsPass = recentChecks.length > 0;
      steps.push({
        ok: ticketsPass,
        label: "Tickets (last 7 days)",
        count: recentChecks.length,
        message: ticketsPass
          ? `${recentChecks.length} ticket(s) with open time in the last 7 days (${allChecks.length} since ${sinceTime})`
          : `No tickets in the last 7 days (${allChecks.length} check(s) returned since ${sinceTime})`,
        sample: recentChecks.slice(0, 5).map((c) => ({
          checkNumber: c.header?.checkNumber,
          openTime: c.header?.openTime,
        })),
      });
    } catch (err) {
      steps.push({
        ok: false,
        label: "Tickets (last 7 days)",
        message: err instanceof Error ? err.message : "Request failed",
      });
    }

    const ticketsStep = steps.find((s) => s.label === "Tickets (last 7 days)");
    const dataSteps = steps.filter((s) => s.label !== "Authentication");
    const dataOk = dataSteps.every((s) => s.ok);
    const ticketsOk = ticketsStep?.ok === true;

    res.json({
      ok: dataOk && ticketsOk,
      dataOk,
      ticketsOk,
      durationMs: Date.now() - startedAt,
      steps,
      context: ctx,
    });
  })
);
