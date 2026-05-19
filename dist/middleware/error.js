export const errorHandler = (err, _req, res, _next) => {
    const status = typeof err === "object" && err && "status" in err
        ? Number(err.status) || 500
        : 500;
    const body = typeof err === "object" && err && "body" in err
        ? err.body
        : undefined;
    res.status(status).json({
        error: err instanceof Error ? err.message : "Internal server error",
        details: body,
    });
};
//# sourceMappingURL=error.js.map