import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

/** Optional API key guard for Postman / public deployment. */
export function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!config.integrationApiKey) {
    next();
    return;
  }

  const key =
    req.header("x-api-key") ??
    req.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (key !== config.integrationApiKey) {
    res.status(401).json({ error: "Invalid or missing API key" });
    return;
  }

  next();
}
