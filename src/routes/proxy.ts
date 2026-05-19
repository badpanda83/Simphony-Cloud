import { Router } from "express";
import { asyncHandler } from "../middleware/async.js";
import { simphonyRequest, resolveContext } from "../simphony/client.js";
import { simphonyHeaders } from "../utils/context.js";

/**
 * Generic read proxy: GET /proxy/v1/organizations, etc.
 * For config/check paths, pass Simphony-OrgShortName, Simphony-LocRef, Simphony-RvcRef headers.
 */
export const proxyRouter = Router();

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join("/");
  return value ?? "";
}

proxyRouter.get(
  "/proxy/{*path}",
  asyncHandler(async (req, res) => {
    const suffix = paramString(req.params.path);
    const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
    if (!path.startsWith("/api/")) {
      res.status(400).json({
        error: "Proxy path must start with api/v1 or api/v2",
        example: "/proxy/api/v1/organizations",
      });
      return;
    }

    const needsContext =
      path.includes("/menus") ||
      path.includes("/checks") ||
      path.includes("/taxes") ||
      path.includes("/discounts") ||
      path.includes("/tenders") ||
      path.includes("/employees") ||
      path.includes("/barcodes") ||
      path.includes("/serviceCharges");

    const query: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === "string") query[k] = v;
    }

    let headers: Record<string, string> | undefined;
    let context;
    if (needsContext) {
      context = resolveContext(undefined, req.headers as Record<string, string>);
      headers = simphonyHeaders(context);
    }

    const { data, status } = await simphonyRequest({
      method: "GET",
      path,
      query,
      headers,
      context,
    });
    res.status(status).json(data);
  })
);
