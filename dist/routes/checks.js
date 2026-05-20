import { randomUUID } from "node:crypto";
import { Router } from "express";
import { asyncHandler } from "../middleware/async.js";
import { simphonyRequest } from "../simphony/client.js";
import { contextFromRequest, simphonyHeaders } from "../utils/context.js";
import { config } from "../config.js";
export const checksRouter = Router();
function newIdempotencyId() {
    return randomUUID().replace(/-/g, "");
}
checksRouter.head("/api/v1/checks/connectionStatus", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { status } = await simphonyRequest({
        method: "HEAD",
        path: "/api/v1/checks/connectionStatus",
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).end();
}));
checksRouter.get("/api/v1/checks", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { data, status } = await simphonyRequest({
        method: "GET",
        path: "/api/v1/checks",
        query: req.query,
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).json(data);
}));
checksRouter.get("/api/v1/checks/:checkRef", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { data, status } = await simphonyRequest({
        method: "GET",
        path: `/api/v1/checks/${req.params.checkRef}`,
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).json(data);
}));
checksRouter.get("/api/v1/checks/:checkRef/printed", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { data, status } = await simphonyRequest({
        method: "GET",
        path: `/api/v1/checks/${req.params.checkRef}/printed`,
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).json(data);
}));
checksRouter.post("/api/v1/checks/calculator", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { data, status } = await simphonyRequest({
        method: "POST",
        path: "/api/v1/checks/calculator",
        body: req.body,
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).json(data);
}));
/** Open a new check (POST /api/v1/checks). Body is a Simphony Check object. */
checksRouter.post("/api/v1/checks", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const check = req.body ?? {};
    if (check.header && !check.header.idempotencyId) {
        check.header.idempotencyId = newIdempotencyId();
    }
    const { data, status } = await simphonyRequest({
        method: "POST",
        path: "/api/v1/checks",
        body: check,
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).json(data);
}));
/** Add items / round to an existing check. */
checksRouter.post("/api/v1/checks/:checkRef/round", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { data, status } = await simphonyRequest({
        method: "POST",
        path: `/api/v1/checks/${req.params.checkRef}/round`,
        body: req.body,
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).json(data);
}));
checksRouter.delete("/api/v1/checks/:checkRef", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { data, status } = await simphonyRequest({
        method: "DELETE",
        path: `/api/v1/checks/${req.params.checkRef}`,
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).json(data);
}));
/**
 * Convenience: open check with minimal header fields.
 * POST /workflows/checks/open
 */
checksRouter.post("/workflows/checks/open", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { checkName, checkEmployeeRef, orderTypeRef, orderChannelRef, tableName, guestCount, menuItems, idempotencyId, } = req.body ?? {};
    if (!checkEmployeeRef || !orderTypeRef) {
        res.status(400).json({
            error: "checkEmployeeRef and orderTypeRef are required",
        });
        return;
    }
    const check = {
        header: {
            orgShortName: ctx.orgShortName,
            locRef: ctx.locRef,
            rvcRef: Number(ctx.rvcRef),
            idempotencyId: idempotencyId ?? newIdempotencyId(),
            checkEmployeeRef,
            orderTypeRef,
            checkName: checkName ?? `API-${Date.now()}`,
            orderChannelRef,
            tableName,
            guestCount,
        },
        menuItems: menuItems ?? [],
        notificationOptions: config.publicBaseUrl
            ? {
                enabled: true,
            }
            : undefined,
    };
    const { data, status } = await simphonyRequest({
        method: "POST",
        path: "/api/v1/checks",
        body: check,
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).json(data);
}));
/**
 * Convenience: add menu items to a check.
 * POST /workflows/checks/:checkRef/items
 */
checksRouter.post("/workflows/checks/:checkRef/items", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { menuItems, comboMeals } = req.body ?? {};
    if (!menuItems?.length && !comboMeals?.length) {
        res.status(400).json({ error: "menuItems or comboMeals required" });
        return;
    }
    const round = {
        header: {
            orgShortName: ctx.orgShortName,
            locRef: ctx.locRef,
            rvcRef: Number(ctx.rvcRef),
            checkRef: req.params.checkRef,
        },
        menuItems: menuItems ?? [],
        comboMeals: comboMeals ?? [],
    };
    const { data, status } = await simphonyRequest({
        method: "POST",
        path: `/api/v1/checks/${req.params.checkRef}/round`,
        body: round,
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).json(data);
}));
/**
 * Convenience: pay check by posting tenders on a round.
 * POST /workflows/checks/:checkRef/pay
 * Body: { tenders: CheckTenderItem[] } — get tender refs from /api/v1/tenders/collection
 */
checksRouter.post("/workflows/checks/:checkRef/pay", asyncHandler(async (req, res) => {
    const ctx = contextFromRequest(req);
    const { tenders } = req.body ?? {};
    if (!tenders?.length) {
        res.status(400).json({
            error: "tenders array is required (from tenders/collection config)",
        });
        return;
    }
    const round = {
        header: {
            orgShortName: ctx.orgShortName,
            locRef: ctx.locRef,
            rvcRef: Number(ctx.rvcRef),
            checkRef: req.params.checkRef,
        },
        tenders,
    };
    const { data, status } = await simphonyRequest({
        method: "POST",
        path: `/api/v1/checks/${req.params.checkRef}/round`,
        body: round,
        headers: simphonyHeaders(ctx),
        context: ctx,
    });
    res.status(status).json(data);
}));
//# sourceMappingURL=checks.js.map