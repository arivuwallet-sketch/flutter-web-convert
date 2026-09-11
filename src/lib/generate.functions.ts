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

/**
 * Kick off a real compile on a connected build service.
 * Requires CODEMAGIC_API_TOKEN (+ app id) to be configured; without it we say so
 * clearly instead of pretending a binary was produced.
 */
export const startCloudBuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appId: string; platform: "android" | "ios" }) => data)
  .handler(async ({ data, context }) => {
    const token = process.env["CODEMAGIC_API_TOKEN"];
    const codemagicAppId = process.env["CODEMAGIC_APP_ID"];

    if (!token || !codemagicAppId) {
      return {
        ok: false as const,
        reason: "not_configured" as const,
        message:
          "No build machine is connected yet. Add your build service credentials to compile a real APK/IPA here.",
      };
    }

    const res = await fetch("https://api.codemagic.io/builds", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": token },
      body: JSON.stringify({
        appId: codemagicAppId,
        workflowId: data.platform === "android" ? "android-release" : "ios-release",
        branch: "main",
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { buildId?: string; error?: string };

    if (!res.ok) {
      return {
        ok: false as const,
        reason: "provider_error" as const,
        message: body.error || `Build service returned ${res.status}`,
      };
    }

    await context.supabase.from("builds").insert({
      app_id: data.appId,
      user_id: context.userId,
      platform: data.platform,
      status: "running",
      provider: "codemagic",
      external_id: body.buildId ?? null,
    });

    return { ok: true as const, buildId: body.buildId ?? "", message: "Build started." };
  });
