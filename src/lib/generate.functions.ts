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

async function fetchPng(url: string): Promise<Uint8Array | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 5_000_000 || buf.byteLength < 8) return null;
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    return pngSignature.every((byte, index) => buf[index] === byte) ? buf : null;
  } catch {
    return null;
  }
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(name: string, data: Uint8Array) {
  const type = new TextEncoder().encode(name);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(type, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.slice(4, 8 + data.length)));
  return chunk;
}

async function placeholderPng(hex: string, size = 1024) {
  const clean = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  const rgb = [0, 2, 4].map((offset) => Number.parseInt(clean.slice(offset, offset + 2), 16));
  const raw = new Uint8Array(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    for (let x = 0; x < size; x += 1) {
      const pixel = row + 1 + x * 4;
      raw[pixel] = rgb[0] ?? 0;
      raw[pixel + 1] = rgb[1] ?? 0;
      raw[pixel + 2] = rgb[2] ?? 0;
      raw[pixel + 3] = 255;
    }
  }
  const compressedStream = new Blob([raw.buffer]).stream().pipeThrough(new CompressionStream("deflate"));
  const compressed = new Uint8Array(await new Response(compressedStream).arrayBuffer());
  const header = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const chunks = [header, pngChunk("IHDR", ihdr), pngChunk("IDAT", compressed), pngChunk("IEND", new Uint8Array())];
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { png.set(chunk, offset); offset += chunk.length; }
  return png;
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

  const icon = await fetchPng(config.branding.iconUrl);
  zip.file("assets/icon.png", icon ?? (await placeholderPng(config.branding.iconBackground)));

  const splash = await fetchPng(config.splash.logoUrl || config.branding.iconUrl);
  zip.file("assets/splash.png", splash ?? (await placeholderPng(config.splash.backgroundColor)));

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
        message?: string;
        artefacts?: Artefact[];
      };
      if (!res.ok || !build.status) continue;

      const status = normaliseStatus(build.status);
      let artifactUrl: string | null = b.artifact_url;

      if (status === "success") {
        const art = pickArtefact(build.artefacts ?? [], b.platform as "android" | "ios");
        if (art?.url) artifactUrl = await publicArtefactUrl(art.url);
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
