import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import {
  AreaField,
  ColorField,
  ListField,
  Row,
  SectionHeader,
  SelectField,
  TextField,
  ToggleField,
} from "./fields";
import { COMMON_LOCALES, ICON_LIBRARY, type AppConfig } from "@/lib/appConfig";

type Patch = (fn: (c: AppConfig) => AppConfig) => void;

const set = <K extends keyof AppConfig>(key: K, part: Partial<AppConfig[K]>) => (c: AppConfig) => ({
  ...c,
  [key]: { ...(c[key] as object), ...part } as AppConfig[K],
});

export function AppInfoSection({ config, patch }: { config: AppConfig; patch: Patch }) {
  const a = config.appInfo;
  return (
    <div className="space-y-5">
      <SectionHeader title="App Info" hint="Identity and store metadata for the generated app." />
      <Row>
        <TextField label="App name" value={a.appName} onChange={(v) => patch(set("appInfo", { appName: v }))} />
        <TextField label="Short name" value={a.shortName} onChange={(v) => patch(set("appInfo", { shortName: v }))} hint="Shown under the home screen icon" />
      </Row>
      <Row>
        <TextField label="Website URL" value={a.websiteUrl} onChange={(v) => patch(set("appInfo", { websiteUrl: v }))} hint="Works with any platform, including custom domains" />
        <TextField label="Package / bundle ID" value={a.packageId} onChange={(v) => patch(set("appInfo", { packageId: v }))} hint="e.g. com.yourdomain.app" />
      </Row>
      <Row>
        <TextField label="Version name" value={a.versionName} onChange={(v) => patch(set("appInfo", { versionName: v }))} />
        <TextField label="Version code" type="number" value={a.versionCode} onChange={(v) => patch(set("appInfo", { versionCode: Number(v) || 1 }))} />
      </Row>
      <AreaField label="Description" rows={3} value={a.description} onChange={(v) => patch(set("appInfo", { description: v }))} />
      <Row>
        <TextField label="Company" value={a.company} onChange={(v) => patch(set("appInfo", { company: v }))} />
        <TextField label="Support email" value={a.supportEmail} onChange={(v) => patch(set("appInfo", { supportEmail: v }))} />
      </Row>
      <Row>
        <TextField label="Minimum Android SDK" type="number" value={a.minSdk} onChange={(v) => patch(set("appInfo", { minSdk: Number(v) || 23 }))} />
        <TextField label="iOS deployment target" value={a.iosDeploymentTarget} onChange={(v) => patch(set("appInfo", { iosDeploymentTarget: v }))} />
      </Row>
    </div>
  );
}

export function BrandingSection({ config, patch }: { config: AppConfig; patch: Patch }) {
  const b = config.branding;
  return (
    <div className="space-y-5">
      <SectionHeader title="Icon Library & Branding" hint="Upload your own icon or start from the built-in library." />
      <div className="flex gap-2">
        <Button variant={b.iconMode === "library" ? "default" : "outline"} size="sm" onClick={() => patch(set("branding", { iconMode: "library" }))}>Icon library</Button>
        <Button variant={b.iconMode === "upload" ? "default" : "outline"} size="sm" onClick={() => patch(set("branding", { iconMode: "upload" }))}>Use my image</Button>
      </div>

      {b.iconMode === "library" ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {ICON_LIBRARY.map((icon) => (
            <button
              key={icon.key}
              type="button"
              onClick={() => patch(set("branding", { iconLibraryKey: icon.key }))}
              className={`flex aspect-square items-center justify-center rounded-lg border text-2xl transition-colors ${
                b.iconLibraryKey === icon.key
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:bg-accent"
              }`}
              title={icon.label}
            >
              {icon.glyph}
            </button>
          ))}
        </div>
      ) : (
        <TextField label="Icon image URL (1024×1024 PNG)" value={b.iconUrl} onChange={(v) => patch(set("branding", { iconUrl: v }))} hint="Paste a public image link — it gets packaged into the build" />
      )}

      <Row>
        <ColorField label="Icon background" value={b.iconBackground} onChange={(v) => patch(set("branding", { iconBackground: v }))} />
        <ColorField label="Accent colour" value={b.accentColor} onChange={(v) => patch(set("branding", { accentColor: v }))} />
      </Row>
      <Row>
        <ColorField label="Theme colour" value={b.themeColor} onChange={(v) => patch(set("branding", { themeColor: v }))} />
        <SelectField label="Status bar icons" value={b.statusBarStyle} onChange={(v) => patch(set("branding", { statusBarStyle: v as "light" | "dark" }))} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
      </Row>
      <ToggleField label="Adaptive Android icon" checked={b.adaptiveIcon} onChange={(v) => patch(set("branding", { adaptiveIcon: v }))} />
    </div>
  );
}

export function SplashSection({ config, patch }: { config: AppConfig; patch: Patch }) {
  const s = config.splash;
  return (
    <div className="space-y-5">
      <SectionHeader title="Splash / Loading Screen" hint="What people see while the app opens." />
      <ToggleField label="Show splash screen" checked={s.enabled} onChange={(v) => patch(set("splash", { enabled: v }))} />
      <TextField label="Splash logo URL" value={s.logoUrl} onChange={(v) => patch(set("splash", { logoUrl: v }))} hint="Leave empty to reuse the app icon" />
      <Row>
        <ColorField label="Background colour" value={s.backgroundColor} onChange={(v) => patch(set("splash", { backgroundColor: v }))} />
        <ColorField label="Spinner colour" value={s.spinnerColor} onChange={(v) => patch(set("splash", { spinnerColor: v }))} />
      </Row>
      <Row>
        <TextField label="Duration (ms)" type="number" value={s.durationMs} onChange={(v) => patch(set("splash", { durationMs: Number(v) || 0 }))} />
        <TextField label="Tagline" value={s.tagline} onChange={(v) => patch(set("splash", { tagline: v }))} />
      </Row>
      <ToggleField label="Loading spinner" checked={s.showSpinner} onChange={(v) => patch(set("splash", { showSpinner: v }))} />
      <ToggleField label="Fullscreen splash" checked={s.fullscreen} onChange={(v) => patch(set("splash", { fullscreen: v }))} />
    </div>
  );
}

export function PermissionsSection({ config, patch }: { config: AppConfig; patch: Patch }) {
  const p = config.permissions;
  const items: { key: keyof typeof p; label: string; hint: string }[] = [
    { key: "camera", label: "Camera", hint: "Photo capture and QR scanning" },
    { key: "microphone", label: "Microphone", hint: "Voice input and calls" },
    { key: "location", label: "Location", hint: "While using the app" },
    { key: "backgroundLocation", label: "Background location", hint: "Tracking when closed" },
    { key: "storage", label: "Photos & files", hint: "Uploads and downloads" },
    { key: "notifications", label: "Notifications", hint: "Required for push" },
    { key: "contacts", label: "Contacts", hint: "Contact picker" },
    { key: "calendar", label: "Calendar", hint: "Add events" },
    { key: "bluetooth", label: "Bluetooth", hint: "Nearby devices" },
    { key: "biometric", label: "Face ID / fingerprint", hint: "Biometric unlock" },
  ];
  return (
    <div className="space-y-5">
      <SectionHeader title="App Permissions" hint="Only request what the site actually uses — stores reject the rest." />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <ToggleField key={i.key} label={i.label} hint={i.hint} checked={Boolean(p[i.key])} onChange={(v) => patch(set("permissions", { [i.key]: v } as never))} />
        ))}
      </div>
      <AreaField label="Permission explanation" rows={2} value={p.rationale} onChange={(v) => patch(set("permissions", { rationale: v }))} hint="Shown in the iOS permission prompts" />
    </div>
  );
}

export function SettingsSection({ config, patch }: { config: AppConfig; patch: Patch }) {
  const s = config.settings;
  return (
    <div className="space-y-5">
      <SectionHeader title="App Settings" hint="How the app frame behaves around your site." />
      <Row>
        <SelectField label="Orientation" value={s.orientation} onChange={(v) => patch(set("settings", { orientation: v as never }))} options={[{ value: "auto", label: "Auto" }, { value: "portrait", label: "Portrait only" }, { value: "landscape", label: "Landscape only" }]} />
        <SelectField label="Caching" value={s.cacheMode} onChange={(v) => patch(set("settings", { cacheMode: v as never }))} options={[{ value: "default", label: "Default" }, { value: "offline-first", label: "Offline first" }, { value: "network-only", label: "Always fresh" }]} />
      </Row>
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleField label="Fullscreen" checked={s.fullscreen} onChange={(v) => patch(set("settings", { fullscreen: v }))} />
        <ToggleField label="Pull to refresh" checked={s.pullToRefresh} onChange={(v) => patch(set("settings", { pullToRefresh: v }))} />
        <ToggleField label="Pinch zoom" checked={s.zoomEnabled} onChange={(v) => patch(set("settings", { zoomEnabled: v }))} />
        <ToggleField label="Swipe back / forward" checked={s.swipeNavigation} onChange={(v) => patch(set("settings", { swipeNavigation: v }))} />
        <ToggleField label="JavaScript" checked={s.javascriptEnabled} onChange={(v) => patch(set("settings", { javascriptEnabled: v }))} />
        <ToggleField label="Third-party cookies" checked={s.thirdPartyCookies} onChange={(v) => patch(set("settings", { thirdPartyCookies: v }))} />
        <ToggleField label="Desktop site mode" checked={s.desktopMode} onChange={(v) => patch(set("settings", { desktopMode: v }))} />
        <ToggleField label="Confirm before exit" checked={s.confirmExit} onChange={(v) => patch(set("settings", { confirmExit: v }))} />
        <ToggleField label="Keep screen on" checked={s.keepScreenOn} onChange={(v) => patch(set("settings", { keepScreenOn: v }))} />
        <ToggleField label="File uploads" checked={s.fileUploads} onChange={(v) => patch(set("settings", { fileUploads: v }))} />
        <ToggleField label="Downloads" checked={s.downloads} onChange={(v) => patch(set("settings", { downloads: v }))} />
        <ToggleField label="Share location with site" checked={s.geolocationBridge} onChange={(v) => patch(set("settings", { geolocationBridge: v }))} />
      </div>
      <TextField label="User agent suffix" value={s.userAgentSuffix} onChange={(v) => patch(set("settings", { userAgentSuffix: v }))} hint="Lets your site detect the app" />
      <Row>
        <TextField label="Offline title" value={s.offlineTitle} onChange={(v) => patch(set("settings", { offlineTitle: v }))} />
        <TextField label="Offline message" value={s.offlineMessage} onChange={(v) => patch(set("settings", { offlineMessage: v }))} />
      </Row>
    </div>
  );
}

export function LinksSection({ config, patch }: { config: AppConfig; patch: Patch }) {
  const l = config.linkHandling;
  return (
    <div className="space-y-5">
      <SectionHeader title="Link Handling" hint="Decide what opens inside the app and what leaves it." />
      <ListField label="Domains that stay in the app" values={l.internalDomains} onChange={(v) => patch(set("linkHandling", { internalDomains: v }))} placeholder="example.com" hint="Include your custom domain and any subdomains" />
      <ListField label="Blocked URL patterns" values={l.blockedUrlPatterns} onChange={(v) => patch(set("linkHandling", { blockedUrlPatterns: v }))} placeholder="/admin" />
      <Row>
        <TextField label="Deep link scheme" value={l.deepLinkScheme} onChange={(v) => patch(set("linkHandling", { deepLinkScheme: v }))} hint="myapp:// links open the app" />
        <ListField label="Universal link hosts" values={l.universalLinkHosts} onChange={(v) => patch(set("linkHandling", { universalLinkHosts: v }))} />
      </Row>
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleField label="Open other sites in the browser" checked={l.openExternalInBrowser} onChange={(v) => patch(set("linkHandling", { openExternalInBrowser: v }))} />
        <ToggleField label="Keep target=_blank links in-app" checked={l.targetBlankInApp} onChange={(v) => patch(set("linkHandling", { targetBlankInApp: v }))} />
        <ToggleField label="Email links open mail app" checked={l.handleMailto} onChange={(v) => patch(set("linkHandling", { handleMailto: v }))} />
        <ToggleField label="Phone links open dialler" checked={l.handleTel} onChange={(v) => patch(set("linkHandling", { handleTel: v }))} />
        <ToggleField label="WhatsApp links open WhatsApp" checked={l.handleWhatsapp} onChange={(v) => patch(set("linkHandling", { handleWhatsapp: v }))} />
      </div>
    </div>
  );
}

export function OverridesSection({ config, patch }: { config: AppConfig; patch: Patch }) {
  const o = config.overrides;
  return (
    <div className="space-y-5">
      <SectionHeader title="Website Overrides" hint="Change how your site looks and behaves inside the app only." />
      <ListField label="Hide these elements" values={o.hideSelectors} onChange={(v) => patch(set("overrides", { hideSelectors: v }))} placeholder=".site-header" hint="CSS selectors, one per line — great for hiding web navigation" />
      <AreaField label="Custom CSS" value={o.customCss} onChange={(v) => patch(set("overrides", { customCss: v }))} />
      <AreaField label="Custom JavaScript" value={o.customJs} onChange={(v) => patch(set("overrides", { customJs: v }))} />
      <SelectField label="Inject timing" value={o.injectTiming} onChange={(v) => patch(set("overrides", { injectTiming: v as never }))} options={[{ value: "documentStart", label: "Before page loads" }, { value: "documentEnd", label: "After page loads" }]} />
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleField label="Disable text selection" checked={o.disableTextSelection} onChange={(v) => patch(set("overrides", { disableTextSelection: v }))} />
        <ToggleField label="Disable long-press menu" checked={o.disableContextMenu} onChange={(v) => patch(set("overrides", { disableContextMenu: v }))} />
      </div>
    </div>
  );
}

export function AddonsSection({ config, patch }: { config: AppConfig; patch: Patch }) {
  const a = config.addons;
  const updateItem = (i: number, part: Partial<{ label: string; url: string; icon: string }>) =>
    patch((c) => ({
      ...c,
      addons: {
        ...c.addons,
        bottomNavItems: c.addons.bottomNavItems.map((it, idx) => (idx === i ? { ...it, ...part } : it)),
      },
    }));
  return (
    <div className="space-y-5">
      <SectionHeader title="Add-ons" hint="Native extras layered on top of your website." />
      <ToggleField label="Push notifications (Firebase)" checked={a.pushEnabled} onChange={(v) => patch(set("addons", { pushEnabled: v }))} />
      {a.pushEnabled ? (
        <Row>
          <TextField label="Firebase sender ID" value={a.firebaseSenderId} onChange={(v) => patch(set("addons", { firebaseSenderId: v }))} />
          <TextField label="Firebase project ID" value={a.firebaseProjectId} onChange={(v) => patch(set("addons", { firebaseProjectId: v }))} />
        </Row>
      ) : null}
      <ToggleField label="Analytics" checked={a.analyticsEnabled} onChange={(v) => patch(set("addons", { analyticsEnabled: v }))} />
      {a.analyticsEnabled ? <TextField label="Measurement / analytics ID" value={a.analyticsId} onChange={(v) => patch(set("addons", { analyticsId: v }))} /> : null}
      <ToggleField label="AdMob ads" checked={a.admobEnabled} onChange={(v) => patch(set("addons", { admobEnabled: v }))} />
      {a.admobEnabled ? (
        <Row>
          <TextField label="AdMob app ID" value={a.admobAppId} onChange={(v) => patch(set("addons", { admobAppId: v }))} />
          <TextField label="Banner unit ID" value={a.admobBannerId} onChange={(v) => patch(set("addons", { admobBannerId: v }))} />
        </Row>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleField label="Biometric app lock" checked={a.biometricLock} onChange={(v) => patch(set("addons", { biometricLock: v }))} />
        <ToggleField label="Ask for store rating" checked={a.ratingPrompt} onChange={(v) => patch(set("addons", { ratingPrompt: v }))} />
        <ToggleField label="Share button" checked={a.shareButton} onChange={(v) => patch(set("addons", { shareButton: v }))} />
        <ToggleField label="QR scanner" checked={a.qrScanner} onChange={(v) => patch(set("addons", { qrScanner: v }))} />
      </div>
      <ToggleField label="Native bottom navigation" checked={a.bottomNav} onChange={(v) => patch(set("addons", { bottomNav: v }))} />
      {a.bottomNav ? (
        <div className="space-y-2">
          {a.bottomNavItems.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item.label} placeholder="Label" onChange={(e) => updateItem(i, { label: e.target.value })} className="bg-background" />
              <Input value={item.url} placeholder="https://…" onChange={(e) => updateItem(i, { url: e.target.value })} className="bg-background font-mono text-xs" />
              <Button variant="ghost" size="icon" onClick={() => patch((c) => ({ ...c, addons: { ...c.addons, bottomNavItems: c.addons.bottomNavItems.filter((_, idx) => idx !== i) } }))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => patch((c) => ({ ...c, addons: { ...c.addons, bottomNavItems: [...c.addons.bottomNavItems, { label: "Home", url: c.appInfo.websiteUrl, icon: "home" }] } }))}>
            <Plus className="mr-2 size-4" /> Add tab
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function LocalisationSection({ config, patch }: { config: AppConfig; patch: Patch }) {
  const l = config.localization;
  return (
    <div className="space-y-5">
      <SectionHeader title="Language & Localisation" hint="Translate the app shell around your site." />
      <Row>
        <SelectField label="Default language" value={l.defaultLocale} onChange={(v) => patch(set("localization", { defaultLocale: v }))} options={l.locales.map((x) => ({ value: x.code, label: `${x.label} (${x.code})` }))} />
        <div className="space-y-2">
          <ToggleField label="Follow phone language" checked={l.followSystemLocale} onChange={(v) => patch(set("localization", { followSystemLocale: v }))} />
          <ToggleField label="Right-to-left support" checked={l.rtlSupport} onChange={(v) => patch(set("localization", { rtlSupport: v }))} />
        </div>
      </Row>
      <div className="space-y-2">
        {l.locales.map((loc, i) => (
          <div key={loc.code} className="flex items-center gap-2 rounded-md border border-border bg-background/40 p-2">
            <Badge variant="outline" className="font-mono">{loc.code}</Badge>
            <Input value={loc.appName} onChange={(e) => patch((c) => ({ ...c, localization: { ...c.localization, locales: c.localization.locales.map((x, idx) => (idx === i ? { ...x, appName: e.target.value } : x)) } }))} className="bg-background" placeholder="App name in this language" />
            {l.locales.length > 1 ? (
              <Button variant="ghost" size="icon" onClick={() => patch((c) => ({ ...c, localization: { ...c.localization, locales: c.localization.locales.filter((_, idx) => idx !== i) } }))}>
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {COMMON_LOCALES.filter((c) => !l.locales.some((x) => x.code === c.code)).map((c) => (
          <Button key={c.code} variant="outline" size="sm" onClick={() => patch((cfg) => ({ ...cfg, localization: { ...cfg.localization, locales: [...cfg.localization.locales, { code: c.code, label: c.label, appName: cfg.appInfo.appName }] } }))}>
            <Plus className="mr-1 size-3" /> {c.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function EnvSection({ config, patch }: { config: AppConfig; patch: Patch }) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Environment Variables" hint="Values baked into the build. Mark anything private as secret — it is left blank in the download for you to fill in on your build machine." />
      <div className="space-y-2">
        {config.env.map((e, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={e.key} placeholder="KEY" onChange={(ev) => patch((c) => ({ ...c, env: c.env.map((x, idx) => (idx === i ? { ...x, key: ev.target.value.toUpperCase() } : x)) }))} className="bg-background font-mono text-xs" />
            <Input value={e.value} placeholder="value" onChange={(ev) => patch((c) => ({ ...c, env: c.env.map((x, idx) => (idx === i ? { ...x, value: ev.target.value } : x)) }))} className="bg-background font-mono text-xs" />
            <Button variant={e.secret ? "default" : "outline"} size="sm" onClick={() => patch((c) => ({ ...c, env: c.env.map((x, idx) => (idx === i ? { ...x, secret: !x.secret } : x)) }))}>
              {e.secret ? "Secret" : "Public"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => patch((c) => ({ ...c, env: c.env.filter((_, idx) => idx !== i) }))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => patch((c) => ({ ...c, env: [...c.env, { key: "", value: "", secret: false }] }))}>
        <Plus className="mr-2 size-4" /> Add variable
      </Button>
    </div>
  );
}
