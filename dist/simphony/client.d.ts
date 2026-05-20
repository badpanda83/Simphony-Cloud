import type { SimphonyContext, SimphonyRequestOptions } from "../types.js";
export interface SimphonySession {
    host: string;
    idToken: string;
}
export declare function resolveContext(partial?: Partial<SimphonyContext>, headers?: Record<string, string | undefined>): SimphonyContext;
export declare function simphonyRequestWithSession<T = unknown>(session: SimphonySession, options: SimphonyRequestOptions): Promise<{
    status: number;
    data: T;
    headers: Headers;
}>;
export declare function simphonyRequest<T = unknown>(options: SimphonyRequestOptions): Promise<{
    status: number;
    data: T;
    headers: Headers;
}>;
//# sourceMappingURL=client.d.ts.map