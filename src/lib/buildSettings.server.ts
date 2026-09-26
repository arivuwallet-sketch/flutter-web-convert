import { getRequest } from "@tanstack/react-start/server";

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
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Auth request failed (${res.status})`);
  return text ? JSON.parse(text) : {};
}

export async function readStoredSettings(): Promise<
  import("./buildSettings.types").StoredBuildSettings
> {
  const user = await callAuth("GET");
  const raw = user?.user_metadata?.build_settings;
  return raw && typeof raw === "object"
    ? (raw as import("./buildSettings.types").StoredBuildSettings)
    : {};
}

export async function writeStoredSettings(
  value: import("./buildSettings.types").StoredBuildSettings | null,
) {
  await callAuth("PUT", { data: { build_settings: value } });
}
