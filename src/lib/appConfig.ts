// Browser-safe app configuration model shared by the editor and the generator.

export type Orientation = "auto" | "portrait" | "landscape";
export type CacheMode = "default" | "offline-first" | "network-only";
export type StatusBarStyle = "light" | "dark";

export interface LocaleEntry {
  code: string;
  label: string;
  appName: string;
}

export interface EnvEntry {
  key: string;
  value: string;
  secret: boolean;
}

export interface AppConfig {
  appInfo: {
    appName: string;
    shortName: string;
    packageId: string;
    versionName: string;
    versionCode: number;
    websiteUrl: string;
    description: string;
    company: string;
    supportEmail: string;
    minSdk: number;
    iosDeploymentTarget: string;
  };
  branding: {
    iconMode: "upload" | "library";
    iconUrl: string;
    iconLibraryKey: string;
    iconBackground: string;
    adaptiveIcon: boolean;
    themeColor: string;
    accentColor: string;
    statusBarStyle: StatusBarStyle;
  };
  splash: {
    enabled: boolean;
    logoUrl: string;
    backgroundColor: string;
    durationMs: number;
    showSpinner: boolean;
    spinnerColor: string;
    tagline: string;
    fullscreen: boolean;
  };
  permissions: {
    camera: boolean;
    microphone: boolean;
    location: boolean;
    backgroundLocation: boolean;
    storage: boolean;
    notifications: boolean;
    contacts: boolean;
    calendar: boolean;
    bluetooth: boolean;
    biometric: boolean;
    rationale: string;
  };
  settings: {
    orientation: Orientation;
    fullscreen: boolean;
    pullToRefresh: boolean;
    zoomEnabled: boolean;
    swipeNavigation: boolean;
    javascriptEnabled: boolean;
    thirdPartyCookies: boolean;
    desktopMode: boolean;
    userAgentSuffix: string;
    cacheMode: CacheMode;
    offlineTitle: string;
    offlineMessage: string;
    confirmExit: boolean;
    keepScreenOn: boolean;
    fileUploads: boolean;
    downloads: boolean;
    geolocationBridge: boolean;
  };
  linkHandling: {
    internalDomains: string[];
    openExternalInBrowser: boolean;
    blockedUrlPatterns: string[];
    deepLinkScheme: string;
    universalLinkHosts: string[];
    handleMailto: boolean;
    handleTel: boolean;
    handleWhatsapp: boolean;
    targetBlankInApp: boolean;
  };
  overrides: {
    customCss: string;
    customJs: string;
    hideSelectors: string[];
    injectTiming: "documentStart" | "documentEnd";
    blockAds: boolean;
    disableTextSelection: boolean;
    disableContextMenu: boolean;
  };
  addons: {
    pushEnabled: boolean;
    firebaseSenderId: string;
    firebaseProjectId: string;
    analyticsEnabled: boolean;
    analyticsId: string;
    admobEnabled: boolean;
    admobAppId: string;
    admobBannerId: string;
    biometricLock: boolean;
    ratingPrompt: boolean;
    shareButton: boolean;
    qrScanner: boolean;
    bottomNav: boolean;
    bottomNavItems: { label: string; url: string; icon: string }[];
  };
  localization: {
    defaultLocale: string;
    locales: LocaleEntry[];
    rtlSupport: boolean;
    followSystemLocale: boolean;
  };
  env: EnvEntry[];
}

export const ICON_LIBRARY = [
  { key: "rocket", label: "Rocket", glyph: "🚀" },
  { key: "globe", label: "Globe", glyph: "🌐" },
  { key: "bolt", label: "Bolt", glyph: "⚡" },
  { key: "cart", label: "Store", glyph: "🛍️" },
  { key: "chat", label: "Chat", glyph: "💬" },
  { key: "news", label: "News", glyph: "📰" },
  { key: "music", label: "Music", glyph: "🎵" },
  { key: "camera", label: "Photo", glyph: "📷" },
  { key: "fitness", label: "Fitness", glyph: "🏋️" },
  { key: "food", label: "Food", glyph: "🍔" },
  { key: "finance", label: "Finance", glyph: "📈" },
  { key: "school", label: "Learning", glyph: "🎓" },
  { key: "travel", label: "Travel", glyph: "✈️" },
  { key: "health", label: "Health", glyph: "🩺" },
  { key: "game", label: "Game", glyph: "🎮" },
  { key: "tools", label: "Tools", glyph: "🧰" },
];

export const COMMON_LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ru", label: "Russian" },
  { code: "id", label: "Indonesian" },
];

export function hostnameOf(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return "";
  }
}

export function slugToPackageId(name: string, url: string): string {
  const host = hostnameOf(url);
  const parts = host.split(".").filter(Boolean).reverse();
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = parts.length ? parts.map(clean).filter(Boolean) : ["app", "lovable"];
  const last = clean(name) || "app";
  const segments = [...base.slice(0, 2), last].filter(Boolean);
  return segments.join(".").replace(/^(\d)/, "a$1");
}

export function defaultConfig(name: string, websiteUrl: string): AppConfig {
  const host = hostnameOf(websiteUrl);
  return {
    appInfo: {
      appName: name,
      shortName: name.slice(0, 12),
      packageId: slugToPackageId(name, websiteUrl),
      versionName: "1.0.0",
      versionCode: 1,
      websiteUrl: websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`,
      description: `${name} mobile app`,
      company: "",
      supportEmail: "",
      minSdk: 23,
      iosDeploymentTarget: "13.0",
    },
    branding: {
      iconMode: "library",
      iconUrl: "",
      iconLibraryKey: "rocket",
      iconBackground: "#0B0E14",
      adaptiveIcon: true,
      themeColor: "#0B0E14",
      accentColor: "#22D3A5",
      statusBarStyle: "light",
    },
    splash: {
      enabled: true,
      logoUrl: "",
      backgroundColor: "#0B0E14",
      durationMs: 1600,
      showSpinner: true,
      spinnerColor: "#22D3A5",
      tagline: "",
      fullscreen: true,
    },
    permissions: {
      camera: false,
      microphone: false,
      location: false,
      backgroundLocation: false,
      storage: true,
      notifications: true,
      contacts: false,
      calendar: false,
      bluetooth: false,
      biometric: false,
      rationale: "This app needs the selected permissions to work correctly.",
    },
    settings: {
      orientation: "auto",
      fullscreen: false,
      pullToRefresh: true,
      zoomEnabled: false,
      swipeNavigation: true,
      javascriptEnabled: true,
      thirdPartyCookies: true,
      desktopMode: false,
      userAgentSuffix: `${name.replace(/\s+/g, "")}App`,
      cacheMode: "default",
      offlineTitle: "You are offline",
      offlineMessage: "Check your internet connection and try again.",
      confirmExit: true,
      keepScreenOn: false,
      fileUploads: true,
      downloads: true,
      geolocationBridge: false,
    },
    linkHandling: {
      internalDomains: host ? [host] : [],
      openExternalInBrowser: true,
      blockedUrlPatterns: [],
      deepLinkScheme: (name.toLowerCase().replace(/[^a-z0-9]/g, "") || "app").slice(0, 16),
      universalLinkHosts: host ? [host] : [],
      handleMailto: true,
      handleTel: true,
      handleWhatsapp: true,
      targetBlankInApp: true,
    },
    overrides: {
      customCss: "",
      customJs: "",
      hideSelectors: [],
      injectTiming: "documentEnd",
      blockAds: false,
      disableTextSelection: false,
      disableContextMenu: false,
    },
    addons: {
      pushEnabled: false,
      firebaseSenderId: "",
      firebaseProjectId: "",
      analyticsEnabled: false,
      analyticsId: "",
      admobEnabled: false,
      admobAppId: "",
      admobBannerId: "",
      biometricLock: false,
      ratingPrompt: false,
      shareButton: true,
      qrScanner: false,
      bottomNav: false,
      bottomNavItems: [],
    },
    localization: {
      defaultLocale: "en",
      locales: [{ code: "en", label: "English", appName: name }],
      rtlSupport: false,
      followSystemLocale: true,
    },
    env: [],
  };
}

/** Deep-merge a stored (possibly older) config onto current defaults. */
export function mergeConfig(name: string, url: string, stored: unknown): AppConfig {
  const base = defaultConfig(name, url) as unknown as Record<string, unknown>;
  if (!stored || typeof stored !== "object") return base as unknown as AppConfig;
  const src = stored as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    const b = base[key];
    const s = src[key];
    if (s === undefined) continue;
    if (Array.isArray(b) || Array.isArray(s)) {
      out[key] = s;
    } else if (b && typeof b === "object" && s && typeof s === "object") {
      out[key] = { ...(b as object), ...(s as object) };
    } else {
      out[key] = s;
    }
  }
  return out as unknown as AppConfig;
}
