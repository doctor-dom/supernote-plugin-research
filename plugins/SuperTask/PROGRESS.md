# SuperTask Progress

> Lasso-to-Todoist plugin for Supernote. Design doc: `docs/plugin-taskharvest-v2.md`

## Phase overview

- [x] **Phase 1a: Scaffold** -- plugin structure, button registration, screen routing, build verified
- [x] **Phase 1b: Config + connection** -- Todoist API v1 verified on-device, tasks loading (29 tasks)
- [x] **Phase 1c: Dev tooling** -- HTTP dev log server, logs stream to Mac in real-time
- [x] **Phase 2: Task viewer redesign** -- stack nav, tabbed home, project drill-down, task detail/add, date picker
- [x] **Phase 3: Post-action workflows + config** -- Add Another/Done flow, silent refresh, expanded settings screen
- [x] **Phase 5: Lasso capture** -- handwriting OCR via recognizeElements, pre-fills TaskAdd, confirmed on-device
- [ ] **Phase 4: Subtasks** -- view/create/edit/complete subtasks via parent_id
- [ ] **Phase 6: Doc capture** -- PDF text selection, same flow as lasso
- [ ] **Phase 7: Config persistence** -- save token/settings to plugin directory, on-device config UI
- [ ] **Phase 8: Polish** -- loading states, error handling, empty states, no-network handling

## Current status

**Phase 5 complete. Lasso capture working on device.** Full flow: lasso handwriting -> OCR via recognizeElements -> pre-filled TaskAdd form -> POST to Todoist. Config screen expanded with all settings visible. Add Another/Done flow working after task creation.

Phase 3 and 5 completed in Session 4. Phase 4 (subtasks) and Phase 6 (doc capture) are next.

### What to do next session

#### Phase 3: Post-action workflows + unified config

**Post-action behaviors (confirmed design direction):**

After **saving edits**: stay on detail screen, show brief "Saved" overlay (already implemented). No pop-back.

After **creating a task**: show "Task added!" overlay with two choices: **"Add Another"** (clears form) and **"Done"** (pops back to list). Currently just pops back after 500ms.

After **completing a task**: pop back to list (task is gone from view). Keep as-is.

After **deleting a task**: pop back to list. Keep as-is.

**Configuration section expansion:**
The existing Config.tsx is minimal (just API token + test connection). Expand into a full settings screen:
- **API token** -- already exists, keep it
- **Project filters** -- toggle which projects show in the task viewer (partially built, behind "Test Connection")
- **Default project** -- which project new tasks go into by default
- **Default tab** -- which tab (Today/Upcoming/Projects) the home screen opens on (partially built)
- **Post-action behavior** -- configurable: after save (stay/go back), after create (prompt/auto-back/add another)
- **Default screen** -- which screen the plugin opens to (home vs last project vs specific project)
- **API key editing** -- ability to update the token without rebuilding

All config is in-memory only for now (lost on plugin restart). Persistent config is deferred to Phase 7.

#### Phase 4: Subtasks

Todoist API v1 supports subtasks via `parent_id` field on tasks. No code exists yet. Needed:
- `createTask` and `updateTask` already accept arbitrary fields -- just add `parentId` mapping
- TaskDetail: show subtasks list below the form fields, with add/complete/delete
- TaskHome: decide how to display subtasks (indented under parent? hidden until parent tapped?)

#### Known issue: e-ink refresh on data reload

**Symptom:** Tapping Refresh appears to do nothing. Data loads successfully (confirmed in logs: 30 tasks, 6 projects, all 200s) but the UI doesn't visibly update until a tab switch forces the e-ink to redraw.

**Cause:** The list -> spinner -> list transition completes in ~1-2 seconds. E-ink partial refresh doesn't trigger properly for this pattern since the content looks identical before and after.

**Fix ideas:**
1. On manual refresh, skip the loading spinner entirely -- just silently swap the data. Avoids the visual no-op.
2. Add a brief "Refreshing..." overlay (like the save overlay) that doesn't replace the list content.
3. Force a visual flash/blank frame to trigger e-ink refresh (hacky, avoid if possible).

Option 1 is cleanest.

#### Other improvements to consider
- Subtask support (Phase 4)
- Lasso capture testing (Phase 5 -- untested since Phase 1, may need fixes)
- Cache config loader result to avoid redundant loads per API call
- Remove `autoFocus` from TaskAdd (may cause issues on e-ink keyboard)

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

### Lasso OCR (Session 4)
- `PluginCommAPI.recognizeElements(elements, {width, height})` -- **size param is the note page size in pixels, required**
- Without the size param, the call hangs forever (no error, no timeout)
- `PluginFileAPI.getPageSize(notePath, page)` returns page dimensions
- `PluginCommAPI.getLassoElements()` works from lasso toolbar context, returns element array
- OCR quality is good for clear handwriting on Supernote
- Full lasso -> OCR -> TaskAdd flow takes ~2-5 seconds on device

### Config button routing (Session 4)
- `PluginManager.registerConfigButtonListener({onClick: ...})` -- callback is `onClick`
- Config button event fires BEFORE React component mounts
- Must capture initial button ID in index.js (global) and read synchronously during useState init
- Listeners in useEffect catch subsequent presses but miss the initial one
- InkGames plugin is a good reference implementation for Supernote plugin patterns

### Todoist API v1 response format
- **Response is paginated:** `{results: [...], next_cursor: "..."}` -- NOT a bare array
- `getTasks()` and `getProjects()` now handle pagination with `fetchAllPages` loop
- The REST v2 API (`/rest/v2`) returns 410 Gone as of April 2026
- Base URL: `https://api.todoist.com/api/v1`
- Subtasks supported via `parent_id` field on tasks (not yet implemented)

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

### E-ink UI learnings (Session 3)
- **Horizontal ScrollView swallows taps** -- ProjectPicker was unresponsive until replaced with flexWrap View
- **Side effects in render body cause infinite loops** -- `log()` during render triggers listener -> setState -> re-render -> log(). Must use useEffect.
- **E-ink doesn't refresh on identical-looking content swaps** -- list -> spinner -> list (same data) shows no visible change. Tab switch forces redraw.
- **`keyboardShouldPersistTaps="handled"` needed on ScrollViews** -- otherwise taps near TextInputs get swallowed on Android
- **Position-absolute overlays work well for status messages** -- no layout shift, doesn't push form content around

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
  App.tsx               -- root component, stack navigation, debug viewer
  config.local.js       -- API token + debugServerUrl (gitignored, bundled at build time)
  dev-server.js         -- local Node server for receiving debug logs over wifi
  PluginConfig.json     -- plugin metadata (supertask001, v0.1.0)
  package.json          -- deps: RN 0.79.2, sn-plugin-lib ^0.1.19
  PROGRESS.md           -- this file
  src/
    api/todoist.js      -- Todoist API v1 client, pagination, response unwrapping
    utils/
      config.js         -- config loader (bundled token, in-memory runtime config)
      debug.js          -- debug logger with HTTP export to dev server
    components/
      TaskRow.tsx        -- reusable task row (checkbox + content + priority + due)
      TabBar.tsx         -- horizontal tab strip
      SectionHeader.tsx  -- group divider with title + count + optional arrow
      PriorityPicker.tsx -- P1-P4 toggle buttons
      ProjectPicker.tsx  -- project toggle buttons (flexWrap, not horizontal scroll)
      DatePicker.tsx     -- month-grid calendar for e-ink
    screens/
      TaskHome.tsx       -- tabbed home (Today / Upcoming / Projects)
      ProjectView.tsx    -- single project drill-down (Overdue/Today/Upcoming/No Date)
      TaskDetail.tsx     -- edit/complete/delete task, date picker, floating overlay
      TaskAdd.tsx        -- create new task, date picker, add-another flow (pending)
      Capture.tsx        -- lasso OCR or DOC text capture, submit to Todoist
      Config.tsx         -- settings UI (API token, project toggles, default tab)
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
- `getTasks()` and `getProjects()` now unwrap the response
- **Task list now loads 29 tasks successfully**

**Dev log server working:**
- `dev-server.js` zero-dependency Node HTTP server, logs to terminal + files
- Confirmed on-device via fetch() POST

### 2026-04-26 -- Session 3: UI redesign, on-device testing

**Full task viewer redesign (Phase 2):**
- Stack-based navigation in App.tsx (push/pop/resetTo)
- TaskHome: tabbed view (Today/Upcoming/Projects) with grouped task lists
- ProjectView: single project drill-down with Overdue/Today/Upcoming/No Date sections
- TaskDetail: edit/complete/delete with floating status overlay, stays on screen after save
- TaskAdd: create task form with Log button for debugging
- 5 shared components: TaskRow, TabBar, SectionHeader, PriorityPicker, ProjectPicker
- DatePicker: month-grid calendar for e-ink, wired into TaskDetail and TaskAdd

**API enhancements:**
- Cursor-based pagination via fetchAllPages loop
- getTasksByProject(projectId)
- unwrapResult helper (deduplicates response unwrapping)
- updateTask with proper field mapping (dueString -> due_string, projectId -> project_id)

**On-device testing results:**
- Task list loads 30 tasks, 6 projects (confirmed via logs)
- Editing a task and saving works -- changes appear in Todoist app
- Tab switching works (Today/Upcoming/Projects)
- Project drill-down works
- Horizontal ScrollView in ProjectPicker swallowed taps -- fixed with flexWrap View
- log() in render body caused infinite loop crash -- fixed with useEffect
- E-ink doesn't visually refresh on Refresh tap (data loads fine, display doesn't redraw)

**Bugs found and fixed:**
1. Crash on launch: log() in App render body -> infinite re-render via listener setState
2. ProjectPicker taps not registering: horizontal ScrollView -> flexWrap View
3. TaskDetail kicked back after save: removed nav.pop(), now stays with "Saved" overlay

**Design decisions for Phase 3:**
- Post-action workflows: save stays, create offers "Add Another" / "Done", complete/delete pop back
- Unified settings screen: project filters, default project, default tab, post-action behavior, default screen, API key editing
- Subtasks via parent_id: deferred to Phase 4

### 2026-04-26 -- Session 4: Phase 3, config fixes, lasso capture working

**Phase 3: Post-action workflows + config:**
- TaskAdd: "Add Another" / "Done" overlay after task creation (replaces auto-pop). Keeps project and priority for rapid batch entry. Respects `postCreateAction` config setting.
- TaskHome: silent refresh (skip spinner on manual refresh, just swap data) fixes e-ink non-redraw issue.
- Config screen: expanded with default tab, post-create behavior, default screen, project filters, default project. Settings show immediately when token exists (not gated behind Test Connection). Auto-fetches projects on mount. Save button in header with floating "Saved!" overlay.
- Config: `defaultProjectId`, `postCreateAction`, `defaultScreen` added to config schema.

**Config button routing fix (major debugging session):**
- Config button was never routing to Config screen. Root cause: two issues.
  1. Wrong callback name: `onConfigButtonPress` should be `onClick` (discovered by studying InkGames plugin)
  2. Race condition: listener in index.js set global, but React useEffect read it too late
- Fix: global set in index.js (catches initial press before React mounts) + listeners registered in App.tsx useEffect (catches subsequent presses). Both `onClick` and `onConfigButtonPress` registered as belt-and-suspenders.
- Button ID type coercion added (SDK may pass string or number).

**Lasso capture (Phase 5) working end-to-end:**
- `getLassoElements()` works, returns element array
- `recognizeElements(elements, size)` requires TWO parameters -- the second is `{width, height}` of the note page in pixels. We were only passing elements, causing it to hang forever.
- Page size fetched via `PluginFileAPI.getPageSize(notePath, page)` with A5X fallback (1404x1872)
- Capture.tsx is now a thin OCR bridge: runs recognition, then navigates to TaskAdd with content pre-filled
- On-screen trace log for debugging without dev server (since HTTP logs sometimes don't reach)
- All SDK calls wrapped with timeouts (10-30s) so the screen can't hang forever

**Key SDK learnings:**
- `PluginManager.registerConfigButtonListener({onClick: ...})` -- callback is `onClick`, not `onConfigButtonPress`
- `PluginCommAPI.recognizeElements(elements, {width, height})` -- second param is note page size in pixels, required
- `PluginFileAPI.getPageSize(notePath, page)` -- returns page dimensions needed for OCR
- Config button event fires BEFORE React mounts -- must capture via global in index.js
- Listeners registered in useEffect need refs to avoid stale closures

**What to do next session:**
- Phase 4: Subtasks (parent_id support)
- Phase 6: Doc capture (PDF text selection -- similar to lasso but no OCR needed)
- Config persistence investigation (Phase 7)
- Config screen redesign (noted as needed, functional but could be cleaner)
- Remove on-screen trace from Capture once OCR is stable
- Test Add Another / Done flow on device
