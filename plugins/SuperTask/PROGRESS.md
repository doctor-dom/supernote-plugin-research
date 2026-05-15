# SuperTask

Lasso-to-Todoist plugin for Supernote. Design doc: `docs/plugin-taskharvest-v2.md`

## Status

**Session 17 in progress.** Interactive bidirectional navigation. View Note button works (same-note confirmed). Gesture detector built but motion listener doesn't fire -- active investigation.

| Phase | Status | Summary |
|-------|--------|---------|
| 1a: Scaffold | Done | Plugin structure, button registration, screen routing |
| 1b: Config + connection | Done | Todoist API v1 verified on-device (29 tasks) |
| 1c: Dev tooling | Done | HTTP dev log server streaming to Mac |
| 2: Task viewer | Done | Stack nav, tabbed home, project drill-down, detail/add, date picker |
| 3: Post-action + config | Done | Add Another/Done/View Task flow, silent refresh, tabbed config |
| 5: Lasso capture | Done | Handwriting OCR via recognizeElements, pre-fills TaskAdd |
| 5b: Task marking | Done | Replaced with supertask:// linking (see 10a). T badge removed. |
| 5c: This Page | Done | Element scan + registry + description matching. Confirmed on-device. |
| 5d: Mark as Text | Done | Convert to Text applies supertask:// link to typed text box. |
| 5e: Quick-add overlay | Done | Overlay working. Both Done and Convert to Text use supertask:// link. |
| 5f: Settings redesign | Done | Compact horizontal e-ink layout, tabbed Connections/Preferences. markAsTextLink setting removed. |
| 7: Config persistence | Done | RNFS build with XOR obfuscation. |
| Native modules | Done | Gradle build pipeline for native modules. react-native-fs added. ProGuard/R8 configured. |
| Debug mode | Done | Toggle in Config Preferences, hides Log/trace when OFF |
| 10a: Bidirectional linking (data) | Done | supertask:// links in notes, description back-references, task registry, page/device discovery. See Session 16. |
| 10b: Bidirectional linking (interactive) | In Progress | View Note button done. Gesture detector built but motion listener activation blocked (see session 17). |
| 10c: Offline mode | Future | Cache last API response in registry. Queue creates/completes locally. Sync on reconnect. |
| 9: Task dashboard | Backlog | All APIs confirmed: createNote, insertTextLink, insertNotePage, replaceElements. |
| 4: Subtasks | Backlog | parent_id support, subtask list in detail view |
| 6: Doc capture | Backlog | PDF text selection, same flow as lasso |
| 8: Polish | Backlog | Loading states, error handling, empty states |

## Session 17 -- interactive bidirectional navigation

Branch: `supertask-ui-redesign` (continued from session 16)
Plan: `~/.claude/plans/groovy-percolating-pelican.md`

### What's done

1. **View Note button in TaskDetail** -- inside the "Captured from" dashed-border section. Same-note case works: closes plugin with "Go to page N" hint. Different-note case tries `openFilePath()` then shows path as fallback.

2. **Gesture detector module** -- `src/utils/gestureDetector.js`. Registers motion listener, detects finger long-press (>800ms, <20px drift), scans page elements for supertask:// links, hit-tests touch point against link bounds, sets deep link global, calls `showPluginView()`.

3. **Deep link wiring in App.tsx** -- `getInitialScreen()` reads `global.__superTaskDeepLink`. `DeepLinkLoader` screen fetches task from API/registry, navigates to TaskDetail.

4. **Navigation diagnostics** -- four test buttons in Diagnostics screen for `openFilePath`, `Linking.openURL`, `showRattaDialog`, and link element bounds.

### Confirmed on-device

- **Link element bounds are populated** -- stroke links (cat=1) have real X, Y, width, height in page coordinates. Example: `X=450 Y=468 w=338 h=99`. Hit-testing will work.
- **`openFilePath()` with .note path** -- returns `true` but opens the **file manager** at the note location, not the note editor. Not useful for cross-note navigation.
- **`Linking.openURL('file://...')`** -- dead. Android blocks file:// URIs in intents ("exposed beyond app through Intent.getData()").
- **`showRattaDialog()`** -- native dialog works. Shows message + two buttons, returns which was tapped. Useful for user prompts but not navigation.
- **View Note (same note)** -- `closePluginView()` returns user to the note. Works.

### Active investigation: motion listener won't fire from gesture detector

**The bug:** `registerMotionListener` called from `index.js` init or `App.tsx` useEffect registers successfully (returns subscription) but never fires events. The identical API call from the Diagnostics "Start & Close" button DOES fire events.

**What we've tried:**
1. Register in `index.js` before UI shows -- no events
2. Register in `App.tsx` useEffect (during UI mount) -- no events
3. Register in Diagnostics, then `closePluginView()` 500ms later -- **events fire**

**The working pattern (Diagnostics):**
```js
_motionSub = PluginManager.registerMotionListener(1, {onMsg: ...});
setTimeout(() => PluginManager.closePluginView(), 500);
// Events fire on canvas after close
```

**What's different about the failing cases:**
- Time gap between register and closePluginView (minutes vs 500ms)
- Register happens before UI has been shown (index.js) or at mount (useEffect)
- The Diagnostics test registers then IMMEDIATELY closes

**Theories to test:**
- Native side may require register + close in quick succession to "arm" the listener
- Listener may need to be registered AFTER `showPluginView()` has been called (Diagnostics runs while UI is shown)
- There may be a native timeout that invalidates listeners after a period of inactivity
- `registerType` parameter (0=always first, 1=normal, 2=always last) may affect persistence

**Goal:** Make the gesture detector active automatically whenever a note is open (plugin JS loads at note open). No manual activation step.

**Next steps to try:**
- Register listener from index.js + call `showPluginView()` then `closePluginView()` immediately to activate it (may flash UI briefly)
- Try `registerType: 0` or `registerType: 2` instead of `1`
- Check if `registerEventListener('event_pen_up', ...)` fires from init (different API, may have different lifecycle)
- Inspect sn-plugin-lib PluginManager.ts wrapper for registerMotionListener to see if it does anything beyond the native call

### Builds

- `build/outputs/SuperTask.snplg` -- session 17 build with View Note + gesture detector (6.82MB, RNFS)

## Session 16 -- bidirectional note-task linking

Branch: `supertask-ui-redesign` (continued from session 15)
Plan: `.claude/plans/federated-fluttering-brooks.md`

### What changed

1. **linkType 4 with `supertask://` URI** -- tested on-device. linkType 5 doesn't exist (native returns error 506, valid range 0-4). linkType 4 with custom protocol works: dashed border appears, link stores the task ID. Native tap opens dead browser page (acceptable since real interaction is long-press gesture).

2. **Replaced all marking with supertask:// link** -- T badge removed. `markAsTextLink` config toggle removed. Both workflows (mark handwriting on Done, convert to text) always apply `setLassoStrokeLink({destPath: 'supertask://task/{id}', style: 2, linkType: 4})`. No config gate.

3. **Note context in Todoist description** -- `[SuperTask] Captured from: {file}.note p.{N}` appended to every lasso-captured task description. Human-readable in Todoist web/mobile. Machine-parseable by SuperTask via regex.

4. **Task registry** -- `src/utils/taskRegistry.js`, RNFS-persisted at `/MyStyle/SuperTask/task-registry.json`. Written on task creation from both TaskAdd and QuickAdd. Supports lookup by page, note, or ID.

5. **Page-aware discovery** -- TaskHome scans page elements via `getElements()` on mount, filters for `type === 600` with `supertask://task/` destPath. Cross-references with registry and Todoist API response. Three matching layers: link element IDs > description text > registry-only.

6. **Device tab** -- New tab in TaskHome showing all registry tasks grouped by note file, with page numbers. Works independently of Todoist API.

7. **TaskDetail back-reference** -- Parses `[SuperTask] Captured from` from description, shows dashed-border "Captured from" section with note name and page. Metadata preserved on save. `noteContext` stabilized via `useState` initializer so it doesn't flicker during editing.

### Key findings

- **linkType range is 0-4.** JS SDK `setLassoStrokeLink` has no range check, but native C/C++ layer rejects values > 4 with error 506. `modifyLassoLink` JS validation does check `linkType > 4`.
- **`supertask://` protocol has no handler** -- native tap on linkType 4 link opens browser with dead URL. This is the known trade-off. Interactive linking will use long-press finger gesture (motion listener) instead of native link taps.
- **Element scan returns link destPaths** -- `getElements()` reliably returns link elements with `link.destPath` field. Confirmed 2 and 3 supertask links found on page via scan.
- **Registry persists across sessions** -- task created in one plugin open was found in registry on next open.

### What's next (session 17)

**Interactive bidirectional navigation:**
- **Long-press gesture** -- register motion listener (headless, finger toolType 1). Detect long press (>1s, no movement). Read elements at (x,y), find supertask:// link, open TaskDetail. Key unknown: how to programmatically show plugin UI from headless context (`showPluginView()`).
- **"View Note" button** -- in TaskDetail "Captured from" section, navigate to the source note page. If on same note, could close plugin and let user navigate. If different note, show the path.
- **Offline data caching** -- registry should cache essential Todoist fields (priority, due, project) from last API response so SuperTask works without connectivity.

### Builds

- `build/outputs/SuperTask.snplg` -- session 16 build with all linking changes (6.82MB, RNFS)

## Session 15 -- config persistence investigation

Branch: `phase3-harmony`

### Problem
crypto-js AES encryption broke config save on-device. Error: "Native crypto module could not be used to get secure random number." Hermes doesn't implement the Web Crypto API (`crypto.getRandomValues()`), which crypto-js needs for AES salt/IV generation.

### What changed
1. **Replaced crypto-js with XOR obfuscation** -- `btoa`/`atob` + XOR key. Not real encryption, just scrambles tokens so they're not plain text in the JSON file. Acceptable for Todoist API key threat model.
2. **Attempted .note file storage to eliminate RNFS** -- goal was pure JS build (279KB vs 6.8MB). Modeled on [sn-keyworder](https://github.com/taoist22/sn-keyworder) `src/storage.ts` which stores JSON as type-500 text elements in a .note file.
3. **Settings button added to TaskHome header** -- navigates to Config screen from within a note context (SDK file APIs require active note context; config button from Settings returns error 102).
4. **Config screen Back button** -- shows "Back" when pushed from TaskHome, "Close" when opened from Settings.

### .note storage status (untested on-device)
Current build uses the sn-keyworder pattern:
- `getNoteTotalPageNum()` to check file existence
- `createNote({template: 'none'})` with system template fallback
- `clearLayerElements()` + `insertElements()` with plain objects (no `createElement`)
- Path: `/MyStyle/SuperTask/supertask-config.note`

Previous attempt failed with error 802 (`template: 'none'`) and error 102 (config screen has no note context). The keyworder proves `template: 'none'` works in a note context, so the current build may work. Untested.

### Key findings
- **`crypto.getRandomValues()` not in Hermes** -- Web Crypto API, not ECMAScript. Could polyfill with `react-native-get-random-values` (native module) but defeats the point.
- **`template: 'none'` validity** -- sn-keyworder uses it successfully. Our error 802 was from the config screen (no note context). Official Ratta docs say use `Template.name` from `getNoteSystemTemplates()`.
- **PluginFileAPI needs note context** -- `createNote`, `insertElements` etc. return error 102 from the Settings config button. Must launch from within a note (toolbar button).
- **Ratta's sticker demo uses AsyncStorage** (native module) for config. Community plugins use RNFS. Native modules are standard, not an anti-pattern.
- **Build sizes**: pure JS = 279KB, with RNFS native module = 6.8MB, installed on-device ~40MB.

### Decision for next session
The .note storage workaround is research-grade, not production-ready. Options:
1. **Test current .note build on-device** -- if it works, keep it (279KB, pure JS)
2. **Revert to RNFS** -- proven, standard pattern, 6.8MB build, `SuperTask-rnfs.snplg` backup ready
3. **Try AsyncStorage** -- Ratta's official pattern, another native module but potentially lighter than RNFS

### Builds available
- `build/outputs/SuperTask.snplg` -- pure JS .note storage build (279KB, untested)
- `build/outputs/SuperTask-rnfs.snplg` -- RNFS build with XOR obfuscation (6.8MB, save was broken by crypto-js but XOR fix not yet tested in RNFS build)

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

**Config persistence partially implemented** -- MyStyle JSON read + .note storage write coded. Save currently returning false on-device (showing "session only"). Detailed logging added to diagnose. See Session 13 notes.

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

### File I/O status
- `FileUtils.writeFile()` -- not in the TurboModule interface
- `fetch('file:///...')` -- WORKS on Android. Returns status 0 (not 200), must ignore `response.ok` and parse directly. Used for MyStyle JSON config reading.
- `.note` file as storage -- `createNote({template: 'none'})` + text element for write, `getElements` for read. Needs on-device testing (createNote may fail with error 802).
- `PluginFileAPI.createNote()` with system templates -- error 802 (template path not found)
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

### Config persistence (Session 13 -- implemented, testing)

| Approach | Result |
|----------|--------|
| `FileUtils.writeFile()` | Method doesn't exist |
| `FileUtils.saveTextToFile()` | Exists in Java but not exposed to JS (confirmed on-device Session 5) |
| `fetch('file:///...')` | **WORKS** -- reads MyStyle JSON config. Status 0 on Android, ignore `response.ok`. |
| `createNote({template: 'none'})` + `insertElements()` | Implemented for .note storage. Needs on-device testing. |
| `clearLayerElements()` + `insertElements()` | Used to overwrite existing config in .note storage. |
| `adb push` | ADB locked down |

**Current implementation:** Load priority: MyStyle JSON > .note storage > bundled config.local.js > defaults. Save writes to .note storage. MyStyle JSON is read-only (user edits via USB). Detailed logging in `saveToStorage()` for debugging.

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

### Session 11 -- 2026-05-14: Workflow implementation (auto-mark + Convert to Text rework)

- Implemented approved workflow: auto-mark on submit, Convert to Text as optional post-action
- Replaced replaceElements pipeline with deleteLassoElements approach
- Multiple on-device test builds iterating on the lasso lifecycle

### Session 12 -- 2026-05-14: deleteLassoElements debugging

- Diagnosed Config OFF Convert to Text: deleteLassoElements returns success but strokes remain visible
- Added reloadFile() after delete, OCR stroke filter (type 200 only), diagnostic logging
- Build `1fa8b3f` deployed for further testing

### Session 13 -- 2026-05-14: Convert to Text fixed, settings redesign, config persistence

**Convert to Text -- fully working (all 4 test cases pass):**
- Root cause of previous failures: `insertText` (T badge) + `saveCurrentNote` during auto-mark killed the original lasso context before Convert to Text could use it
- Fix: deferred ALL marking until user picks Done or Convert to Text. Original lasso stays alive through the success phase.
- `getLassoRect()` replaces ~60 lines of EMR-to-pixel coordinate math. Returns exact pixel bounds.
- Race condition guard: `marking` state prevents handleDone from re-applying marks during Convert to Text
- Re-lasso at end of both Done and Convert to Text paths so user can reposition content
- T badge gap increased from 8px to 20px to prevent overlap with 10px lasso padding

**Settings screen redesigned (T-001):**
- Compact horizontal e-ink layout matching wireframe mockup
- Built-in tab bar (Connections / Preferences)
- Preferences grouped: General, Projects, Handwriting, Advanced
- Inline radio buttons, horizontal toggle rows, 2-column checkbox grids, wrapping button grids
- Config source chip showing where settings were loaded from (MyStyle / storage / build config / defaults)

**Config persistence implemented (F-007) -- needs on-device testing:**
- Load priority: MyStyle JSON > .note storage > bundled config.local.js > defaults
- MyStyle JSON reading via `fetch('file:///...')` with status 0 handling (from sn-keyworder pattern)
- .note file storage: `createNote({template: 'none'})` + `insertElements(type 500 text element)` for writing, `getElements` for reading
- `clearLayerElements` before writing to prevent stale data
- Save currently showing "Saved (session only)" -- `saveToStorage()` returning false. Detailed step-by-step logging added to diagnose where `createNote`/`insertElements` fails on-device.

**Documentation architecture established:**
- `plugins/SuperTask/docs/tracker.md` -- Features (F-001 to F-007), Tasks (T-001), Bugs (B-001 to B-003) with status tracking
- `plugins/SuperTask/docs/changelog.md` -- resolved items with dates
- `plugins/SuperTask/docs/design-settings.md` -- settings redesign + MyStyle JSON persistence design
- `plugins/SuperTask/docs/design-task-markers.md` -- inline T/ST marker exploration (F-001)
- All docs gitignored (`docs/`, `**/docs/`, `**/PROGRESS.md`) -- not visible to GitHub users
- Each doc has header with cross-references to related docs

**Key SDK discoveries:**
- `getLassoRect()` -- returns exact pixel bounds of active lasso selection. Eliminates need for EMR-to-pixel coordinate computation.
- `fetch('file:///...')` WORKS on Android -- returns HTTP status 0 (not 200), so `response.ok` is false. Must ignore status and call `response.json()` directly. Pattern from sn-keyworder.
- `.note` file as key-value storage -- `createNote({template: 'none'})` + text element with JSON payload. Full round-trip persistence without `writeFile`.
- `clearLayerElements(path, page, layer)` -- clears all elements on a layer. Used before writing new config.

**Commits (8):**
- `7216170` Defer auto-mark to Done/Convert decision
- `6561b76` Use getLassoRect() for exact bounds
- `ed82d30` Fix lasso persistence, T badge overlap, race condition
- `12ebac3` Add plugin doc architecture
- `581c906` Add T-001 settings redesign
- `6368c7c` Exclude internal docs from repo
- `b566159` Redesign settings screen, persistent config storage
- `931dd2c` Remove header border, group preferences, config save logging

**Awaiting on-device feedback:**
1. Config persistence -- is `createNote({template: 'none'})` succeeding? Check logs from saveToStorage step-by-step output.
2. Settings UI -- grouped preferences layout, toggle button spacing
3. Config source chip -- does it correctly show "MyStyle" when supertask-config.json exists?

### Session 14 -- 2026-05-14: RNFS native module, config persistence confirmed, crypto-js

**react-native-fs added -- config persistence confirmed on-device:**
- Added `react-native-fs` as first native module (direct filesystem read/write)
- Replaced .note file storage hack (which failed with error 102 from Config screen -- no note context)
- Config now saves as plain JSON to `/storage/emulated/0/MyStyle/SuperTask/supertask-config.json`
- Works from ANY screen (no note context needed). Confirmed on-device: directory created, file written, 357 chars.
- Config survives reinstalls, editable via USB

**Gradle build pipeline established:**
- Build script auto-detects native modules in `node_modules/`, runs Gradle, bundles APK as `app.npk`
- `android/local.properties` created with SDK path
- `PluginConfig.json` gets `reactPackages` and `nativeCodePackage` automatically
- Debug build: ~6.9MB .snplg, installs in ~5 seconds, ~25MB on device

**crypto-js added for token encryption (F-008):**
- Pure JS (no native module), AES-256 encryption for sensitive config fields
- `apiToken` and `debugServerUrl` encrypted before writing to disk
- Encrypted values start with `U2FsdGVkX1` (CryptoJS AES signature)
- Plain text values accepted on load (USB-seeded configs), encrypted on next Save
- Needs on-device verification -- confirm token encrypts on save and decrypts on load

**R8 release build -- DO NOT USE (caused device freeze + factory reset):**
- Attempted R8/ProGuard minification to reduce APK from 6.7MB to 2.7MB
- ProGuard rules added for sn-plugin-lib and RNFS keep rules
- Build succeeded but **froze the Supernote on install**, required factory reset
- Root cause unknown -- R8 may strip classes PluginHost needs at runtime
- Compounding bug: build script `find` grabbed cached release APK even after reverting to debug. Fixed by deleting release APK artifacts.
- **INVESTIGATE NEXT SESSION:** Why does R8 release build freeze PluginHost? What classes are being stripped? Could be React Native internals needed by PluginHost's class loader. Need to diff debug vs release APK class lists.

**Architecture doc created:**
- `docs/design-architecture.md` -- complete technical reference: build pipeline, native modules, config, API, SDK usage, file layout, debugging

**Code changes:**
- `src/utils/config.js` -- complete rewrite: RNFS read/write, crypto-js encryption/decryption
- `src/screens/Config.tsx` -- updated source labels for RNFS
- `buildPlugin.sh` -- reverted to debug build (was release, caused freeze)
- `android/app/build.gradle` -- `enableProguardInReleaseBuilds = true` (for future use, not active in debug)
- `android/app/proguard-rules.pro` -- keep rules for sn-plugin-lib, RNFS, plugincommon
- `android/local.properties` -- SDK path
- `package.json` -- added react-native-fs, crypto-js dependencies
- `docs/design-architecture.md` -- new technical architecture reference
- `docs/tracker.md` -- F-007 done, F-008 added, T-001 done
- `docs/changelog.md` -- F-007, T-001, native module pipeline archived

**Next session priorities:**
1. Verify crypto-js encryption on-device (save config, pull file via USB, check encrypted values)
2. Investigate R8 freeze -- diff debug/release APK class lists, identify what PluginHost needs
3. Consider build size optimization that doesn't use R8 (strip unused resources, template assets)
4. Continue feature work (F-001 inline markers, F-003 subtasks, dashboard)
