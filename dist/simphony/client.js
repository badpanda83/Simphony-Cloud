import { assertSimphonyHost } from "../config.js";
import { ensureIdToken } from "./auth.js";
function buildQuery(query) {
    if (!query)
        return "";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== "")
            params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `?${s}` : "";
}
export function resolveContext(partial, headers) {
    const orgShortName = partial?.orgShortName ??
        headers?.["simphony-orgshortname"] ??
        headers?.["x-org-short-name"];
    const locRef = partial?.locRef ?? headers?.["simphony-locref"] ?? headers?.["x-loc-ref"];
    const rvcRef = partial?.rvcRef ?? headers?.["simphony-rvcref"] ?? headers?.["x-rvc-ref"];
    if (!orgShortName || !locRef || !rvcRef) {
        throw new Error("Location context required: set SIMPHONY_ORG_SHORT_NAME, SIMPHONY_LOC_REF, SIMPHONY_RVC_REF or pass headers Simphony-OrgShortName, Simphony-LocRef, Simphony-RvcRef");
    }
    return {
        orgShortName: orgShortName.toLowerCase(),
        locRef: locRef.toLowerCase(),
        rvcRef: String(rvcRef),
    };
}
export async function simphonyRequest(options) {
    const host = assertSimphonyHost();
    const idToken = await ensureIdToken();
    const queryString = buildQuery(options.query);
    const url = `${host}${options.path}${queryString}`;
    const headers = new Headers({
        Authorization: `Bearer ${idToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
    });
    if (options.headers) {
        for (const [k, v] of Object.entries(options.headers)) {
            if (v)
                headers.set(k, v);
        }
    }
    if (options.context) {
        const ctx = resolveContext(options.context);
        headers.set("Simphony-OrgShortName", ctx.orgShortName);
        headers.set("Simphony-LocRef", ctx.locRef);
        headers.set("Simphony-RvcRef", ctx.rvcRef);
    }
    const res = await fetch(url, {
        method: options.method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    if (options.method === "HEAD") {
        if (!res.ok) {
            const err = new Error(`Simphony API error ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return { status: res.status, data: {}, headers: res.headers };
    }
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    }
    catch {
        data = { raw: text };
    }
    if (!res.ok) {
        const err = new Error(typeof data === "object" && data && "message" in data
            ? String(data.message)
            : `Simphony API error ${res.status}`);
        err.status = res.status;
        err.body = data;
        throw err;
    }
    return { status: res.status, data, headers: res.headers };
}
//# sourceMappingURL=client.js.map