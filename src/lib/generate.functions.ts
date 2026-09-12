import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mergeConfig, type AppConfig } from "./appConfig";
import { buildFlutterProject } from "./flutterProject";

/** Public settings feed baked into the generated app so edits reach phones live. */
function liveConfigUrl(appId: string) {
  const configured = process.env["PUBLIC_SITE_URL"];
  const origin = configured || new URL(getRequest().url).origin;
  return `${origin.replace(/\/$/, "")}/api/public/app-config/${appId}`;
}

function safeName(s: string) {
  return (s || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function fetchBinary(url: string): Promise<Uint8Array | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 5_000_000) return null;
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

function placeholderSvg(color: string, glyphColor: string, letter: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${color}"/>
  <text x="256" y="330" font-family="monospace" font-size="240" font-weight="700"
        text-anchor="middle" fill="${glyphColor}">${letter}</text>
</svg>`;
}

async function zipFor(
  config: AppConfig,
  platform: "android" | "ios" | "both",
  liveConfigUrl: string,
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const files = buildFlutterProject(config, liveConfigUrl);

  for (const [path, content] of Object.entries(files)) {
    if (platform === "android" && path.startsWith("ios/")) continue;
    if (platform === "ios" && path.startsWith("android/")) continue;
    zip.file(path, content);
  }

  const icon = await fetchBinary(config.branding.iconUrl);
  if (icon) zip.file("assets/icon.png", icon);
  else
    zip.file(
      "assets/icon.svg",
      placeholderSvg(
        config.branding.iconBackground,
        config.branding.accentColor,
        (config.appInfo.appName[0] || "A").toUpperCase(),
      ),
    );

  const splash = await fetchBinary(config.splash.logoUrl || config.branding.iconUrl);
  if (splash) zip.file("assets/splash.png", splash);
  else
    zip.file(
      "assets/splash.svg",
      placeholderSvg(
        config.splash.backgroundColor,
        config.branding.accentColor,
        (config.appInfo.appName[0] || "A").toUpperCase(),
      ),
    );

  if (!icon || !splash) {
    zip.file(
      "assets/README.md",
      "Drop a 1024x1024 `icon.png` and `splash.png` in this folder before building,\n" +
        "or upload them in the web console and regenerate. SVG placeholders are included.\n",
    );
  }

  return zip.generateAsync({ type: "base64", compression: "DEFLATE" });
}

export const generateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appId: string; platform: "android" | "ios" | "both" }) => data)
  .handler(async ({ data, context }) => {
    const { data: app, error } = await context.supabase
      .from("apps")
      .select("id,name,website_url,config")
      .eq("id", data.appId)
      .single();
    if (error || !app) throw new Error("App not found");

    const config = mergeConfig(app.name, app.website_url, app.config);
    const base64 = await zipFor(config, data.platform, liveConfigUrl(data.appId));
    const suffix =
      data.platform === "android" ? "android" : data.platform === "ios" ? "ios" : "full";
    return {
      filename: `${safeName(app.name)}-flutter-${suffix}.zip`,
      base64,
    };
  });

export const previewFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appId: string; path: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: app, error } = await context.supabase
      .from("apps")
      .select("name,website_url,config")
      .eq("id", data.appId)
      .single();
    if (error || !app) throw new Error("App not found");
    const config = mergeConfig(app.name, app.website_url, app.config);
    const files = buildFlutterProject(config, liveConfigUrl(data.appId));
    return { paths: Object.keys(files).sort(), content: files[data.path] ?? "" };
  });

/* ------------------------------------------------------------------ *
 * Codemagic build service
 * ------------------------------------------------------------------ */

const CM_API = "https://api.codemagic.io";

function cmToken() {
  return process.env["CODEMAGIC_API_TOKEN"] ?? "";
}
function cmAppId() {
  return process.env["CODEMAGIC_APP_ID"] ?? "";
}
function cmBranch() {
  return process.env["CODEMAGIC_BRANCH"] || "main";
}

async function cmFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${CM_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-auth-token": cmToken(),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body };
}

/** Codemagic statuses -> our simple vocabulary. */
function normaliseStatus(s: string): "running" | "success" | "failed" {
  if (["finished", "success", "succeeded", "published"].includes(s)) return "success";
  if (["failed", "canceled", "cancelled", "timeout", "skipped", "error"].includes(s))
    return "failed";
  return "running";
}

type Artefact = { name?: string; url?: string; type?: string; size?: number };

function pickArtefact(artefacts: Artefact[], platform: "android" | "ios") {
  const wanted = platform === "android" ? [".apk", ".aab"] : [".ipa", ".xcarchive.zip", ".zip"];
  for (const ext of wanted) {
    const hit = artefacts.find((a) => (a.name ?? "").toLowerCase().endsWith(ext));
    if (hit) return hit;
  }
  return artefacts[0];
}

/** Turn a protected artefact URL into a link the browser can download. */
async function publicArtefactUrl(url: string): Promise<string> {
  try {
    const res = await fetch(`${url}/public-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": cmToken() },
      body: JSON.stringify({ expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }),
    });
    const body = (await res.json().catch(() => ({}))) as { url?: string };
    return body.url || url;
  } catch {
    return url;
  }
}

/**
 * Kick off a real compile on Codemagic. The generated project's `codemagic.yaml`
 * defines `android-release` (APK + AAB) and `ios-release` (signed IPA) workflows;
 * per-app settings travel with the build as environment variables.
 */
export const startCloudBuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appId: string; platform: "android" | "ios" }) => data)
  .handler(async ({ data, context }) => {
    if (!cmToken() || !cmAppId()) {
      return {
        ok: false as const,
        reason: "not_configured" as const,
        message:
          "No build machine is connected yet. Add your build service credentials to compile a real APK/IPA here.",
      };
    }

    const { data: app, error } = await context.supabase
      .from("apps")
      .select("id,name,website_url,config")
      .eq("id", data.appId)
      .single();
    if (error || !app) throw new Error("App not found");

    const config = mergeConfig(app.name, app.website_url, app.config);

    const res = await cmFetch("/builds", {
      method: "POST",
      body: JSON.stringify({
        appId: cmAppId(),
        workflowId: data.platform === "android" ? "android-release" : "ios-release",
        branch: cmBranch(),
        environment: {
          variables: {
            APP_NAME: config.appInfo.appName,
            PACKAGE_ID: config.appInfo.packageId,
            BUNDLE_ID: config.appInfo.packageId,
            WEBSITE_URL: config.appInfo.websiteUrl,
            APP_VERSION: config.appInfo.versionName,
            BUILD_NUMBER: String(config.appInfo.versionCode),
            LIVE_CONFIG_URL: liveConfigUrl(data.appId),
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
          `Build service returned ${res.status}. Check the connected repository and workflow names.`,
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
        message: "Build queued",
      })
      .select("id")
      .single();

    return {
      ok: true as const,
      buildId,
      rowId: row?.id ?? "",
      message: `${data.platform === "android" ? "Android" : "iOS"} build started.`,
    };
  });

/** Poll Codemagic for every unfinished build of an app and sync our records. */
export const refreshBuilds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("builds")
      .select("id,platform,status,external_id,artifact_url,message,created_at")
      .eq("app_id", data.appId)
      .order("created_at", { ascending: false })
      .limit(20);

    const builds = rows ?? [];
    if (!cmToken()) return { configured: false as const, builds };

    for (const b of builds) {
      if (b.status !== "running" || !b.external_id) continue;

      const res = await cmFetch(`/builds/${b.external_id}`);
      const build = (res.body["build"] ?? {}) as {
        status?: string;
        artefacts?: Artefact[];
      };
      if (!res.ok || !build.status) continue;

      const status = normaliseStatus(build.status);
      let artifactUrl: string | null = b.artifact_url;

      if (status === "success") {
        const art = pickArtefact(build.artefacts ?? [], b.platform as "android" | "ios");
        if (art?.url) artifactUrl = await publicArtefactUrl(art.url);
      }

      await context.supabase
        .from("builds")
        .update({
          status,
          artifact_url: artifactUrl,
          message:
            status === "success"
              ? "Build finished"
              : status === "failed"
                ? `Build ${build.status}`
                : `Building (${build.status})`,
        })
        .eq("id", b.id);

      b.status = status;
      b.artifact_url = artifactUrl;
    }

    return { configured: true as const, builds };
  });
