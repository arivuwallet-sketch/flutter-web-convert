import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Blocks,
  Download,
  Globe2,
  Image,
  KeyRound,
  Languages,
  Link2,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Terminal,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NativeForge — Website to Flutter app converter" },
      {
        name: "description",
        content:
          "Turn any website, including Lovable sites and custom domains, into a real Flutter app. Full editor for icon, splash, permissions, links and add-ons, with downloadable Android and iOS builds.",
      },
      { property: "og:title", content: "NativeForge — Website to Flutter app converter" },
      {
        property: "og:description",
        content: "Convert any website into a native Android and iOS app with a full app editor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Image, title: "Icon library & uploads", body: "Pick a ready-made icon or bring your own artwork." },
  { icon: Sparkles, title: "Splash screen", body: "Logo, colours, tagline and timing for the loading screen." },
  { icon: ShieldCheck, title: "Permissions", body: "Camera, location, notifications and more — only what you need." },
  { icon: Sliders, title: "App settings", body: "Orientation, pull-to-refresh, offline page, caching, downloads." },
  { icon: Link2, title: "Link handling", body: "Deep links, universal links, which domains stay inside the app." },
  { icon: Globe2, title: "Website overrides", body: "Hide web-only navigation, inject custom CSS and JavaScript." },
  { icon: Blocks, title: "Add-ons", body: "Push, analytics, ads, biometric lock, share, QR scanner, bottom tabs." },
  { icon: Languages, title: "Localisation", body: "Multiple languages with per-language app names." },
  { icon: KeyRound, title: "Environment variables", body: "Public and secret values baked into the build." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="flex items-center gap-2 font-display text-sm">
          <Smartphone className="size-4 text-primary" /> nativeforge
        </span>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main>
        <section className="grid-lines border-y border-border">
          <div className="mx-auto max-w-6xl px-4 py-24 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              website → flutter → store-ready
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-tight sm:text-6xl">
              Turn any website into a real native app
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground">
              Works with Lovable sites, WordPress, Shopify, Webflow and your own custom domain.
              Customise everything, then download the complete Flutter project — Android APK build
              and iOS build folder included.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  <Terminal className="mr-2 size-4" /> Start building
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">
                  <Download className="mr-2 size-4" /> Get a build package
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-2xl">Everything is editable</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Each setting is written straight into the generated Flutter project, so what you see in
            the console is exactly what ships in the app.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="panel p-5 transition-colors hover:border-primary/50">
                  <Icon className="size-5 text-primary" />
                  <h3 className="mt-4 text-base">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 md:grid-cols-3">
            {[
              { step: "01", title: "Add your website", body: "Paste any address, including custom domains." },
              { step: "02", title: "Customise the app", body: "Icon, splash, permissions, links, add-ons, languages." },
              { step: "03", title: "Download the build", body: "Full Flutter project, ready for the Play Store and App Store." },
            ].map((s) => (
              <div key={s.step} className="panel p-6">
                <span className="font-mono text-xs text-primary">{s.step}</span>
                <h3 className="mt-3 text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Built for people shipping websites as apps.
      </footer>
    </div>
  );
}
