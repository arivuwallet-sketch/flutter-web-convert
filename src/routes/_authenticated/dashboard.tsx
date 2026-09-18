import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { defaultConfig } from "@/lib/appConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Smartphone, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your apps — NativeForge" },
      { name: "description", content: "Manage the mobile apps you generated from your websites." },
      { property: "og:title", content: "Your apps — NativeForge" },
      { property: "og:description", content: "Manage your generated mobile apps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const apps = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apps")
        .select("id,name,website_url,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("apps")
        .insert({
          user_id: uid,
          name,
          website_url: cleanUrl,
          config: JSON.parse(JSON.stringify(defaultConfig(name, cleanUrl))),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setName("");
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      navigate({ to: "/apps/$appId", params: { appId: data.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create the app"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("apps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["apps"] }),
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Your apps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Point it at any website — Lovable, Webflow, WordPress, Shopify or your own custom domain.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/build-settings">Build machine</Link>
        </Button>
      </div>

      <div className="panel mt-6 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="app-name">App name</Label>
            <Input
              id="app-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Shop"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="app-url">Website address</Label>
            <Input
              id="app-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://myshop.com"
              className="bg-background font-mono text-sm"
            />
          </div>
          <Button
            onClick={() => create.mutate()}
            disabled={!name || !url || create.isPending}
            className="h-10"
          >
            <Plus className="mr-2 size-4" />
            {create.isPending ? "Creating…" : "New app"}
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        {apps.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {apps.data?.length === 0 ? (
          <div className="panel grid-lines p-10 text-center text-sm text-muted-foreground">
            No apps yet. Add your first website above.
          </div>
        ) : null}
        {apps.data?.map((app) => (
          <div
            key={app.id}
            className="panel tilt flex items-center justify-between gap-4 p-4 hover:border-primary/50"
          >
            <button
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() => navigate({ to: "/apps/$appId", params: { appId: app.id } })}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Smartphone className="size-5 text-primary" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-sm">{app.name}</span>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {app.website_url}
                </span>
              </span>
            </button>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Android + iOS
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(app.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}
