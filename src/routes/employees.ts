import { Router } from "express";
import { asyncHandler } from "../middleware/async.js";
import { simphonyRequest } from "../simphony/client.js";
import { contextFromRequest, simphonyHeaders } from "../utils/context.js";

export const employeesRouter = Router();

employeesRouter.get(
  "/api/v1/employees",
  asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { data, status } = await simphonyRequest({
      method: "GET",
      path: "/api/v1/employees",
      query: req.query as Record<string, string>,
      headers: simphonyHeaders(ctx),
      context: ctx,
    });
    res.status(status).json(data);
  })
);
