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
| F-007 | Open | Config persistence via MyStyle JSON | `design-settings.md` | Ship a JSON config file in MyStyle/ that the plugin reads at startup. User edits via USB. Removes need for gradle-injected config.local.js. See T-001. |

## Tasks

| ID | Status | Title | Design doc | Notes |
|----|--------|-------|------------|-------|
| T-001 | Open | Settings page redesign | `design-settings.md` | Compact horizontal layout for e-ink. Connections tab validates API tokens from MyStyle config. Preferences tab uses inline toggles, button rows, and checkbox grids. |

## Bugs

| ID | Status | Title | Notes |
|----|--------|-------|-------|
| B-001 | Open | OCR sometimes reads "1" as "I" | `recognizeElements` returns "Test I" instead of "Test 1". May need post-processing or user always reviews. |
| B-002 | Resolved | Convert to Text fails to delete strokes | Was using re-lasso with EMR-computed bounds. Fixed by deferring delete to original lasso context. See `changelog.md`. |
| B-003 | Resolved | T badge position inconsistent | EMR-to-pixel sampling was approximate. Fixed by using `getLassoRect()` for exact pixel bounds. See `changelog.md`. |
