import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  cmFetch,
  loadBuildCreds,
  normaliseStatus,
  NOT_CONFIGURED,
  pickArtefact,
  publicArtefactUrl,
  publicLiveConfigUrl,
  pushProject,
  safeName,
  zipFor,
} from "./generate.server";
import { mergeConfig } from "./appConfig";
import { buildFlutterProject } from "./flutterProject";

export const generateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { appId: string; platform: "android" | "ios" | "both" }) => data)
  .handler(async ({ data, context }) => {
    const { data: app, error } = await context.supabase
      .from("apps")
      .select("id,name,website_url,config")
      .eq("id", data.appId)
      .single();
    if (error || !app) throw new Error("App not found");

    const config = mergeConfig(app.name, app.website_url, app.config);
    const base64 = await zipFor(config, data.platform, publicLiveConfigUrl(data.appId));
    const suffix =
      data.platform === "android" ? "android" : data.platform === "ios" ? "ios" : "full";
    return {
      filename: `${safeName(app.name)}-flutter-${suffix}.zip`,
      base64,
    };
  });

export const previewFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { appId: string; path: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: app, error } = await context.supabase
      .from("apps")
      .select("name,website_url,config")
      .eq("id", data.appId)
      .single();
    if (error || !app) throw new Error("App not found");
    const config = mergeConfig(app.name, app.website_url, app.config);
    const files = buildFlutterProject(config, publicLiveConfigUrl(data.appId));
    return { paths: Object.keys(files).sort(), content: files[data.path] ?? "" };
  });

export const startCloudBuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { appId: string; platform: "android" | "ios" }) => data)
  .handler(async ({ data, context }) => {
    const creds = await loadBuildCreds();
    if (!creds) {
      return { ok: false as const, reason: "not_configured" as const, message: NOT_CONFIGURED };
    }

    const { data: app, error } = await context.supabase
      .from("apps")
      .select("id,name,website_url,config")
      .eq("id", data.appId)
      .single();
    if (error || !app) throw new Error("App not found");

    const config = mergeConfig(app.name, app.website_url, app.config);

    let branch = creds.codemagic_branch;
    let pushedToRepo = false;
    if (creds.github_token && creds.github_repo) {
      try {
        const pushed = await pushProject(
          creds as typeof creds & { github_token: string; github_repo: string },
          data.appId,
          config,
          publicLiveConfigUrl(data.appId),
        );
        branch = pushed.branch;
        pushedToRepo = true;
      } catch (err) {
        return {
          ok: false as const,
          reason: "repo_error" as const,
          message:
            err instanceof Error
              ? err.message
              : "Could not push the project to your repository.",
        };
      }
    }

    const res = await cmFetch(creds.codemagic_token, "/builds", {
      method: "POST",
      body: JSON.stringify({
        appId: creds.codemagic_app_id,
        workflowId: data.platform === "android" ? "android-release" : "ios-release",
        branch,
        environment: {
          variables: {
            APP_NAME: config.appInfo.appName,
            PACKAGE_ID: config.appInfo.packageId,
            BUNDLE_ID: config.appInfo.packageId,
            WEBSITE_URL: config.appInfo.websiteUrl,
            APP_VERSION: config.appInfo.versionName,
            BUILD_NUMBER: String(config.appInfo.versionCode),
            LIVE_CONFIG_URL: publicLiveConfigUrl(data.appId),
          },
        },
      }),
    });

    const buildId = (res.body["buildId"] as string | undefined) ?? "";
    if (!res.ok || !buildId) {
      return {
        ok: false as const,
        reason: "provider_error" as const,
        message:
          (res.body["error"] as string | undefined) ||
          `Codemagic returned ${res.status}. Check that the app ID belongs to this repository and that the branch ${branch} is allowed.`,
      };
    }

    const { data: row } = await context.supabase
      .from("builds")
      .insert({
        app_id: data.appId,
        user_id: context.userId,
        platform: data.platform,
        status: "running",
        provider: "codemagic",
        external_id: buildId,
        message: `Queued from ${branch}`,
      })
      .select("id")
      .single();

    return {
      ok: true as const,
      buildId,
      branch,
      pushedToRepo,
      rowId: row?.id ?? "",
      message: `${data.platform === "android" ? "Android" : "iOS"} build started on your Codemagic machine.`,
    };
  });

export const refreshBuilds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { appId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("builds")
      .select("id,platform,status,external_id,artifact_url,message,created_at")
      .eq("app_id", data.appId)
      .order("created_at", { ascending: false })
      .limit(20);

    const builds = rows ?? [];
    const creds = await loadBuildCreds();
    if (!creds) return { configured: false as const, builds };

    for (const b of builds) {
      if (b.status !== "running" || !b.external_id) continue;

      const res = await cmFetch(creds.codemagic_token, `/builds/${b.external_id}`);
      const build = (res.body["build"] ?? {}) as {
        status?: string;
        message?: string;
        artefacts?: Array<{ name?: string; url?: string; type?: string; size?: number }>;
      };
      if (!res.ok || !build.status) continue;

      const status = normaliseStatus(build.status);
      let artifactUrl: string | null = b.artifact_url;

      if (status === "success") {
        const art = pickArtefact(build.artefacts ?? [], b.platform as "android" | "ios");
        if (art?.url) {
          artifactUrl = await publicArtefactUrl(creds.codemagic_token, art.url);
        }
      }

      const reason = (build.message ?? "").trim();
      await context.supabase
        .from("builds")
        .update({
          status,
          artifact_url: artifactUrl,
          message:
            status === "success"
              ? "Build finished"
              : status === "failed"
                ? reason || `Build ${build.status}`
                : `Building (${build.status})`,
        })
        .eq("id", b.id);

      b.status = status;
      b.artifact_url = artifactUrl;
    }

    return { configured: true as const, builds };
  });
