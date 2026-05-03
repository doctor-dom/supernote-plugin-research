# SuperTask

Lasso-to-Todoist plugin for Supernote. Design doc: `docs/plugin-taskharvest-v2.md`

## Status

**Session 6 in progress.** EMR-to-pixel coord fix applied, debug mode toggle added. Ready for on-device test of task marking.

| Phase | Status | Summary |
|-------|--------|---------|
| 1a: Scaffold | Done | Plugin structure, button registration, screen routing |
| 1b: Config + connection | Done | Todoist API v1 verified on-device (29 tasks) |
| 1c: Dev tooling | Done | HTTP dev log server streaming to Mac |
| 2: Task viewer | Done | Stack nav, tabbed home, project drill-down, detail/add, date picker |
| 3: Post-action + config | Done | Add Another/Done/View Task flow, silent refresh, tabbed config |
| 5: Lasso capture | Done | Handwriting OCR via recognizeElements, pre-fills TaskAdd |
| 5b: Task marking | Built | EMR-to-pixel conversion applied, needs on-device test |
| 5c: This Page | Built | TaskHome shows tasks linked to current note/page |
| Debug mode | Done | Toggle in Config Preferences, hides Log/trace when OFF |
| 4: Subtasks | Next | parent_id support, subtask list in detail view |
| 6: Doc capture | Backlog | PDF text selection, same flow as lasso |
| 7: Config persistence | Blocked | SDK has no writeFile, saveTextToFile not exposed to JS |
| 8: Polish | Backlog | Loading states, error handling, empty states |

## To test on device

- [ ] Task marking: EMR-to-pixel conversion applied, verify border + badge placement
- [ ] "This Page" section in TaskHome (needs tasks with matching `From:` descriptions)
- [ ] Debug mode toggle (Preferences tab, should hide Log buttons when OFF)

## To build next

1. **Phase 4: Subtasks** -- `parent_id` mapping in create/update. Subtask list in TaskDetail.
2. **Phase 6: Doc capture** -- PDF text selection, similar to lasso but no OCR.

## Architecture

### Entry points (index.js)

| Button ID | Type | App | Action |
|-----------|------|-----|--------|
| 100 | Toolbar | NOTE | "Tasks" -- opens TaskHome |
| 200 | Lasso bar | NOTE | "Add Task" -- Capture (OCR) then TaskAdd |
| 300 | Toolbar | DOC | "Add Task" -- Capture (doc text) then TaskAdd |
| Config | Config button | -- | Opens Config screen |

### Screen flow

```
TaskHome (Today/Upcoming/Projects tabs, "This Page" section)
  -> ProjectView (single project drill-down)
  -> TaskDetail (edit/complete/delete)
  -> TaskAdd (create, with Add Another/View Task/Done)
     -> View Task replaces TaskAdd (Back goes to TaskHome)

Capture (lasso OCR or doc text) -> TaskAdd (pre-filled, marks note on submit)

Config (Connections tab / Preferences tab)
```

### File structure

```
plugins/SuperTask/
  index.js                 -- entry point, button registration, global routing
  App.tsx                  -- root component, stack navigation, debug viewer
  config.local.js          -- API token + debugServerUrl (gitignored, bundled at build)
  dev-server.js            -- zero-dep Node server for debug logs over wifi
  PluginConfig.json        -- plugin metadata (supertask001, v0.1.0)
  src/
    api/todoist.js         -- Todoist API v1 client, pagination, response unwrapping
    utils/
      config.js            -- config loader (bundled token, in-memory runtime config)
      debug.js             -- debug logger with HTTP export
    components/
      TaskRow.tsx           -- task row (checkbox + content + priority + due)
      TabBar.tsx            -- horizontal tab strip
      SectionHeader.tsx     -- group divider with title + count
      PriorityPicker.tsx    -- P1-P4 toggle buttons
      ProjectPicker.tsx     -- project toggle buttons (flexWrap, not ScrollView)
      DatePicker.tsx        -- month-grid calendar for e-ink
    screens/
      TaskHome.tsx          -- tabbed home (Today / Upcoming / Projects)
      ProjectView.tsx       -- single project, sections: Overdue/Today/Upcoming/No Date
      TaskDetail.tsx        -- edit/complete/delete, floating status overlay
      TaskAdd.tsx           -- create task, date picker, add-another flow
      Capture.tsx           -- lasso OCR or doc text capture, navigates to TaskAdd
      Config.tsx            -- settings UI (token, project toggles, defaults)
```

### Dev workflow

```bash
cd plugins/SuperTask && node dev-server.js   # 1. Start log server
bash buildPlugin.sh                          # 2. Build
# 3. Copy build/outputs/SuperTask.snplg to Supernote via USB (MyStyle/)
# 4. Settings > Apps > Plugins > Install
# 5. Open note, tap plugin button, test
# 6. Log > Upload Log to send debug output to terminal
```

---

## Known issues

**E-ink refresh on data reload** -- tapping Refresh loads data (confirmed via logs) but display doesn't visibly update until a tab switch forces redraw. Partially fixed with silent refresh (skip spinner, just swap data). May need further work.

**Config is in-memory only** -- all settings lost on plugin restart. Bundled `config.local.js` covers API token and debug URL. Full persistence deferred to Phase 7.

---

## SDK learnings

### Lasso OCR
- `PluginCommAPI.recognizeElements(elements, {width, height})` -- size param is note page size in pixels, **required**
- Without size param the call hangs forever (no error, no timeout)
- `PluginFileAPI.getPageSize(notePath, page)` returns page dimensions
- `PluginCommAPI.getLassoElements()` returns element array from lasso toolbar context
- Full lasso -> OCR -> TaskAdd flow takes ~2-5 seconds on device

### Config button routing
- `PluginManager.registerConfigButtonListener({onClick: ...})` -- callback is `onClick`, not `onConfigButtonPress`
- Config button fires BEFORE React mounts -- must capture via global in index.js
- Listeners in useEffect catch subsequent presses but miss the initial one

### Todoist API v1
- Paginated: `{results: [...], next_cursor: "..."}` not a bare array
- Base URL: `https://api.todoist.com/api/v1`
- REST v2 (`/rest/v2`) returns 410 Gone as of April 2026
- Subtasks via `parent_id` field (not yet implemented)

### SDK method locations
- **PluginCommAPI**: `getCurrentFilePath()`, `getCurrentPageNum()`, `getNoteSystemTemplates()`, `recognizeElements()`
- **PluginNoteAPI**: `insertText()` (current note only), `saveCurrentNote()`, `getLastElement()`
- **PluginFileAPI**: `insertElements(notePath, page, elements)`, `createNote()`, `getElements()`, `getPageSize()`
- **FileUtils**: `getExportPath()`, `exists()`, `makeDir()`, `copyFile()`, `deleteFile()`, `listFiles()` -- **no `writeFile()`**

### What doesn't work for file I/O
- `FileUtils.writeFile()` -- not in the TurboModule interface
- `fetch('file://...')` -- unverified, likely broken
- `PluginFileAPI.createNote()` with system templates -- error 802
- ADB is locked down (`shell`, `logcat`, `push`, `pull` all fail)

### E-ink UI patterns
- Horizontal ScrollView swallows taps -- use flexWrap View instead
- Side effects in render body cause infinite loops (log() -> listener -> setState -> re-render)
- `keyboardShouldPersistTaps="handled"` needed on ScrollViews with TextInputs
- Position-absolute overlays work well for status messages (no layout shift)

### Element coordinates (Session 5)
- Lasso element `maxX`/`maxY` are in **EMR (digitizer) coordinates**, not pixels
- Example: maxX=20967, maxY=15725 on a 1404x1872 pixel page
- Element keys from lasso: `stroke, angles, contoursSrc, status, numInPage, recognizeResult, maxY, thickness, pageNum, maxX, layerNum, type, uuid`
- Stroke elements (type=0) have no explicit minX/minY -- only maxX/maxY
- Must convert to pixel coordinates before calling `insertElements`
- SDK has `PointUtils.emrPoint2Android()` -- needs testing

### OCR sensitivity (Session 5)
- `recognizeElements` returns `success: false` when lasso captures strokes from adjacent lines
- Even reasonable visual distance between lines can cause failure if stroke elements overlap
- Works fine with isolated handwriting (13 elements, clear separation)

### Insertable element types (Session 5)
- **Link (600)**: X, Y, width, height, style (0=solid underline, 1=solid border, 2=dashed border), linkType (4=URL), destPath
- **Text (500)**: textContentFull, textRect {left, top, right, bottom}, fontSize, textBold, textFrameStyle (3=stroke border)
- **Title (100)**: X, Y, width, height, style (1=black bg, 2=light gray, 3=dark gray, 4=shadow), controlTrailNums
- **Geometry (700)**: type (straightLine, GEO_circle, GEO_ellipse, GEO_polygon), points, penColor, penWidth
- All text/link/title elements must have `layerNum: 0`

### Config persistence (deferred)

| Approach | Result |
|----------|--------|
| `FileUtils.writeFile()` | Method doesn't exist |
| `FileUtils.saveTextToFile()` | Exists in Java but not exposed to JS (confirmed on-device Session 5) |
| `fetch('file://...')` | Unverified, likely broken |
| `createNote()` + `insertElements()` | Error 802: template not found |
| `adb push` | ADB locked down |

**To investigate:** AsyncStorage, Android SharedPreferences via TurboModule

---

## Session log

### Session 1 -- 2026-04-25: Scaffold, first device tests

- Initialized repo, created GitHub remote (apclark31/supernote-plugin-research, private)
- Scaffolded SuperTask from template with 4 entry points
- Build 1: Todoist API 410 Gone (REST v2 deprecated), confirmed fetch() works
- Build 2: "undefined is not a function" from filesystem APIs
- Build 3: Stripped to bundled config only, added debug logging

### Session 2 -- 2026-04-25: API fix, task list working

- Fixed Todoist API v1 pagination (unwrap `{results: [...]}`)
- Task list loads 29 tasks successfully
- Dev log server confirmed working on-device

### Session 3 -- 2026-04-26: UI redesign (Phase 2)

- Stack-based navigation, tabbed home, project drill-down, detail/add screens
- 5 shared components: TaskRow, TabBar, SectionHeader, PriorityPicker, ProjectPicker
- DatePicker: month-grid calendar for e-ink
- On-device: 30 tasks, 6 projects load. Editing + saving works.
- Fixed: infinite loop from log() in render, ScrollView tap swallowing, detail screen pop-back after save

### Session 4 -- 2026-04-26: Phase 3 + 5 complete

- Add Another/Done overlay after task creation
- Silent refresh (skip spinner on manual refresh)
- Expanded Config screen with all settings visible
- Fixed config button routing (onClick callback + global capture for race condition)
- Lasso OCR working: recognizeElements needs page size param, was hanging without it
- Capture.tsx: on-screen trace log, SDK call timeouts, navigates to TaskAdd with OCR text

### Session 5 -- 2026-05-02: UX polish, task marking, config redesign

**On-device testing of Session 4 work:**
- Add Another/Done flow works. View Task button added (navigates to created task's detail)
- Silent refresh works, but replaced ActivityIndicator with static text (animated spinner shows as frozen artifact on e-ink)
- Config button routing works, expanded settings work
- Clipboard.getString() works -- added Paste button for API token input
- `FileUtils.saveTextToFile()` confirmed not available from JS (exists in Java but not exposed)

**UX improvements:**
- TaskAdd overlay: centered modal over form content (was bottom-anchored, blocked by handwriting input)
- View Task uses `nav.replace()` so Back goes to TaskHome, not empty add form
- Config screen: split into Connections and Preferences tabs via TabBar. Defaults to Connections if no token, Preferences if token exists.
- Config layout tightened throughout

**Task marking on notes (built, needs coord fix):**
- After lasso capture + task creation, inserts dashed border (Link element) + T badge (Text element) on note page
- Stores Todoist task URL in the link element's destPath
- Problem: element maxX/maxY are in EMR coordinates (20967, 15725), not pixel coords (1404, 1872). Marks placed off-page.
- Next: convert via PointUtils.emrPoint2Android() or manual ratio conversion

**"This Page" section (built, untested):**
- TaskHome detects current note/page via getCurrentFilePath/getCurrentPageNum
- Filters tasks with matching `From: {noteName} p.{pageNum}` in description
- Shows "THIS PAGE" section above tab content, only when matches exist

**OCR finding:**
- recognizeElements fails (success=false) when lasso grabs strokes from adjacent lines
- Works fine with isolated handwriting

**PROGRESS.md restructured:** dashboard at top for quick scanning, detailed reference below

### Session 6 -- 2026-05-02: Coord fix, debug toggle

**EMR-to-pixel coordinate conversion:**
- Lasso element bounds (maxX/maxY) are in EMR digitizer space, not pixels
- Added manual conversion using SDK axis mapping: EMR X -> Android Y (scaled), EMR Y -> Android X (mirrored)
- Supports both A5X (1404x1872, maxEMR 15819/11864) and A5X2 (1920x2560, maxEMR 21632/16224)
- For stroke elements without explicit minX/minY, estimates bounds from recognized text length
- Both EMR and pixel values logged in Capture trace for debugging
- pageSize now passed through noteContext for TaskAdd debug logging

**Debug mode toggle:**
- `debugMode: false` default in config
- Toggle in Config > Preferences tab (checkbox at bottom)
- When OFF: hides Log buttons in TaskHome, TaskAdd, Capture; hides capture trace (shows "Processing..." instead); suppresses HTTP log uploads
- When ON: everything works as before
- Logs still collect in memory regardless of mode (available for error diagnostics)
