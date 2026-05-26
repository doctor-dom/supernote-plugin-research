# Supernote Plugin Research

Research, SDK source analysis, and plugin development for the [Supernote](https://supernote.com) e-ink tablet plugin system.

Supernote devices run a React Native plugin runtime (`sn-plugin-lib`) that lets third-party code interact with the NOTE and DOC apps. This repo contains the extracted SDK source, research notes, and working plugins built on top of it.

## What's here

```
src/                  SDK TypeScript source (sn-plugin-lib internals)
lib/                  Compiled JS output
android/              Native bridge (plugincommonlib.aar)
template/             Plugin project scaffold
plugins/
  SuperTask/          Lasso-to-Todoist task capture plugin
  SmartGestures/      Gesture detection experiments (early)
SDK-REFERENCE.md      Full API reference and quick-start guide
```

## Plugins

### [SuperTask](plugins/SuperTask/)

Capture handwritten notes as Todoist tasks. Lasso handwriting, OCR it on-device, and push to Todoist with bidirectional linking back to the source page.

**Releases:** `.snplg` builds are available on the [Releases](https://github.com/apclark31/supernote-plugin-research/releases) page. Copy to your Supernote's `MyStyle/` directory and install via Settings > Apps > Plugins.

See the [SuperTask README](plugins/SuperTask/README.md) for usage and configuration.

## SDK Reference

[SDK-REFERENCE.md](SDK-REFERENCE.md) has the full API surface, data model, architecture diagrams, device specs, and a quick-start guide for building your own plugin.

Key resources:
- [Official Supernote plugin docs](https://docs.supernote.com/en)
- [`sn-plugin-lib` on npm](https://www.npmjs.com/package/sn-plugin-lib)

## Building a plugin

Prerequisites: Node.js >= 18, JDK >= 19, Android SDK Platform 35.

```bash
# Scaffold from template
npx @react-native-community/cli init MyPlugin \
  --template @supernote-plugin/sn-plugin-template --version 0.79.2

# Build
cd MyPlugin && bash buildPlugin.sh
# Output: build/outputs/MyPlugin.snplg
```

See [SDK-REFERENCE.md](SDK-REFERENCE.md) for the full walkthrough.

## License

MIT
