# SmartGestures — Dev Environment Setup

Checklist for standing up the toolchain needed to build this Supernote plugin into a `.snplg` package.

## Prerequisites (from official Supernote docs)

| Requirement | Minimum | Status on this machine |
|---|---|---|
| Node.js | >= 18 | Installed (v23.11.0) |
| JDK | >= 19 (using Temurin 21 LTS) | Installing via brew |
| Android Studio | Narwhal 2025.1.2+ | Installing via brew |
| Android SDK Platform | 35 (VanillaIceCream) | Install via Android Studio SDK Manager after first launch |
| Android SDK Build-Tools | 35.0.0 | Install via Android Studio SDK Manager after first launch |
| `ANDROID_HOME` env var | set, with `platform-tools` on PATH | Pending (see below) |
| `jq` or `python3` | either works | Both installed |
| Beta firmware on Supernote | Plugins panel under Settings > Apps | Device updating |

## Install commands

```bash
# 1. JDK 21 LTS (satisfies JDK >= 19)
brew install --cask temurin@21

# 2. Android Studio (bundles the SDK Manager)
brew install --cask android-studio
```

## Post-install steps

### 1. Open Android Studio once to trigger SDK download

Launch Android Studio from Applications. On first launch, run the setup wizard. Then:

**More Actions > SDK Manager**
- **SDK Platforms tab**: check **Android 15.0 (VanillaIceCream)** — API Level 35
- **SDK Tools tab**: check
  - Android SDK Build-Tools 35.0.0
  - Android SDK Platform-Tools
  - Android SDK Command-line Tools (latest)
- Click **Apply** to download.

### 2. Add environment variables to `~/.zshrc`

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/emulator"
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
```

Then reload:

```bash
source ~/.zshrc
```

### 3. Verify everything

```bash
java -version          # should show Temurin 21
javac -version         # should show 21
echo $JAVA_HOME        # should point inside Temurin.jdk
echo $ANDROID_HOME     # should be ~/Library/Android/sdk
adb version            # should print Android Debug Bridge version
```

## Building the plugin

Once the toolchain is in place:

```bash
cd "/Users/alex/Library/Mobile Documents/com~apple~CloudDocs/Work/SmartGestures"
bash buildPlugin.sh
```

The build script:
1. Runs `npx react-native bundle` to produce the Hermes bytecode bundle
2. Generates `PluginConfig.json` (with a random 16-char `pluginID` if none is set)
3. Detects whether the plugin has custom native Android code
4. If native code exists, runs `gradlew buildCustomApkDebug` to compile `app.npk`
5. Zips everything into `build/outputs/SmartGestures.snplg`

For SmartGestures (pure JS/TS, no custom native modules), the native APK build path is skipped and only the JS bundle + assets + config are packaged.

## Installing the `.snplg` on the Supernote

Two options once the plugin is built:

1. **Settings > Apps > Plugins** panel on device (beta firmware required) — select the `.snplg` file and tap Install.
2. Drop the `.snplg` file into the **MyStyle** directory on the device over USB.

No ADB or rooting required on the beta firmware.

## Sideloading the `.snplg` onto the device

Once a build produces `build/outputs/SmartGestures.snplg`:

1. Connect the Supernote to the Mac with a USB cable.
2. On the device, allow the USB connection prompt (grants mass-storage access).
3. The Supernote mounts as a drive in Finder (it shows up like a USB stick, not via iCloud).
4. Copy `SmartGestures.snplg` into the `MyStyle` directory on the device root.
5. Eject the device.
6. On the device, open **Settings > Apps > Plugins**. The `.snplg` should appear in the install list. Tap **Install**.
7. Once installed, open NOTE. The SmartGestures buttons appear in the left toolbar.

Alternative: open the file manager on the device, navigate to the `.snplg` in `MyStyle`, tap it directly.

No ADB. No developer mode. No pairing. Beta firmware (March 2026+) is the only device-side requirement.

## Build-time learnings (important)

### The JDK + Android Studio toolchain is NOT strictly required for pure-JS plugins

`buildPlugin.sh` has a conditional Gradle path. It only invokes `gradlew buildCustomApkDebug` when the plugin contains custom native Android code (detected by scanning for ReactPackages in Java sources, or by finding third-party node_modules with native code). For a pure-JS plugin that uses only `sn-plugin-lib` APIs:

- `npx react-native bundle` produces the Hermes bytecode (Node only, no Java)
- The native-code detection returns false
- Gradle is skipped entirely with the log message `Build conditions not met; skipping native build and reactPackages update`
- The build zips the bundle + assets + `PluginConfig.json` directly into `.snplg`

**Observed build output from the stock scaffold:**

```
Bundle generated: build/generated/SmartGestures.bundle
Created: PluginConfig.json
Build conditions not met; skipping native build and reactPackages update
Plugin package created: build/outputs/SmartGestures.snplg
```

The whole build completed in under a minute with zero Gradle invocation.

### Why install JDK + Android Studio anyway

1. **Future-proofing.** The moment a plugin needs a custom TurboModule, a native Supernote API wrapper, or a third-party library with native code, the Gradle path fires and the full toolchain is required. Having it in place means you never hit a sudden wall mid-development.
2. **Official docs say so.** The Supernote docs explicitly list JDK 19+ and Android Studio Narwhal as prerequisites. Following them avoids edge cases in `buildPlugin.sh`'s detection logic on different macOS / shell / node setups.
3. **SDK Platform 35 matching.** The template's `android/build.gradle` pins `compileSdkVersion = 35` and `buildToolsVersion = "35.0.0"`. Android Studio installs newer defaults (36.x) by default; you must explicitly go into SDK Manager, enable "Show Package Details", and install 35.0.0 so that if the Gradle path ever runs, versions line up.

### Bottom line

For SmartGestures Phase 1 (realtime mode gestures, no custom native code), the practical minimum toolchain is just **Node + jq/python3**. The rest is insurance. Don't skip it if you're following the docs, but know that an accidental missing Android SDK piece is unlikely to block early development.

## Other notes

- Do not upgrade React / React Native past the template-pinned versions. This project is locked to React 19.0.0 and React Native 0.79.2.
- `sn-plugin-lib` is the only Supernote-specific dependency. Its APIs live under `PluginCommAPI`, `PluginFileAPI`, `PluginNoteAPI`, and `PluginDocAPI`.
- The auto-generated `PluginConfig.json` contains a random 16-char `pluginID`. Commit this file so rebuilds stay stable; otherwise every build produces a "new" plugin from the device's perspective.
- The default `PluginConfig.json` leaves `iconPath` unset. The build warns but still succeeds. Set it to `assets/icon.png` once the plugin has a real icon.
