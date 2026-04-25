# Supernote Plugin Research & Development

## What this repo is

A monorepo for Supernote plugin SDK research and plugin development. Contains:
- **SDK source** (`src/`, `lib/`, `android/`) -- extracted sn-plugin-lib internals for reference
- **Official docs** (`official-docs-extracted.md`) -- full extraction of Ratta's plugin documentation
- **Design docs** (`docs/`) -- architecture analysis and plugin design documents
- **Plugins** (`plugins/`) -- each plugin is a standalone React Native project

## Plugin development practices

### Creating a new plugin
- Always scaffold from `template/`, never copy another plugin. Each plugin is its own standalone RN project with its own dependencies.
- Rename all `HelloWorld`/`helloworld` references to the new plugin name in: app.json, package.json, android package dirs + kotlin files, ios dirs + swift/xcodeproj, build.gradle namespace.
- Each plugin gets its own directory under `plugins/` with its own `PROGRESS.md` for session continuity.

### Plugin architecture
- **React Native 0.79.2 + React 19.0.0** -- locked versions, do not upgrade
- **sn-plugin-lib ^0.1.19** -- Supernote SDK bridge, the only way to talk to the device
- **Build output** -- `buildPlugin.sh` produces a `.snplg` file (zip of Hermes bytecode + assets + PluginConfig.json)
- **No native modules needed for pure JS plugins** -- build skips Gradle entirely, runs in under a minute
- **Install on device** -- copy `.snplg` to MyStyle/, then Settings > Apps > Plugins > Install

### Key SDK patterns
- `PluginManager.init()` must be called at startup
- `registerButton(type, appTypes, config)` -- type 1 = toolbar, type 2 = lasso bar, type 3 = selection bar
- `showType: 0` = headless/background, `showType: 1` = full-screen React Native UI
- All SDK API calls are async (return Promises)
- `saveCurrentNote()` is mandatory before `deleteElements()` to avoid stale state
- Plugin directory via `getPluginDirPath()` for persistent local storage (JSON, config)
- `fetch()` works for HTTP calls -- no restrictions on network access

### Learnings from SmartGestures development
- `event_pen_up` payload elements can't be read directly; must call `getLastElement()`
- Stroke points are in EMR coordinates (digitizer space, axes rotated vs screen)
- Inherent 1-2 second delay after `deleteElements()` due to SDK refresh -- unavoidable
- Elements are atomic (can't partially delete a stroke)
- Promise chain pattern (`chain = chain.then(...)`) prevents race conditions on rapid events
- Cache page context (size, path, page number) to avoid redundant API round-trips

### E-ink UI guidelines
- Black text on white background, no grayscale gradients
- Large tap targets (e-ink touch is less precise than phone screens)
- No animations -- e-ink can't render them
- Use typography (bold, size) and borders for visual hierarchy, not color
- Minimize full-screen refreshes

### Build & test cycle
1. Edit code
2. Run `bash buildPlugin.sh` from the plugin directory
3. Copy `build/outputs/<PluginName>.snplg` to Supernote via USB (MyStyle/ directory)
4. Settings > Apps > Plugins > Install (or reinstall)
5. Open a note, tap plugin button to test

### Git practices
- Commit frequently -- previous sessions have lost work from uncommitted state
- No co-authored-by lines in commits
- Each plugin is in `plugins/<Name>/` with its own PROGRESS.md
- Design docs live in `docs/`
