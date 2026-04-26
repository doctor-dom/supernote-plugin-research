# SuperTask Progress

> Lasso-to-Todoist plugin for Supernote. Design doc: `docs/plugin-taskharvest-v2.md`

## Phase overview

- [x] **Phase 1a: Scaffold** -- plugin structure, button registration, screen routing, build verified
- [x] **Phase 1b: Config + connection** -- Todoist API v1 verified on-device, tasks loading (29 tasks)
- [x] **Phase 1c: Dev tooling** -- HTTP dev log server, logs stream to Mac in real-time
- [ ] **Phase 2: Task viewer polish** -- complete/delete actions, manual add, pagination (cursor-based)
- [ ] **Phase 3: Lasso capture** -- handwriting OCR, confirmation UI, POST to Todoist
- [ ] **Phase 4: Doc capture** -- PDF text selection, same flow as lasso
- [ ] **Phase 5: Config persistence** -- save token/settings to plugin directory, on-device config UI
- [ ] **Phase 6: Polish** -- loading states, error handling, empty states, no-network handling

## Current status

**Phase 1 complete. Task list loads 29 tasks from Todoist API v1.** Dev log server confirmed working -- logs POST from device to Mac over wifi.

### What to do next session

1. **Phase 2: Task viewer improvements**
   - Test complete-task flow (tap checkbox to close a task)
   - Handle pagination -- API returns `{results: [...], next_cursor: "..."}`, currently only first page
   - Add pull-to-refresh or manual refresh
   - Add manual "Add Task" button from the task list screen
   - Test delete-task flow

2. **Phase 3: Lasso capture**
   - Test Button 200 (lasso bar "Add Task") -- does `recognizeElements()` work?
   - Build confirmation UI: show recognized text, let user edit, set priority/due/project
   - POST to Todoist and confirm task appears

3. **Phase 4: Doc capture**
   - Test Button 300 (toolbar "Add Task" in DOC mode)
   - Test `getLastSelectedText()` / `getSelectedText()` for PDF text extraction

4. **Phase 5: Config persistence**
   - Investigate which file I/O APIs actually work (see "Deferred: config persistence" below)
   - Goal: save API token on-device so it survives reinstalls without rebuilding

### Dev workflow

```bash
# 1. Start log server (keep running in terminal)
cd plugins/SuperTask && node dev-server.js

# 2. Edit code, then build
bash buildPlugin.sh

# 3. Copy build/outputs/SuperTask.snplg to Supernote via USB (MyStyle/)

# 4. On device: Settings > Apps > Plugins > Install

# 5. Open a note, tap plugin button, test feature

# 6. Tap Log > Upload Log -- logs appear in terminal + saved to logs/
```

## Confirmed learnings

### Todoist API v1 response format
- **Response is paginated:** `{results: [...], next_cursor: "..."}` -- NOT a bare array
- `getTasks()` and `getProjects()` unwrap this, checking for `results`, `items`, `tasks` keys
- The REST v2 API (`/rest/v2`) returns 410 Gone as of April 2026
- Base URL: `https://api.todoist.com/api/v1`

### fetch() works on Supernote
- Confirmed by successful 200 responses from Todoist API
- HTTPS works, JSON parsing works, Authorization headers work

### SDK API locations (which class has which method)
- `PluginCommAPI.getCurrentFilePath()` -- NOT on PluginNoteAPI
- `PluginCommAPI.getCurrentPageNum()` -- NOT on PluginNoteAPI
- `PluginCommAPI.getNoteSystemTemplates()` -- system template list
- `PluginNoteAPI.insertText()` -- insert text box on CURRENT note page only
- `PluginFileAPI.insertElements(notePath, page, elements)` -- insert into ANY note
- `PluginFileAPI.createNote()` -- requires a valid template path (error 802 if template file doesn't exist on device filesystem)
- `FileUtils.getExportPath()` -- returns /EXPORT/ directory path (works)
- **`FileUtils` has NO `writeFile()` method** -- confirmed by reading the TurboModule interface

### What doesn't work for file I/O
- `FileUtils.writeFile()` -- does not exist in the SDK
- `fetch('file://...')` -- unverified, likely broken
- `PluginFileAPI.createNote()` with system templates -- got error 802 "Background template file doesn't exist"
- `PluginNoteAPI.getCurrentFilePath()` -- method doesn't exist on this class (it's on PluginCommAPI)
- `adb shell`, `adb logcat`, `adb push`, `adb pull` -- Supernote ADB is locked down, only reports device presence

### Dev logging via HTTP
- `fetch()` can POST to a local dev server on the same wifi
- `config.local.js` holds `debugServerUrl` (e.g., `http://192.168.68.68:3000/log`)
- `dev-server.js` is a zero-dependency Node server that prints logs to terminal and saves to `logs/`
- Button in debug screen: "Upload Log" POSTs all entries
- Falls back to `insertText` on current note page if server unreachable

### Plugin scaffolding
- Always scaffold from `template/`, never copy another plugin
- Rename all `HelloWorld`/`helloworld` references in: app.json, package.json, PluginConfig.json, android package dir + kotlin files, ios dirs, build.gradle namespace
- Build with `bash buildPlugin.sh` -- pure JS plugins skip Gradle, build in under a minute

### Bundled config pattern
- `config.local.js` at project root (gitignored) holds API token + debug server URL
- Baked into Hermes bundle at build time
- `src/utils/config.js` imports with `require('../../config.local')` with fallback
- `.default` access pattern: `localConfig.default || localConfig` handles both ES module and CommonJS exports

### E-ink UI guidelines
- Black text on white background, no grayscale gradients
- Large tap targets (e-ink touch is less precise)
- No animations -- e-ink can't render them
- Use typography and borders for visual hierarchy, not color

## Deferred: config persistence

The SDK has no `writeFile()`. Investigated approaches that failed:

| Approach | Result |
|---|---|
| `FileUtils.writeFile()` | Method doesn't exist in TurboModule interface |
| `fetch('file://...')` | Unverified, likely broken |
| `PluginFileAPI.createNote()` + `insertElements()` | Error 802: template file not found |
| `adb push` | Supernote ADB is locked down |

**Remaining approaches to investigate:**
1. `AsyncStorage` from `@react-native-async-storage/async-storage` (would need to add dependency)
2. React Native's built-in `Settings` module (iOS only, probably won't work)
3. Direct TurboModule call to Android's SharedPreferences (may exist but undocumented)
4. `PluginManager.getPluginDirPath()` + some undiscovered write API

**When to revisit:** After core task management features work. The bundled config pattern is adequate for development.

## File structure

```
plugins/SuperTask/
  index.js              -- entry point, button registration, global routing
  App.tsx               -- root component, screen router, error boundary, debug viewer
  config.local.js       -- API token + debugServerUrl (gitignored, bundled at build time)
  dev-server.js         -- local Node server for receiving debug logs over wifi
  PluginConfig.json     -- plugin metadata (supertask001, v0.1.0)
  package.json          -- deps: RN 0.79.2, sn-plugin-lib ^0.1.19
  PROGRESS.md           -- this file
  src/
    api/todoist.js      -- Todoist API v1 client, response unwrapping, debug logging
    utils/
      config.js         -- config loader (bundled token, persistence deferred)
      debug.js          -- debug logger with HTTP export to dev server
    screens/
      TaskList.tsx      -- task list viewer with sort-by-due, complete action, Log/Refresh/Close
      Capture.tsx       -- lasso OCR or DOC text capture, priority/due/project, submit
      Config.tsx        -- settings UI (API token entry, test connection)
  android/              -- standard RN android scaffold (com.supertask)
  ios/                  -- standard RN ios scaffold
  logs/                 -- received debug logs from device (gitignored)
  assets/icon.png       -- toolbar icon (placeholder, same as template)
  buildPlugin.sh        -- build script (produces .snplg)
  build/outputs/        -- SuperTask.snplg (gitignored)
```

## Session log

### 2026-04-25 -- Session 1: Scaffold, first device tests, debug logging

**Repo setup:**
- Initialized supernote-plugin-research as standalone git repo
- Created GitHub remote at `apclark31/supernote-plugin-research` (private, SSH)

**Plugin scaffold:**
- Created SuperTask from SDK template
- 4 entry points: toolbar NOTE (Tasks), lasso NOTE (Add Task), toolbar DOC (Add Task), config
- Todoist API client, config utility, debug logger, 3 screens

**Device tests:**
- Build 1: Todoist API returned 410 Gone (REST v2 deprecated), confirmed fetch() works
- Build 2: "undefined is not a function" from filesystem APIs in config.js
- Build 3: Stripped to bundled config only, added debug logging

### 2026-04-25 -- Session 2: API fix, dev tooling, task list working

**Todoist API v1 response parsing:**
- API returns `{results: [...], next_cursor: "..."}`, not a bare array
- `getTasks()` and `getProjects()` now unwrap the response, checking `results`/`items`/`tasks` keys
- Added safety check in TaskList.tsx before calling `.sort()` on result
- **Task list now loads 29 tasks successfully**

**Log export attempts (what failed):**
- `PluginNoteAPI.getCurrentFilePath()` -- doesn't exist (it's on PluginCommAPI)
- `PluginFileAPI.createNote()` with system templates -- error 802 "template file doesn't exist"
- dpaste.org -- service is down
- ix.io -- service is down

**Dev log server (what works):**
- Created `dev-server.js` -- zero-dependency Node HTTP server
- Plugin POSTs logs via `fetch()` to `http://<mac-ip>:3000/log`
- Server URL configured in `config.local.js` as `debugServerUrl`
- Logs print to terminal and save to `logs/` directory
- Confirmed working: first log received shows full API call trace

**ADB investigation:**
- Supernote has ADB locked down -- `adb devices` sees it, but `shell`, `logcat`, `push`, `pull` all fail
- Not viable for deployment or debugging

**CLAUDE.md updated** with all learnings (SDK method locations, file I/O limitations, API format)
