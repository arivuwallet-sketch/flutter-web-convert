import { getRequest } from "@tanstack/react-start/server";

export function publicLiveConfigUrl(appId: string): string {
  const configured = process.env["PUBLIC_SITE_URL"];
  const origin = configured || new URL(getRequest().url).origin;
  return `${origin.replace(/\/$/, "")}/api/public/app-config/${appId}`;
}
