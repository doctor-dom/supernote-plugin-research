# SmartGestures — Progress & Learnings

A running log of everything we discover while building this plugin. Written so future-us (and anyone joining later) can reconstruct the reasoning behind every decision.

Design doc: `../../docs/plugin-smart-gestures.md`
Setup guide: `./SETUP.md`

**Project location (as of 2026-04-12)**: moved under `supernote-plugin-research/plugins/SmartGestures/` so all plugin builds can live alongside the shared research docs. Plan to add NotesBridge / TaskHarvest as sibling folders later.

**Test device**: Supernote A5X (1404x1872 pixel page, 15819x11864 EMR) on March 2026+ beta firmware with the Plugins settings panel.

---

## Timeline

### 2026-04-12 — Project bootstrap

**Goal**: stand up a working plugin project and verify the full toolchain end-to-end before writing any real code.

**What was done**:
1. Scaffolded `SmartGestures/` from `@supernote-plugin/sn-plugin-template` with RN 0.79.2
2. Installed dev toolchain: Temurin JDK 21, Android Studio, SDK Platform 35, Build-Tools 35.0.0
3. Wired `JAVA_HOME`, `ANDROID_HOME`, `PATH` in `~/.zshrc`
4. Produced a stock `.snplg` via `buildPlugin.sh` on the first try
5. Sideloaded the stock plugin to the device and confirmed the three template buttons render in NOTE

**Outcome**: pipeline works, scaffold -> build -> sideload -> install -> run loop proven.

### 2026-04-12 — Question #1 answered (the big one)

**Goal**: answer the design doc's most critical open question -- "does a `showType: 0` plugin receive `event_pen_up` events in the background while the user writes normally?" If no, realtime mode as designed is impossible.

**Result**: YES. `showType: 0` plugins DO run JS persistently AND receive `event_pen_up` events while the user is writing in the native NOTE app. **The realtime mode architecture is viable.**

### 2026-04-12 — Phase 1a: scratch-out detection iteration

Multiple iterations of the classifier and diagnostic tooling. Key discoveries:
- `event_pen_up` payload elements' lazy accessors return -1; must call `getLastElement()`
- `stroke.points` are in EMR coordinates (axes rotated vs screen)
- Dense EMR sampling (~1px/point after conversion) defeated naive X-reversal counting
- Arc-length / bbox-diagonal ratio is the robust classification signal
- First confirmed visual erase achieved at v0.0.3

### 2026-04-12 to 2026-04-18 — Phase 1b: robust scribble-to-delete

Iterated from v0.0.3 through v0.1.1, systematically fixing false positives, false negatives, and performance.

**Classifier evolution**:
- v0.0.3: `isScratchOut` with arc ratio >= 2.5 OR rev >= 5, flat h/w < 0.6 (screen space)
- v0.0.4: broadened to `isSuspiciousStroke`, r >= 1.8, real-point crossing test
- v0.0.5: 70% containment ratio (too strict -- flat gesture doesn't cover tall letters)
- v0.0.6: EMR-native rewrite, `deleteElements` API, safety cap, SmartPenToolkit-inspired dual-gate (density AND inversions)
- v0.0.7: coverage guard (scribble must span 60% of target's extent)
- v0.0.8: EMR aspect ratio gate (h/w >= 1.3 in EMR = flat on screen), pre-save fix for page revert
- v0.0.9-v0.1.1: performance optimization (cached context, early bail, save reduction)

**Current classifier (v0.1.1)**: `isScribble()` requires ALL of:
- pts >= 30
- EMR diagonal >= 200
- EMR h/w >= 1.3 (flat/wide on screen; filters out handwriting sentences)
- density (arc/diagonal) > 2.5
- combined X+Y inversions (stride-2) > 6

**Current overlap**: `isContainedWithMargin()` requires:
- Target stroke's full EMR bbox inside scribble EMR bbox + 150 margin
- Scribble covers >= 60% of target's larger dimension

**Current delete flow**: `saveCurrentNote()` -> `deleteElements(notePath, page, numsInPage)`

---

## Outstanding issues

### Issue 1 (RESOLVED): coordinate space + classifier signal

`stroke.points` are EMR. Arc-ratio is the robust signal. X-reversals alone are weak due to dense sampling. Final approach: work entirely in EMR, use density + inversions dual-gate.

### Issue 2 (RESOLVED): over-aggressive erase

Fixed by reading real stroke points for target bbox computation (replacing pessimistic 0..maxX rect), plus containment + coverage checks.

### Issue 3 (PARTIALLY RESOLVED): processing delay, screen flash, viewport reset

**Symptom**: 1-2 second delay from scribble to erase, screen flash (rule lines disappear briefly), viewport can shift.

**Root cause**: `saveCurrentNote()` is mandatory before `deleteElements()` (confirmed: without it, page reverts to stale on-disk state). This pre-save causes an e-ink refresh. `deleteElements` causes another. There is no SDK API to suppress or batch refreshes.

**Optimizations applied (v0.1.1)**:
- Dropped post-delete `saveCurrentNote()` (not needed; delete persists without it)
- Cached `notePath`, `page`, `pageSize` (saves 3 async round-trips per scribble after first)
- Early bail at 30 points before expensive `getRange()` (was 5)
- Non-scribble strokes never touch `getElements`

**Confirmed: pre-save cannot be removed.** Tested in v0.1.0; page reverted without it.

**Inherent limitation**: plugin-based delete will always be slower than native lasso erase (OS-level, no bridge overhead). The value proposition is convenience (no tool switching), not speed.

### Issue 4 (RESOLVED): long handwriting classified as scribble

Full sentences written without lifting the pen can hit density > 2.5 and inversions > 6 naturally. Fixed with EMR aspect ratio gate: scribbles are flat/wide on screen (EMR h/w >= 1.3), handwriting sentences are taller (EMR h/w ~ 0.8).

### Issue 5: `ups` counter inflated vs real stroke count

`pen_up` fires hundreds of times per real stroke. Dedupe handles correctness but wastes cycles. Not a blocker.

### Issue 6: elements are atomic (can't partially delete a stroke)

If a user writes a full sentence in one continuous stroke and scribbles over one word, the entire sentence element gets deleted. The coverage guard (60% threshold) mitigates this but doesn't solve it. True solution would require stroke splitting, which the SDK doesn't support.

---

## Community reference: SmartPenToolkit

GitHub: `wolfsolver/Supernote-SmartPenToolkit` -- similar concept, independently developed.

**Their approach**:
- Detection: density > 3x AND inversions > 10 (both required)
- Overlap: full target bbox containment inside scribble bbox + MARGIN=100 EMR
- Deletion: `PluginFileAPI.deleteElements()` (batch by numInPage list)
- Works entirely in EMR coordinates
- Dedupe by UUID, not numInPage
- Known issue: their old version had an "omnipotence complex" (erased entire pages) due to a buggy overlap check that only compared maxX/maxY

**What we adopted from them**: EMR-native approach, `deleteElements` API, dual-gate classifier (density AND inversions), full-bbox containment test.

**What we added beyond them**: EMR aspect ratio gate, coverage check, safety cap (max 50% of page strokes), cached page context, diagnostic dump-to-PNG pipeline.

---

## SDK learnings

### `PluginManager.init()` and event listeners are persistent

The RN runtime for a `showType: 0` plugin stays alive after `PluginManager.init()` runs. Listeners registered at module load continue firing even when no plugin UI is shown.

### `event_pen_up` payload elements can't be read directly

The `stroke.points` accessors return `-1` from `size()`. Must call `PluginFileAPI.getLastElement()`. Plain numeric fields (`type`, `numInPage`, `maxX`, `maxY`) ARE readable on the payload.

### `deleteElements` vs `replaceElements`

- `deleteElements(notePath, page, numsInPage[])`: batch delete by index. Lighter than replaceElements.
- `replaceElements(notePath, page, elements[])`: rewrites entire page element list. Heavier, causes viewport reset.
- Both require `saveCurrentNote()` beforehand to avoid operating on stale on-disk state.
- Neither offers refresh-control flags. The SDK has no way to suppress e-ink refresh.

### `saveCurrentNote()` is mandatory before file-based mutations

Without it, `deleteElements` and `replaceElements` operate on the last-saved version of the page, causing the current unsaved content to revert. Confirmed experimentally in v0.1.0.

### No lightweight save or refresh APIs exist

Exhaustive SDK search confirmed: no partial save, no flush-without-refresh, no `suppressRefresh` flag. `saveCurrentNote()` is the only option. The `lassoElements(rect)` + `deleteLassoElements()` path exists but is more steps for the same result.

### EMR coordinate system

- A5X: EMR maxX=15819 (maps to screen Y/height), EMR maxY=11864 (maps to screen X/width, flipped)
- A5X2: EMR maxX=21632, maxY=16224
- EMR h/w > 1 = flat/wide on screen (scratch-out shape)
- EMR h/w < 1 = tall/narrow on screen (handwriting line shape)
- `PointUtils.emrPoint2Android(point, pageSize)` converts; `PointUtils.getRealMaxX/Y(pageSize)` gives EMR range

### Correct API names

- `PluginManager.registerButtonListener(listener)` -- not `addButtonListener`
- `PluginManager.registerEventListener(event, registerType, listener)` -- registerType is priority (0=first, 1=normal, 2=last)
- `EventType.PEN_UP` = `"event_pen_up"`
- Event listener callbacks receive messages via `onMsg(data)`

### `PluginConfig.json` stability

The build script auto-generates a random pluginID if none exists. Set it manually or commit the generated file. Otherwise every rebuild installs as a "new" plugin.

### Sideload flow

1. USB cable to Mac, allow file transfer
2. Drop `.snplg` into device's `MyStyle` directory
3. Settings -> Apps -> Plugins -> tap -> Install

No ADB, no developer mode. Available on March 2026+ beta firmware.

---

## Phase roadmap

- [x] Phase 0 -- toolchain + sanity-check sideload
- [x] Phase 0.5 -- answer open question #1 (showType:0 receives pen_up)
- [x] Phase 1a -- scratch-out detection + first confirmed erase
- [x] Phase 1b -- robust scribble-to-delete (EMR-native, real-point overlap, safety cap)
- [ ] Phase 2a -- strikethrough detection
- [ ] Phase 2b -- circle/rectangle lasso gesture
- [ ] Phase 2c -- undo (detect repeat gesture in same empty spot)
- [ ] Phase 3 -- markup mode overlay scaffold
- [ ] Phase 4 -- markup mode multi-finger gestures + tag database
- [ ] Phase 5 -- NotesBridge sync integration

---

## Known-good builds

| Version | Date | What works | Notes |
|---|---|---|---|
| 0.0.1 (probe) | 2026-04-12 | pen_up count stamp | Phase 0.5 proof of concept |
| 0.0.3 | 2026-04-12 | First confirmed erase (aggressive zigzag only) | Arc ratio classifier, rev>=5 or r>=2.5 |
| 0.0.6 | 2026-04-12 | EMR-native detection, deleteElements, safety cap | SmartPenToolkit-inspired rewrite |
| 0.0.8 | 2026-04-18 | EMR aspect gate, pre-save fix, word-level delete | Filters out handwriting sentences |
| 0.1.1 | 2026-04-18 | Cached context, early bail, single pre-save | Current build. As fast as SDK allows. |

---

## Picking up next session

**Current build**: v0.1.1 at `build/outputs/SmartGestures.snplg`

**Current state**: scribble-to-delete works reliably for individual words and short clusters. The classifier correctly rejects normal handwriting including long connected sentences. There's an inherent ~1-2 second delay from the mandatory `saveCurrentNote()` + `deleteElements()` pipeline that cannot be reduced further within the SDK.

**Open questions for next session**:
1. Is the current detection sensitivity well-tuned? User reported it works "slightly more consistently" but may still miss gentle scratch-outs. The density > 2.5 AND inversions > 6 thresholds could be adjusted based on more testing.
2. Should we proceed to Phase 2a (strikethrough) or focus on polishing Phase 1b further?
3. The element atomicity issue (Issue 6) limits usefulness for connected handwriting. Is this acceptable, or should we explore workarounds?

**Key files**:
- `index.js` -- all classifier and deletion logic (~350 lines)
- `PluginConfig.json` -- version tracking
- `PROGRESS.md` -- this file
- Design doc: `../../docs/plugin-smart-gestures.md`
