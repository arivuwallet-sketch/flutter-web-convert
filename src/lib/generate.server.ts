import { getRequest } from "@tanstack/react-start/server";
import { readStoredSettings } from "./buildSettings.server";

export function publicLiveConfigUrl(appId: string): string {
  const configured = process.env["PUBLIC_SITE_URL"];
  const origin = configured || new URL(getRequest().url).origin;
  return `${origin.replace(/\/$/, "")}/api/public/app-config/${appId}`;
}


export async function loadBuildCreds(userId: string) {
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
