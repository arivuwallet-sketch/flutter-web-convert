import { useEffect, useMemo, useRef, useState } from "react";
import { ICON_LIBRARY, type AppConfig } from "@/lib/appConfig";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Sparkles,
  Wifi,
} from "lucide-react";

type Device = "android" | "ios";

const FRAME = {
  android: { w: 360, h: 760, radius: 30, label: "Pixel · Android 14" },
  ios: { w: 375, h: 812, radius: 44, label: "iPhone · iOS 17" },
} as const;

function iconGlyph(config: AppConfig) {
  return ICON_LIBRARY.find((i) => i.key === config.branding.iconLibraryKey)?.glyph ?? "📱";
}

function AppIcon({ config, size }: { config: AppConfig; size: number }) {
  const style = { width: size, height: size, backgroundColor: config.branding.iconBackground };
  if (config.branding.iconMode === "upload" && config.branding.iconUrl) {
    return (
      <img
        src={config.branding.iconUrl}
        alt=""
        className="rounded-[22%] object-cover"
        style={style}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-[22%]"
      style={{ ...style, fontSize: size * 0.5 }}
    >
      {iconGlyph(config)}
    </div>
  );
}

function StatusBar({ config, device }: { config: AppConfig; device: Device }) {
  const light = config.branding.statusBarStyle === "light";
  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 text-[10px] font-medium"
      style={{
        backgroundColor: config.branding.themeColor,
        color: light ? "#ffffff" : "#111111",
      }}
    >
      <span>9:41</span>
      {device === "ios" ? <span className="h-1 w-16 rounded-full bg-current opacity-40" /> : null}
      <span className="flex items-center gap-1">
        <Wifi className="size-3" />
        <span>100%</span>
      </span>
    </div>
  );
}

function Splash({ config }: { config: AppConfig }) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: config.splash.backgroundColor }}
    >
      {config.splash.logoUrl ? (
        <img src={config.splash.logoUrl} alt="" className="size-20 object-contain" />
      ) : (
        <AppIcon config={config} size={80} />
      )}
      {config.splash.tagline ? (
        <p className="px-6 text-center text-xs" style={{ color: config.branding.accentColor }}>
          {config.splash.tagline}
        </p>
      ) : null}
      {config.splash.showSpinner ? (
        <Loader2 className="size-5 animate-spin" style={{ color: config.splash.spinnerColor }} />
      ) : null}
    </div>
  );
}

function BottomNav({ config }: { config: AppConfig }) {
  return (
    <div
      className="flex items-center justify-around border-t px-2 py-2"
      style={{ backgroundColor: config.branding.themeColor, borderColor: "rgba(255,255,255,0.12)" }}
    >
      {config.addons.bottomNavItems.slice(0, 5).map((item, i) => (
        <div
          key={`${item.label}-${i}`}
          className="flex flex-col items-center gap-0.5 text-[9px]"
          style={{
            color: i === 0 ? config.branding.accentColor : "rgba(255,255,255,0.65)",
          }}
        >
          <span className="text-sm leading-none">{item.icon || "•"}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DevicePreview({ config }: { config: AppConfig }) {
  const [device, setDevice] = useState<Device>("android");
  const [landscape, setLandscape] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const url = config.appInfo.websiteUrl;
  const forcePortrait = config.settings.orientation === "portrait";
  const forceLandscape = config.settings.orientation === "landscape";
  const isLandscape = forceLandscape || (landscape && !forcePortrait);

  const size = useMemo(() => {
    const base = FRAME[device];
    return isLandscape ? { ...base, w: base.h, h: base.w } : base;
  }, [device, isLandscape]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLoaded(false);
    setBlocked(false);
    if (config.splash.enabled) {
      setSplashVisible(true);
      timers.current.push(
        setTimeout(() => setSplashVisible(false), Math.min(config.splash.durationMs, 6000)),
      );
    } else {
      setSplashVisible(false);
    }
    timers.current.push(setTimeout(() => setBlocked((b) => (loadedRef.current ? b : true)), 6000));
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, url, config.splash.enabled, config.splash.durationMs]);

  const loadedRef = useRef(false);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  const scale = Math.min(1, 620 / size.h);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg">Live Preview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          See your website running inside the app shell, with your splash screen, colours and
          bottom tabs applied.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border p-1">
          {(["android", "ios"] as Device[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`rounded px-3 py-1.5 text-xs transition-colors ${
                device === d ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d === "android" ? "Android" : "iPhone"}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLandscape((v) => !v)}
          disabled={forcePortrait || forceLandscape}
        >
          <RotateCcw className="mr-2 size-4" /> {isLandscape ? "Portrait" : "Landscape"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCw className="mr-2 size-4" /> Reload
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSplashVisible(true);
            setTimeout(() => setSplashVisible(false), Math.min(config.splash.durationMs, 6000));
          }}
          disabled={!config.splash.enabled}
        >
          <Sparkles className="mr-2 size-4" /> Replay splash
        </Button>
      </div>

      <div className="flex justify-center overflow-hidden rounded-lg border border-border bg-background p-6">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
          <div
            className="relative overflow-hidden border-[10px] border-neutral-800 bg-black shadow-2xl"
            style={{
              width: size.w,
              height: size.h,
              borderRadius: FRAME[device].radius,
            }}
          >
            {!config.settings.fullscreen ? <StatusBar config={config} device={device} /> : null}

            <div className="relative flex-1 bg-white" style={{ height: "100%" }}>
              {splashVisible ? <Splash config={config} /> : null}

              {blocked && !loaded ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center">
                  <Smartphone className="size-6 text-primary" />
                  <p className="text-xs text-neutral-300">
                    This site refuses to be shown inside a preview window. It will still load
                    normally in the real app.
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary underline"
                  >
                    Open the site <ExternalLink className="size-3" />
                  </a>
                </div>
              ) : null}

              <iframe
                key={`${reloadKey}-${url}`}
                src={url}
                title="App preview"
                onLoad={() => {
                  setLoaded(true);
                  setBlocked(false);
                }}
                className="size-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                referrerPolicy="no-referrer"
              />
            </div>

            {config.addons.bottomNav && config.addons.bottomNavItems.length > 0 ? (
              <div className="absolute inset-x-0 bottom-0">
                <BottomNav config={config} />
              </div>
            ) : null}

            {device === "ios" ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
                <span className="h-1 w-28 rounded-full bg-neutral-500/70" />
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
            {FRAME[device].label} · {size.w}×{size.h}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Note: custom CSS and JavaScript overrides cannot run in this browser preview for security
        reasons — they are applied in the generated app.
      </p>
    </div>
  );
}
