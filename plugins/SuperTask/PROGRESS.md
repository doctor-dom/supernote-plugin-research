# SuperTask

Lasso-to-Todoist plugin for Supernote. Design doc: `docs/plugin-taskharvest-v2.md`

## Status

**Session 12 in progress.** Testing `deleteLassoElements` approach for Convert to Text. Build `1fa8b3f`.

| Phase | Status | Summary |
|-------|--------|---------|
| 1a: Scaffold | Done | Plugin structure, button registration, screen routing |
| 1b: Config + connection | Done | Todoist API v1 verified on-device (29 tasks) |
| 1c: Dev tooling | Done | HTTP dev log server streaming to Mac |
| 2: Task viewer | Done | Stack nav, tabbed home, project drill-down, detail/add, date picker |
| 3: Post-action + config | Done | Add Another/Done/View Task flow, silent refresh, tabbed config |
| 5: Lasso capture | Done | Handwriting OCR via recognizeElements, pre-fills TaskAdd |
| 5b: Task marking | Done | setLassoStrokeLink (dashed border + link icon) confirmed on-device |
| 5c: This Page | Done | Confirmed working on-device (shows tasks for current note/page) |
| 5d: Mark as Text | Done | Post-action replaces handwriting with editable typed text + dashed border. Configurable font size and Todoist link. |
| 5e: Quick-add overlay | **In progress** | Overlay working. Convert to Text being reworked (was replaceElements, now deleteLassoElements). |
| Debug mode | Done | Toggle in Config Preferences, hides Log/trace when OFF |
| 9: Task dashboard | Unblocked | All APIs confirmed: createNote, insertTextLink, insertNotePage, replaceElements. Ready to build. |
| 4: Subtasks | Backlog | parent_id support, subtask list in detail view |
| 6: Doc capture | Backlog | PDF text selection, same flow as lasso |
| 7: Config persistence | Blocked | SDK has no writeFile, saveTextToFile not exposed to JS |
| 8: Polish | Backlog | Loading states, error handling, empty states |
| Offline mode | Future | Queue tasks locally, sync to Todoist when wifi available |

## Session 12 -- current state

Latest build: `1fa8b3f` (on `supertask-ui-redesign` branch)

### What changed from Session 11

**Abandoned `replaceElements` for Convert to Text.** The file-level `getElements` -> filter -> `replaceElements` -> `reloadFile` pipeline had fatal problems:
- Error 502/602: native cross-reference validation (`controlTrailNums` in link/title elements) fails unpredictably. Removing all type 600/100 elements didn't reliably fix it -- sometimes `getElements` returns link elements with type 600 that we can filter, sometimes it doesn't.
- Position shifts: `replaceElements` causes other strokes on the page to visually move, ruining adjacent handwriting.

**New approach: `lassoElements(bounds)` + `deleteLassoElements()`.**
Since the lasso expires during auto-mark (insertText/saveCurrentNote kills it), we programmatically re-create the lasso via `lassoElements(handwritingBounds)` and then `deleteLassoElements()`. This lets the native layer handle element deletion and cross-reference cleanup.

### Convert to Text flow (current build `1fa8b3f`)

```
1. lassoElements(handwritingBounds)   -- re-select the handwriting
2. getLassoElements()                  -- DIAGNOSTIC: log what was captured
3. deleteLassoElements()               -- delete (native handles cross-refs)
4. saveCurrentNote()                   -- persist deletion
5. reloadFile()                        -- force display refresh
6. insertText(typed text)              -- editable text at handwriting position
7. insertText(T badge)                 -- re-insert (delete may have caught it)
8. saveCurrentNote()                   -- persist inserts
9. lassoElements(textRect)             -- select text for repositioning
10. setLassoStrokeLink() (config ON)   -- dashed border + Todoist link
```

### Auto-mark flow (unchanged, runs on task submit)

```
1. setLassoStrokeLink() (config ON)    -- dashed border on original lasso
2. insertText(T badge)                 -- 26x26 bordered "T" to the left
3. saveCurrentNote()                   -- persist
```

### What's been tested (Session 12, build `1fa8b3f`)

| Test | Config | Action | Result | Notes |
|------|--------|--------|--------|-------|
| Auto-mark, config OFF | OFF | Submit only | T badge appears | T badge position slightly off (too close to handwriting, appears above) |
| Auto-mark, config ON | ON | Submit only | T badge + dashed border + link | Looks good |
| Convert, config ON | ON | Submit + Convert | Handwriting removed, typed text + dashed border | Works! T badge lost (caught by re-lasso) |
| Convert, config OFF | OFF | Submit + Convert | Handwriting NOT removed, typed text overlaid | `deleteLassoElements` returns success but strokes remain visible |

### Open issues being investigated

1. **Config OFF Convert to Text: strokes not removed.** `deleteLassoElements` returns `{result: true, success: true}` but handwriting remains visible. Two hypotheses:
   - Display not refreshing: strokes deleted from data but e-ink not updated. Build `1fa8b3f` adds `reloadFile()` after delete to test this.
   - Re-lasso capturing wrong elements: `lassoElements(bounds)` might select non-stroke elements (T badge) instead of the handwriting. Build `1fa8b3f` adds `getLassoElements()` diagnostic to log exactly what was captured.

2. **Config ON Convert to Text: T badge lost.** The re-lasso catches the T badge (only 4px gap). Fixed in `1fa8b3f`: gap increased to 16px, and T badge is re-inserted after delete.

3. **OCR null results on dirty pages.** `recognizeElements` returns `{success: true, result: null}` on pages with mixed element types (text boxes, links from previous tests). Fixed in `1fa8b3f`: filter to stroke-only elements (type 200) before passing to recognizer.

### Parameter corrections made

- **`textEditable: 0` = editable, `1` = not editable** (counterintuitive). Convert to Text was using `1` (not editable), now uses `0`.
- **`textFrameWidthType: 1` = auto-width** (system sizes to fit). Was using `0` (fixed width with manual char-count estimate).
- **T badge gap**: `bounds.left - badgeW - 16` (was `-4`, too close, caught by re-lasso).

### Key SDK discovery: lasso lifecycle

The original user lasso **expires** after `insertText()` + `saveCurrentNote()` during auto-mark. `deleteLassoElements()` without re-lasso returns error 904. But `lassoElements(rect)` can programmatically re-create a lasso context that `deleteLassoElements()` accepts.

Config ON vs OFF difference during Convert to Text:
- Config ON: `setLassoStrokeLink` was called during auto-mark, converting strokes to linked strokes. When re-lasso'd, `deleteLassoElements` removes both strokes and their link elements.
- Config OFF: strokes are plain. `deleteLassoElements` returns success but strokes remain (needs investigation -- may be display refresh or lasso capturing wrong elements).

### Dev tooling

- **Log buffer increased to 500** (was 50). Previous buffer was too small for multi-test sessions.
- **Inkling skill installed** at `.claude/skills/inkling/`. Provides Supernote plugin API reference, patterns, and type definitions. Complements CLAUDE.md with PluginDocAPI, native floating windows, sticker APIs, coordinate conversion utilities.

## Backlog

1. **Dashboard v1** -- all APIs confirmed. Build single-page dashboard with bidirectional links using createNote + insertTextLink + insertNotePage.
2. **Config redesign** -- settings screen is getting bloated. Needs reorganization as features accumulate.
3. **Test Convert to Text with dense handwriting** -- verify on pages with lots of handwriting.

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

### Element coordinates (Sessions 5-6)
- Lasso element `maxX`/`maxY` are **page-level constants, NOT stroke positions**
  - All elements return identical values (e.g., maxX=20967, maxY=15725 for all 6-25 elements)
  - These are the EMR digitizer boundary, not individual stroke extents
- **Actual stroke positions** are in `element.stroke.points` (an `ElementDataAccessor`)
  - Async lazy loader: `await element.stroke.points.get(index)` returns `{x, y}` in EMR coords
  - `element.stroke.points._size` gives point count
  - Read first/last point of each stroke to compute bounding box
  - Confirmed working on-device: returns real EMR coordinates that vary by stroke position
- EMR-to-pixel conversion (axis mapping):
  - EMR X axis -> Android Y (direct scale: `pixelY = emrX / scaleX`)
  - EMR Y axis -> Android X (mirrored: `pixelX = pageWidth - 1 - emrY / scaleY`)
  - `scaleX = realMaxX / (pageHeight - 1)`, `scaleY = realMaxY / (pageWidth - 1)`
- **Device EMR range detection**: page size alone is NOT reliable for determining EMR maximums
  - Nomad reports page size 1404x1872 but uses A5X2-range EMR values (max 21632/16224)
  - Detect from actual element data: if any EMR value > 15819, use A5X2 range
  - Normal range: maxX=15819, maxY=11864 (for 1404x1872)
  - A5X2 range: maxX=21632, maxY=16224 (for 1920x2560)
- Element keys from lasso: `stroke, angles, contoursSrc, status, numInPage, recognizeResult, maxY, thickness, pageNum, maxX, layerNum, type, uuid`
- Stroke keys: `recognPoints, markPenDirection, penColor, eraseLineTrailNums, pressures, penType, flagDraw, points`

### OCR sensitivity (Session 5)
- `recognizeElements` returns `success: false` when lasso captures strokes from adjacent lines
- Even reasonable visual distance between lines can cause failure if stroke elements overlap
- Works fine with isolated handwriting (13 elements, clear separation)

### Inserting elements on note pages (Sessions 5-7)

**`PluginNoteAPI.insertText()` -- WORKS (confirmed on-device)**
- Inserts on CURRENT note page (no filePath/page params needed)
- Uses pixel coordinates: `textRect: {left, top, right, bottom}`
- Required: `textContentFull` (non-empty string), `textRect`
- Optional: `fontSize`, `textBold`, `textAlign`, `textFrameStyle` (3=stroke border), `textEditable`, `textItalics`, `textFrameWidthType`
- Works even while plugin UI is showing (note is underneath)

**`PluginNoteAPI.setLassoTitle({style})` -- WORKS but pollutes TOC**
- Applies title styling to lasso-selected strokes while lasso context is active
- Styles: 0=remove, 1=black background, 2=light gray, 3=dark gray, 4=shadow
- Confirmed on-device: `{result: true, success: true}` with style 1
- **Problem**: Title elements show up in Supernote's Table of Contents. Not viable for task marking.

**`PluginNoteAPI.setLassoStrokeLink({destPath, destPage, style, linkType})` -- WORKS (confirmed Session 8)**
- Makes lasso-selected strokes into a tappable link with visible dashed border + link icon
- Styles: 0=solid underline, 1=solid border, 2=dashed border
- Link types: 0=note page, 1=note file, 2=document, 3=image, 4=URL
- Does NOT affect TOC (unlike setLassoTitle)
- Must be called while lasso context is active (same timing as setLassoTitle)
- Link is functional -- tapping opens browser/target

**`PluginNoteAPI.insertTextLink()` -- WORKS (confirmed Session 8)**
- Inserts a tappable text link element on current note page
- Params: destPath, destPage, style, linkType, rect, fontSize, fullText, showText, isItalic
- Returns `{result: 0, success: true}` on success
- **Requires active note context** -- fails with error 102 if no note is open

**`PluginFileAPI.insertElements()` -- FAILS with error 106**
- JS-side schema validation passes, but native layer rejects with code 106: "Invalid API parameters"
- Tested with Link (600), Text (500), AND Title (100) element types -- ALL fail
- Error 107 (JS validation) fires for negative coordinates; 106 is native-side rejection

**Element type schemas (from SDK VerifyUtils.ts):**
- **Link (600)**: category (required), X/Y/width/height (required, min:0), style (required), linkType (required), destPath, fullText, showText
- **Text (500)**: textContentFull (required, nonEmpty), textRect (required, non-zero-area), fontSize (min:1), textBold, textAlign, textFrameStyle, textEditable
- **Title (100)**: X/Y/width/height (min:0), style, controlTrailNums -- NO required fields in title sub-object
- **Geometry (700)**: validated via GeometrySchema
- All elements need `layerNum: 0` for the main drawing layer

### Overlay UI pattern (Session 7)
- Full-screen takeover is NOT required. Community plugins (sn-calc) achieve pop-up overlays with same `showType: 1`
- Technique: root component `flex: 1, backgroundColor: 'transparent'`, content in a fixed-width centered panel
- Outer Pressable with `onPress={closePluginView}` for tap-outside-to-dismiss
- Inner panel `stopPropagation()` to prevent dismiss on panel taps
- Supernote renders plugin RN view with transparent background, note page visible underneath

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

### Session 6 -- 2026-05-02/03: Coord fix, debug toggle, task marking iteration

**Debug mode toggle:**
- `debugMode: false` default in config
- Toggle in Config > Preferences tab (checkbox at bottom)
- When OFF: hides Log buttons in TaskHome, TaskAdd, Capture; hides capture trace (shows "Processing..." instead)
- When ON: everything works as before
- Logs still collect in memory regardless of mode (available for error diagnostics)
- Bug fix: `exportLog()` was gated on `_debugMode` flag which was only set at app mount. Toggling debug mode in Config mid-session didn't update the flag. Fixed by always allowing explicit Upload Log.

**EMR coordinate investigation (5 on-device test builds):**
1. Initial: element maxX/maxY assumed to be stroke positions. Computed pixel bounds with negative values (left=-457). `insertElements` error 107: "link.X must be >= 0"
2. Discovered device (Nomad) uses A5X2 EMR range despite 1404x1872 page size. Fixed by detecting range from actual EMR values instead of page size. Bounds now positive but `insertElements` error 106: "Invalid API parameters" from native layer.
3. Switched from `insertElements` (Link+Text) to `insertText` (proven working from debug log export). API returns success=true, but "T" badge placed at bottom of page (y=1753) while handwriting was elsewhere.
4. Key discovery: **element maxX/maxY are page-level constants, identical across all elements** (20967/15725 for all 6-25 elements). They're the EMR page boundary, not stroke positions.
5. Read actual stroke point data via `ElementDataAccessor`: `await el.stroke.points.get(0)` returns real EMR {x,y} coordinates. Bounding box now computed from real stroke positions -- positioning confirmed correct.
6. "T" badge now appears at correct position but is too small (26x26px). User wants header-style marking (Title element with black background). Current build tries `insertElements` with Title (type 100, style 1), falls back to larger text banner.

**"This Page" section -- confirmed working on-device:**
- TaskHome shows tasks with matching `From: {noteName} p.{pageNum}` in description
- Even shows tasks from deleted notes (description matching still works)

**Dev log server issues:**
- Stale node process can hold port 3000 without accepting connections. Kill by PID before restarting.
- Must use full path: `node "/Users/alex/Library/Mobile Documents/com~apple~CloudDocs/Work/supernote-plugin-research/plugins/SuperTask/dev-server.js"`
- `debugServerUrl` in config.local.js is baked into build at bundle time

### Session 7 -- 2026-05-03/12: Task marking confirmed, design docs, API research

**On-device testing results:**
- `setLassoTitle({style: 1})` confirmed working -- black header applied to lasso'd strokes, `{result: true, success: true}`
- `insertElements` with Title (type 100) confirmed failing -- error 106, same as Link and Text types. All insertElements paths are dead ends.
- T badge via `insertText` confirmed working -- 32x32 bordered "T" placed to the left of handwriting
- Todoist API 502/503 errors observed -- added retry logic (up to 2 retries with 1.5s/3s delays)
- OCR misread: "Testing again" recognized as "i /i" (15 stroke elements). OCR accuracy is an SDK limitation, not a plugin bug.

**Design decision: Title pollutes TOC**
- `setLassoTitle` creates Title elements that appear in Supernote's Table of Contents
- Every task-marked handwriting would show as a TOC heading -- not viable
- Switching to `setLassoStrokeLink` (dashed border, no TOC impact) for task marking

**SDK API research (from source code):**
- Discovered `setLassoStrokeLink` -- applies visible border to strokes + makes them tappable links
- Discovered `insertTextLink` -- inserts tappable text link element (key for dashboard)
- Discovered `insertNotePage` -- adds pages to existing notes
- Discovered `openFilePath` -- may open .note files from plugin
- All untested on-device -- queued for next build

**Design docs created:**
- `docs/design-task-linking.md` -- dashboard concept, inter-note linking, bidirectional navigation. Option B chosen (stroke link to dashboard note + T badge matching mockup SVG).
- `docs/design-capture-workflow.md` -- streamlined post-action flow. "Mark as Text" replaces handwriting with typed text at same position, left lasso'd for user editing. No font size computation, fixed 20px default.

**Overlay UI research:**
- Analyzed sn-calc community plugin (github.com/taoist22/sn-calc v2.1.0-beta)
- Pop-up overlay is purely CSS/layout, same `showType: 1`. Transparent root + centered fixed-width panel.
- Planned: lasso capture uses compact overlay, toolbar button keeps full-screen TaskHome

**Code changes this session:**
- `todoist.js`: Added retry logic for 5xx errors (502, 503) with up to 2 retries
- `Capture.tsx`: Added `setLassoTitle({style: 1})` call after OCR (to be replaced with `setLassoStrokeLink`)
- `TaskAdd.tsx`: Removed dead `insertElements` Title code, added `titleApplied` flag to skip redundant marking, improved insertText fallback (fontSize 20, wider box), added T badge insertion
- `CLAUDE.md`: Added "check SDK source first" protocol for problem-solving

### Session 8 -- 2026-05-12: setLassoStrokeLink confirmed, all dashboard APIs pass

**setLassoStrokeLink -- confirmed working on-device:**
- Replaced `setLassoTitle({style: 1})` with `setLassoStrokeLink({destPath: 'https://todoist.com', destPage: 0, style: 2, linkType: 4})`
- Dashed border appears around lasso'd strokes with a link icon
- Link is tappable -- opens device browser to todoist.com (placeholder URL for testing)
- Does NOT pollute Table of Contents (unlike setLassoTitle)
- T badge via insertText still works alongside the stroke link

**Dashboard API diagnostics -- all 7 tests pass:**
- Built Diagnostics screen to probe APIs needed for dashboard
- Key finding: all APIs require active note context. Tests fail with error 102 ("not allowed") when run from Config screen (no note context). All pass when run from TaskHome with note open.
- `getNoteSystemTemplates()` -- 28 templates, objects with `{name, hUri, vUri}` fields
- `createNote({notePath, template: 'style_white', mode: 0, isPortrait: true})` -- works with `Template.name` and full absolute path (`/storage/emulated/0/Note/...`)
- `insertTextLink({destPath, destPage, style, linkType, rect, fontSize, fullText, showText, isItalic})` -- works, `{result: 0, success: true}`
- `insertNotePage({notePath, page, template: 'style_white'})` -- works, appends page
- `replaceElements(notePath, page, elements)` -- works (roundtrip read/write)
- `openFilePath(path)` -- works but ejects from note to file manager (not useful for dashboard)
- Error 102 is NOT a permission restriction -- it means "no active note context available"

**Code changes:**
- `Capture.tsx`: Replaced setLassoTitle with setLassoStrokeLink (style 2 = dashed border, linkType 4 = URL)
- `TaskAdd.tsx`: Renamed `titleApplied` to `strokeLinkApplied` throughout
- `Diagnostics.tsx`: New screen -- tests dashboard APIs with timeouts, proper absolute paths, per-attempt error logging
- `App.tsx`: Added Diagnostics screen routing
- `Config.tsx`: Added API Diagnostics button (debug mode only)
- `TaskHome.tsx`: Added Diag button in header (debug mode only)

### Session 9 -- 2026-05-13: Mark as Text post-action complete

**Mark as Text -- confirmed working on-device (10+ test builds):**
- Post-create overlay shows "Mark as Text" button for lasso captures with noteContext
- Replaces handwriting strokes with editable typed text at same position
- Dashed border + link icon via setLassoStrokeLink on TextBox element
- Re-lassoed via lassoElements(rect) for immediate adjustment
- Font size 32 default, configurable (24/28/32/36/40) in Config Preferences
- Todoist link optional (toggle in Config), defaults to self-referencing note link

**Key SDK discoveries:**

*Element matching between APIs:*
- `getLassoElements()` and `getElements()` return different UUIDs for the same elements
- Match by `numInPage` instead -- stable identifier across both APIs
- Lasso elements have key `numInPage` that corresponds to page element `numInPage`

*Link element structure:*
- Link elements (type 600) have `link.controlTrailNums` array containing the `numInPage` values of referenced strokes
- Use `controlTrailNums` overlap to surgically identify which links reference specific strokes
- Removing strokes without their associated link elements causes error 502 ("Invalid element index for the link")

*File vs in-memory state:*
- `PluginNoteAPI` methods (insertText, saveCurrentNote) operate on in-memory note state
- `PluginFileAPI` methods (getElements, replaceElements) operate on the .note file directly
- After `replaceElements`, the display still shows stale in-memory state
- `PluginCommAPI.reloadFile()` forces the display to sync from file -- required after replaceElements
- `insertText` must run BEFORE `replaceElements` since replaceElements can sever the note binding (error 105)

*Lasso context lifetime:*
- Lasso context expires after navigating away from Capture.tsx to TaskAdd
- `deleteLassoElements()` returns error 904 ("No lasso action has been performed") from TaskAdd
- Solution: use getElements -> filter by numInPage -> replaceElements instead

*New APIs confirmed on-device:*
- `PluginCommAPI.lassoElements(rect)` -- programmatically creates lasso selection in pixel coordinates. Works on-device despite not being in TypeScript source.
- `PluginCommAPI.reloadFile()` -- forces display refresh from file state
- `PluginNoteAPI.setLassoStrokeLink` supports TextBox elements (type 500), not just strokes -- confirmed via docs and on-device

*insertText vs insertTextLink:*
- `insertTextLink` creates an atomic link element (type 600) -- breaking the link removes the text entirely
- `insertText` creates an editable text box (type 500) -- text survives link removal
- Hybrid approach: insertText + lassoElements + setLassoStrokeLink gives editable text with dashed border + link
- `textEditable: 0` = editable (not 1, which means NOT editable)
- `textFrameStyle: 0` = no border (native), `3` = stroke border
- `textFrameWidthType: 1` = auto width (system sizes to fit content)

*Dashed border behavior:*
- Dashed border is the link's visual style (style 2 from setLassoStrokeLink)
- Breaking/removing the link also removes the dashed border -- they are one and the same
- No known way to have a persistent dashed border without a link via this API
- Edge case for future investigation: textFrameStyle values beyond 0 and 3

**Code changes:**
- `TaskAdd.tsx`: Added Mark as Text handler with full pipeline (insertText -> getElements -> filter by numInPage -> replaceElements -> reloadFile -> lassoElements -> setLassoStrokeLink). Configurable font size and Todoist link toggle.
- `Capture.tsx`: Collects lasso element IDs (uuid, numInPage, type) for later matching in TaskAdd
- `Config.tsx`: Added "Mark as Text Font Size" picker (24-40) and "Link to Todoist Task" toggle in Preferences

### Session 10 -- 2026-05-13/14: Quick-add overlay, workflow redesign

**Quick-add overlay -- confirmed working on-device:**
- New `QuickAdd.tsx` screen: combines OCR capture + compact add form in a centered panel over the note page
- Transparent root background lets the note show through, tap outside to dismiss
- Lasso button (200) routes to QuickAdd overlay, toolbar button (100) keeps full-screen TaskHome
- Form: task title (pre-filled from OCR, editable), priority, project, description
- "Tasks" link in header to jump to TaskHome, "View Tasks" button in success phase

**Pre-confirmation marking removed from all screens:**
- `setLassoStrokeLink` was firing DURING capture (before task creation) in Capture.tsx and QuickAdd.tsx -- removed
- `insertTaskMark` (auto T badge) was firing on submit in TaskAdd.tsx -- removed along with the function
- `strokeLinkApplied` field removed from NoteContext type across all files
- All note marking is now strictly post-confirmation and user-initiated

**Stale screen state bug found and fixed:**
- Symptom: second lasso capture showed stale "Task added!" success screen from previous capture, no OCR ran
- Root cause: `resetTo('capture-lasso')` when current screen is already `capture-lasso` -- React reuses the component instance, `useEffect([], [])` doesn't re-fire
- Fix: `ScreenEntry` now carries a unique `id` counter (incremented on push/replace/resetTo), all screen components use `key={current.id}` to force fresh React instances

**Workflow redesign approved (not yet implemented):**
- See `docs/workflow-lasso-capture.svg` for the full approved workflow diagram
- Key changes: auto-mark on submit (dashed border on handwriting immediately after task creation), "Mark as Text" renamed to "Convert to Text" (optional, replaces handwriting with typed text), standalone "Mark" button removed
- Link destination respects "Link to Todoist Task" config toggle for both auto-mark and Convert to Text
- Lasso selection stays active after both operations for repositioning
- See "Session 10 remaining work" section above for detailed implementation instructions

**Code changes this session:**
- `QuickAdd.tsx`: New file -- overlay capture + compact add form, OCR, mark handlers, applyStrokeLink helper
- `App.tsx`: Added QuickAdd import/route, transparent container for overlay, `navIdCounter` + `key={current.id}` on all screens
- `Capture.tsx`: Removed setLassoStrokeLink block, removed unused PluginNoteAPI import
- `TaskAdd.tsx`: Removed insertTaskMark function + call, removed strokeLinkApplied from NoteContext, added handleMark + applyStrokeLink (to be refactored per workflow)
- `docs/workflow-lasso-capture.svg`: New approved workflow diagram
