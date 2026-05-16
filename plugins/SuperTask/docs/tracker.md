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
| F-002 | Open | Text editability on convert | -- | Convert to Text inserts with `textEditable: 0`. User can't tap to edit. Need to decide if converted text should be editable. |
| F-003 | Backlog | Subtask support | -- | `parent_id` in Todoist API. Subtask list in detail view. ST marker on note. |
| F-004 | Backlog | Task dashboard / master note | -- | Create a note with all captured tasks as linked entries. APIs confirmed ready. |
| F-005 | Backlog | Doc capture (PDF) | -- | PDF text selection, same flow as lasso handwriting. |
| F-006 | Backlog | Offline mode | -- | Queue tasks locally, sync to Todoist when wifi available. |
| F-007 | Done | Config persistence via RNFS | `design-settings.md`, `design-architecture.md` | JSON config file in MyStyle/SuperTask/ read/written via react-native-fs. Works from any screen (no note context needed). Confirmed on-device. |
| F-008 | Done | Token obfuscation + auto-generation | `design-architecture.md` | XOR+base64 obfuscation replaces crypto-js (which broke on Hermes). Template config auto-generated on first launch. Plain text tokens auto-obfuscated on load. Info popup guides USB/BT/keyboard entry. |
| F-009 | Done | Motion listener gesture capture | `../../docs/gesture-research.md` | Long-press finger detection on supertask:// links. Pre-scan on DOWN, mixed-input rejection (pen, multi-pointer). Confirmed on-device. |
| F-010 | Open | Background processing with showPluginView | -- | Dismiss UI during API calls, reopen with results via `showPluginView()`. New in sn-plugin-lib 0.1.43. |
| F-011 | Done | View Note from TaskDetail | -- | Button in "Captured from" section. Same note: closes plugin with page hint. Different note: tries openFilePath (opens file manager, not editor), falls back to showing path. |
| F-012 | Done | Long-press gesture to open task from note | `../../docs/gesture-research.md` | Gesture detector in `gestureDetector.js`, registered at init (index.js). Pre-scans links on finger DOWN, navigates via `global.__superTaskNavigate` (re-show) or `getInitialScreen` (first mount). Single task API + parallel fetch. |
| F-013 | Open | Cross-note navigation | -- | Opening a .note file from a different note in the editor. `openFilePath()` opens file manager (B-002). Need alternative approach. |

## Tasks

| ID | Status | Title | Design doc | Notes |
|----|--------|-------|------------|-------|
| T-001 | Done | Settings page redesign | `design-settings.md` | Compact horizontal layout for e-ink. Connections tab validates API tokens from MyStyle config. Preferences tab uses inline toggles, button rows, and checkbox grids. |
| T-002 | Open | Audit undocumented SDK native modules | -- | `RTNFileModule.java` revealed `openFilePath` dispatches `ACTION_VIEW` with `only_open_file` extra -- not in TS types or docs. Systematically read native Java sources in `android/src/main/java/` for all TurboModules (`RTNFileUtils`, `NativePluginAPI`, `NativePluginManager`, `FileSelector`, `NativeUIUtils`) to find other hidden capabilities. Check Intent extras, undocumented params, internal methods not exposed to JS. |

## Bugs

| ID | Status | Title | Notes |
|----|--------|-------|-------|
| B-001 | Open | OCR sometimes reads "1" as "I" | `recognizeElements` returns "Test I" instead of "Test 1". May need post-processing or user always reviews. |
| B-002 | Testing | Cross-note navigation opens file manager, not editor | Native Java source (`RTNFileModule.java`) shows `openFilePath` dispatches `ACTION_VIEW` intent with `only_open_file` extra to `FileManagerMainActivity`. Previous attempts called it with plugin view still open. Fix: call `closePluginView()` first, then `openFilePath()` after 200ms delay. Needs on-device test. |
| B-003 | Resolved | Motion listener doesn't fire from init/mount | Was a red herring -- events were firing but `log()` only collects in-memory (doesn't POST). Confirmed working from both index.js and App.tsx on sn-plugin-lib 0.1.43. |
| B-004 | Open | Selected projects in settings isn't honored in the upcoming or today area or projects of supertask |
| B-005 | Open | Renaming a note breaks task back-references | Both Todoist description (`Captured from: file.note p.N`) and task registry (`noteFile`) store the bare filename. Renaming the .note file breaks View Note navigation and This Page scan. **Approach:** reconciliation on plugin open -- if a registry noteFile is missing from disk, scan .note files for pages containing a supertask:// link matching the task ID (link elements survive renames). When found, update registry `noteFile` + patch Todoist task description via API. Short-circuit by checking same directory first. |

