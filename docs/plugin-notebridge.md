# NotesBridge — Supernote ↔ Obsidian Sync Plugin

> Convert handwritten Supernote notes to Obsidian-compatible Markdown. Optionally import Obsidian Markdown back into Supernote as typed text. The goal: your handwritten thinking and your digital knowledge base become one system.

## Why this plugin

Supernote excels at handwriting. Obsidian excels at linked, searchable, tagged knowledge management. Right now they're separate worlds — you write on Supernote, then manually re-type anything you want in Obsidian. NotesBridge makes them continuous:

- Write meeting notes by hand → they appear in your Obsidian vault as searchable Markdown
- Star important pages → they're automatically flagged in Obsidian
- Handwritten titles become Markdown headings
- Keywords become Obsidian tags
- Internal links between Supernote notes become Obsidian `[[wikilinks]]`
- Page images embed alongside the recognized text

## Architecture

```
┌──────────────────────┐          ┌──────────────────────────────────┐
│    Supernote Device    │          │      Your Computer / Phone        │
│                        │          │                                    │
│  ┌──────────────────┐ │          │  ┌───────────────────────────┐    │
│  │   NotesBridge     │ │          │  │      Obsidian Vault         │    │
│  │   Plugin          │ │  sync    │  │                             │    │
│  │                   │─┼──folder──┼─►│  SupernoteSync/             │    │
│  │  recognizes       │ │  service │  │  ├── Meeting 2026-04-11.md  │    │
│  │  handwriting      │ │          │  │  ├── Project Ideas.md       │    │
│  │  writes Markdown  │ │          │  │  ├── _assets/               │    │
│  │  generates PNGs   │ │          │  │  │   ├── page_0.png         │    │
│  │  manages state    │ │          │  │  │   └── page_1.png         │    │
│  └──────────────────┘ │          │  │  └── _index.md               │    │
│           │            │          │  └───────────────────────────┘    │
│           ▼            │          │                                    │
│  ┌──────────────────┐ │          │  Sync: Dropbox / Supernote Cloud   │
│  │  Sync Folder      │ │          │  / USB transfer / Google Drive     │
│  │  /EXPORT/Obsidian/│ │          └──────────────────────────────────┘
│  └──────────────────┘ │
└──────────────────────┘
```

### Data flow

**Export (Supernote → Obsidian):**
1. User opens NotesBridge, selects notes/pages to export
2. Plugin reads all elements from selected pages
3. Plugin runs `recognizeElements()` on handwritten strokes
4. Plugin extracts titles, keywords, links, and text boxes
5. Plugin assembles Markdown with YAML frontmatter
6. Plugin renders page PNGs via `generateNotePng()`
7. Plugin writes `.md` + `.png` files to the sync folder on external storage
8. A cloud sync service (Dropbox, Supernote Cloud, etc.) moves files to the computer
9. Obsidian's file watcher detects new/updated files

**Import (Obsidian → Supernote, stretch goal):**
1. Plugin scans sync folder for `.md` files with `supernote-import: true` frontmatter
2. Plugin parses Markdown headings, bullets, and text
3. Plugin creates new Supernote note pages
4. Plugin inserts content as TextBox elements

### State management

```
Plugin directory (getPluginDirPath()):
├── config.json           ← sync folder path, export preferences
├── sync-state.json       ← per-note: { notePath, lastExported, md5, pageCount }
└── recognition-cache/    ← cached recognition results per page
    ├── {md5}_p0.txt
    ├── {md5}_p1.txt
    └── ...
```

**Change detection:** Before re-exporting a note, compare `getFileMD5(notePath)` against `sync-state.json`. If unchanged, skip. This makes re-sync fast even with large note libraries.

**Recognition caching:** Store recognized text per page keyed by the page content hash. If a page hasn't changed, reuse the cached recognition instead of re-running OCR.

---

## Plugin entry points

### Button 1: Toolbar (Type 1, NOTE + DOC)
- **Name:** "NotesBridge"
- **showType:** 1 (full-screen UI)
- **Purpose:** Main plugin interface — select notes, configure export, trigger sync

### Button 2: Lasso toolbar (Type 2, NOTE)
- **Name:** "Export Selection"
- **showType:** 1
- **editDataTypes:** [0, 1, 3, 4, 5] (strokes, titles, text, links, geometry)
- **Purpose:** Quick-capture — lasso-select content, recognize it, append to a "Quick Captures" Markdown file

### Config button
- Stores: sync folder path, default tags, export format preferences, whether to include page images

---

## Markdown output format

### Single note → single Markdown file

```markdown
---
title: "Meeting Notes - Project Alpha"
source: "/storage/emulated/0/Note/Meetings/Project Alpha.note"
device: "Supernote A5X2"
pages: 3
exported: 2026-04-11T14:30:00
tags:
  - meeting
  - project-alpha
  - q2-planning
supernote-md5: "a1b2c3d4e5f6..."
---

# Meeting Notes - Project Alpha

> Exported from Supernote via NotesBridge

## Page 1

![Page 1](/_assets/project-alpha/page_0.png)

### Recognized text

[Recognized handwritten text from page 1 goes here. Titles extracted from
the note become headings. Regular handwriting becomes paragraphs.]

**Keywords:** meeting, project-alpha

### Links
- [[Design Specs]] (page 3)
- [External resource](https://example.com/specs)

---

## Page 2

![Page 2](/_assets/project-alpha/page_1.png)

### Recognized text

[Page 2 content...]

**Five-star items on this page:**
- ⭐ [Important decision point recognized text here]

---
```

### Structure mapping

| Supernote element | Obsidian Markdown |
|---|---|
| Note file name | Document title + filename |
| Page titles (`getTitles`) | `## Heading` at appropriate level |
| Keywords (`getKeyWords`) | YAML frontmatter `tags:` array |
| Recognized handwriting | Paragraph text |
| TextBox elements | Quoted text or inline text |
| Links to other notes (`linkType: 1`) | `[[NoteFileName]]` wikilinks |
| Links to URLs (`linkType: 4`) | `[text](url)` |
| Links to pages (`linkType: 0`) | `[[NoteFileName#Page X]]` |
| Five-star annotations | Highlighted with ⭐ prefix |
| Page images | `![Page N](path)` embeds |
| Geometry elements | Noted as `[geometric annotation]` |

---

## Implementation plan

### Phase 1: Core export (MVP)
1. **Config screen** — set sync folder path via `registerConfigButton`
2. **Note picker UI** — list all `.note` files via `FileUtils.getFileList(['.note'])`, show as a scrollable list
3. **Single note export:**
   - `getNoteTotalPageNum()` → iterate pages
   - `getElements(page, notePath)` → get all elements
   - `recognizeElements(strokeElements)` → handwriting to text
   - `getTitles(notePath, pages)` → extract headings
   - `getKeyWords(notePath, pages)` → extract tags
   - Assemble Markdown string
   - `generateNotePng()` for each page → save to sync folder
   - Write `.md` file to sync folder via `FileUtils.copyFile()` or direct write
4. **Progress UI** — show page-by-page progress, allow cancellation via `cancelRecognize()`

### Phase 2: Smart sync
5. **Change detection** — `getFileMD5()` comparison against sync state
6. **Incremental export** — only re-export changed notes
7. **Recognition caching** — store per-page recognized text, skip unchanged pages
8. **Batch export** — "Export all" / "Export starred" / "Export changed since last sync"
9. **Starred note discovery** — `searchFiveStars()` across all note files

### Phase 3: Rich content
10. **Link resolution** — resolve internal note links to Obsidian wikilinks
11. **Cross-note link graph** — scan all exported notes for link targets, ensure bidirectional references
12. **Table detection** — if strokes form a grid-like pattern (heuristic), attempt to export as Markdown table
13. **Quick capture via lasso** — lasso-select content, recognize, append to a running "captures" file

### Phase 4: Bidirectional sync (stretch)
14. **Import scanner** — check sync folder for `.md` files with `supernote-import: true`
15. **Markdown parser** — extract headings, bullets, and text
16. **Note generation** — `createNote()` + `insertNotePage()` + `insertText()` for each section
17. **Conflict detection** — if a note was modified on both sides since last sync, flag for manual resolution

---

## Key API usage patterns

### Full note scan and export
```typescript
// Get all note files on the device
const noteFiles = await FileUtils.getFileList(['.note']);

for (const notePath of noteFiles.result) {
  // Check if changed since last export
  const md5 = await FileUtils.getFileMD5(notePath);
  if (syncState[notePath]?.md5 === md5) continue; // skip unchanged

  const totalPages = await PluginFileAPI.getNoteTotalPageNum(notePath);
  let markdown = '';

  for (let page = 0; page < totalPages.result; page++) {
    // Get all elements
    const elements = await PluginFileAPI.getElements(page, notePath);
    const strokeElements = elements.result.filter(e => e.type === 0);

    // Recognize handwriting
    const recognized = await PluginCommAPI.recognizeElements(strokeElements);

    // Extract titles
    const titles = await PluginFileAPI.getTitles(notePath, [page]);

    // Generate page image
    const pngPath = `${syncFolder}/_assets/${noteName}/page_${page}.png`;
    await PluginFileAPI.generateNotePng({
      notePath, page, times: 1, pngPath, type: 1
    });

    // Assemble page markdown
    markdown += `## Page ${page + 1}\n\n`;
    markdown += `![Page ${page + 1}](/_assets/${noteName}/page_${page}.png)\n\n`;
    titles.result?.forEach(t => { markdown += `### ${t.text || 'Untitled'}\n\n`; });
    markdown += recognized.result + '\n\n---\n\n';
  }

  // Write markdown file
  // ... write to sync folder
}
```

### Quick capture from lasso selection
```typescript
// In lasso button handler:
const elements = await PluginCommAPI.getLassoElements();
const recognized = await PluginCommAPI.recognizeElements(elements.result);
const currentFile = await PluginCommAPI.getCurrentFilePath();
const currentPage = await PluginCommAPI.getCurrentPageNum();

const capture = {
  text: recognized.result,
  source: `${currentFile.result}#page${currentPage.result}`,
  timestamp: new Date().toISOString(),
};

// Append to captures file
// ... read existing captures.md, append new entry, write back
```

---

## Edge cases and considerations

### Recognition quality
- Handwriting recognition quality will vary. The plugin should always include page images as a fallback.
- Consider offering a "recognition confidence" indicator or "review before export" mode.
- Mixed content (drawings + text) may produce noisy recognition results. Filter elements by type and only recognize strokes that look like text (heuristic: aspect ratio, stroke density).

### File naming
- Note filenames may contain characters invalid for Markdown filenames on some OS. Sanitize.
- Handle duplicate note names across different Supernote folders by including the folder path in the Obsidian directory structure.

### Large notes
- A note with 100+ pages will take several minutes to fully recognize. Show progress, allow background processing with `setSystemDormancyState(true)` to prevent sleep.
- Consider a "pages changed since" optimization: only re-recognize pages where elements changed.

### Sync folder location
- The most reliable location is probably `/storage/emulated/0/EXPORT/Obsidian/` or a custom path.
- Need to verify which folders Supernote Cloud syncs. If it only syncs specific folders, the user may need to use Dropbox or USB.
- Fallback: export to a folder the user can manually transfer via USB.

### Obsidian compatibility
- Use standard Markdown syntax (CommonMark) for maximum compatibility.
- Wikilinks (`[[note]]`) are Obsidian-specific but widely supported.
- YAML frontmatter is standard across Obsidian, Hugo, Jekyll, etc.
- Image paths should be relative to the vault root.

### What the plugin CANNOT do
- **Automatic sync on note save** — no background execution. User must open the plugin and trigger export.
- **Watch for Obsidian changes in real-time** — import scan only runs when plugin is opened.
- **Sync handwriting back to Supernote** — only typed text (TextBox) can be inserted. You can't convert Markdown back to handwritten strokes.
- **Export .note files directly** — the `.note` format is proprietary. Export is always through the SDK APIs to Markdown + PNG.

---

## UI wireframes (React Native)

### Main screen
```
┌─────────────────────────────────────────┐
│  NotesBridge                    [⚙ Config]│
├─────────────────────────────────────────┤
│                                           │
│  📋 Ready to sync                        │
│  Last sync: 2026-04-11 10:30 AM          │
│  Notes: 47 total, 3 changed              │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │  [  Sync Changed (3)  ]             │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │  [  Sync All Notes    ]             │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │  [  Export Current Note ]           │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │  [  Export Starred Notes ]          │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  Recent exports:                         │
│  ✓ Meeting Notes.md (2 min ago)          │
│  ✓ Project Ideas.md (2 min ago)          │
│  ✓ Reading Notes.md (1 hr ago)           │
│                                           │
│                            [Close]        │
└─────────────────────────────────────────┘
```

### Sync progress screen
```
┌─────────────────────────────────────────┐
│  Syncing...                    [Cancel]   │
├─────────────────────────────────────────┤
│                                           │
│  Meeting Notes (3/5 pages)               │
│  ████████████████░░░░░░░░  60%           │
│                                           │
│  ✓ Project Ideas.md                      │
│  ✓ Reading Notes.md                      │
│  ⏳ Meeting Notes.md                     │
│  ○ Weekly Review.md                      │
│                                           │
│  Recognized: "discussed the Q2 timeline  │
│  and agreed on three milestones..."       │
│                                           │
└─────────────────────────────────────────┘
```

---

## Dependencies

| Dependency | Purpose | Notes |
|---|---|---|
| `sn-plugin-lib` | Supernote SDK | Core requirement |
| React Native built-in `fetch` | Optional: cloud upload | Only if doing direct API sync |
| No external OCR service | `recognizeElements()` is on-device | Key advantage: works offline |

The plugin is intentionally dependency-light. The heavy lifting (recognition, rendering, file I/O) is all done by the Supernote SDK. The plugin is mostly orchestration and Markdown assembly.

---

## Open questions to resolve during development

1. **Recognition output format**: Does `recognizeElements()` return plain text, or structured data with word positions? This affects how we map recognized text to page regions.
2. **Sync folder writability**: Can `FileUtils.copyFile()` write to any path on external storage, or are there sandbox restrictions we haven't hit yet?
3. **Performance at scale**: How long does recognition take for a 50-page note? Is the device's ARM processor fast enough for batch operations?
4. **Template for import**: When inserting text back into Supernote, what's the best template to use for readability? The "lined" template with appropriately sized TextBox elements?
5. **Concurrent access**: Can the plugin read a note file that's currently open in the NOTE app, or does it need to work on a copy?
