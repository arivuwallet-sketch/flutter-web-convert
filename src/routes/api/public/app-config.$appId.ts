import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { mergeConfig } from "@/lib/appConfig";

const paramsSchema = z.object({
  appId: z.string().uuid(),
});

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
};

/**
 * Public settings feed for installed Android/iOS apps.
 * Returns only presentation settings for a single app id - never any account
 * data, owner details or secret environment values.
 */
export const Route = createFileRoute("/api/public/app-config/$appId")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            ...jsonHeaders,
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "content-type, accept, cache-control",
          },
        }),
      GET: async ({ params }) => {
        const parsed = paramsSchema.safeParse(params);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid app id" }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: app, error } = await supabaseAdmin
          .from("apps")
          .select("id,name,website_url,config,updated_at")
          .eq("id", parsed.data.appId)
          .maybeSingle();

        if (error || !app) {
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: jsonHeaders,
          });
        }

        const c = mergeConfig(app.name, app.website_url, app.config);

        const css = [
          c.overrides.hideSelectors.length
            ? `${c.overrides.hideSelectors.join(", ")} { display: none !important; }`
            : "",
          c.overrides.disableTextSelection
            ? "* { -webkit-user-select: none !important; user-select: none !important; }"
            : "",
          c.overrides.customCss,
        ]
          .filter(Boolean)
          .join("\n");

        const js = [
          c.overrides.disableContextMenu
            ? "document.addEventListener('contextmenu', function (e) { e.preventDefault(); });"
            : "",
          c.linkHandling.targetBlankInApp
            ? "document.querySelectorAll('a[target=\"_blank\"]').forEach(function(a){a.removeAttribute('target');});"
            : "",
          c.overrides.customJs,
        ]
          .filter(Boolean)
          .join("\n");

        return new Response(
          JSON.stringify({
            appName: c.appInfo.appName,
            startUrl: c.appInfo.websiteUrl,
            themeColor: c.branding.themeColor,
            accentColor: c.branding.accentColor,
            splashBackground: c.splash.backgroundColor,
            splashTagline: c.splash.tagline,
            splashDurationMs: c.splash.durationMs,
            customCss: css,
            customJs: js,
            internalDomains: c.linkHandling.internalDomains,
            blockedUrlPatterns: c.linkHandling.blockedUrlPatterns,
            bottomNav: c.addons.bottomNav,
            bottomNavItems: c.addons.bottomNavItems,
            updatedAt: app.updated_at,
          }),
          { status: 200, headers: jsonHeaders },
        );
      },
    },
  },
});
