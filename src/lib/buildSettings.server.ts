import { getRequest } from "@tanstack/react-start/server";

export function currentRequestOrigin(): string {
  return new URL(getRequest().url).origin;
}

export function publicLiveConfigUrl(appId: string): string {
  const configured = process.env["PUBLIC_SITE_URL"];
  const origin = configured || currentRequestOrigin();
  return `${origin.replace(/\/$/, "")}/api/public/app-config/${appId}`;
}

function authApi() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase is not configured");
  const header = getRequest()?.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer /, "");
  if (!token) throw new Error("Unauthorized");
  return { url: `${url}/auth/v1/user`, key, token };
}

async function callAuth(method: "GET" | "PUT", body?: unknown) {
  const { url, key, token } = authApi();
  const res = await fetch(url, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Auth request failed (${res.status})`);
  return text ? JSON.parse(text) : {};
}

export async function readStoredSettings(): Promise<import("./buildSettings.functions").StoredBuildSettings> {
  const user = await callAuth("GET");
  const raw = user?.user_metadata?.build_settings;
  return raw && typeof raw === "object"
    ? (raw as import("./buildSettings.functions").StoredBuildSettings)
    : {};
}

export async function writeStoredSettings(
  value: import("./buildSettings.functions").StoredBuildSettings | null,
) {
  await callAuth("PUT", { data: { build_settings: value } });
}
