import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  readStoredSettings,
  writeStoredSettings,
} from "./buildSettings.server";

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

export const getBuildSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => data)
  .handler(async (): Promise<BuildSettingsView> => {
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
  .validator(
    (data: {
      codemagicToken?: string;
      codemagicAppId?: string;
      codemagicBranch?: string;
      githubToken?: string;
      githubRepo?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
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
  .validator((data: unknown) => data)
  .handler(async () => {
    await writeStoredSettings(null);
    return { ok: true as const };
  });
