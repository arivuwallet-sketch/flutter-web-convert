import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BuildSettingsView = {
  hasCodemagicToken: boolean;
  hasGithubToken: boolean;
  codemagicAppId: string;
  codemagicBranch: string;
  githubRepo: string;
  ready: boolean;
};

export const getBuildSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data)
  .handler(async ({ context }): Promise<BuildSettingsView> => {
    const { data } = await context.supabase
      .from("build_settings")
      .select("codemagic_token,codemagic_app_id,codemagic_branch,github_token,github_repo")
      .eq("user_id", context.userId)
      .maybeSingle();

    const hasCodemagicToken = Boolean(data?.codemagic_token);
    const hasGithubToken = Boolean(data?.github_token);
    const codemagicAppId = data?.codemagic_app_id ?? "";
    const githubRepo = data?.github_repo ?? "";

    return {
      hasCodemagicToken,
      hasGithubToken,
      codemagicAppId,
      codemagicBranch: data?.codemagic_branch || "main",
      githubRepo,
      ready: hasCodemagicToken && hasGithubToken && Boolean(codemagicAppId) && Boolean(githubRepo),
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
    const repo = (data.githubRepo ?? "").trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
    if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      throw new Error("Repository must look like owner/repository");
    }

    const patch: Record<string, string> = { user_id: context.userId };
    if (data.codemagicToken?.trim()) patch["codemagic_token"] = data.codemagicToken.trim();
    if (data.githubToken?.trim()) patch["github_token"] = data.githubToken.trim();
    if (data.codemagicAppId !== undefined) patch["codemagic_app_id"] = data.codemagicAppId.trim();
    if (data.codemagicBranch !== undefined) patch["codemagic_branch"] = data.codemagicBranch.trim() || "main";
    if (data.githubRepo !== undefined) patch["github_repo"] = repo;

    const { error } = await context.supabase
      .from("build_settings")
      .upsert(patch, { onConflict: "user_id" });
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });

export const clearBuildSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data)
  .handler(async ({ context }) => {
    await context.supabase.from("build_settings").delete().eq("user_id", context.userId);
    return { ok: true as const };
  });
