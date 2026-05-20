import { config } from "../config.js";
import { resolveContext } from "../simphony/client.js";
export function contextFromRequest(req) {
    return resolveContext({
        orgShortName: req.query.orgShortName ??
            req.body?.orgShortName ??
            config.simphony.orgShortName,
        locRef: req.query.locRef ??
            req.body?.locRef ??
            config.simphony.locRef,
        rvcRef: req.query.rvcRef ??
            req.body?.rvcRef ??
            config.simphony.rvcRef,
    }, req.headers);
}
export function simphonyHeaders(ctx) {
    return {
        "Simphony-OrgShortName": ctx.orgShortName,
        "Simphony-LocRef": ctx.locRef,
        "Simphony-RvcRef": ctx.rvcRef,
    };
}
//# sourceMappingURL=context.js.map