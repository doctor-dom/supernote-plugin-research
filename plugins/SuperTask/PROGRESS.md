# SuperTask Progress

> Lasso-to-Todoist plugin for Supernote. Design doc: `docs/plugin-taskharvest-v2.md`

## Phase overview

- [x] **Phase 1a: Scaffold** -- plugin structure, button registration, screen routing, build verified
- [ ] **Phase 1b: Config + connection** -- Todoist API verified on-device, config persistence working
- [ ] **Phase 2: Lasso capture** -- handwriting OCR, confirmation UI, POST to Todoist
- [ ] **Phase 3: Task viewer** -- fetch/display tasks, complete, edit, manual add
- [ ] **Phase 4: Polish** -- loading states, error handling, empty states, no-network handling

## Current status

**Waiting on device test.** Build v0.1.0 is ready with debug logging. User needs to install the `.snplg` and report what the debug log shows when tapping "Tasks". This will tell us whether the Todoist v1 API works and whether the bundled config pattern loads correctly.

### What to do next session

1. Get the device test results (debug log output from tapping Tasks, then tapping Log)
2. Fix whatever the log reveals
3. Once task list loads: test complete-task flow
4. Once API round-trip is proven: test lasso capture (Button 200 -- "Add Task" in lasso bar)
5. Add back config persistence (see "Deferred: config persistence" section below)

## Confirmed learnings

### Todoist API v1 (not v2)
- **The REST v2 API is deprecated.** `https://api.todoist.com/rest/v2` returns 410 Gone.
- **Use v1:** `https://api.todoist.com/api/v1` -- same endpoint paths (`/tasks`, `/projects`, `/tasks/{id}/close`), just different base URL.
- This was confirmed on-device: the plugin's `fetch()` reached Todoist and got a real 410 response back, proving network access works.

### fetch() works on Supernote
- Confirmed by the 410 error response from the first build. The device can make HTTPS requests to external APIs.

### Plugin scaffolding
- Always scaffold from `template/`, never copy another plugin. Copying SmartGestures caused confusion about which project was being modified.
- Rename all `HelloWorld`/`helloworld` references: app.json, package.json, PluginConfig.json, android package dir + kotlin files, ios dirs, build.gradle namespace.
- Build with `bash buildPlugin.sh` -- pure JS plugins skip Gradle, build in under a minute.

### Bundled config pattern
- Typing an API token on the e-ink keyboard is impractical.
- Solution: `config.local.js` at project root (gitignored) holds the token. It's baked into the Hermes bundle at build time.
- `src/utils/config.js` imports it with `require('../../config.local')` and falls back gracefully if missing.
- The `.default` access pattern needs care: `const localConfig = require('...'); bundledConfig = localConfig.default || localConfig;` handles both ES module default exports and CommonJS.

### Debug logging on e-ink
- No dev console available on Supernote. Debug info must be shown in the UI itself.
- `src/utils/debug.js` collects timestamped log entries in memory.
- App.tsx has a debug screen (navigable via "Log" button in TaskList header, or shown automatically on error).
- All API calls and key state transitions log to this system.
- Logging is at: config load, API request (method + URL), API response (status code), errors (with stack trace).

## Deferred: config persistence

The original config.js tried to read/write JSON files to the plugin directory using `PluginManager.getPluginDirPath()` + `FileUtils.writeFile()` + `fetch('file://...')`. This was stripped out because it caused "undefined is not a function" on device -- one of those APIs doesn't exist as expected.

**What was removed:**
```javascript
// Reading a JSON file from plugin directory
async function readJsonFile(filename) {
  const dir = await getPluginDir();             // PluginManager.getPluginDirPath()
  const path = `${dir}/${filename}`;
  const response = await fetch(`file://${path}`); // file:// URL fetch
  return response.json();
}

// Writing a JSON file to plugin directory
async function writeJsonFile(filename, data) {
  const dir = await getPluginDir();
  const {FileUtils} = require('sn-plugin-lib');
  await FileUtils.writeFile(path, content);     // THIS IS THE SUSPECT
}
```

**What needs investigation:**
1. Does `PluginManager.getPluginDirPath()` return successfully? (Add a debug log call to test)
2. Does `fetch('file://...')` work for reading local files on the device?
3. What file write APIs actually exist in sn-plugin-lib? Check:
   - `FileUtils.writeFile`
   - `FileUtils.copyFile` (write to temp then copy)
   - React Native's built-in file system modules
   - `AsyncStorage` from `@react-native-async-storage/async-storage` (would need to add dependency)

**When to add back:**
- After the core Todoist API round-trip is proven on device
- Start by just testing `getPluginDirPath()` in a debug log
- Then try each read/write approach one at a time

## File structure

```
plugins/SuperTask/
  index.js              -- entry point, button registration, global routing
  App.tsx               -- root component, screen router, error boundary, debug viewer
  config.local.js       -- API token (gitignored, bundled at build time)
  PluginConfig.json     -- plugin metadata (supertask001, v0.1.0)
  package.json          -- deps: RN 0.79.2, sn-plugin-lib ^0.1.19
  PROGRESS.md           -- this file
  src/
    api/todoist.js      -- Todoist API v1 client with debug logging
    utils/
      config.js         -- config loader (bundled token, persistence deferred)
      debug.js          -- in-memory debug logger for on-device diagnostics
    screens/
      TaskList.tsx      -- task list viewer with Log/Refresh/Close buttons
      Capture.tsx       -- lasso OCR or DOC text capture, priority/due/project, submit
      Config.tsx        -- settings UI (API token entry, test connection)
  android/              -- standard RN android scaffold (com.supertask)
  ios/                  -- standard RN ios scaffold
  assets/icon.png       -- toolbar icon (placeholder, same as template)
  buildPlugin.sh        -- build script (produces .snplg)
  build/outputs/        -- SuperTask.snplg (258KB, gitignored)
```

## Session log

### 2026-04-25 -- Session 1: Scaffold, first device tests, debug logging

**Repo setup:**
- Discovered git repo was rooted at `/Users/alex` (home directory), tracking both Guitar and Supernote files
- Initialized supernote-plugin-research as its own standalone git repo
- Created GitHub remote at `apclark31/supernote-plugin-research` (private, SSH)
- Excluded `update.zip` (1.1GB firmware file) via .gitignore
- Guitar project lives separately at `chord-viz/` with its own repo -> `apclark31/guitarVisualizer`

**Plugin scaffold:**
- Created SuperTask from SDK `template/` directory (not copied from SmartGestures)
- Registered 4 entry points: toolbar NOTE (Tasks), lasso NOTE (Add Task), toolbar DOC (Add Task), config
- Built App.tsx with screen routing via `global.__superTaskButtonId`
- Created Todoist API client, config utility, and 3 screens (TaskList, Capture, Config)
- Build verified: 258KB .snplg, clean Metro bundle

**First device test:**
- Todoist API returned 410 Gone -- REST v2 is deprecated, need v1
- Confirmed: `fetch()` works, token is valid, network is reachable
- Fixed API URL to `https://api.todoist.com/api/v1`

**Second device test:**
- Got "undefined is not a function" error
- Likely cause: filesystem APIs in config.js (`getPluginDirPath`, `FileUtils.writeFile`, or `fetch('file://...')`)
- Fix: stripped config.js down to just return bundled token, no filesystem calls
- Added debug logging system (`src/utils/debug.js`) with in-UI log viewer

**Third build (current):**
- Simplified config (bundled token only)
- Debug logging at all key points (config load, API calls, response codes, errors)
- "Log" button in TaskList header to view debug entries
- Error boundary in App.tsx shows debug log on crash
- Awaiting device test

**Commits:**
1. `8472f75` Initial commit: full repo with all research, docs, SmartGestures, SDK source
2. `54a9c5a` Add SuperTask plugin scaffold and repo CLAUDE.md
3. `42eab6e` Add bundled config pattern for API token
4. `8ffae7f` Fix Todoist API URL: /rest/v2 deprecated, use /api/v1
5. `fa2d793` Add debug logging and simplify config to bundled token only
