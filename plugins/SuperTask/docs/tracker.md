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
| F-009 | Open | Motion listener gesture capture | `../../docs/gesture-research.md` | Use `registerMotionListener` for finger-driven workflows: box draw to lasso+OCR, tap to complete, gesture triggers. New in sn-plugin-lib 0.1.43. On-device testing confirmed: palm rejection built into firmware, pen+finger independent, finger rect ~25 events/sec, long press trivially detectable. Gated activation pattern (toolbar button enters capture mode). |
| F-010 | Open | Background processing with showPluginView | -- | Dismiss UI during API calls, reopen with results via `showPluginView()`. New in sn-plugin-lib 0.1.43. |
| F-011 | Done | View Note from TaskDetail | -- | Button in "Captured from" section. Same note: closes plugin with page hint. Different note: tries openFilePath (opens file manager, not editor), falls back to showing path. |
| F-012 | Blocked | Long-press gesture to open task from note | `../../docs/gesture-research.md` | Gesture detector built (`gestureDetector.js`), deep link wiring done. Blocked: motion listener doesn't fire when registered at init/mount. Only fires with Diagnostics "register then closePluginView 500ms later" pattern. See PROGRESS.md session 17 investigation. |

## Tasks

| ID | Status | Title | Design doc | Notes |
|----|--------|-------|------------|-------|
| T-001 | Done | Settings page redesign | `design-settings.md` | Compact horizontal layout for e-ink. Connections tab validates API tokens from MyStyle config. Preferences tab uses inline toggles, button rows, and checkbox grids. |

## Bugs

| ID | Status | Title | Notes |
|----|--------|-------|-------|
| B-001 | Open | OCR sometimes reads "1" as "I" | `recognizeElements` returns "Test I" instead of "Test 1". May need post-processing or user always reviews. |
| B-002 | Open | Cross-note navigation opens file manager, not editor | `openFilePath()` with a .note path returns true but opens the Supernote file manager, not the note in the editor. `Linking.openURL('file://...')` fails (Android blocks file:// URIs). No known SDK method opens a .note file in the editor. View Note falls back to showing the path for manual navigation. |
| B-003 | Investigating | Motion listener doesn't fire from init/mount | `registerMotionListener` called at index.js init or App.tsx mount returns a subscription but never delivers events. Same API called from Diagnostics "Start & Close" (register + closePluginView 500ms later) works. Blocks F-012 gesture detection. |
