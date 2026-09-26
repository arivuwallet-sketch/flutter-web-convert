import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildFlutterProject } from "../src/lib/flutterProject.ts";
import { defaultConfig, validateConfig } from "../src/lib/appConfig.ts";
import yaml from "js-yaml";

const config = () => defaultConfig("Demo & Shop $5", "https://example.com");

test("quoted and multiline input produces valid YAML, XML, plist and shell", () => {
  const c = config();
  c.appInfo.appName = `Shop: "Bob's" & $5\nNew line`;
  c.appInfo.description = "Description: true\nnext: value";
  c.permissions.rationale = 'Photos & files <needed> "please"';
  c.permissions.camera = true;
  const files = buildFlutterProject(c);
  assert.equal(yaml.load(files["pubspec.yaml"]).description, c.appInfo.description);
  for (const path of ["codemagic.yaml", ".github/workflows/build.yml"])
    assert.ok(yaml.load(files[path]).jobs || yaml.load(files[path]).workflows);
  assert.ok(files["lib/app_config.dart"].includes("\\$5"));
  const dir = mkdtempSync(join(tmpdir(), "generator-"));
  try {
    for (const [path, text] of Object.entries(files)) {
      if (path.endsWith(".sh")) execFileSync("bash", ["-n"], { input: text });
    }
    for (const path of ["android/app/src/main/AndroidManifest.xml", "ios/Runner/Info.plist"]) {
      execFileSync(
        "python3",
        ["-c", "import sys,xml.etree.ElementTree as E; E.fromstring(sys.stdin.read())"],
        { input: files[path] },
      );
    }
    const plist = JSON.parse(
      execFileSync(
        "python3",
        [
          "-c",
          "import sys,plistlib,json; print(json.dumps(plistlib.loads(sys.stdin.buffer.read())))",
        ],
        { input: files["ios/Runner/Info.plist"] },
      ),
    );
    assert.equal(plist.CFBundleDisplayName, c.appInfo.appName);
    assert.equal(plist.CFBundleExecutable, "$(EXECUTABLE_NAME)");
    assert.equal(plist.UILaunchStoryboardName, "LaunchScreen");
    writeFileSync(join(dir, "sign.py"), files["tool/configure_signing.py"]);
    writeFileSync(join(dir, "build.gradle.kts"), "android {}\n");
    for (let n = 0; n < 2; n++)
      execFileSync("python3", [join(dir, "sign.py"), join(dir, "build.gradle.kts")]);
    assert.equal(
      readFileSync(join(dir, "build.gradle.kts"), "utf8").split("// NativeForge release signing")
        .length,
      2,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("secrets never enter exported files", () => {
  const c = config();
  c.env = [
    { key: "TOKEN", value: "secret-sentinel-123", secret: true },
    { key: "PUBLIC", value: "visible", secret: false },
  ];
  const files = buildFlutterProject(c);
  assert.ok(!Object.values(files).join("\n").includes("secret-sentinel-123"));
  assert.equal(JSON.parse(files["assets/config/app_config.json"]).env[1].value, "visible");
});

test("invalid native configuration is rejected before a build is queued", () => {
  for (const packageId of ["com.123.app", "com.class.app", "com.foo;echo bad", "com.App.demo"]) {
    const c = config();
    c.appInfo.packageId = packageId;
    assert.throws(() => buildFlutterProject(c), /Package ID/);
  }
  for (const websiteUrl of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:pass@example.com",
  ]) {
    const c = config();
    c.appInfo.websiteUrl = websiteUrl;
    assert.throws(() => validateConfig(c), /HTTPS/);
  }
  const c = config();
  c.addons.bottomNav = true;
  assert.throws(() => buildFlutterProject(c), /two to five/);
  validateConfig(defaultConfig("123 app", "https://123.example.com"));
});

test("bootstrap preserves native customizations and emits isolated scaffolding", () => {
  const shell = buildFlutterProject(config())["tool/bootstrap.sh"];
  assert.ok(!shell.includes("rm -rf android"));
  assert.ok(!shell.includes("rm -rf ios"));
  assert.ok(shell.includes("--no-pub"));
  assert.ok(shell.includes("elif not target.exists()"));
});

test("biometric variant blocks content until authentication succeeds", () => {
  const c = config();
  c.addons.biometricLock = true;
  const files = buildFlutterProject(c);
  assert.ok(
    Object.values(files).some((s) => s.includes("class MainActivity : FlutterFragmentActivity()")),
  );
  assert.ok(files["android/app/src/main/AndroidManifest.xml"].includes("USE_BIOMETRIC"));
  assert.ok(files["ios/Runner/Info.plist"].includes("NSFaceIDUsageDescription"));
  assert.ok(files["lib/main.dart"].includes("if (_unlocked) _controller.loadRequest"));
});


test("asset generation targets only the bootstrapped platform and can switch targets", () => {
  const files = buildFlutterProject(config());
  const script = files["tool/bootstrap.sh"].split("<<'ASSET_PLATFORMS'\n")[1].split("\nASSET_PLATFORMS")[0];
  const dir = mkdtempSync(join(tmpdir(), "asset-platforms-"));
  try {
    writeFileSync(join(dir, "pubspec.yaml"), files["pubspec.yaml"]);
    for (const platform of ["android", "ios", "both", "android"]) {
      execFileSync("python3", ["-c", script, platform], { cwd: dir });
      const parsed = yaml.load(readFileSync(join(dir, "pubspec.yaml"), "utf8"));
      for (const section of ["flutter_launcher_icons", "flutter_native_splash"]) {
        assert.equal(parsed[section].android, platform !== "ios");
        assert.equal(parsed[section].ios, platform !== "android");
      }
      assert.equal(parsed.flutter_native_splash.web, false);
      assert.equal(parsed.flutter_launcher_icons.image_path, "assets/icon.png");
      assert.ok(parsed.flutter_native_splash.android_12.image);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
