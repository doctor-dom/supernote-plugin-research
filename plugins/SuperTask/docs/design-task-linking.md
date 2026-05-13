# SuperTask: Task Linking & Dashboard Design

## Problem

After capturing a task from handwriting, how do we:
1. Visually mark it on the note page without interfering with TOC
2. Connect the handwriting back to the task in SuperTask
3. Provide an on-device way to browse all captured tasks across notes

## What we know works

- `setLassoTitle({style: 1})` -- applies black header to lasso'd strokes. **Works but pollutes Table of Contents.** Not viable for production.
- `insertText()` -- inserts text box on current note page (pixel coords). Confirmed working on-device.
- `setLassoStrokeLink()` -- makes lasso'd strokes into a tappable link with visible border style. Untested on-device.
- `insertTextLink()` -- inserts tappable text link element with destination (note page, URL, etc.). Untested on-device.

## SDK APIs that enable this

### Confirmed working

| API | What it does |
|-----|-------------|
| `PluginNoteAPI.insertText()` | Inserts text box on current note page |
| `PluginNoteAPI.setLassoTitle()` | Applies title style to lasso'd strokes (TOC side effect) |
| `PluginNoteAPI.saveCurrentNote()` | Saves current note before file-level operations |
| `PluginCommAPI.getLassoElements()` | Gets lasso-selected elements |
| `PluginCommAPI.recognizeElements()` | OCR on elements |
| `PluginFileAPI.getPageSize()` | Gets page dimensions |

### Needs on-device testing

| API | What it does | Why it matters |
|-----|-------------|----------------|
| `PluginNoteAPI.setLassoStrokeLink({destPath, destPage, style, linkType})` | Makes lasso'd strokes into a tappable link with dashed/solid border | Task marking with dashboard link. No TOC impact. |
| `PluginNoteAPI.insertTextLink({destPath, destPage, style, linkType, rect, fontSize, fullText, showText, isItalic})` | Inserts tappable text link on current note | Dashboard entries linking back to source notes |
| `PluginFileAPI.createNote({notePath, template, mode, isPortrait})` | Creates a new .note file | Creating the dashboard note. Error 802 with system templates previously -- need to find valid template string. |
| `PluginFileAPI.insertNotePage({notePath, page, template})` | Adds a page to an existing note | Growing the dashboard as tasks accumulate |
| `PluginFileAPI.getNoteTotalPageNum(notePath)` | Gets page count of a note | Knowing where to append new dashboard pages |
| `PluginFileAPI.getElements(page, notePath)` | Reads all elements from any note page | Scanning dashboard for existing entries |
| `PluginFileAPI.replaceElements(notePath, page, elements)` | Replaces ALL elements on a page | Writing/updating dashboard pages by path (bypasses insertElements error 106?) |
| `FileUtils.openFilePath(path)` | Opens a file path | Navigating to the dashboard note from the plugin |
| `PluginCommAPI.getNoteSystemTemplates()` | Gets available system templates | Finding valid template string for createNote |

### Confirmed not working

| API | Issue |
|-----|-------|
| `PluginFileAPI.insertElements()` | Error 106 from native layer for all element types (Link, Text, Title) |
| `setLassoTitle` for task marking | Works technically, but pollutes Table of Contents |

### Unknown / needs investigation

- **Link-tap event listener**: Can we detect when a user taps a link? No obvious API exists, but `registerEventListener` supports `event_pen_up` -- are there other event types?
- **Programmatic note navigation**: `openFilePath()` exists in FileUtils but is untested. Could it open a .note file in the Supernote note app?
- **Plugin UI from link tap**: If `openFilePath` doesn't work, is there another path to bring up the plugin when a link is tapped?

## Task marking design (chosen: Option B)

### Visual spec (from task-mark-mockup.svg)

```
  [T]  |Follow up with Jamie on proposal|
  ^     ^                                ^
  |     |                                |
  |     Dashed border around handwriting (setLassoStrokeLink style 2)
  |
  Solid black square with white "T" (insertText, positioned to the left)
```

- **Dashed border**: `setLassoStrokeLink({destPath: dashboardNotePath, destPage: N, style: 2, linkType: 0})`
- **T badge**: Solid black 18x18 square with white "T", positioned top-left of the dashed border
- **No TOC interference**: Links don't appear in TOC
- **Tapping handwriting**: Navigates to the dashboard note page (native Supernote link behavior)

### Flow

```
1. Lasso -> OCR
2. setLassoStrokeLink({destPath: dashboardNotePath, destPage: N, style: 2, linkType: 0})
3. Navigate to TaskAdd (pre-filled with OCR text)
4. User submits -> task created in Todoist
5. insertText "T" badge to the left of handwriting bounds
6. (Future) Write entry on dashboard note page N linking back to source
```

### Fallback

If `setLassoStrokeLink` fails on-device, fall back to T badge only (no border, no link). The badge alone is already confirmed working. Visual marking degrades gracefully.

## The SuperTask dashboard note

### Vision

A user-specified .note file that serves as a task hub:
- An interlinked web where notes across the Supernote ecosystem all route to this central dashboard
- Tasks captured from any note link to the dashboard; the dashboard links back to source notes
- Different pages can serve as categories (by project, by date, by context)
- Pages can serve as entry points into indexed sections of longer notes
- Browsable natively in Supernote's file manager and note viewer -- no plugin needed to read it

### How it works

```
User's notes (scattered across the device):
  MeetingNotes/20260512 p.3:
    [T] |Follow up with Jamie|  --> taps to SuperTask.note p.1

  DailyNotes/20260510 p.1:
    [T] |Buy groceries|         --> taps to SuperTask.note p.1

  WorkNotes/sprint12 p.7:
    [T] |Review PR #42|         --> taps to SuperTask.note p.2 (Work category)

SuperTask.note (the dashboard):
  Page 1: Recent / Uncategorized
    [Follow up with Jamie]      --> taps back to MeetingNotes/20260512 p.3
    [Buy groceries]             --> taps back to DailyNotes/20260510 p.1

  Page 2: Work
    [Review PR #42]             --> taps back to WorkNotes/sprint12 p.7

  Page 3: Personal
    ...
```

### Bidirectional linking

Every captured task creates two links:
1. **Source -> Dashboard**: `setLassoStrokeLink` on the handwriting points to the dashboard page
2. **Dashboard -> Source**: `insertTextLink` on the dashboard page points back to the source note/page

Tapping the handwriting in your notes jumps to the dashboard. Tapping the entry on the dashboard jumps back to where you wrote it. Native Supernote navigation, no plugin UI required.

### Page organization

Pages in the dashboard note can be organized by:
- **Category/Project**: one page per Todoist project, or user-defined groupings
- **Date**: one page per day/week (daily notes style)
- **Status**: active tasks on page 1, completed tasks pushed to later pages

The organization scheme can be configurable. Start simple (single page, most recent first) and expand.

### Technical approach

1. **Dashboard note location**: User-specified path in Config > Preferences (e.g., `/Note/SuperTask.note`). Default to a reasonable location.

2. **Creating the note**: `createNote()` with valid template. Need to test template strings (`'style_blank'`, results from `getNoteSystemTemplates()`). If createNote fails, prompt user to create a blank note manually at the configured path.

3. **Writing entries**: Two approaches to test:
   - `replaceElements()` to rebuild an entire dashboard page (works on any note by path, but replaces everything)
   - `insertTextLink()` if it works on the current note (requires opening the dashboard note somehow)

4. **Reading existing entries**: `getElements()` to scan a dashboard page and find existing task entries before adding new ones.

5. **Adding pages**: `insertNotePage()` when a dashboard page is full or a new category is needed.

6. **Navigating to dashboard**: `openFilePath()` if it works. Otherwise, user navigates manually (the note is in their file system).

### State management

Need to track:
- Dashboard note path (config setting)
- Which dashboard page maps to which category
- Which tasks have dashboard entries (to avoid duplicates)

This requires config persistence (Phase 7, currently blocked). In the interim, could use the dashboard note itself as the source of truth -- scan pages with `getElements()` to reconstruct state.

### Relationship to SuperTask plugin UI

The dashboard note is complementary to the plugin UI, not a replacement:

| | Plugin UI (TaskHome) | Dashboard Note |
|---|---|---|
| Data source | Todoist API (live) | Written entries (static until updated) |
| Navigation | Plugin toolbar button | Native note file browser |
| Capabilities | Full CRUD, sync, filtering | Visual index, bidirectional links |
| Works offline | No (needs API) | Yes (it's a local note) |
| Entry point | Toolbar button, linked text in dashboard | File manager, linked handwriting in notes |

The two interlink: the plugin UI could show which tasks have dashboard entries, and dashboard entries could deep-link to specific tasks in the plugin (if we solve plugin-from-link invocation).

## Open questions (prioritized for testing)

### Must test (blocks task marking)
1. Does `setLassoStrokeLink` work from the same lasso context as `setLassoTitle`?
2. Is the dashed border (style 2) visible and distinct on e-ink?

### Should test (blocks dashboard)
3. Does `createNote()` work with `'style_blank'` or templates from `getNoteSystemTemplates()`?
4. Does `insertTextLink()` work on the current note?
5. Does `replaceElements()` work for writing text/link elements to a non-current note?
6. Does `openFilePath()` open a .note file in the Supernote note app?
7. Does `insertNotePage()` work on a note the user isn't viewing?

### Nice to know
8. Are there other event types besides `event_pen_up` that could detect link taps?
9. Can `getElements()` reliably read text link entries from a dashboard page?

## Recommended next steps

1. **Immediate**: Replace `setLassoTitle` with `setLassoStrokeLink` in Capture.tsx. Test on-device with the mockup styling (dashed border + T badge).
2. **Exploratory build**: Test dashboard-enabling APIs (`createNote`, `insertTextLink`, `replaceElements`, `openFilePath`, `getNoteSystemTemplates`) in a single diagnostic build.
3. **Design**: Based on test results, finalize the dashboard architecture and page organization.
4. **Build**: Dashboard v1 -- single page, most recent first, bidirectional links.
