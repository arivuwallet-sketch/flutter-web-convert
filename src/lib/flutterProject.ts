// Pure generator: AppConfig -> a complete Flutter project as a file map.
// Browser-safe (no node APIs) so the editor can preview any file.

import { validateConfig, type AppConfig } from "./appConfig.ts";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
const xml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const dartStr = (s: string) => `'${esc(s).replace(/\$/g, "\\$").replace(/\r/g, "\\r")}'`;
const dartList = (a: string[]) => `[${a.map(dartStr).join(", ")}]`;
const hexToDart = (hex: string) => {
  const h = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  return `Color(0xFF${h.toUpperCase()})`;
};

export function packagePath(packageId: string) {
  return packageId.split(".").join("/");
}

function androidPermissions(c: AppConfig): string[] {
  const p = c.permissions;
  const list = ["android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE"];
  if (p.camera) list.push("android.permission.CAMERA");
  if (p.microphone) list.push("android.permission.RECORD_AUDIO");
  if (p.location) {
    list.push(
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
    );
  }
  if (p.backgroundLocation) list.push("android.permission.ACCESS_BACKGROUND_LOCATION");
  if (p.storage) {
    list.push("android.permission.READ_MEDIA_IMAGES", "android.permission.READ_MEDIA_VIDEO");
  }
  if (p.notifications) list.push("android.permission.POST_NOTIFICATIONS");
  if (p.contacts) list.push("android.permission.READ_CONTACTS");
  if (p.calendar) list.push("android.permission.READ_CALENDAR");
  if (p.bluetooth) list.push("android.permission.BLUETOOTH_CONNECT");
  if (p.biometric || c.addons.biometricLock) list.push("android.permission.USE_BIOMETRIC");
  if (c.settings.keepScreenOn) list.push("android.permission.WAKE_LOCK");
  if (c.settings.downloads) list.push("android.permission.WRITE_EXTERNAL_STORAGE");
  return [...new Set(list)];
}

function iosUsageKeys(c: AppConfig): Record<string, string> {
  const p = c.permissions;
  const r = c.permissions.rationale;
  const keys: Record<string, string> = {};
  if (p.camera) keys["NSCameraUsageDescription"] = r;
  if (p.microphone) keys["NSMicrophoneUsageDescription"] = r;
  if (p.location) keys["NSLocationWhenInUseUsageDescription"] = r;
  if (p.backgroundLocation) keys["NSLocationAlwaysAndWhenInUseUsageDescription"] = r;
  if (p.storage) keys["NSPhotoLibraryUsageDescription"] = r;
  if (p.contacts) keys["NSContactsUsageDescription"] = r;
  if (p.calendar) keys["NSCalendarsUsageDescription"] = r;
  if (p.bluetooth) keys["NSBluetoothAlwaysUsageDescription"] = r;
  if (p.biometric || c.addons.biometricLock) keys["NSFaceIDUsageDescription"] = r;
  return keys;
}

function pubspec(c: AppConfig): string {
  const deps = [
    "  flutter:",
    "    sdk: flutter",
    "  flutter_localizations:",
    "    sdk: flutter",
    // Keep this set mutually compatible: share_plus 13.x and package_info_plus
    // 10.x both pin win32 ^6.0.1, so they must be bumped together.
    "  webview_flutter: ^4.14.1",
    "  webview_flutter_android: ^4.14.1",
    "  webview_flutter_wkwebview: ^3.26.1",
    "  connectivity_plus: ^7.3.1",
    "  url_launcher: ^6.3.2",
    "  shared_preferences: ^2.5.5",
    "  package_info_plus: ^10.2.1",
    "  intl: any",
    "  http: ^1.6.0",
  ];
  if (c.addons.shareButton) deps.push("  share_plus: ^13.3.0");
  if (c.addons.pushEnabled || c.addons.analyticsEnabled) deps.push("  firebase_core: ^4.15.0");
  if (c.addons.pushEnabled) deps.push("  firebase_messaging: ^16.7.0");
  if (c.addons.analyticsEnabled) deps.push("  firebase_analytics: ^12.6.0");
  if (c.addons.admobEnabled) deps.push("  google_mobile_ads: ^9.1.0");
  if (c.addons.biometricLock || c.permissions.biometric) deps.push("  local_auth: ^3.0.2");
  if (c.addons.ratingPrompt) deps.push("  in_app_review: ^2.0.12");
  if (c.addons.qrScanner) deps.push("  mobile_scanner: ^7.4.2");
  if (c.permissions.location || c.settings.geolocationBridge) deps.push("  geolocator: ^14.0.3");
  if (c.settings.fileUploads) deps.push("  file_selector: ^1.1.0");
  if (c.settings.downloads) deps.push("  path_provider: ^2.1.6");
  deps.push("  permission_handler: ^13.0.2");

  return `name: ${c.appInfo.packageId.split(".").pop() || "webapp"}_app
description: ${JSON.stringify(c.appInfo.description || c.appInfo.appName)}
publish_to: "none"
version: ${c.appInfo.versionName}+${c.appInfo.versionCode}

environment:
  sdk: ">=3.13.0 <4.0.0"

dependencies:
${deps.join("\n")}

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^6.0.0
  flutter_launcher_icons: ^0.14.4
  flutter_native_splash: ^2.4.8

flutter:
  uses-material-design: true
  assets:
    - assets/
    - assets/config/

flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/icon.png"
  adaptive_icon_background: "${c.branding.iconBackground}"
  adaptive_icon_foreground: "assets/icon.png"

flutter_native_splash:
  color: "${c.splash.backgroundColor}"
  image: assets/splash.png
  android_12:
    color: "${c.splash.backgroundColor}"
    image: assets/splash.png
`;
}

function appConfigDart(c: AppConfig, liveConfigUrl: string): string {
  const l = c.linkHandling;
  const s = c.settings;
  return `// GENERATED FILE - edit values here or regenerate from the web console.
import 'package:flutter/material.dart';

class AppConfig {
  static const String appName = ${dartStr(c.appInfo.appName)};
  static const String packageId = ${dartStr(c.appInfo.packageId)};
  static const String startUrl = ${dartStr(c.appInfo.websiteUrl)};
  static const String versionName = ${dartStr(c.appInfo.versionName)};
  static const int versionCode = ${c.appInfo.versionCode};

  // Live sync: the app pulls the latest settings from this endpoint on launch
  // and every time it returns to the foreground.
  static const String liveConfigUrl = ${dartStr(liveConfigUrl)};
  static const bool liveSync = ${liveConfigUrl ? "true" : "false"};


  // Branding
  static const Color themeColor = ${hexToDart(c.branding.themeColor)};
  static const Color accentColor = ${hexToDart(c.branding.accentColor)};
  static const bool lightStatusBarIcons = ${c.branding.statusBarStyle === "light"};

  // Splash
  static const bool splashEnabled = ${c.splash.enabled};
  static const Color splashBackground = ${hexToDart(c.splash.backgroundColor)};
  static const Color splashSpinnerColor = ${hexToDart(c.splash.spinnerColor)};
  static const int splashDurationMs = ${c.splash.durationMs};
  static const bool splashSpinner = ${c.splash.showSpinner};
  static const String splashTagline = ${dartStr(c.splash.tagline)};

  // Web view settings
  static const String orientation = ${dartStr(s.orientation)};
  static const bool fullscreen = ${s.fullscreen};
  static const bool pullToRefresh = ${s.pullToRefresh};
  static const bool zoomEnabled = ${s.zoomEnabled};
  static const bool swipeNavigation = ${s.swipeNavigation};
  static const bool javascriptEnabled = ${s.javascriptEnabled};
  static const bool thirdPartyCookies = ${s.thirdPartyCookies};
  static const bool desktopMode = ${s.desktopMode};
  static const String userAgentSuffix = ${dartStr(s.userAgentSuffix)};
  static const String cacheMode = ${dartStr(s.cacheMode)};
  static const String offlineTitle = ${dartStr(s.offlineTitle)};
  static const String offlineMessage = ${dartStr(s.offlineMessage)};
  static const bool confirmExit = ${s.confirmExit};
  static const bool keepScreenOn = ${s.keepScreenOn};
  static const bool fileUploads = ${s.fileUploads};
  static const bool downloads = ${s.downloads};

  // Link handling
  static const List<String> internalDomains = ${dartList(l.internalDomains)};
  static const bool openExternalInBrowser = ${l.openExternalInBrowser};
  static const List<String> blockedUrlPatterns = ${dartList(l.blockedUrlPatterns)};
  static const String deepLinkScheme = ${dartStr(l.deepLinkScheme)};
  static const List<String> universalLinkHosts = ${dartList(l.universalLinkHosts)};
  static const bool handleMailto = ${l.handleMailto};
  static const bool handleTel = ${l.handleTel};
  static const bool handleWhatsapp = ${l.handleWhatsapp};

  // Overrides
  static const String customCss = ${dartStr(c.overrides.customCss)};
  static const String customJs = ${dartStr(c.overrides.customJs)};
  static const List<String> hideSelectors = ${dartList(c.overrides.hideSelectors)};
  static const String injectTiming = ${dartStr(c.overrides.injectTiming)};
  static const bool disableTextSelection = ${c.overrides.disableTextSelection};
  static const bool disableContextMenu = ${c.overrides.disableContextMenu};

  // Add-ons
  static const bool pushEnabled = ${c.addons.pushEnabled};
  static const bool analyticsEnabled = ${c.addons.analyticsEnabled};
  static const String analyticsId = ${dartStr(c.addons.analyticsId)};
  static const bool admobEnabled = ${c.addons.admobEnabled};
  static const String admobBannerId = ${dartStr(c.addons.admobBannerId)};
  static const bool biometricLock = ${c.addons.biometricLock};
  static const bool ratingPrompt = ${c.addons.ratingPrompt};
  static const bool shareButton = ${c.addons.shareButton};
  static const bool qrScanner = ${c.addons.qrScanner};
  static const bool bottomNav = ${c.addons.bottomNav};
  static const List<Map<String, String>> bottomNavItems = [
${c.addons.bottomNavItems
  .map(
    (i) =>
      `    {'label': ${dartStr(i.label)}, 'url': ${dartStr(i.url)}, 'icon': ${dartStr(i.icon)}},`,
  )
  .join("\n")}
  ];

  // Localization
  static const String defaultLocale = ${dartStr(c.localization.defaultLocale)};
  static const bool followSystemLocale = ${c.localization.followSystemLocale};
  static const List<String> supportedLocales = ${dartList(c.localization.locales.map((x) => x.code))};

  // Environment values injected at build time
  static const Map<String, String> env = {
${c.env
  .filter((e) => e.key)
  .map((e) => `    ${dartStr(e.key)}: ${dartStr(e.secret ? "" : e.value)},`)
  .join("\n")}
  };
}
`;
}

function injectionDart(c: AppConfig): string {
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
      ? "document.querySelectorAll('a[target=\\\"_blank\\\"]').forEach(function(a){a.removeAttribute('target');});"
      : "",
    c.overrides.customJs,
  ]
    .filter(Boolean)
    .join("\n");

  return `// GENERATED FILE - website overrides injected into the web view.
import 'dart:convert';

class WebOverrides {
  static const String css = ${dartStr(css)};
  static const String js = ${dartStr(js)};

  static String script() => scriptFor(css, js);

  /// Builds the injection script for the given css/js. Live-synced overrides
  /// pass the freshly downloaded values here.
  static String scriptFor(String cssIn, String jsIn) {
    final buffer = StringBuffer();
    {
      buffer.writeln("(function(){var s=document.getElementById('nativeforge-style');"
          "if(!s){s=document.createElement('style');s.id='nativeforge-style';document.head.appendChild(s);}"
          "s.textContent=" + jsonEncode(cssIn) + ";})();");
    }
    if (jsIn.isNotEmpty) {
      buffer.writeln(jsIn);
    }
    return buffer.toString();
  }
}
`;
}

function stringsDart(c: AppConfig): string {
  return `// GENERATED FILE - localisation strings.
class AppStrings {
  static const Map<String, Map<String, String>> values = {
${c.localization.locales
  .map(
    (l) => `    ${dartStr(l.code)}: {
      'appName': ${dartStr(l.appName)},
      'offlineTitle': ${dartStr(c.settings.offlineTitle)},
      'offlineMessage': ${dartStr(c.settings.offlineMessage)},
      'retry': 'Retry',
      'exitTitle': 'Leave app?',
      'exitMessage': 'Do you want to close the app?',
    },`,
  )
  .join("\n")}
  };

  static String t(String locale, String key) {
    final table = values[locale] ?? values[${dartStr(c.localization.defaultLocale)}] ?? const {};
    return table[key] ?? key;
  }
}
`;
}

function liveConfigDart(): string {
  return `// GENERATED FILE - over-the-air settings sync.
// Downloads the latest app settings published from the web console and caches
// them on the device, so edits appear in the installed Android/iOS app without
// rebuilding or resubmitting to the stores.
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'app_config.dart';
import 'web_overrides.dart';

class Live {
  static const String _prefsKey = 'live_config_v1';
  static Map<String, dynamic> _data = <String, dynamic>{};
  static String _raw = '';

  /// Loads the last downloaded settings from disk (instant, offline safe).
  static Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(_prefsKey);
      if (cached != null && cached.isNotEmpty) {
        _raw = cached;
        _data = jsonDecode(cached) as Map<String, dynamic>;
      }
    } catch (_) {
      _data = <String, dynamic>{};
    }
  }

  /// Fetches the newest settings. Returns true when something actually changed.
  static Future<bool> refresh() async {
    if (!AppConfig.liveSync) return false;
    try {
      final res = await http
          .get(Uri.parse(AppConfig.liveConfigUrl), headers: {
            'accept': 'application/json',
            'cache-control': 'no-cache',
          })
          .timeout(const Duration(seconds: 10));
      if (res.statusCode != 200) return false;
      final body = res.body;
      final parsed = jsonDecode(body);
      if (parsed is! Map<String, dynamic>) return false;
      if (body == _raw) return false;
      _raw = body;
      _data = parsed;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, body);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Preserve signed URLs, repeated query parameters and website routing.
  static String freshUrl(String url) => url;

  static String _s(String key, String fallback) {
    final value = _data[key];
    return value is String ? value : fallback;
  }

  static bool _b(String key, bool fallback) {
    final value = _data[key];
    return value is bool ? value : fallback;
  }

  static int _i(String key, int fallback) {
    final value = _data[key];
    return value is num ? value.toInt() : fallback;
  }

  static Color _c(String key, Color fallback) {
    final value = _data[key];
    if (value is String) {
      final hex = value.replaceAll('#', '');
      if (hex.length >= 6) {
        final parsed = int.tryParse(hex.substring(0, 6), radix: 16);
        if (parsed != null) return Color(0xFF000000 | parsed);
      }
    }
    return fallback;
  }

  static List<String> _l(String key, List<String> fallback) {
    final value = _data[key];
    if (value is List) return value.whereType<String>().toList();
    return fallback;
  }

  static String get startUrl {
    final value = _s('startUrl', AppConfig.startUrl);
    final uri = Uri.tryParse(value);
    return uri != null && uri.scheme == 'https' && uri.host.isNotEmpty
        ? value : AppConfig.startUrl;
  }
  static Color get themeColor => _c('themeColor', AppConfig.themeColor);
  static Color get accentColor => _c('accentColor', AppConfig.accentColor);
  static Color get splashBackground =>
      _c('splashBackground', AppConfig.splashBackground);
  static String get splashTagline => _s('splashTagline', AppConfig.splashTagline);
  static int get splashDurationMs =>
      _i('splashDurationMs', AppConfig.splashDurationMs);
  static String get customCss => _s('customCss', WebOverrides.css);
  static String get customJs => _s('customJs', WebOverrides.js);
  static List<String> get internalDomains =>
      _l('internalDomains', AppConfig.internalDomains);
  static List<String> get blockedUrlPatterns =>
      _l('blockedUrlPatterns', AppConfig.blockedUrlPatterns);
  static bool get bottomNav => _b('bottomNav', AppConfig.bottomNav);

  static List<Map<String, String>> get bottomNavItems {
    final value = _data['bottomNavItems'];
    if (value is List) {
      final items = value
          .whereType<Map>()
          .map((item) => {
                'label': (item['label'] ?? '').toString(),
                'url': (item['url'] ?? '').toString(),
                'icon': (item['icon'] ?? '').toString(),
              })
          .where((item) => item['url']!.isNotEmpty)
          .toList();
      return items;
    }
    return AppConfig.bottomNavItems
        .map((item) => Map<String, String>.from(item))
        .toList();
  }
}
`;
}

function mainDart(c: AppConfig): string {
  return `import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
${c.settings.fileUploads ? "import 'package:file_selector/file_selector.dart';\n" : ""}
${c.addons.shareButton ? "import 'package:share_plus/share_plus.dart';\n" : ""}${c.addons.pushEnabled || c.addons.analyticsEnabled ? "import 'package:firebase_core/firebase_core.dart';\n" : ""}${c.addons.pushEnabled ? "import 'package:firebase_messaging/firebase_messaging.dart';\n" : ""}${c.addons.biometricLock ? "import 'package:local_auth/local_auth.dart';\n" : ""}import 'app_config.dart';
import 'live_config.dart';
import 'web_overrides.dart';
import 'strings.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Live.load();
${c.addons.pushEnabled || c.addons.analyticsEnabled ? "  await Firebase.initializeApp();\n" : ""}${c.addons.pushEnabled ? "  await FirebaseMessaging.instance.requestPermission();\n" : ""}  if (AppConfig.orientation == 'portrait') {
    await SystemChrome.setPreferredOrientations(
      [DeviceOrientation.portraitUp, DeviceOrientation.portraitDown],
    );
  } else if (AppConfig.orientation == 'landscape') {
    await SystemChrome.setPreferredOrientations(
      [DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight],
    );
  }
  if (AppConfig.fullscreen) {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }
  SystemChrome.setSystemUIOverlayStyle(
    AppConfig.lightStatusBarIcons
        ? SystemUiOverlayStyle.light
        : SystemUiOverlayStyle.dark,
  );
  runApp(const WebApp());
}

class WebApp extends StatelessWidget {
  const WebApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Live.accentColor,
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: Live.themeColor,
      ),
      home: AppConfig.splashEnabled ? const SplashScreen() : const WebHome(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Timer(Duration(milliseconds: Live.splashDurationMs), () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(builder: (_) => const WebHome()),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Live.splashBackground,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset('assets/splash.png', width: 140, height: 140),
            const SizedBox(height: 24),
            if (Live.splashTagline.isNotEmpty)
              Text(
                Live.splashTagline,
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
            const SizedBox(height: 20),
            if (AppConfig.splashSpinner)
              CircularProgressIndicator(color: AppConfig.splashSpinnerColor),
          ],
        ),
      ),
    );
  }
}

class WebHome extends StatefulWidget {
  const WebHome({super.key});

  @override
  State<WebHome> createState() => _WebHomeState();
}

class _WebHomeState extends State<WebHome> with WidgetsBindingObserver {
  late final WebViewController _controller;
  bool _offline = false;
  bool _loading = true;
  int _navIndex = 0;
  String _locale = AppConfig.defaultLocale;
  Timer? _syncTimer;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _syncing = false;
  bool _pageError = false;
  bool _unlocked = !AppConfig.biometricLock;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setupLocale();
    _setupController();
    _setupConnectivity();
    _startLiveSync();
${c.addons.biometricLock ? "    _authenticate();\n" : ""}  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    _connectivitySubscription?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_syncLive());
    }
  }

  /// Pulls the newest settings published from the web console and applies them
  /// immediately - no reinstall, no store update.
  void _startLiveSync() {
    if (!AppConfig.liveSync) return;
    _syncLive();
    _syncTimer = Timer.periodic(const Duration(seconds: 60), (_) => _syncLive());
  }

  Future<void> _syncLive() async {
    if (!AppConfig.liveSync || !_unlocked || _syncing ||
        WidgetsBinding.instance.lifecycleState == AppLifecycleState.paused) return;
    _syncing = true;
    final previousUrl = Live.startUrl;
    try {
      final changed = await Live.refresh();
      if (!changed || !mounted) return;
      setState(() { _navIndex = 0; });
      if (previousUrl != Live.startUrl) {
        await _controller.loadRequest(Uri.parse(Live.startUrl));
      } else {
        _inject();
      }
    } finally {
      _syncing = false;
    }
  }


  void _setupLocale() {
    if (!AppConfig.followSystemLocale) return;
    final system =
        WidgetsBinding.instance.platformDispatcher.locale.languageCode;
    if (AppConfig.supportedLocales.contains(system)) {
      _locale = system;
    }
  }
${
  c.addons.biometricLock
    ? `
  Future<void> _authenticate() async {
    final auth = LocalAuthentication();
    try {
      final allowed = await auth.authenticate(localizedReason: 'Unlock ' + AppConfig.appName);
      if (!mounted || !allowed) return;
      setState(() => _unlocked = true);
      await _controller.loadRequest(Uri.parse(Live.startUrl));
    } catch (_) {
      // Fail closed when authentication is cancelled or unavailable.
    }
  }
`
    : ""
}
  Future<void> _setupConnectivity() async {
    void update(List<ConnectivityResult> result) {
      if (!mounted) return;
      final off = result.contains(ConnectivityResult.none);
      final reconnecting = _offline && !off;
      setState(() => _offline = off);
      if (reconnecting && _unlocked) _controller.reload();
    }
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen(update);
    update(await Connectivity().checkConnectivity());
  }

  void _setupController() {
    _controller = WebViewController()
      ..setJavaScriptMode(
        AppConfig.javascriptEnabled
            ? JavaScriptMode.unrestricted
            : JavaScriptMode.disabled,
      )
      ..setBackgroundColor(Live.themeColor)
      ..enableZoom(AppConfig.zoomEnabled)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() { _loading = true; _pageError = false; });
            if (AppConfig.injectTiming == 'documentStart') _inject();
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
            if (AppConfig.injectTiming == 'documentEnd') _inject();
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == true && mounted) {
              setState(() { _loading = false; _pageError = true; });
            }
          },
          onNavigationRequest: _handleNavigation,
        ),
      );
    if (_controller.platform is AndroidWebViewController) {
      final android = _controller.platform as AndroidWebViewController;
      final cookies = WebViewCookieManager();
      if (cookies.platform is AndroidWebViewCookieManager) {
        (cookies.platform as AndroidWebViewCookieManager)
            .setAcceptThirdPartyCookies(android, AppConfig.thirdPartyCookies);
      }
      android.setOnShowFileSelector((params) async {
${
  c.settings.fileUploads
    ? `        try {
          final files = params.mode == FileSelectorMode.openMultiple
              ? await openFiles()
              : [if (await openFile() case final file?) file];
          return files.map((file) => Uri.file(file.path).toString()).toList();
        } catch (_) {
          return <String>[];
        }`
    : "        return <String>[];"
}
      });
    }
    unawaited(_configureUserAgent());
    if (_unlocked) _controller.loadRequest(Uri.parse(Live.startUrl));
  }

  Future<void> _configureUserAgent() async {
    final base = await _controller.getUserAgent() ?? '';
    final ua = AppConfig.desktopMode
        ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'
        : base;
    if (ua.isNotEmpty) {
      await _controller.setUserAgent((ua + ' ' + AppConfig.userAgentSuffix).trim());
    }
  }

  void _inject() {
    final script = WebOverrides.scriptFor(Live.customCss, Live.customJs);
    if (AppConfig.javascriptEnabled && script.isNotEmpty) {
      _controller.runJavaScript(script);
    }
  }

  bool _isInternal(Uri uri) {
    if (Live.internalDomains.isEmpty) return true;
    return Live.internalDomains
        .any((d) => uri.host == d || uri.host.endsWith('.' + d));
  }

  Future<NavigationDecision> _handleNavigation(NavigationRequest request) async {
    if (!request.isMainFrame) return NavigationDecision.navigate;
    final uri = Uri.tryParse(request.url);
    if (uri == null) return NavigationDecision.prevent;

    for (final pattern in Live.blockedUrlPatterns) {
      if (pattern.isNotEmpty && request.url.contains(pattern)) {
        return NavigationDecision.prevent;
      }
    }

    if (AppConfig.handleMailto && uri.scheme == 'mailto') {
      await launchUrl(uri);
      return NavigationDecision.prevent;
    }
    if (AppConfig.handleTel && (uri.scheme == 'tel' || uri.scheme == 'sms')) {
      await launchUrl(uri);
      return NavigationDecision.prevent;
    }
    if (AppConfig.handleWhatsapp && (uri.host == 'wa.me' || uri.scheme == 'whatsapp')) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      return NavigationDecision.prevent;
    }

    if (uri.scheme != 'https' && uri.scheme != 'http') {
      return NavigationDecision.prevent;
    }
    if (!_isInternal(uri) && AppConfig.openExternalInBrowser) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      return NavigationDecision.prevent;
    }
    return NavigationDecision.navigate;
  }

  Future<bool> _onWillPop() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    if (!AppConfig.confirmExit) return true;
    if (!mounted) return false;
    final leave = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppStrings.t(_locale, 'exitTitle')),
        content: Text(AppStrings.t(_locale, 'exitMessage')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Exit'),
          ),
        ],
      ),
    );
    return leave ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _onWillPop() && mounted) await SystemNavigator.pop();
      },
      child: Scaffold(
        backgroundColor: Live.themeColor,
        body: SafeArea(
          top: !AppConfig.fullscreen,
          child: !_unlocked
              ? Center(child: ${c.addons.biometricLock ? "FilledButton(onPressed: _authenticate, child: const Text('Unlock app'))" : "const Text('App locked')"})
              : _offline || _pageError ? _offlineView() : _webView(),
        ),
        floatingActionButton: ${
          c.addons.shareButton
            ? `FloatingActionButton.small(
          backgroundColor: Live.accentColor,
          onPressed: () =>
              SharePlus.instance.share(ShareParams(text: Live.startUrl)),
          child: const Icon(Icons.share),
        )`
            : "null"
        },
        bottomNavigationBar: _unlocked && Live.bottomNav && Live.bottomNavItems.length >= 2
            ? BottomNavigationBar(
                currentIndex: _navIndex,
                type: BottomNavigationBarType.fixed,
                onTap: (index) {
                  setState(() => _navIndex = index);
                  _controller.loadRequest(
                    Uri.parse(Live.bottomNavItems[index]['url']!),
                  );
                },
                items: Live.bottomNavItems
                    .map(
                      (item) => BottomNavigationBarItem(
                        icon: const Icon(Icons.circle_outlined),
                        label: item['label'],
                      ),
                    )
                    .toList(),
              )
            : null,
      ),
    );
  }

  Widget _webView() {
    final view = Stack(
      children: [
        WebViewWidget(controller: _controller),
        if (_loading)
          Center(child: CircularProgressIndicator(color: Live.accentColor)),
      ],
    );
    if (!AppConfig.pullToRefresh) return view;
    return Stack(children: [
      Positioned.fill(child: view),
      Positioned(
        right: 12, top: 8,
        child: IconButton.filledTonal(
          tooltip: 'Refresh website',
          onPressed: () => _controller.reload(),
          icon: const Icon(Icons.refresh),
        ),
      ),
    ]);
  }

  Widget _offlineView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off, size: 56, color: Colors.white54),
            const SizedBox(height: 16),
            Text(
              AppStrings.t(_locale, 'offlineTitle'),
              style: const TextStyle(fontSize: 20, color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(
              AppStrings.t(_locale, 'offlineMessage'),
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () {
                setState(() { _offline = false; _pageError = false; });
                _controller.reload();
              },
              child: Text(AppStrings.t(_locale, 'retry')),
            ),
          ],
        ),
      ),
    );
  }
}
`;
}

function androidManifest(c: AppConfig): string {
  const perms = androidPermissions(c)
    .map((p) => `    <uses-permission android:name="${p}" />`)
    .join("\n");
  const hosts = c.linkHandling.universalLinkHosts
    .map((h) => `                <data android:scheme="https" android:host="${h}" />`)
    .join("\n");
  return `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
${perms}

    <application
        android:label="${xml(c.appInfo.appName)}"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="false">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:screenOrientation="${
              c.settings.orientation === "auto" ? "unspecified" : c.settings.orientation
            }"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
                android:name="io.flutter.embedding.android.NormalTheme"
                android:resource="@style/NormalTheme" />
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${c.linkHandling.deepLinkScheme}" />
            </intent-filter>
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
${hosts}
            </intent-filter>
        </activity>
${
  c.addons.admobEnabled
    ? `        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="${xml(c.addons.admobAppId)}" />\n`
    : ""
}        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
`;
}

function infoPlist(c: AppConfig): string {
  const usage = Object.entries(iosUsageKeys(c))
    .map(([k, v]) => `    <key>${k}</key>\n    <string>${xml(v)}</string>`)
    .join("\n");
  const orientation =
    c.settings.orientation === "landscape"
      ? ["UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"]
      : c.settings.orientation === "portrait"
        ? ["UIInterfaceOrientationPortrait"]
        : [
            "UIInterfaceOrientationPortrait",
            "UIInterfaceOrientationLandscapeLeft",
            "UIInterfaceOrientationLandscapeRight",
          ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
    <key>UIMainStoryboardFile</key>
    <string>Main</string>
    <key>CFBundleDisplayName</key>
    <string>${xml(c.appInfo.appName)}</string>
    <key>CFBundleName</key>
    <string>${xml(c.appInfo.shortName || c.appInfo.appName)}</string>
    <key>CFBundleIdentifier</key>
    <string>${c.appInfo.packageId}</string>
    <key>CFBundleShortVersionString</key>
    <string>$(FLUTTER_BUILD_NAME)</string>
    <key>CFBundleVersion</key>
    <string>$(FLUTTER_BUILD_NUMBER)</string>
    <key>MinimumOSVersion</key>
    <string>${Math.max(Number(c.appInfo.iosDeploymentTarget) || 15, 15).toFixed(1)}</string>
    <key>UIStatusBarStyle</key>
    <string>${c.branding.statusBarStyle === "light" ? "UIStatusBarStyleLightContent" : "UIStatusBarStyleDarkContent"}</string>
    <key>UIViewControllerBasedStatusBarAppearance</key>
    <false/>
${usage}
    <key>UISupportedInterfaceOrientations</key>
    <array>
${orientation.map((o) => `        <string>${o}</string>`).join("\n")}
    </array>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>${c.linkHandling.deepLinkScheme}</string>
            </array>
        </dict>
    </array>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
    </dict>
${
  c.addons.admobEnabled
    ? `    <key>GADApplicationIdentifier</key>\n    <string>${xml(c.addons.admobAppId)}</string>\n`
    : ""
}    <key>CADisableMinimumFrameDurationOnPhone</key>
    <true/>
</dict>
</plist>
`;
}

function readme(c: AppConfig): string {
  return `# ${c.appInfo.appName} — Flutter native app

Generated from ${c.appInfo.websiteUrl}

## Build the Android APK

\`\`\`bash
bash tool/bootstrap.sh android
flutter pub get
dart run flutter_launcher_icons
dart run flutter_native_splash:create
bash tool/check_signing.sh  # configure CM_KEYSTORE_* and CM_KEY_* first
flutter build apk --release
# output: build/app/outputs/flutter-apk/app-release.apk
\`\`\`

App bundle for Google Play:

\`\`\`bash
flutter build appbundle --release
\`\`\`

## Build for iOS (needs macOS + Xcode)

\`\`\`bash
bash tool/bootstrap.sh ios
flutter pub get
if [ -f ios/Podfile ]; then (cd ios && pod install); fi
flutter build ios --release --no-codesign
open ios/Runner.xcworkspace   # sign with your Apple team, then Archive
\`\`\`

## One-click cloud builds

- \`codemagic.yaml\` — select android-debug for a test APK. For android-release, upload your existing keystore with reference nativeforge_upload. For ios-release, upload a matching App Store distribution certificate and provisioning profile.
- \`.github/workflows/build.yml\` — GitHub Actions builds a test APK and unsigned iOS app. Store distribution requires signed release artifacts.

## Where settings live

| Area | File |
| --- | --- |
| All app settings | \`lib/app_config.dart\` |
| Website CSS/JS overrides | \`lib/web_overrides.dart\` |
| Translations | \`lib/strings.dart\` |
| Android permissions & deep links | \`android/app/src/main/AndroidManifest.xml\` |
| iOS permissions & deep links | \`ios/Runner/Info.plist\` |
| Environment values | \`.env.example\`, \`assets/config/app_config.json\` |

The website is loaded live from its HTTPS URL. Newly deployed pages appear on reload;
already-open pages need website realtime support or a manual refresh. Live console
settings poll every 60 seconds and on foreground without resetting navigation.
Native permissions, signing, icons and plugins require regeneration and rebuilding.
Never embed private keys: secret-marked environment values are omitted from exports.

Regenerate this project from the web console to receive generator fixes. Bootstrap
preserves native customizations; use a fresh export when changing the package ID.
`;
}

function bootstrapScript(c: AppConfig): string {
  const packageParts = c.appInfo.packageId.split(".");
  const projectName = (packageParts.pop() || "webapp").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  const organisation = packageParts.join(".") || "com.example";
  const platforms = "${1:-both}";
  // Current Firebase / mobile_scanner / local_auth plugins require these floors.
  const minSdk = Math.max(Number(c.appInfo.minSdk) || 24, 24);
  const iosTarget = Math.max(Number(c.appInfo.iosDeploymentTarget) || 15, 15).toFixed(1);

  return `#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
test -f pubspec.yaml || { echo "pubspec.yaml was not found; run this script from the exported project." >&2; exit 1; }

requested="${platforms}"
case "$requested" in
  android) flutter_platforms="android" ;;
  ios) flutter_platforms="ios" ;;
  both) flutter_platforms="android,ios" ;;
  *) echo "Usage: bash tool/bootstrap.sh [android|ios|both]" >&2; exit 2 ;;
esac

backup_dir="$(mktemp -d)"
trap 'rm -rf "$backup_dir"' EXIT
if [ -f android/app/src/main/AndroidManifest.xml ]; then
  cp android/app/src/main/AndroidManifest.xml "$backup_dir/AndroidManifest.xml"
fi
if [ -f ios/Runner/Info.plist ]; then
  cp ios/Runner/Info.plist "$backup_dir/Info.plist"
fi

flutter create --no-pub --platforms="$flutter_platforms" --project-name="${projectName}" --org="${organisation}" "$backup_dir/scaffold"
# Copy missing scaffolding only. Preserve signing, Firebase files and native edits.
python3 - "$backup_dir/scaffold" "$requested" <<'PYTHON'
import pathlib, shutil, sys
source = pathlib.Path(sys.argv[1])
platforms = ['android', 'ios'] if sys.argv[2] == 'both' else [sys.argv[2]]
for platform in platforms:
    for item in (source / platform).rglob('*'):
        target = pathlib.Path(platform) / item.relative_to(source / platform)
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif not target.exists():
            shutil.copy2(item, target)
if not pathlib.Path('.metadata').exists():
    shutil.copy2(source / '.metadata', '.metadata')
PYTHON

if [[ "$requested" == "android" || "$requested" == "both" ]]; then
  if [ -f "$backup_dir/AndroidManifest.xml" ]; then
    cp "$backup_dir/AndroidManifest.xml" android/app/src/main/AndroidManifest.xml
  fi
${
  c.addons.biometricLock
    ? `  python3 - <<'PYTHON'
import pathlib
for p in pathlib.Path('android/app/src/main/res').glob('values*/styles.xml'):
    s = p.read_text()
    for parent in ['@android:style/Theme.Light.NoTitleBar', '@android:style/Theme.Black.NoTitleBar']:
        s = s.replace(parent, 'Theme.AppCompat.DayNight.NoActionBar')
    p.write_text(s)
PYTHON
`
    : ""
}  gradle_file="android/app/build.gradle.kts"
  if [ -f "$gradle_file" ]; then
    sed -i.bak -E 's/^([[:space:]]*)minSdk[[:space:]]*=.*$/\\1minSdk = ${minSdk}/' "$gradle_file"
    sed -i.bak -E 's/^([[:space:]]*)compileSdk[[:space:]]*=.*$/\\1compileSdk = 36/' "$gradle_file"
    sed -i.bak -E 's/^([[:space:]]*)targetSdk[[:space:]]*=.*$/\\1targetSdk = 36/' "$gradle_file"
    rm -f "$gradle_file.bak"
    python3 tool/configure_signing.py "$gradle_file"
    # Opting out of AGP built-in Kotlin also requires applying the Kotlin plugin.
    python3 - "$gradle_file" <<'PYTHON'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
s = p.read_text()
if 'id("org.jetbrains.kotlin.android")' not in s and 'id("kotlin-android")' not in s:
    s = s.replace('id("com.android.application")', 'id("com.android.application")\\n    id("org.jetbrains.kotlin.android")', 1)
p.write_text(s)
PYTHON
  fi

  # Flutter 3.47+ supports built-in Kotlin, but current plugin ecosystems
  # still contain packages that apply the legacy Kotlin Gradle Plugin. Keep
  # this compatibility mode enabled for generated apps.
  gradle_props="android/gradle.properties"
  touch "$gradle_props"
  if grep -q '^android.builtInKotlin=' "$gradle_props"; then
    sed -i.bak 's/^android.builtInKotlin=.*/android.builtInKotlin=false/' "$gradle_props"
  else
    printf '\nandroid.builtInKotlin=false\n' >> "$gradle_props"
  fi
  if grep -q '^android.newDsl=' "$gradle_props"; then
    sed -i.bak 's/^android.newDsl=.*/android.newDsl=false/' "$gradle_props"
  else
    printf 'android.newDsl=false\n' >> "$gradle_props"
  fi
  rm -f "$gradle_props.bak"

  # Flutter v1 Android embedding was removed in Flutter 3.29. Fail early
  # with a clear message if an obsolete reference ever enters the tree.
  if grep -R "io\\.flutter\\.app\\." android/app/src/main 2>/dev/null; then
    echo "ERROR: Android v1 embedding reference detected." >&2
    exit 1
  fi
  grep -R -q "io\\.flutter\\.embedding\\.android\\.Flutter\\(Fragment\\)\\?Activity" android/app/src/main \
    || { echo "ERROR: Android embedding v2 MainActivity was not generated." >&2; exit 1; }
fi

if [[ "$requested" == "ios" || "$requested" == "both" ]]; then
  # Include current Flutter scene/launch metadata while preserving configured values.
  python3 - "$backup_dir/scaffold/ios/Runner/Info.plist" <<'PYTHON'
import pathlib, plistlib, sys
p = pathlib.Path('ios/Runner/Info.plist')
base = plistlib.loads(pathlib.Path(sys.argv[1]).read_bytes())
base.update(plistlib.loads(p.read_bytes()))
p.write_bytes(plistlib.dumps(base))
PYTHON
  sed -i.bak 's/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*/IPHONEOS_DEPLOYMENT_TARGET = ${iosTarget}/g' ios/Runner.xcodeproj/project.pbxproj
  rm -f ios/Runner.xcodeproj/project.pbxproj.bak
  if [ -f ios/Podfile ]; then
    sed -i.bak "s/^# *platform :ios.*/platform :ios, '${iosTarget}'/" ios/Podfile
    sed -i.bak "s/^platform :ios.*/platform :ios, '${iosTarget}'/" ios/Podfile
    rm -f ios/Podfile.bak
  fi
fi

echo "Modern Flutter platform files are ready for $requested."
`;
}

const signingPython = `import pathlib, sys
path = pathlib.Path(sys.argv[1])
source = path.read_text()
marker = '// NativeForge release signing'
if marker not in source:
    source += """
// NativeForge release signing
android {
    signingConfigs {
        maybeCreate("release").apply {
            val keyPath = System.getenv("CM_KEYSTORE_PATH")
            if (!keyPath.isNullOrBlank()) {
                storeFile = file(keyPath)
                storePassword = System.getenv("CM_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("CM_KEY_ALIAS")
                keyPassword = System.getenv("CM_KEY_PASSWORD")
            }
        }
    }
    buildTypes.getByName("release") {
        signingConfig = signingConfigs.getByName("release")
    }
}
"""
    path.write_text(source)
`;

const signingCheck = `#!/usr/bin/env bash
set -euo pipefail
for variable in CM_KEYSTORE_PATH CM_KEYSTORE_PASSWORD CM_KEY_ALIAS CM_KEY_PASSWORD; do
  if [ -z "\${!variable:-}" ]; then
    echo "Missing $variable. Configure nativeforge_upload in Codemagic Code signing identities. Use android-debug for an unsigned-store test APK." >&2
    exit 1
  fi
done
test -f "$CM_KEYSTORE_PATH" || { echo "Keystore file is missing" >&2; exit 1; }
`;

function codemagicYaml(c: AppConfig): string {
  return `workflows:
  android-debug:
    name: Test APK (not for Google Play)
    instance_type: linux_x2
    environment:
      flutter: 3.47.3
      java: 17
    scripts:
      - script: |
          set -euo pipefail
          bash tool/bootstrap.sh android
          flutter pub get
          dart run flutter_launcher_icons
          dart run flutter_native_splash:create
          flutter analyze --no-fatal-infos
          flutter test
          flutter build apk --debug
    artifacts:
      - build/app/outputs/flutter-apk/*.apk
  android-release:
    name: ${JSON.stringify(c.appInfo.appName + " Android")}
    working_directory: .
    instance_type: linux_x2
    max_build_duration: 60
    environment:
      flutter: 3.47.3
      java: 17
      ndk: 28.2.13676358
      # Upload your existing Play upload key with reference nativeforge_upload.
      android_signing:
        - nativeforge_upload
    scripts:
      - name: Prepare current Flutter Android project
        script: |
          set -euo pipefail
          test -f pubspec.yaml
          bash tool/bootstrap.sh android
          flutter doctor -v
          flutter pub get
          dart run flutter_launcher_icons
          dart run flutter_native_splash:create
          flutter analyze --no-fatal-infos
          flutter test
      - name: Build Android release files
        script: |
          set -euo pipefail
          bash tool/check_signing.sh
          flutter build apk --release
          flutter build appbundle --release
    artifacts:
      - build/**/outputs/**/*.apk
      - build/**/outputs/**/*.aab
  ios-release:
    name: ${JSON.stringify(c.appInfo.appName + " iOS")}
    working_directory: .
    instance_type: mac_mini_m2
    max_build_duration: 90
    environment:
      flutter: 3.47.3
      xcode: latest
      cocoapods: default
      ios_signing:
        distribution_type: app_store
        bundle_identifier: ${c.appInfo.packageId}
    scripts:
      - name: Prepare current Flutter iOS project
        script: |
          set -euo pipefail
          test -f pubspec.yaml
          bash tool/bootstrap.sh ios
          flutter doctor -v
          flutter pub get
          dart run flutter_launcher_icons
          dart run flutter_native_splash:create
          flutter analyze --no-fatal-infos
          flutter test
      - name: Set up signing
        script: |
          set -euo pipefail
          xcode-project use-profiles
      - name: Install iOS dependencies and build
        script: |
          set -euo pipefail
          if [ -f ios/Podfile ]; then (cd ios && pod install); fi
          flutter build ipa --release --export-options-plist=/Users/builder/export_options.plist
    artifacts:
      - build/ios/ipa/*.ipa
      - build/ios/archive/*.xcarchive
`;
}

const githubWorkflow = `name: Build app
on:
  push:
  workflow_dispatch:

jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.47.3"
          cache: true
      - run: test -f pubspec.yaml
      - run: bash tool/bootstrap.sh android
      - run: flutter pub get
      - run: dart run flutter_launcher_icons
      - run: dart run flutter_native_splash:create
      - run: flutter analyze --no-fatal-infos
      - run: flutter test
      - run: flutter build apk --debug
      - uses: actions/upload-artifact@v4
        with:
          name: app-debug-apk
          path: build/app/outputs/flutter-apk/app-debug.apk

  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.47.3"
          cache: true
      - run: test -f pubspec.yaml
      - run: bash tool/bootstrap.sh ios
      - run: flutter pub get
      - run: dart run flutter_launcher_icons
      - run: dart run flutter_native_splash:create
      - run: flutter analyze --no-fatal-infos
      - run: flutter test
      - run: flutter build ios --release --no-codesign
      - run: |
          mkdir -p build/ios-out
          cp -r build/ios/iphoneos/Runner.app build/ios-out/
      - uses: actions/upload-artifact@v4
        with:
          name: ios-build
          path: build/ios-out
`;

function envExample(c: AppConfig): string {
  const lines = c.env.filter((e) => e.key).map((e) => `${e.key}=${e.secret ? "" : e.value}`);
  return `# Environment values for ${c.appInfo.appName}\n${lines.join("\n")}\n`;
}

function mainActivity(c: AppConfig): string {
  return `package ${c.appInfo.packageId}

import io.flutter.embedding.android.${c.addons.biometricLock ? "FlutterFragmentActivity" : "FlutterActivity"}

class MainActivity : ${c.addons.biometricLock ? "FlutterFragmentActivity" : "FlutterActivity"}()
`;
}

/** Full project as path -> text content. */
export function buildFlutterProject(c: AppConfig, liveConfigUrl = ""): Record<string, string> {
  validateConfig(c);
  const files: Record<string, string> = {
    "README.md": readme(c),
    "pubspec.yaml": pubspec(c),
    "analysis_options.yaml": "include: package:flutter_lints/flutter.yaml\n",
    ".gitignore":
      "build/\n.dart_tool/\n.packages\n.flutter-plugins\n.flutter-plugins-dependencies\nios/Pods/\n",
    ".env.example": envExample(c),
    "codemagic.yaml": codemagicYaml(c),
    "tool/bootstrap.sh": bootstrapScript(c),
    "tool/configure_signing.py": signingPython,
    "tool/check_signing.sh": signingCheck,
    ".github/workflows/build.yml": githubWorkflow,
    "lib/main.dart": mainDart(c),
    "test/config_test.dart": `import 'package:flutter_test/flutter_test.dart';
import '../lib/app_config.dart';
import '../lib/web_overrides.dart';

void main() {
  test('generated app uses an HTTPS website', () {
    expect(Uri.parse(AppConfig.startUrl).scheme, 'https');
    expect(AppConfig.versionCode, greaterThan(0));
  });
  test('CSS injection safely encodes quotes and backslashes', () {
    expect(WebOverrides.scriptFor('body { color: red; }', ''), contains('textContent='));
  });
}
`,
    "lib/app_config.dart": appConfigDart(c, liveConfigUrl),
    "lib/live_config.dart": liveConfigDart(),
    "lib/web_overrides.dart": injectionDart(c),
    "lib/strings.dart": stringsDart(c),
    "assets/config/app_config.json": JSON.stringify(
      { ...c, env: c.env.map((e) => ({ ...e, value: e.secret ? "" : e.value })) },
      null,
      2,
    ),
    "android/app/src/main/AndroidManifest.xml": androidManifest(c),
    [`android/app/src/main/kotlin/${packagePath(c.appInfo.packageId)}/MainActivity.kt`]:
      mainActivity(c),
    "ios/Runner/Info.plist": infoPlist(c),
    "web/manifest.json": JSON.stringify(
      {
        name: c.appInfo.appName,
        short_name: c.appInfo.shortName,
        start_url: c.appInfo.websiteUrl,
        display: "standalone",
        background_color: c.splash.backgroundColor,
        theme_color: c.branding.themeColor,
      },
      null,
      2,
    ),
  };

  if (c.linkHandling.universalLinkHosts.length) {
    files["universal-links/apple-app-site-association.json"] = JSON.stringify(
      {
        applinks: {
          apps: [],
          details: [{ appID: `TEAMID.${c.appInfo.packageId}`, paths: ["*"] }],
        },
      },
      null,
      2,
    );
    files["universal-links/assetlinks.json"] = JSON.stringify(
      [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: c.appInfo.packageId,
            sha256_cert_fingerprints: ["REPLACE_WITH_YOUR_SIGNING_FINGERPRINT"],
          },
        },
      ],
      null,
      2,
    );
  }

  if (c.addons.pushEnabled || c.addons.analyticsEnabled) {
    files["FIREBASE_SETUP.md"] = `# Push notifications

1. Create a Firebase project (sender id: ${c.addons.firebaseSenderId || "your sender id"}).
2. Download \`google-services.json\` into \`android/app/\`.
3. Download \`GoogleService-Info.plist\` into \`ios/Runner/\`.
4. Rebuild. Messages are received by \`firebase_messaging\` in \`lib/main.dart\`.
`;
  }

  return files;
}

export function projectFileList(c: AppConfig): string[] {
  return Object.keys(buildFlutterProject(c)).sort();
}
