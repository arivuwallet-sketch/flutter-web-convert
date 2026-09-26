import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { buildFlutterProject } from "../src/lib/flutterProject.ts";
import { defaultConfig, mergeConfig } from "../src/lib/appConfig.ts";

const out = resolve(process.argv[2] || ".generated/flutter");
const configFile = process.env.APP_CONFIG_FILE;
const stored = process.env.APP_CONFIG_JSON
  ? JSON.parse(process.env.APP_CONFIG_JSON)
  : configFile
    ? JSON.parse(readFileSync(configFile, "utf8"))
    : undefined;
const name = process.env.APP_NAME || stored?.appInfo?.appName;
const url = process.env.WEBSITE_URL || stored?.appInfo?.websiteUrl;
if (!name || !url)
  throw new Error(
    "Set APP_NAME and WEBSITE_URL in Codemagic, or provide APP_CONFIG_FILE. WEBSITE_URL must use HTTPS.",
  );
const config = stored ? mergeConfig(name, url, stored) : defaultConfig(name, url);
config.appInfo.appName = name;
config.appInfo.websiteUrl = url;
if (process.env.PACKAGE_ID) config.appInfo.packageId = process.env.PACKAGE_ID;
if (process.env.APP_VERSION) config.appInfo.versionName = process.env.APP_VERSION;
if (process.env.APP_BUILD_NUMBER) config.appInfo.versionCode = Number(process.env.APP_BUILD_NUMBER);
for (const [path, value] of Object.entries(
  buildFlutterProject(config, process.env.LIVE_CONFIG_URL || ""),
)) {
  mkdirSync(dirname(resolve(out, path)), { recursive: true });
  writeFileSync(resolve(out, path), value);
}
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const type = Buffer.from(name);
  const bytes = Buffer.alloc(data.length + 12);
  bytes.writeUInt32BE(data.length);
  type.copy(bytes, 4);
  data.copy(bytes, 8);
  bytes.writeUInt32BE(crc32(Buffer.concat([type, data])), data.length + 8);
  return bytes;
}
function png(color) {
  const size = 1024;
  const rgb = Buffer.from(color.slice(1), "hex");
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) rgb.copy(raw, y * (1 + size * 3) + 1 + x * 3);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
async function asset(url, fallback) {
  if (!url) return png(fallback);
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Image URLs must use HTTPS");
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    bytes.length > 5_000_000 ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error("Icons and splash images must be PNG files under 5 MB");
  return bytes;
}
writeFileSync(
  resolve(out, "assets/icon.png"),
  await asset(config.branding.iconUrl, config.branding.iconBackground),
);
writeFileSync(
  resolve(out, "assets/splash.png"),
  await asset(config.splash.logoUrl || config.branding.iconUrl, config.splash.backgroundColor),
);
console.log(`Generated ${config.appInfo.packageId} in ${out}`);
