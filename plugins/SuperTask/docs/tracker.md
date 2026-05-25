# SuperTask: Features & Bugs Tracker

> Active features, tasks, and bugs for the SuperTask plugin. Each item has a unique ID, type label, status, and optional link to a design doc.
>
> **Related docs:**
> - Design docs: `docs/design-*.md` -- deep dives on specific features
> - Changelog: `docs/changelog.md` -- completed/resolved items move here
> - Session state: `PROGRESS.md` -- current session handoff notes
>
> When an item is completed or resolved, move it to `changelog.md` with the date and a one-line summary of the outcome.

## Features

| ID | Status | Title | Design doc | Notes |
|----|--------|-------|------------|-------|
| F-001 | Open | Inline task markers (T/ST) | `design-task-markers.md` | Embed marker into text content instead of separate T badge element. Solves grouping problem (badge doesn't move with content). Supports future subtask markers (ST). |
| F-002 | Done | Text editability on convert | -- | Resolved by SDK behavior: text is editable via pen long-press or finger double-tap (Supernote built-in gestures). |
| F-003 | Backlog | Subtask support | -- | `parent_id` in Todoist API. Subtask list in detail view. ST marker on note. |
| F-004 | Backlog | Task dashboard / master note | -- | Create a note with all captured tasks as linked entries. APIs confirmed ready. |
| F-005 | Backlog | Doc capture (PDF) | -- | PDF text selection, same flow as lasso handwriting. |
| F-006 | Backlog | Offline mode | `design-offline-mode.md` | Queue tasks locally, sync to Todoist when wifi available. |
| F-007 | Done | Config persistence via RNFS | `design-settings.md`, `design-architecture.md` | JSON config file in MyStyle/SuperTask/ read/written via react-native-fs. Works from any screen (no note context needed). Confirmed on-device. |
| F-008 | Done | Token obfuscation + auto-generation | `design-architecture.md` | XOR+base64 obfuscation replaces crypto-js (which broke on Hermes). Template config auto-generated on first launch. Plain text tokens auto-obfuscated on load. Info popup guides USB/BT/keyboard entry. |
| F-009 | Done | Motion listener gesture capture | `../../docs/gesture-research.md` | Long-press finger detection on supertask:// links. Pre-scan on DOWN, mixed-input rejection (pen, multi-pointer). Confirmed on-device. |
| F-010 | Open | Background processing with showPluginView | -- | Dismiss UI during API calls, reopen with results via `showPluginView()`. New in sn-plugin-lib 0.1.43. |
| F-011 | Done | View Note from TaskDetail | -- | Button in "Captured from" section. Same note: closes plugin with page hint. Different note: tries openFilePath (opens file manager, not editor), falls back to showing path. |
| F-012 | Done | Long-press gesture to open task from note | `../../docs/gesture-research.md` | Gesture detector in `gestureDetector.js`, registered at init (index.js). Pre-scans links on finger DOWN, navigates via `global.__superTaskNavigate` (re-show) or `getInitialScreen` (first mount). Single task API + parallel fetch. |
| F-013 | Done | Cross-note navigation | -- | Temp link at top-center of current page with task name. Auto-cleanup via `deleteElements` on next plugin open. Full path stored in Todoist description + task registry. |
| F-014 | Backlog | Edge swipe to launch task home | -- | Swipe from edge (left, right, or bottom) opens SuperTask task home. Non-collision gesture for quick access without toolbar button. |
| F-015 | Done | Quick lasso-add gesture (finger) | `design-gesture-guards.md` | Hold 400ms then drag to select and open QuickAdd. Finger only (pen mode removed). Pre-scan gate blocks lasso-add on content with existing supertask link. Config: off/finger lasso. |
| F-016 | Backlog | Native lasso + gesture to quick-add | -- | User does native pen lasso, then triggers QuickAdd via gesture on the selection. Options: two-finger tap, or single finger held during lasso (some pens have buttons that simulate finger input). Avoids custom pen gesture complexity. Needs research: can we detect these gestures on an active lasso selection? |

## Tasks

| ID | Status | Title | Design doc | Notes |
|----|--------|-------|------------|-------|
| T-001 | Done | Settings page redesign | `design-settings.md` | Compact horizontal layout for e-ink. Connections tab validates API tokens from MyStyle config. Preferences tab uses inline toggles, button rows, and checkbox grids. |
| T-002 | Open | Audit undocumented SDK native modules | -- | `RTNFileModule.java` revealed `openFilePath` dispatches `ACTION_VIEW` with `only_open_file` extra -- not in TS types or docs. Systematically read native Java sources in `android/src/main/java/` for all TurboModules (`RTNFileUtils`, `NativePluginAPI`, `NativePluginManager`, `FileSelector`, `NativeUIUtils`) to find other hidden capabilities. Check Intent extras, undocumented params, internal methods not exposed to JS. |
| T-003 | Open | Write architecture docs, user README, and Ratta feedback | -- | Three deliverables: (1) Architecture doc covering SuperTask's design (temp link nav, gesture detection, task registry, bidirectional linking, offline-first patterns). (2) User-facing README explaining installation, usage, and limitations. (3) Developer feedback for Ratta: API gaps discovered (no goToPage, no openNote, no element fill/background, no writeFile), workarounds used, what would be most helpful (direct note navigation, page switching, element background fill, background task execution). Requires full codebase review to write accurately. |

## Bugs

| ID | Status | Title | Notes |
|----|--------|-------|-------|
| B-004 | Open | Selected projects in settings isn't honored in the upcoming or today area or projects of supertask |
| B-005 | Open | Renaming a note breaks task back-references | Both Todoist description (`Captured from: file.note p.N`) and task registry (`noteFile`) store the bare filename. Renaming the .note file breaks View Note navigation and This Page scan. **Approach:** reconciliation on plugin open -- if a registry noteFile is missing from disk, scan .note files for pages containing a supertask:// link matching the task ID (link elements survive renames). When found, update registry `noteFile` + patch Todoist task description via API. Short-circuit by checking same directory first. |
| B-007 | Done | Long press fires on any empty space (single-link fallback) | `preScanLinks` had a fallback: if only 1 supertask link on page and hit-test fails, use it anyway. This caused ANY long press ANYWHERE on a page with a link to open that task. Fix: removed the fallback entirely. If touch doesn't hit link bounds, long press is ignored. Users access tasks via toolbar/This Page if bounds are unreliable. |
| B-012 | Open | Phantom pen/multi-touch events cancel long press | Supernote EMR digitizer occasionally reports phantom pen events (toolType=2) during firm finger holds, and phantom PTR_DOWN at same coordinates as the original DOWN. Sets `_mixedInput = true` and 500ms cooldown, preventing long press from reaching 800ms. Observed in session 22 testing -- NOT reproducible in session 23 testing. May correlate with native two-finger lasso activity earlier in the session, screen area (left edge near bezel), or firm pressure. Potential fix: require sustained pen activity (multiple events or movement) before cancelling, rather than cancelling on a single pen event. |

