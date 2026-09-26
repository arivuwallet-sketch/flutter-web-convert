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
    signal: AbortSignal.timeout(15000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text) as { msg?: string; message?: string; error_description?: string };
      detail = parsed.msg || parsed.message || parsed.error_description || text;
    } catch {
      // Keep the raw response when Auth did not return JSON.
    }
    throw new Error(`Supabase Auth request failed (${res.status}): ${detail || "unknown error"}`);
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Supabase Auth returned an invalid response while saving build settings.");
  }
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
  const response = await callAuth("PUT", { data: { build_settings: value } });
  const saved = response?.user_metadata?.build_settings;
  if (value === null) {
    if (saved !== undefined && saved !== null) {
      throw new Error("Supabase accepted the save request but did not clear build settings.");
    }
    return;
  }

  if (!saved || typeof saved !== "object") {
    throw new Error("Supabase accepted the save request but build settings were not persisted.");
  }

  for (const [key, expected] of Object.entries(value)) {
    const actual = (saved as Record<string, unknown>)[key];
    if (actual !== expected) {
      throw new Error(`Build settings were not persisted correctly (${key}). Please retry.`);
    }
  }
}
