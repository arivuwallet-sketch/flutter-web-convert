# Appify Your Website

You need to create a real website to flutter native mobile app converter for for all website platform mainly for lovable websites. Even the website has custom domain and it need to give the full build file in downloadable apk for Android and full build zip folder for IOS. Add full app customize and editing add everything to edit a app uploading logos, loading screen, language, settings App Info, Splash Screen, App Permissions, App Settings, Link Handling, Website Overrides, Add-ons, Language Localisation, Icon Library, Environment Variables everything should work 100% perfectly

Show les

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://flutter-web-convert.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d656f4e8-7f6b-423a-b32d-8f87e9471630).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Building Android and iOS with Codemagic

This repository contains the **web converter**. A Flutter app is generated from its
settings; running `flutter build` directly at this repository root cannot work.
The root `codemagic.yaml` now generates the Flutter project first.

1. Select `main` and reload the YAML workflows in Codemagic.
2. Set these environment variables for each Codemagic app:

   | Variable | Example | Purpose |
   | --- | --- | --- |
   | `APP_NAME` | `My Website` | Display name |
   | `WEBSITE_URL` | `https://your-domain.com` | Live website, not a bundled snapshot |
   | `PACKAGE_ID` | `com.company.myapp` | Keep this stable after publishing |
   | `APP_VERSION` | `1.0.0` | Marketing version |
   | `APP_BUILD_NUMBER` | `1` | Increase for each store upload |
   | `LIVE_CONFIG_URL` | your console's `/api/public/app-config/<app-id>` URL | Optional live console settings |

   For full customization, set `APP_CONFIG_FILE` to a repository-relative JSON
   configuration file using the `AppConfig` structure in `src/lib/appConfig.ts`.
3. Run **android-debug** first. It produces an installable test APK without store
   credentials. It is not a Play Store release.
4. For **android-release**, upload your existing Android upload keystore in
   Codemagic **Code signing identities**, with reference `nativeforge_upload`.
   The workflow reads `CM_KEYSTORE_PATH`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`,
   and `CM_KEY_PASSWORD`. It produces a signed APK **and** AAB. Never generate a
   replacement key for an already published app without following Play's key
   recovery process.
5. For **ios-release**, upload your Apple distribution certificate with reference
   `nativeforge_ios_certificate` and matching App Store provisioning profile
   with reference `nativeforge_ios_profile` in Codemagic Code signing identities.
   Set `PACKAGE_ID` explicitly to match the profile. Generated per-app workflows
   select uploaded signing identities by bundle ID instead. This workflow produces a signed **IPA**, not APK/AAB.

The web console can instead push a generated project to a per-app
`nativeforge-<app-id-prefix>` branch. Select that branch in Codemagic when using
its generated workflow. Existing exported projects must be regenerated to
receive generator fixes. Set the deployed converter's `PUBLIC_SITE_URL` to its
stable public HTTPS address so generated apps never point to a temporary preview.

## Website updates and supported behavior

Both native platforms load the same HTTPS website. Website deployments appear on
subsequent page loads without rebuilding the app. An already open page gets live
data if the website implements polling, SSE or WebSockets; the wrapper cannot
turn arbitrary static pages into a realtime application. Use the refresh control
for newly deployed HTML/JS. Configure your website's cache/service-worker policy
to revalidate HTML and use versioned asset URLs.

Console presentation settings are checked at launch/foreground and every 60
seconds while active. Settings updates preserve the current page unless the
configured start URL changes. Switching to a payment app or browser and back no
longer resets the WebView to the homepage. URL query parameters are preserved.
App IDs, icons, entitlements, permissions and native plugins still require a new
signed binary. Store approval and arbitrary websites' OAuth, DRM, popup and
payment compatibility cannot be guaranteed by a WebView generator.

The wrapper includes navigation, external links, offline/load-error recovery,
refresh, Android file selection, sharing, bottom navigation and optional local
authentication. Android file selection uses the system file picker; camera capture
and accept-type filtering need website/device testing. Refresh is an explicit
button because nested Flutter scrolling conflicts with the native WebView.
Firebase features require Firebase native configuration and platform setup;
AdMob, QR, ratings, geolocation, download management and other optional UI toggles
are not a guarantee of a fully implemented native integration. Review and test
these integrations before enabling them for production.

Secret-marked values are excluded from generated files. Never put private API
keys in a mobile app; keep privileged operations behind your server. Build
credentials currently use the existing account metadata storage; migrating them
to server-only encrypted storage is recommended before a multi-tenant launch.

## Verification

Use Node 24 and the committed npm lockfile:

```sh
npm ci
npm test
npm run build
npm run typecheck
APP_NAME='My App' WEBSITE_URL='https://example.com' node scripts/export-flutter.mjs
cd .generated/flutter
bash tool/bootstrap.sh android
flutter pub get
flutter analyze --no-fatal-infos
flutter test
flutter build apk --debug
```

`bootstrap.sh` fills missing platform files from Flutter 3.47.3 without deleting
native customizations, wires legacy Kotlin correctly when built-in Kotlin is
opted out, merges current iOS scene metadata and configures release signing.
GitHub Actions validates the converter and compiles a generated Android/iOS
smoke-test app. iOS checks require macOS; signed release checks need your keys.
