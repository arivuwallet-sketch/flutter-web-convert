import { getRequest } from "@tanstack/react-start/server";
import { readStoredSettings } from "./buildSettings.server";
import { buildFlutterProject } from "./flutterProject";
import type { AppConfig } from "./appConfig";

const CM_API = "https://api.codemagic.io";
const GH_API = "https://api.github.com";

export function publicLiveConfigUrl(appId: string): string {
  const configured = process.env["PUBLIC_SITE_URL"];
  const origin = configured || new URL(getRequest().url).origin;
  return `${origin.replace(/\/$/, "")}/api/public/app-config/${appId}`;
}

export function safeName(s: string): string {
  return (s || "app")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(name: string, data: Uint8Array): Uint8Array {
  const type = new TextEncoder().encode(name);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(type, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.slice(4, 8 + data.length)));
  return chunk;
}

async function placeholderPng(hex: string, size = 1024): Promise<Uint8Array> {
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
  const compressedStream = new Blob([raw.buffer])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  const compressed = new Uint8Array(await new Response(compressedStream).arrayBuffer());
  const header = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const chunks = [
    header,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", new Uint8Array()),
  ];
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    png.set(chunk, offset);
    offset += chunk.length;
  }
  return png;
}

export async function zipFor(
  config: AppConfig,
  platform: "android" | "ios" | "both",
  configUrl: string,
): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const files = buildFlutterProject(config, configUrl);

  for (const [path, content] of Object.entries(files)) {
    if (platform === "android" && path.startsWith("ios/")) continue;
    if (platform === "ios" && path.startsWith("android/")) continue;
    zip.file(path, content);
  }

  const icon =
    (await fetchPng(config.branding.iconUrl)) ??
    (await placeholderPng(config.branding.iconBackground));
  zip.file("assets/icon.png", icon);

  const splash =
    (await fetchPng(config.splash.logoUrl || config.branding.iconUrl)) ??
    (await placeholderPng(config.splash.backgroundColor));
  zip.file("assets/splash.png", splash);

  return zip.generateAsync({ type: "base64", compression: "DEFLATE" });
}

export type BuildCreds = {
  codemagic_token: string;
  codemagic_app_id: string;
  codemagic_branch: string;
  github_token?: string;
  github_repo?: string;
};

export async function loadBuildCreds(): Promise<BuildCreds | null> {
  const settings = await readStoredSettings();
  if (!settings.codemagicToken || !settings.codemagicAppId) return null;
  return {
    codemagic_token: settings.codemagicToken,
    codemagic_app_id: settings.codemagicAppId,
    codemagic_branch: settings.codemagicBranch || "main",
    ...(settings.githubToken && settings.githubRepo
      ? {
          github_token: settings.githubToken,
          github_repo: settings.githubRepo,
        }
      : {}),
  };
}

export async function cmFetch(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${CM_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-auth-token": token,
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body };
}

type GitHubObject = { sha?: string; object?: { sha: string }; message?: string };

export async function ghFetch(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<GitHubObject> {
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "nativeforge",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as GitHubObject;
  if (!res.ok) {
    throw new Error(`GitHub ${path} failed [${res.status}]: ${body?.message ?? "unknown error"}`);
  }
  return body;
}

function requireSha(value: string | undefined): string {
  if (!value || !/^[a-f0-9]{40}$/i.test(value))
    throw new Error("GitHub returned an invalid commit or object SHA");
  return value;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function buildBranch(appId: string): string {
  return `nativeforge-${appId.slice(0, 8)}`;
}

export async function pushProject(
  creds: BuildCreds & { github_token: string; github_repo: string },
  appId: string,
  config: AppConfig,
  configUrl: string,
): Promise<{ branch: string; commitSha: string }> {
  const repo = creds.github_repo;
  const branch = buildBranch(appId);
  const files = buildFlutterProject(config, configUrl);

  const icon =
    (await fetchPng(config.branding.iconUrl)) ??
    (await placeholderPng(config.branding.iconBackground));
  const splash =
    (await fetchPng(config.splash.logoUrl || config.branding.iconUrl)) ??
    (await placeholderPng(config.splash.backgroundColor));

  const binaries: Array<{ path: string; bytes: Uint8Array }> = [
    { path: "assets/icon.png", bytes: icon },
    { path: "assets/splash.png", bytes: splash },
  ];

  const tree: Array<Record<string, string>> = Object.entries(files).map(([path, content]) => ({
    path,
    mode: path.startsWith("tool/") || path.endsWith(".sh") ? "100755" : "100644",
    type: "blob",
    content,
  }));

  for (const bin of binaries) {
    const blob = await ghFetch(creds.github_token, `/repos/${repo}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: toBase64(bin.bytes), encoding: "base64" }),
    });
    tree.push({ path: bin.path, mode: "100644", type: "blob", sha: requireSha(blob.sha) });
  }

  let parent = "";
  let branchExists = false;
  try {
    const ref = await ghFetch(creds.github_token, `/repos/${repo}/git/ref/heads/${branch}`);
    parent = requireSha(ref.object?.sha);
    branchExists = true;
  } catch {
    try {
      const fallback = await ghFetch(
        creds.github_token,
        `/repos/${repo}/git/ref/heads/${creds.codemagic_branch}`,
      );
      parent = requireSha(fallback.object?.sha);
    } catch {
      parent = "";
    }
  }

  const treeRes = await ghFetch(creds.github_token, `/repos/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ tree }),
  });

  const commit = await ghFetch(creds.github_token, `/repos/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `Build ${config.appInfo.appName} (${new Date().toISOString()})`,
      tree: requireSha(treeRes.sha),
      parents: parent ? [parent] : [],
    }),
  });

  if (branchExists) {
    await ghFetch(creds.github_token, `/repos/${repo}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: requireSha(commit.sha), force: false }),
    });
  } else {
    await ghFetch(creds.github_token, `/repos/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: requireSha(commit.sha) }),
    });
  }

  return { branch, commitSha: requireSha(commit.sha) };
}

export function normaliseStatus(s: string): "running" | "success" | "failed" {
  if (["finished", "success", "succeeded", "published"].includes(s)) return "success";
  if (["failed", "canceled", "cancelled", "timeout", "skipped", "error"].includes(s)) {
    return "failed";
  }
  return "running";
}

export type Artefact = { name?: string; url?: string; type?: string; size?: number };

export function pickArtefact(
  artefacts: Artefact[],
  platform: "android" | "ios",
): Artefact | undefined {
  const wanted = platform === "android" ? [".apk", ".aab"] : [".ipa", ".xcarchive.zip", ".zip"];
  for (const ext of wanted) {
    const hit = artefacts.find((a) => (a.name ?? "").toLowerCase().endsWith(ext));
    if (hit) return hit;
  }
  return undefined;
}

export async function publicArtefactUrl(token: string, url: string): Promise<string> {
  try {
    const res = await fetch(`${url}/public-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": token },
      body: JSON.stringify({ expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }),
    });
    const body = (await res.json().catch(() => ({}))) as { url?: string };
    return body.url || url;
  } catch {
    return url;
  }
}

export const NOT_CONFIGURED =
  "Connect your build machine first: add your Codemagic API token and app ID in Build settings. A GitHub repository is optional.";
