import { assertSimphonyHost } from "../config.js";
import { ensureIdToken } from "./auth.js";
import type { SimphonyContext, SimphonyRequestOptions } from "../types.js";

export interface SimphonySession {
  host: string;
  idToken: string;
}

function buildQuery(
  query?: Record<string, string | number | boolean | undefined>
): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function resolveContext(
  partial?: Partial<SimphonyContext>,
  headers?: Record<string, string | undefined>
): SimphonyContext {
  const orgShortName =
    partial?.orgShortName ??
    headers?.["simphony-orgshortname"] ??
    headers?.["x-org-short-name"];
  const locRef =
    partial?.locRef ?? headers?.["simphony-locref"] ?? headers?.["x-loc-ref"];
  const rvcRef =
    partial?.rvcRef ?? headers?.["simphony-rvcref"] ?? headers?.["x-rvc-ref"];

  if (!orgShortName || !locRef || !rvcRef) {
    throw new Error(
      "Location context required: set SIMPHONY_ORG_SHORT_NAME, SIMPHONY_LOC_REF, SIMPHONY_RVC_REF or pass headers Simphony-OrgShortName, Simphony-LocRef, Simphony-RvcRef"
    );
  }

  return {
    orgShortName: orgShortName.toLowerCase(),
    locRef: locRef.toLowerCase(),
    rvcRef: String(rvcRef),
  };
}

export async function simphonyRequestWithSession<T = unknown>(
  session: SimphonySession,
  options: SimphonyRequestOptions
): Promise<{ status: number; data: T; headers: Headers }> {
  return executeSimphonyRequest(session.host, session.idToken, options);
}

export async function simphonyRequest<T = unknown>(
  options: SimphonyRequestOptions
): Promise<{ status: number; data: T; headers: Headers }> {
  const host = assertSimphonyHost();
  const idToken = await ensureIdToken();
  return executeSimphonyRequest(host, idToken, options);
}

async function executeSimphonyRequest<T>(
  host: string,
  idToken: string,
  options: SimphonyRequestOptions
): Promise<{ status: number; data: T; headers: Headers }> {
  const queryString = buildQuery(options.query);
  const url = `${host}${options.path}${queryString}`;

  const headers = new Headers({
    Authorization: `Bearer ${idToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      if (v) headers.set(k, v);
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
    body:
      options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (options.method === "HEAD") {
    if (!res.ok) {
      const err = new Error(`Simphony API error ${res.status}`) as Error & {
        status: number;
      };
      err.status = res.status;
      throw err;
    }
    return { status: res.status, data: {} as T, headers: res.headers };
  }

  const text = await res.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    data = { raw: text } as T;
  }

  if (!res.ok) {
    const err = new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message: string }).message)
        : `Simphony API error ${res.status}`
    ) as Error & { status: number; body: T };
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return { status: res.status, data, headers: res.headers };
}

