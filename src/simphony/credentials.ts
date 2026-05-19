export interface SimphonyCredentials {
  host: string;
  clientId: string;
  username: string;
  password: string;
  orgName: string;
}

export function normalizeHost(host: string): string {
  return host.trim().replace(/\/$/, "");
}
