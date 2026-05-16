# SuperTask: Changelog

> Archive of completed features and resolved bugs. Items move here from `tracker.md` when done.
>
> **Related docs:**
> - Tracker: `docs/tracker.md` -- active features and bugs
> - Design docs: `docs/design-*.md` -- deep dives on specific features
> - Session state: `PROGRESS.md` -- current session handoff notes

## 2026-05-16 (session 19-20)

### F-013: Cross-note navigation
**Resolution:** Temp `insertTextLink` with `linkType:1` + `destPath` placed at top-center of current page (3% from top, horizontally centered). Shows task name in link text. Auto-cleanup via `deleteElements` on next plugin open, keyed by `numInPage`. Pending state persisted to `/MyStyle/SuperTask/pending-temp-link.json`. Full note path stored in Todoist description + task registry. Off-by-one fix: `pageNum` is 0-indexed, was incorrectly subtracting 1.

### F-002: Text editability on convert
**Resolution:** Not a plugin issue. Supernote's built-in text editing gestures (pen long-press, finger double-tap) work on converted text boxes. No plugin-side change needed.

### B-001: OCR sometimes reads "1" as "I"
**Resolution:** Closed as won't-fix. This is inherent to `recognizeElements` OCR accuracy based on handwriting. User reviews recognized text before submitting.

### B-002: Cross-note navigation
**Resolution:** Solved via temp link approach (see F-013). `openFilePath()` and Intent-based strategies were dead ends (all open file manager, not editor). `insertTextLink` with cross-note `destPath` is the working workaround. Gesture regression fixed: `ptrs > 1` mixed-input check was blocking all finger long presses because Supernote reports finger as `PTR_DOWN` with `ptrs=2` (device quirk). Fixed by checking pen `toolType` only; two-finger lasso caught by drift threshold.

### B-003: Motion listener doesn't fire from init/mount
**Resolution:** Moved to changelog (was already resolved in session 18).

## 2026-05-15 (session 18)

### F-012: Long-press gesture to open task from note
**Resolution:** Full deep link chain working on-device. Gesture detector registers at init (index.js) so it works on fresh note views. Pre-scans links on finger DOWN (overlaps with hold time). Rejects false triggers from pen activity or multi-pointer (gesture erase, two-finger lasso). Navigates via `global.__superTaskNavigate` for re-show or `getInitialScreen()` for first mount. Single task API fetch + parallel projects. ~1s from finger lift to TaskDetail (was ~6s).

### F-009: Motion listener gesture capture
**Resolution:** Long-press finger detection on supertask:// links via `registerMotionListener`. Pre-scan on DOWN, mixed-input rejection, hit-test against link bounds with 30px padding. Single-link fallback when bounds are zero.

### B-003: Motion listener doesn't fire from init/mount
**Resolution:** Was a red herring -- events were firing but `log()` from debug.js only collects in-memory (doesn't POST to dev server). Confirmed working from both index.js and App.tsx useEffect on sn-plugin-lib 0.1.43.

## 2026-05-15 (session 16-17)

### F-008: Token obfuscation + auto-generation
**Resolution:** Replaced crypto-js (broke on Hermes -- no `crypto.getRandomValues()`) with XOR+base64 obfuscation. Config template auto-generated on first launch with `YOUR_TOKEN_HERE` placeholder. Plain text tokens auto-obfuscated on next load. Info popup (?) on Settings screen guides users through USB sideload, Bluetooth keyboard, and on-screen keyboard entry methods.

### Config reverted to RNFS from .note storage
**Resolution:** The .note file storage workaround (sn-keyworder pattern) failed on-device: error 802 (`template: 'none'` invalid), error 1204 (system template fallback failed), error 102 (no note context from config screen). Reverted to RNFS (`react-native-fs`) which works reliably. Removed crypto-js dependency, keeping build at 6.8MB.

### SDK upgraded to sn-plugin-lib 0.1.43
**Resolution:** Updated from 0.1.34. New APIs: `registerMotionListener` (pen/finger touch events), `generateLassoPreview`, `generateLayerPreviewImage`, `showPluginView`, `getCacheElement`. New `setLassoBoxState(3)` hides lasso UI while preserving selection. Java-side API names aligned with JS/TS (requires recompile). Bug fixes: image move no longer clears userData, element coordinates update after move, page number -1 fix.

### API token removed from build
**Resolution:** With RNFS persistence confirmed working, removed bundled API token from `config.local.js`. Token entered once via Settings persists in the on-device JSON file across reinstalls.

## 2026-05-14

### B-002: Convert to Text fails to delete strokes
**Resolution:** Root cause was that `insertText` (T badge) + `saveCurrentNote` during auto-mark killed the original lasso context. The re-lasso attempt using EMR-computed bounds failed (`result: false`, 0 elements). Fixed by deferring all marking until the user chooses Done or Convert to Text, so `deleteLassoElements` operates on the still-active original lasso.

### B-003: T badge position inconsistent
**Resolution:** Replaced EMR-to-pixel coordinate math (~60 lines of stroke point sampling) with `getLassoRect()`, which returns exact pixel bounds of the active lasso selection. T badge now consistently positioned relative to the lasso rect.

### Lasso persistence after Done/Convert
**Resolution:** Added `lassoElements(bounds)` re-lasso at the end of both Done and Convert to Text paths. For configON Convert, the link is applied first (which dismisses the lasso), then a second `lassoElements` call re-selects the text. Selection persists after plugin closes so user can reposition.

### Race condition: Done pressed during Convert
**Resolution:** Added `marking` state guard to `handleDone` and disabled Done button during conversion. Prevents duplicate T badges and double link application.

### T-001: Settings page redesign
**Resolution:** Compact horizontal e-ink layout with built-in tab bar (Connections/Preferences). Preferences grouped into General, Projects, Handwriting, Advanced. Inline radio buttons, horizontal toggle rows, 2-column checkbox grids. Config source chip shows where settings loaded from.

### F-007: Config persistence via RNFS
**Resolution:** Added `react-native-fs` as first native module. Config saved as JSON to `/storage/emulated/0/MyStyle/SuperTask/supertask-config.json` via `RNFS.writeFile`. Works from any screen (no note context required). Replaced failed .note file storage approach (which needed note context for `createNote`). Build switched to release with R8 minification -- .snplg dropped from 6.8MB to 2.9MB.

### Native module build pipeline
**Resolution:** Established Gradle build pipeline for native modules. Build script auto-detects native code in `node_modules/`, runs Gradle, bundles APK as `app.npk` in `.snplg`. ProGuard rules configured for sn-plugin-lib and RNFS. Any future native module is just `npm install` + add keep rule + rebuild.
