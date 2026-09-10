import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mergeConfig, type AppConfig } from "@/lib/appConfig";
import { buildFlutterProject } from "@/lib/flutterProject";
import { generateProject, startCloudBuild } from "@/lib/generate.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AddonsSection,
  AppInfoSection,
  BrandingSection,
  EnvSection,
  LinksSection,
  LocalisationSection,
  OverridesSection,
  PermissionsSection,
  SettingsSection,
  SplashSection,
} from "@/components/editor/sections";
import {
  ArrowLeft,
  Blocks,
  Download,
  FileCode2,
  Globe2,
  Image,
  Info,
  KeyRound,
  Languages,
  Link2,
  Loader2,
  Play,
  Save,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/apps/$appId")({
  head: () => ({
    meta: [
      { title: "App editor — NativeForge" },
      {
        name: "description",
        content: "Customise icon, splash screen, permissions, links and add-ons, then export the build.",
      },
      { property: "og:title", content: "App editor — NativeForge" },
      { property: "og:description", content: "Customise and export your native mobile app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppEditor,
});

const SECTIONS = [
  { key: "info", label: "App Info", icon: Info },
  { key: "branding", label: "Icon Library", icon: Image },
  { key: "splash", label: "Splash Screen", icon: Sparkles },
  { key: "permissions", label: "Permissions", icon: ShieldCheck },
  { key: "settings", label: "App Settings", icon: Sliders },
  { key: "links", label: "Link Handling", icon: Link2 },
  { key: "overrides", label: "Website Overrides", icon: Globe2 },
  { key: "addons", label: "Add-ons", icon: Blocks },
  { key: "locale", label: "Localisation", icon: Languages },
  { key: "env", label: "Environment", icon: KeyRound },
  { key: "files", label: "Project Files", icon: FileCode2 },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function downloadBase64Zip(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/zip" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function AppEditor() {
  const { appId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<SectionKey>("info");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedFile, setSelectedFile] = useState("lib/main.dart");
  const generate = useServerFn(generateProject);
  const cloudBuild = useServerFn(startCloudBuild);

  const app = useQuery({
    queryKey: ["app", appId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apps")
        .select("id,name,website_url,config")
        .eq("id", appId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (app.data && !config) {
      setConfig(mergeConfig(app.data.name, app.data.website_url, app.data.config));
    }
  }, [app.data, config]);

  const save = useMutation({
    mutationFn: async (next: AppConfig) => {
      const { error } = await supabase
        .from("apps")
        .update({
          name: next.appInfo.appName,
          website_url: next.appInfo.websiteUrl,
          config: next as unknown as Record<string, unknown>,
        })
        .eq("id", appId);
      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const files = useMemo(() => (config ? buildFlutterProject(config) : {}), [config]);

  const download = useMutation({
    mutationFn: async (platform: "android" | "ios" | "both") => {
      if (config && dirty) await save.mutateAsync(config);
      return generate({ data: { appId, platform } });
    },
    onSuccess: (res) => {
      downloadBase64Zip(res.filename, res.base64);
      toast.success("Build package downloaded");
    },
    onError: () => toast.error("Could not build the package"),
  });

  const build = useMutation({
    mutationFn: async (platform: "android" | "ios") => {
      if (config && dirty) await save.mutateAsync(config);
      return cloudBuild({ data: { appId, platform } });
    },
    onSuccess: (res) => (res.ok ? toast.success(res.message) : toast.warning(res.message)),
    onError: () => toast.error("Could not reach the build service"),
  });

  const patch = (fn: (c: AppConfig) => AppConfig) => {
    setConfig((prev) => (prev ? fn(prev) : prev));
    setDirty(true);
  };

  if (!config) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading app…
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/dashboard" })}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="font-display text-xl">{config.appInfo.appName}</h1>
            <p className="font-mono text-xs text-muted-foreground">{config.appInfo.websiteUrl}</p>
          </div>
          {dirty ? <Badge variant="outline">Unsaved</Badge> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => save.mutate(config)} disabled={save.isPending}>
            <Save className="mr-2 size-4" /> Save
          </Button>
          <Button size="sm" onClick={() => download.mutate("android")} disabled={download.isPending}>
            {download.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
            Android package
          </Button>
          <Button size="sm" variant="secondary" onClick={() => download.mutate("ios")} disabled={download.isPending}>
            <Download className="mr-2 size-4" /> iOS package
          </Button>
          <Button size="sm" variant="outline" onClick={() => download.mutate("both")} disabled={download.isPending}>
            <Download className="mr-2 size-4" /> Full project
          </Button>
        </div>
      </div>

      <div className="panel mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          Downloads give you the complete, ready-to-compile project. Connect a build machine to get a
          signed <span className="font-mono">.apk</span> / <span className="font-mono">.ipa</span> straight from here.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => build.mutate("android")} disabled={build.isPending}>
            <Play className="mr-2 size-4" /> Cloud build APK
          </Button>
          <Button size="sm" variant="outline" onClick={() => build.mutate("ios")} disabled={build.isPending}>
            <Play className="mr-2 size-4" /> Cloud build iOS
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  section === s.key
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {s.label}
              </button>
            );
          })}
        </nav>

        <section className="panel p-6">
          {section === "info" ? <AppInfoSection config={config} patch={patch} /> : null}
          {section === "branding" ? <BrandingSection config={config} patch={patch} /> : null}
          {section === "splash" ? <SplashSection config={config} patch={patch} /> : null}
          {section === "permissions" ? <PermissionsSection config={config} patch={patch} /> : null}
          {section === "settings" ? <SettingsSection config={config} patch={patch} /> : null}
          {section === "links" ? <LinksSection config={config} patch={patch} /> : null}
          {section === "overrides" ? <OverridesSection config={config} patch={patch} /> : null}
          {section === "addons" ? <AddonsSection config={config} patch={patch} /> : null}
          {section === "locale" ? <LocalisationSection config={config} patch={patch} /> : null}
          {section === "env" ? <EnvSection config={config} patch={patch} /> : null}
          {section === "files" ? (
            <div className="grid gap-4 md:grid-cols-[250px_1fr]">
              <div className="max-h-[520px] overflow-auto rounded-md border border-border bg-background p-2">
                {Object.keys(files)
                  .sort()
                  .map((path) => (
                    <button
                      key={path}
                      onClick={() => setSelectedFile(path)}
                      className={`block w-full truncate rounded px-2 py-1 text-left font-mono text-xs ${
                        selectedFile === path ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {path}
                    </button>
                  ))}
              </div>
              <pre className="max-h-[520px] overflow-auto rounded-md border border-border bg-background p-4 font-mono text-xs text-foreground">
                {files[selectedFile] ?? "Select a file"}
              </pre>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
