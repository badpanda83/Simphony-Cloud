import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status =
    typeof err === "object" && err && "status" in err
      ? Number((err as { status: number }).status) || 500
      : 500;

  const body =
    typeof err === "object" && err && "body" in err
      ? (err as { body: unknown }).body
      : undefined;

  res.status(status).json({
    error: err instanceof Error ? err.message : "Internal server error",
    details: body,
  });
};
