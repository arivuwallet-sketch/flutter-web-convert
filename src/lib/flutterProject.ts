// Pure generator: AppConfig -> a complete Flutter project as a file map.
// Browser-safe (no node APIs) so the editor can preview any file.

import type { AppConfig } from "./appConfig";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
const dartStr = (s: string) => `'${esc(s)}'`;
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
    list.push("android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION");
  }
  if (p.backgroundLocation) list.push("android.permission.ACCESS_BACKGROUND_LOCATION");
  if (p.storage) {
    list.push("android.permission.READ_MEDIA_IMAGES", "android.permission.READ_MEDIA_VIDEO");
  }
  if (p.notifications) list.push("android.permission.POST_NOTIFICATIONS");
  if (p.contacts) list.push("android.permission.READ_CONTACTS");
  if (p.calendar) list.push("android.permission.READ_CALENDAR");
  if (p.bluetooth) list.push("android.permission.BLUETOOTH_CONNECT");
  if (p.biometric) list.push("android.permission.USE_BIOMETRIC");
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
  if (p.biometric) keys["NSFaceIDUsageDescription"] = r;
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
    "  intl: ^0.20.3",
    "  http: ^1.6.0",
  ];
  if (c.addons.shareButton) deps.push("  share_plus: ^13.3.0");
  if (c.addons.pushEnabled) deps.push("  firebase_core: ^4.15.0", "  firebase_messaging: ^16.7.0");
  if (c.addons.analyticsEnabled) deps.push("  firebase_analytics: ^12.6.0");
  if (c.addons.admobEnabled) deps.push("  google_mobile_ads: ^9.1.0");
  if (c.addons.biometricLock || c.permissions.biometric) deps.push("  local_auth: ^3.0.2");
  if (c.addons.ratingPrompt) deps.push("  in_app_review: ^2.0.12");
  if (c.addons.qrScanner) deps.push("  mobile_scanner: ^7.4.2");
  if (c.permissions.location || c.settings.geolocationBridge) deps.push("  geolocator: ^14.0.3");
  if (c.settings.downloads) deps.push("  path_provider: ^2.1.6");
  deps.push("  permission_handler: ^13.0.2");

  return `name: ${c.appInfo.packageId.split(".").pop() || "webapp"}_app
description: ${c.appInfo.description || c.appInfo.appName}
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
class WebOverrides {
  static const String css = ${dartStr(css)};
  static const String js = ${dartStr(js)};

  static String script() => scriptFor(css, js);

  /// Builds the injection script for the given css/js. Live-synced overrides
  /// pass the freshly downloaded values here.
  static String scriptFor(String cssIn, String jsIn) {
    final buffer = StringBuffer();
    if (cssIn.isNotEmpty) {
      final safe = cssIn.replaceAll('"', '\\\\"').replaceAll('\\n', ' ');
      buffer.writeln("(function(){var s=document.createElement('style');"
          "s.type='text/css';s.appendChild(document.createTextNode(\\"" +
          safe +
          "\\"));document.head.appendChild(s);})();");
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

  /// Adds a cache-busting stamp so the web view shows the newest site content.
  static String freshUrl(String url) {
    if (url.isEmpty) return url;
    final uri = Uri.parse(url);
    final query = Map<String, String>.from(uri.queryParameters);
    query['_v'] = DateTime.now().millisecondsSinceEpoch.toString();
    return uri.replace(queryParameters: query).toString();
  }

  static String _s(String key, String fallback) {
    final value = _data[key];
    return value is String && value.isNotEmpty ? value : fallback;
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

  static String get startUrl => _s('startUrl', AppConfig.startUrl);
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
      if (items.isNotEmpty) return items;
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
${c.addons.shareButton ? "import 'package:share_plus/share_plus.dart';\n" : ""}${c.addons.pushEnabled ? "import 'package:firebase_core/firebase_core.dart';\nimport 'package:firebase_messaging/firebase_messaging.dart';\n" : ""}${c.addons.biometricLock ? "import 'package:local_auth/local_auth.dart';\n" : ""}import 'app_config.dart';
import 'live_config.dart';
import 'web_overrides.dart';
import 'strings.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Live.load();
  unawaited(Live.refresh());
${c.addons.pushEnabled ? "  await Firebase.initializeApp();\n  await FirebaseMessaging.instance.requestPermission();\n" : ""}  if (AppConfig.orientation == 'portrait') {
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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setupLocale();
    _setupConnectivity();
    _setupController();
    _startLiveSync();
${c.addons.biometricLock ? "    _authenticate();\n" : ""}  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_syncLive(forceWebRefresh: true));
    }
  }

  /// Pulls the newest settings published from the web console and applies them
  /// immediately - no reinstall, no store update.
  void _startLiveSync() {
    if (!AppConfig.liveSync) return;
    _syncLive();
    _syncTimer = Timer.periodic(const Duration(seconds: 60), (_) => _syncLive());
  }

  Future<void> _syncLive({bool forceWebRefresh = false}) async {
    if (!AppConfig.liveSync) {
      if (forceWebRefresh && mounted) {
        _controller.loadRequest(Uri.parse(Live.freshUrl(AppConfig.startUrl)));
      }
      return;
    }
    final changed = await Live.refresh();
    if ((!changed && !forceWebRefresh) || !mounted) return;
    setState(() {});
    _controller.loadRequest(Uri.parse(Live.freshUrl(Live.startUrl)));
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
    final canCheck = await auth.canCheckBiometrics;
    if (!canCheck) return;
    await auth.authenticate(localizedReason: 'Unlock ' + AppConfig.appName);
  }
`
    : ""
}
  Future<void> _setupConnectivity() async {
    final result = await Connectivity().checkConnectivity();
    setState(() => _offline = result.contains(ConnectivityResult.none));
    Connectivity().onConnectivityChanged.listen((event) {
      final off = event.contains(ConnectivityResult.none);
      if (mounted) setState(() => _offline = off);
      if (!off) _controller.reload();
    });
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
            if (mounted) setState(() => _loading = true);
            if (AppConfig.injectTiming == 'documentStart') _inject();
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
            if (AppConfig.injectTiming == 'documentEnd') _inject();
          },
          onNavigationRequest: _handleNavigation,
        ),
      );
    final ua = AppConfig.userAgentSuffix;
    if (ua.isNotEmpty) {
      _controller.setUserAgent(
        (AppConfig.desktopMode
                ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/122.0 Safari/537.36 '
                : '') +
            ua,
      );
    }
    _controller.loadRequest(Uri.parse(Live.freshUrl(Live.startUrl)));
  }

  void _inject() {
    final script = WebOverrides.scriptFor(Live.customCss, Live.customJs);
    if (script.isNotEmpty) {
      _controller.runJavaScript(script);
    }
  }

  bool _isInternal(Uri uri) {
    if (Live.internalDomains.isEmpty) return true;
    return Live.internalDomains
        .any((d) => uri.host == d || uri.host.endsWith('.' + d));
  }

  Future<NavigationDecision> _handleNavigation(NavigationRequest request) async {
    final uri = Uri.parse(request.url);

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
    if (AppConfig.handleWhatsapp && uri.host.contains('wa.me')) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
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
        if (await _onWillPop() && mounted) Navigator.of(context).pop();
      },
      child: Scaffold(
        backgroundColor: Live.themeColor,
        body: SafeArea(
          top: !AppConfig.fullscreen,
          child: _offline ? _offlineView() : _webView(),
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
        bottomNavigationBar: Live.bottomNav && Live.bottomNavItems.isNotEmpty
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
    return RefreshIndicator(
      onRefresh: () async => _controller.reload(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height - 24, child: view),
        ],
      ),
    );
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
              onPressed: () => _controller.reload(),
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
    .map(
      (h) => `                <data android:scheme="https" android:host="${h}" />`,
    )
    .join("\n");
  return `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
${perms}

    <application
        android:label="${c.appInfo.appName}"
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
            android:value="${c.addons.admobAppId}" />\n`
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
    .map(([k, v]) => `    <key>${k}</key>\n    <string>${v}</string>`)
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
    <key>CFBundleDisplayName</key>
    <string>${c.appInfo.appName}</string>
    <key>CFBundleName</key>
    <string>${c.appInfo.shortName || c.appInfo.appName}</string>
    <key>CFBundleIdentifier</key>
    <string>${c.appInfo.packageId}</string>
    <key>CFBundleShortVersionString</key>
    <string>${c.appInfo.versionName}</string>
    <key>CFBundleVersion</key>
    <string>${c.appInfo.versionCode}</string>
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
    ? `    <key>GADApplicationIdentifier</key>\n    <string>${c.addons.admobAppId}</string>\n`
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
cd ios && pod install && cd ..
flutter build ios --release --no-codesign
open ios/Runner.xcworkspace   # sign with your Apple team, then Archive
\`\`\`

## One-click cloud builds

- \`codemagic.yaml\` — push this repo to Codemagic and both platforms build automatically.
- \`.github/workflows/build.yml\` — GitHub Actions builds the APK on every push and uploads it as an artifact.

## Where settings live

| Area | File |
| --- | --- |
| All app settings | \`lib/app_config.dart\` |
| Website CSS/JS overrides | \`lib/web_overrides.dart\` |
| Translations | \`lib/strings.dart\` |
| Android permissions & deep links | \`android/app/src/main/AndroidManifest.xml\` |
| iOS permissions & deep links | \`ios/Runner/Info.plist\` |
| Environment values | \`.env.example\`, \`assets/config/app_config.json\` |

Regenerate this project any time from the web console after changing settings.
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

if [[ "$requested" == "android" || "$requested" == "both" ]]; then rm -rf android; fi
if [[ "$requested" == "ios" || "$requested" == "both" ]]; then rm -rf ios; fi

flutter create --platforms="$flutter_platforms" --project-name="${projectName}" --org="${organisation}" .

if [[ "$requested" == "android" || "$requested" == "both" ]]; then
  if [ -f "$backup_dir/AndroidManifest.xml" ]; then
    cp "$backup_dir/AndroidManifest.xml" android/app/src/main/AndroidManifest.xml
  fi
  gradle_file="android/app/build.gradle.kts"
  if [ -f "$gradle_file" ]; then
    sed -i.bak -E 's/^([[:space:]]*)minSdk[[:space:]]*=.*$/\1minSdk = ${minSdk}/' "$gradle_file"
    sed -i.bak -E 's/^([[:space:]]*)compileSdk[[:space:]]*=.*$/\1compileSdk = 36/' "$gradle_file"
    sed -i.bak -E 's/^([[:space:]]*)targetSdk[[:space:]]*=.*$/\1targetSdk = 36/' "$gradle_file"
    rm -f "$gradle_file.bak"
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
  if grep -R "io\.flutter\.app\." android/app/src/main 2>/dev/null; then
    echo "ERROR: Android v1 embedding reference detected." >&2
    exit 1
  fi
  grep -R -q "io\.flutter\.embedding\.android\.FlutterActivity" android/app/src/main \
    || { echo "ERROR: Android embedding v2 MainActivity was not generated." >&2; exit 1; }
fi

if [[ "$requested" == "ios" || "$requested" == "both" ]]; then
  if [ -f "$backup_dir/Info.plist" ]; then cp "$backup_dir/Info.plist" ios/Runner/Info.plist; fi
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

function codemagicYaml(c: AppConfig): string {
  return `workflows:
  android-release:
    name: ${c.appInfo.appName} Android
    working_directory: .
    instance_type: linux_x2
    max_build_duration: 60
    environment:
      flutter: 3.47.3
      java: 17
      ndk: 28.2.13676358
    scripts:
      - name: Prepare current Flutter Android project
        script: |
          test -f pubspec.yaml
          bash tool/bootstrap.sh android
          flutter doctor -v
          flutter pub get
          dart run flutter_launcher_icons
          dart run flutter_native_splash:create
          flutter analyze
      - name: Build Android release files
        script: |
          flutter build apk --release
          flutter build appbundle --release
    artifacts:
      - build/**/outputs/**/*.apk
      - build/**/outputs/**/*.aab
  ios-release:
    name: ${c.appInfo.appName} iOS
    working_directory: .
    instance_type: mac_mini_m2
    max_build_duration: 90
    integrations:
      app_store_connect: codemagic
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
          test -f pubspec.yaml
          bash tool/bootstrap.sh ios
          flutter doctor -v
          flutter pub get
          dart run flutter_launcher_icons
          dart run flutter_native_splash:create
          flutter analyze
      - name: Set up signing
        script: |
          keychain initialize
          app-store-connect fetch-signing-files "${c.appInfo.packageId}" --type IOS_APP_STORE --create
          keychain add-certificates
          xcode-project use-profiles
      - name: Install iOS dependencies and build
        script: |
          cd ios && pod install && cd ..
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
      - run: flutter analyze
      - run: flutter build apk --release
      - uses: actions/upload-artifact@v4
        with:
          name: app-release-apk
          path: build/app/outputs/flutter-apk/app-release.apk

  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true
      - run: test -f pubspec.yaml
      - run: bash tool/bootstrap.sh ios
      - run: flutter pub get
      - run: dart run flutter_launcher_icons
      - run: dart run flutter_native_splash:create
      - run: flutter analyze
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
  const lines = c.env
    .filter((e) => e.key)
    .map((e) => `${e.key}=${e.secret ? "" : e.value}`);
  return `# Environment values for ${c.appInfo.appName}\n${lines.join("\n")}\n`;
}

function mainActivity(c: AppConfig): string {
  return `package ${c.appInfo.packageId}

import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity()
`;
}

/** Full project as path -> text content. */
export function buildFlutterProject(
  c: AppConfig,
  liveConfigUrl = "",
): Record<string, string> {
  const files: Record<string, string> = {
    "README.md": readme(c),
    "pubspec.yaml": pubspec(c),
    "analysis_options.yaml": "include: package:flutter_lints/flutter.yaml\n",
    ".gitignore": "build/\n.dart_tool/\n.packages\n.flutter-plugins\n.flutter-plugins-dependencies\nios/Pods/\n",
    ".env.example": envExample(c),
    "codemagic.yaml": codemagicYaml(c),
    "tool/bootstrap.sh": bootstrapScript(c),
    ".github/workflows/build.yml": githubWorkflow,
    "lib/main.dart": mainDart(c),
    "lib/app_config.dart": appConfigDart(c, liveConfigUrl),
    "lib/live_config.dart": liveConfigDart(),
    "lib/web_overrides.dart": injectionDart(c),
    "lib/strings.dart": stringsDart(c),
    "assets/config/app_config.json": JSON.stringify(c, null, 2),
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

  if (c.addons.pushEnabled) {
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
