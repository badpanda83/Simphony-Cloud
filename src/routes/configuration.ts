import { Router } from "express";
import { asyncHandler } from "../middleware/async.js";
import { simphonyRequest } from "../simphony/client.js";
import { contextFromRequest, simphonyHeaders } from "../utils/context.js";

export const configurationRouter = Router();

function configGet(path: string) {
  return asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { data, status } = await simphonyRequest({
      method: "GET",
      path,
      query: req.query as Record<string, string>,
      headers: simphonyHeaders(ctx),
      context: ctx,
    });
    res.status(status).json(data);
  });
}

configurationRouter.get("/api/v1/menus/summary", configGet("/api/v1/menus/summary"));

configurationRouter.get(
  "/api/v1/menus/:menuId",
  asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: `/api/v1/menus/${req.params.menuId}`,
      query: req.query as Record<string, string>,
      headers: simphonyHeaders(ctx),
      context: ctx,
    });
    res.status(status).json(data);
  })
);
configurationRouter.get("/api/v1/taxes", configGet("/api/v1/taxes"));
configurationRouter.get("/api/v1/barcodes/collection", configGet("/api/v1/barcodes/collection"));
configurationRouter.get("/api/v1/menus/items/unavailable", configGet("/api/v1/menus/items/unavailable"));
configurationRouter.get("/api/v1/discounts/collection", configGet("/api/v1/discounts/collection"));
configurationRouter.get("/api/v1/serviceCharges/collection", configGet("/api/v1/serviceCharges/collection"));
configurationRouter.get("/api/v1/tenders/collection", configGet("/api/v1/tenders/collection"));
configurationRouter.get("/api/v2/menus/summary", configGet("/api/v2/menus/summary"));

configurationRouter.get(
  "/api/v2/menus/:menuId",
  asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: `/api/v2/menus/${req.params.menuId}`,
      query: req.query as Record<string, string>,
      headers: simphonyHeaders(ctx),
      context: ctx,
    });
    res.status(status).json(data);
  })
);
