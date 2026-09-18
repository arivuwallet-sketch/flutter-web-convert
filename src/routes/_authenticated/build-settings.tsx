import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getBuildSettings, saveBuildSettings, clearBuildSettings } from "@/lib/buildSettings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, CircleAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/build-settings")({
  head: () => ({
    meta: [
      { title: "Build machine — NativeForge" },
      {
        name: "description",
        content: "Connect your own Codemagic build machine and GitHub repository to compile real Android and iOS apps.",
      },
      { property: "og:title", content: "Build machine — NativeForge" },
      { property: "og:description", content: "Connect Codemagic and GitHub to build real apps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BuildSettingsPage,
});

function BuildSettingsPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(getBuildSettings);
  const save = useServerFn(saveBuildSettings);
  const clear = useServerFn(clearBuildSettings);

  const settings = useQuery({ queryKey: ["build-settings"], queryFn: () => load({ data: {} }) });

  const [codemagicToken, setCodemagicToken] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [codemagicAppId, setCodemagicAppId] = useState("");
  const [codemagicBranch, setCodemagicBranch] = useState("main");
  const [githubRepo, setGithubRepo] = useState("");

  useEffect(() => {
    if (!settings.data) return;
    setCodemagicAppId(settings.data.codemagicAppId);
    setCodemagicBranch(settings.data.codemagicBranch);
    setGithubRepo(settings.data.githubRepo);
  }, [settings.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: { codemagicToken, githubToken, codemagicAppId, codemagicBranch, githubRepo },
      }),
    onSuccess: () => {
      setCodemagicToken("");
      setGithubToken("");
      toast.success("Build machine saved");
      queryClient.invalidateQueries({ queryKey: ["build-settings"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  const clearMutation = useMutation({
    mutationFn: () => clear({ data: {} }),
    onSuccess: () => {
      toast.success("Build machine disconnected");
      queryClient.invalidateQueries({ queryKey: ["build-settings"] });
    },
  });

  const ready = settings.data?.ready ?? false;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to your apps
      </Link>

      <div className="panel glow p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl">Build machine</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your apps are pushed to your own repository and compiled on your own Codemagic machine,
              so the APK, AAB and signed IPA belong entirely to you.
            </p>
          </div>
          <Badge variant={ready ? "default" : "secondary"} className="shrink-0">
            {ready ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CircleAlert className="size-3" /> Not connected
              </span>
            )}
          </Badge>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cm-token">Codemagic API token</Label>
            <Input
              id="cm-token"
              type="password"
              placeholder={settings.data?.hasCodemagicToken ? "Saved — type to replace" : "Paste your token"}
              value={codemagicToken}
              onChange={(e) => setCodemagicToken(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Codemagic → Teams / Personal account → Integrations → Codemagic API.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cm-app">Codemagic app ID</Label>
            <Input
              id="cm-app"
              placeholder="e.g. 6650f0c1a1b2c3d4e5f60718"
              value={codemagicAppId}
              onChange={(e) => setCodemagicAppId(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              The long ID in your Codemagic app URL, for the app linked to the repository below.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gh-repo">GitHub repository</Label>
            <Input
              id="gh-repo"
              placeholder="owner/repository"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gh-token">GitHub token</Label>
            <Input
              id="gh-token"
              type="password"
              placeholder={settings.data?.hasGithubToken ? "Saved — type to replace" : "Paste a token with repository write access"}
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cm-branch">Base branch</Label>
            <Input
              id="cm-branch"
              placeholder="main"
              value={codemagicBranch}
              onChange={(e) => setCodemagicBranch(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Each app is pushed to its own branch based on this one, so nothing else in the repository is overwritten.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending || !settings.data?.hasCodemagicToken}
            >
              Disconnect
            </Button>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">For signed iOS builds</p>
          <p className="mt-1">
            In Codemagic, add your Apple Developer / App Store Connect integration to the same app. The generated
            project already asks Codemagic for the signing files it needs, so the finished build is a signed IPA.
          </p>
        </div>
      </div>
    </main>
  );
}
