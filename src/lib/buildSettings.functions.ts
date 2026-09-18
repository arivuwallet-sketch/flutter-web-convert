import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Build-machine credentials are kept on the signed-in user's own account
 * record, so no extra table (and no migration) is needed.
 */
export type StoredBuildSettings = {
  codemagicToken?: string;
  codemagicAppId?: string;
  codemagicBranch?: string;
  githubToken?: string;
  githubRepo?: string;
};

export type BuildSettingsView = {
  hasCodemagicToken: boolean;
  hasGithubToken: boolean;
  codemagicAppId: string;
  codemagicBranch: string;
  githubRepo: string;
  /** Enough to start a build (GitHub push is optional). */
  ready: boolean;
  /** Generated project will be pushed to GitHub before building. */
  pushEnabled: boolean;
};

/**
 * The server-side Supabase client has no persisted session, so `auth.getUser()`
 * and `auth.updateUser()` fail with "Auth session missing!". The caller's own
 * access token is on the request, so we talk to the auth API with it directly —
 * no service-role key required.
 */
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

export async function readStoredSettings(_userId?: string): Promise<StoredBuildSettings> {
  const user = await callAuth("GET");
  const raw = user?.user_metadata?.build_settings;
  return raw && typeof raw === "object" ? (raw as StoredBuildSettings) : {};
}

async function writeStoredSettings(value: StoredBuildSettings | null) {
  await callAuth("PUT", { data: { build_settings: value } });
}

export const getBuildSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data)
  .handler(async ({ context }): Promise<BuildSettingsView> => {
    const s = await readStoredSettings();
    const hasCodemagicToken = Boolean(s.codemagicToken);
    const hasGithubToken = Boolean(s.githubToken);
    const codemagicAppId = s.codemagicAppId ?? "";
    const githubRepo = s.githubRepo ?? "";

    return {
      hasCodemagicToken,
      hasGithubToken,
      codemagicAppId,
      codemagicBranch: s.codemagicBranch || "main",
      githubRepo,
      ready: hasCodemagicToken && Boolean(codemagicAppId),
      pushEnabled: hasGithubToken && Boolean(githubRepo),
    };
  });

export const saveBuildSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      codemagicToken?: string;
      codemagicAppId?: string;
      codemagicBranch?: string;
      githubToken?: string;
      githubRepo?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const repo = (data.githubRepo ?? "")
      .trim()
      .replace(/^https?:\/\/github\.com\//i, "")
      .replace(/\.git$/i, "");
    if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      throw new Error("Repository must look like owner/repository");
    }

    const current = await readStoredSettings();
    const next: StoredBuildSettings = { ...current };

    if (data.codemagicToken?.trim()) next.codemagicToken = data.codemagicToken.trim();
    if (data.githubToken?.trim()) next.githubToken = data.githubToken.trim();
    if (data.codemagicAppId !== undefined) next.codemagicAppId = data.codemagicAppId.trim();
    if (data.codemagicBranch !== undefined) next.codemagicBranch = data.codemagicBranch.trim() || "main";
    if (data.githubRepo !== undefined) {
      next.githubRepo = repo;
      if (!repo) delete next.githubToken;
    }

    await writeStoredSettings(next);

    return { ok: true as const };
  });

export const clearBuildSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data)
  .handler(async ({ context }) => {
    await writeStoredSettings(null);
    return { ok: true as const };
  });
