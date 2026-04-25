# Supernote Plugin API — Capability Analysis & Creative Potential

> What can you actually *build* with the plugin SDK? This document breaks down every API surface area by what it enables, what it doesn't, and where the boundaries of the possible are.

## The big picture: what kind of apps can you build?

The Supernote plugin SDK gives you:

- **Full React Native UI** — you can build any interface that React Native supports (lists, forms, buttons, text inputs, scrollviews, etc.). The plugin view is full-screen when `showType: 1`.
- **Deep note manipulation** — read, create, modify, and delete every element type (strokes, text, titles, links, geometry, images, stars).
- **Filesystem access** — read/write files anywhere on external storage, list directories, copy/move/delete.
- **On-device handwriting recognition** — convert strokes to text without an external service.
- **Programmatic selection** — lasso-select regions of a page without user interaction.
- **Network access** — React Native's built-in `fetch` works (the SDK doesn't block it), so you can call any HTTP API.
- **Persistent local storage** — the plugin has its own directory (`getPluginDirPath()`) where you can store JSON, SQLite, or any data files.

What you *don't* get:
- **No background execution** — plugins only run when the user taps a button. No persistent daemon, no file watchers, no cron jobs.
- **No inter-plugin communication** — plugins are sandboxed from each other.
- **No system-level hooks** — you can't intercept the device's sync, replace system apps, or modify the OS UI outside the note/doc toolbar.
- **No real-time pen tracking** — only `event_pen_up` is available, not continuous stroke data during writing.

---

## API-by-API capability breakdown

### 1. PluginManager — Lifecycle & UI Registration

| API | What it does | Creative potential |
|---|---|---|
| `init()` | Required startup call | - |
| `registerButton(type, appTypes, config)` | Place buttons in toolbar (1), lasso bar (2), selection bar (3) | **Multi-entry-point apps**: register different buttons that open different views of the same plugin. E.g., a toolbar button for the "inbox" and a lasso button for "capture this to inbox." |
| `registerButtonListener(listener)` | Receive button tap events with `id` | **Context-aware routing**: switch between plugin modes based on which button was tapped. |
| `registerConfigButton()` / `registerConfigButtonListener()` | Settings gear icon | **User configuration**: store API tokens, sync folder paths, preferences. Essential for any integration plugin. |
| `registerEventListener('event_pen_up', priority, listener)` | Fires when pen lifts, receives `Element[]` | **Live capture**: grab the last stroke the user wrote and process it immediately. Could power a "quick note" clipper that recognizes each stroke as you write. Priority 0 = first to receive. |
| `registerLangListener(listener)` | Language change events (`en`, `zh_CN`, `zh_TW`, `ja`) | **i18n**: adapt plugin UI to device language. |
| `getDeviceType()` | Returns 0-5 device model | **Adaptive layouts**: adjust UI density and coordinate math for A5X2/Manta's higher resolution vs. other devices. |
| `getPluginDirPath()` | Plugin's private storage directory | **Local database**: store JSON files, SQLite databases, configuration, sync state — anything. This is your app's persistent storage. |
| `closePluginView()` | Dismiss plugin UI | **Background operations**: set `showType: 0` to run logic without showing UI. Useful for "quick actions" that don't need a full screen. |

**What this enables:**
- Multi-mode plugins with different buttons for different workflows
- Settings/configuration screens via config button
- Persistent data storage for any app-like functionality
- Background processing triggered by pen events

---

### 2. PluginCommAPI — The Swiss Army Knife

#### Handwriting Recognition (the game-changer)

| API | What it does | Creative potential |
|---|---|---|
| `recognizeElements(elements)` | **On-device OCR** — converts handwritten stroke elements to text strings | This is the single most powerful API for bridging handwriting to digital. Every integration idea depends on this. |
| `cancelRecognize()` | Abort ongoing recognition | Needed for UX — let users cancel long recognition jobs. |

**What this enables:**
- Convert any handwritten note page to searchable text
- Extract tasks, dates, names, URLs from handwriting
- Feed recognized text to external APIs (translation, summarization, task creation)
- Build a handwriting search engine across all notes
- No external OCR service needed — works offline on-device

**Limitations to test:**
- Recognition quality for cursive vs. print handwriting
- Language support (likely optimized for the 4 supported languages)
- Performance on pages with many strokes
- Whether it can handle mixed text/drawing content

#### Programmatic Selection

| API | What it does | Creative potential |
|---|---|---|
| `lassoElements(rect)` | **Select a region programmatically** — no user interaction needed | Batch processing: scan an entire page region by region. |
| `getLassoElements()` | Get all selected elements | Read what's in a selection. |
| `getLassoElementTypeCounts()` | Count elements by type | Quick triage: how many strokes, texts, links in a selection? |
| `getLassoRect()` | Get selection bounding box | Coordinate reference for layout calculations. |
| `resizeLassoRect(rect)` | Resize existing selection | Adjust selection programmatically. |
| `deleteLassoElements()` | Delete everything in selection | **Destructive editing**: clear regions of a page. |
| `setLassoBoxState(state)` | 0=show, 1=hide, 2=remove lasso UI | Control selection visibility during programmatic operations. |

**What this enables:**
- **Page scanning**: divide a page into a grid, lasso each cell, recognize the text in it → structured data extraction from handwritten tables
- **Selective export**: lasso specific regions to export, leaving the rest
- **Content migration**: lasso elements on one page, read them, insert them on another
- **Cleanup tools**: lasso and delete specific regions programmatically

#### Pen & Device State

| API | What it does | Creative potential |
|---|---|---|
| `getPenInfo()` | Current pen type, color, width | **Context-aware actions**: "if user is using the marker pen, treat this as highlighting for export." Different behavior based on pen state. |
| `getCurrentPageNum()` | Active page number | Navigation context. |
| `getCurrentFilePath()` | Active file path | Know which note is open. Essential for every plugin. |
| `reloadFile()` | Refresh from disk | After modifying a note file via FileAPI, reload to show changes. |

#### Geometry, Stickers & Stars

| API | What it does | Creative potential |
|---|---|---|
| `insertGeometry(geo)` | Insert circles, ellipses, lines, polygons | **Visual indicators**: draw circles around important items, lines between related content, visual borders. |
| `insertSticker(path)` | Insert a sticker image | **Stamp system**: insert pre-made visual elements (checkmarks, icons, status badges). |
| `convertElement2Sticker(params)` | Convert elements to a reusable sticker | **Clip and save**: turn handwritten content into reusable stamps. |
| `insertFiveStar(points)` | Insert a five-star annotation | **Importance marking**: programmatically star content for later retrieval. |
| `getNoteSystemTemplates()` | List available templates | **Template picker**: show users available templates when creating pages. |

**What this enables:**
- **Custom visual overlays**: draw checkboxes, status indicators, progress bars using geometry
- **Stamp/badge system**: insert visual status markers (done, urgent, review) as stickers
- **Star-based priority system**: programmatically add/find stars for task prioritization

#### UI Control

| API | What it does | Creative potential |
|---|---|---|
| `setSlideBarStatus(status)` | Control sidebar scrollability | Lock UI during operations. |
| `setSystemDormancyState(enable)` | Prevent device sleep | Keep device awake during long sync operations. |
| `setStatusBarAndSlideBarState(isLock)` | Lock status/slide bars | Immersive mode for full-screen plugin UI. |

---

### 3. PluginNoteAPI — Direct Note Content Manipulation

#### Text

| API | What it does | Creative potential |
|---|---|---|
| `insertText(textBox)` | Insert a TextBox with full formatting (font, size, alignment, bold, italic, border style, editable flag) | **Inject digital content into notes**: insert task lists, calendar events, weather, quotes, timestamps — anything that's text. |
| `getLassoText()` | Read selected TextBox elements | Extract text content from notes. |
| `modifyLassoText(textBox)` | Update selected TextBox content/formatting | **Live editing**: change text content, toggle bold/italic, resize. |

**TextBox formatting options:**
- `fontSize`, `fontPath` (custom fonts!)
- `textAlign`: left/center/right
- `textBold`, `textItalics`: 0 or 1
- `textFrameWidthType`: 0=fixed, 1=auto
- `textFrameStyle`: 0=none, 3=stroke border
- `textEditable`: 0=editable, 1=locked (read-only display)
- `textRect`: exact pixel positioning

**What this enables:**
- **Custom to-do lists**: insert checkbox-like text items (`[ ] Task name`) with precise positioning
- **Form generation**: create structured forms with labeled fields
- **Template population**: fill in template fields with digital data
- **Read-only displays**: insert non-editable text (status info, synced data) that users can see but not accidentally modify

#### Titles

| API | What it does | Creative potential |
|---|---|---|
| `setLassoTitle({ style })` | Convert handwriting to a title (4 visual styles) | **Auto-structure**: detect heading-like handwriting and formally title it. |
| `getLassoTitles()` | Read title data (position, style, page, associated strokes) | **TOC generation**: extract all titles to build a table of contents. |
| `modifyLassoTitle({ style })` | Change title visual style | Restyle titles programmatically. |

**Title styles:** 0=remove, 1=black background, 2=gray-white, 3=gray-black, 4=shadow

**What this enables:**
- **Automatic heading detection**: recognize handwritten text, if it looks like a heading → `setLassoTitle`
- **Table of contents generation**: scan all pages for titles → build a structured index
- **Note structure analysis**: titles + their positions reveal the document's organization

#### Links

| API | What it does | Creative potential |
|---|---|---|
| `insertTextLink(textLink)` | Insert a clickable text link | **Deep linking**: link to other notes, pages, documents, images, or URLs. |
| `setLassoStrokeLink(strokeLink)` | Convert handwritten strokes into a link | Turn handwriting into navigable links. |
| `getLassoLinks()` | Read link targets and metadata | Extract cross-references from notes. |
| `modifyLassoLink(modifyLink)` | Update link destination/style | Redirect existing links. |

**Link types:** NOTE page (0), NOTE file (1), DOC (2), image (3), **URL (4)**, digest (6, read-only)

**Link styles:** solid underline (0), solid border (1), dashed border (2)

**What this enables:**
- **Bi-directional linking between notes**: like Obsidian backlinks, but inside Supernote
- **URL injection**: insert clickable links to Todoist tasks, calendar events, web pages
- **Cross-note navigation**: link meeting notes to project notes to reference docs
- **Knowledge graph**: build a network of linked notes

#### Images

| API | What it does | Creative potential |
|---|---|---|
| `insertImage(pngPath)` | Insert a PNG image into the current note | **Visual content injection**: charts, diagrams, photos, QR codes, generated images. |

**What this enables:**
- Insert QR codes linking to digital resources
- Insert charts/graphs generated from data
- Insert photos or screenshots
- Insert visual task boards or calendars rendered as images

---

### 4. PluginFileAPI — Deep File Operations

#### Element CRUD (the most powerful surface)

| API | What it does | Creative potential |
|---|---|---|
| `getElements(page, notePath)` | **Read ALL elements on any page of any note** | Full read access to every note on the device. |
| `insertElements(notePath, page, elements)` | Add elements to any page | Write to any note, not just the currently open one. |
| `modifyElements(notePath, page, elements)` | Update existing elements | Edit any note in-place. |
| `replaceElements(notePath, page, elements)` | **Replace ALL elements on a page** | Complete page rewrite — dangerous but powerful. |
| `deleteElements(notePath, page, indices)` | Delete specific elements by index | Surgical removal of individual items. |
| `createElement(type)` | Create a new blank element | Factory for any element type. |

**The critical insight: these operate on ANY note file, not just the currently open one.** The `notePath` parameter means you can read from Note A and write to Note B. This enables cross-note operations that aren't possible in the built-in UI.

**What this enables:**
- **Custom database**: store structured data as elements across dedicated "data notes"
- **Cross-note operations**: copy/move content between notes
- **Batch editing**: modify elements across dozens of notes in one operation
- **Note templating**: programmatically populate note pages from digital data
- **Backup/export**: read all elements from all pages → serialize to any format

#### Page & Note Management

| API | What it does | Creative potential |
|---|---|---|
| `createNote({ notePath, template, mode, isPortrait })` | **Create entirely new notes programmatically** | Generate new notes from templates, pre-populated with content. |
| `insertNotePage({ notePath, page, template })` | Add pages to existing notes | Append or insert pages anywhere. |
| `removeNotePage(notePath, page)` | Delete pages | Cleanup, reorganization. |
| `getNoteTotalPageNum(notePath)` | Page count | Iteration boundary. |
| `getNoteType(notePath)` | 0=normal, 1=recognition | Detect note type for appropriate processing. |
| `getPageSize(notePath, page)` | Page pixel dimensions | Coordinate system adaptation. |
| `getFileMachineType(notePath)` | Device type that created the file | Cross-device compatibility handling. |
| `generateNotePng({ notePath, page, times, pngPath, type })` | **Render any page to PNG** | Export, thumbnailing, preview generation. |
| `generateNoteTemplatePng(notePath, page, pngPath)` | Render page template to PNG | Template preview without content. |

**What this enables:**
- **Note generation pipeline**: create a new note → add pages → populate with text/links/images → all programmatically
- **Export system**: render every page of every note to PNG → upload to cloud
- **Note reorganization**: move pages between notes, reorder, delete empty pages
- **Template system**: create custom templates as notes with pre-placed elements

#### Layers

| API | What it does | Creative potential |
|---|---|---|
| `getLayers(notePath, page)` | Read layer structure | Understand page organization. |
| `insertLayer(notePath, page, layer)` | Add custom layers (1-3) | **Plugin-owned layer**: put all plugin-generated content on a dedicated layer. |
| `modifyLayers(notePath, page, layers)` | Change name, visibility, current status | Toggle layers on/off. |
| `deleteLayers(notePath, page, layerIds)` | Remove custom layers | Clean up plugin layers. |
| `sortLayers(notePath, page, layerIds)` | Reorder layers | Control visual stacking. |
| `clearLayerElements(notePath, page, layer)` | Clear all elements on a layer | Bulk cleanup. |

**Layer rules:**
- Layer -1 (background): visibility toggle only
- Layer 0 (main): required for titles, links, digests — cannot delete
- Layers 1-3 (custom): full control — create, delete, rename, reorder

**What this enables:**
- **Non-destructive overlays**: put plugin-generated content (task checkboxes, status indicators, synced text) on a custom layer. User can toggle it off to see their original handwriting cleanly.
- **Separation of concerns**: handwritten content on layer 0, plugin-generated content on layer 1, annotations on layer 2.
- **Undo**: clear a plugin's layer to remove all its additions without touching user content.

#### Titles & Keywords (Metadata)

| API | What it does | Creative potential |
|---|---|---|
| `getTitles(notePath, pageList)` | Extract title metadata from multiple pages | **Index building**: scan titles across an entire notebook. |
| `getKeyWords(notePath, pageList)` | Extract keywords from multiple pages | **Tag system**: keywords are effectively tags on pages. |
| `insertKeyWord(notePath, page, keyword)` | Add a keyword to a page | **Auto-tagging**: recognize content and tag pages automatically. |
| `deleteKeyWord(notePath, page, index)` | Remove a keyword | Tag management. |

**What this enables:**
- **Full-text search index**: extract all titles + recognized text → build a searchable index stored in plugin directory
- **Auto-tagging system**: recognize handwriting → extract key terms → insert as keywords
- **Tag-based navigation**: show a tag cloud of all keywords across notes, tap to jump to pages

#### Stars & Marks

| API | What it does | Creative potential |
|---|---|---|
| `searchFiveStars(filePath)` | **Find all pages with stars** across a file | Star = "important" — scan for starred content. |
| `getMarkPages(filePath)` | Get pages with mark annotations | Find annotated document pages. |
| `generateMarkThumbnails(...)` | Render mark thumbnails | Preview annotations. |
| `clearMarkElements(filePath, page)` | Remove mark annotations | Cleanup. |

**What this enables:**
- **Starred item aggregation**: scan all notes for stars → extract content near each star → build an "important items" dashboard
- **Document annotation export**: extract all marks from PDFs/documents

---

### 5. PluginDocAPI — PDF/Document Operations

| API | What it does | Creative potential |
|---|---|---|
| `getLastSelectedText()` | Get highlighted text from DOC | **Selection-based actions**: translate, define, search, link. |
| `getCurrentDocText(page)` | Get full page text | **Full document text extraction** from PDFs. |
| `getCurrentTotalPages()` | Document page count | Iteration boundary for full-doc processing. |

**What this enables:**
- **PDF text extraction**: read every page of a PDF, build a full-text index
- **Translation**: grab selected/full text → call translation API → insert as annotation
- **Quote capture**: select text → save to a "quotes" note with source link
- **Vocabulary building**: select words → look up definitions → insert as annotations

---

### 6. FileUtils — Filesystem Operations

| API | What it does | Creative potential |
|---|---|---|
| `exists(path)` | Check file/directory existence | Prerequisite for safe file operations. |
| `makeDir(path)` | Create directories | Set up sync folder structures. |
| `copyFile(src, dest)` | Copy files | Export to accessible locations. |
| `renameToFile(src, dest)` | Move/rename files | Organize exports. |
| `deleteFile(path)` / `deleteDir(path)` | Remove files/directories | Cleanup. |
| `listFiles(dirPath)` | List directory contents | Scan for notes, exported files, sync targets. |
| `getFileMD5(path)` | File hash | **Change detection**: compare hashes to know if a note changed since last sync. |
| `getExternalDirPath()` | External storage paths | **Shared folder access**: write to user-accessible storage. |
| `getExportPath()` | Export directory | Standard export location. |
| `getFileList(suffixList)` | Find files by extension | Discover all `.note` files, all `.pdf` files, etc. |
| `getImageList()` | Find all images | Discover images for insertion. |
| `openFilePath(path)` | Open in system file manager | Navigate user to a file. |
| `getStorageAvailableSpace()` | Free disk space | Check before large operations. |

**The critical insight: `getExternalDirPath()` and `getExportPath()` give you access to user-visible storage.** This means you can write files that other sync services (Supernote Cloud, Dropbox, etc.) can pick up.

---

## Answering your specific questions

### Can I build a custom to-do app that replaces the built-in one?

**Yes, with caveats.** You can't literally replace/uninstall the built-in to-do functionality, but you can build a superior alternative:

**What your custom to-do plugin could do:**
- Full React Native UI with task lists, projects, due dates, priorities, drag-and-drop reordering
- Store task data as JSON in `getPluginDirPath()` — your own database
- Display tasks visually in notes by inserting TextBox elements and geometry (checkboxes as squares, etc.)
- Scan notes for handwritten tasks using `recognizeElements()` → add to your task database
- Use five-star annotations to mark task priorities, then `searchFiveStars()` to find them
- Sync tasks to/from Todoist, Notion, etc. via `fetch`
- Use a dedicated layer (layer 1) for task checkboxes/status so users can toggle them off

**What you can't do:**
- Replace the system's built-in task list UI outside the note/doc views
- Run in the background to check for new tasks automatically — requires user to open plugin
- Intercept the pen's checkbox gesture (if one exists)

**Architecture:**
```
Plugin directory (persistent JSON store)
├── tasks.json           ← master task list
├── sync-state.json      ← last sync timestamps
└── config.json          ← API tokens, preferences

Note pages (visual representation)
├── Layer 0: user's handwriting
└── Layer 1: plugin-generated checkboxes, status text, links
```

### Can I have a to-do list interface built into the plugin?

**Absolutely.** This is where React Native really shines. Your plugin view is a full React Native app. You can build:

- A scrollable task list with checkboxes, swipe actions, priority colors
- Inline editing of task titles
- Project/folder organization
- Due date pickers
- Search and filter
- A "capture" mode that recognizes handwritten selections and adds them as tasks

The UI appears as a full-screen overlay when the user taps the plugin button. It's the same technology used in apps like Instagram and Discord — you have the full React Native component library plus any npm packages you add.

### Can I sync with iCloud?

**Not directly, but you can bridge to it.** The Supernote is an Android device — there's no native iCloud framework. But there are practical workarounds:

**Option A: Shared sync folder (simplest)**
```
Your Plugin → writes files to /storage/emulated/0/EXPORT/Sync/
         → Supernote Cloud or Dropbox syncs this folder
         → Files appear on your Mac/iPhone via cloud service
         → iCloud sees them in a shared folder
```

**Option B: HTTP API sync (most flexible)**
```
Your Plugin → fetch('https://your-server.com/api/sync', { tasks, notes })
         → Your server stores data
         → Your server pushes to Apple CloudKit / iCloud Drive API
         → Or simply: your server provides a web UI accessible from any device
```

**Option C: Direct cloud API calls from plugin**
```
Your Plugin → fetch('https://api.dropbox.com/...') or similar
         → Writes directly to Dropbox/Google Drive/OneDrive
         → Those services sync to their desktop/mobile clients
         → Cross-platform access achieved
```

**Option D: Write to a WebDAV folder**
```
Your Plugin → fetch('https://your-webdav.com/notes/...', { method: 'PUT', body: ... })
         → WebDAV server (many support iCloud bridge)
         → Access from any device
```

The most practical approach: **write Markdown files and PNGs to a sync folder** that a cloud service picks up. Obsidian already watches folders. Todoist's API is HTTP-based. The gap between "Supernote" and "everything else" is just an HTTP request away.

### Can I replace the Supernote database/sync entirely?

**Partially.** You can't replace the internal `.note` file format or the device's built-in sync mechanism. But you can:

1. **Read everything**: every element on every page of every note is accessible via `getElements()` + `getFileList(['.note'])`
2. **Write your own parallel database**: store a structured representation (JSON, SQLite) that mirrors note content
3. **Sync that database**: to any service you want
4. **Generate output**: write Markdown, HTML, JSON, or PNG exports to shared folders

What you're building is essentially a **sync adapter** — it reads Supernote's native format and writes to your preferred format/service. It can't replace the native sync, but it can run alongside it.

---

## Capability matrix: what's possible vs. what's not

| Use case | Possible? | How | Constraints |
|---|---|---|---|
| Custom to-do UI | **Yes** | React Native full-screen plugin view | Only visible when plugin is opened |
| Handwriting → text | **Yes** | `recognizeElements()` | Quality depends on handwriting + language |
| Sync to Todoist/Notion | **Yes** | `fetch()` to their REST APIs | Requires network; manual trigger only |
| Sync to Obsidian | **Yes** | Write Markdown files to shared folder | Need a sync service to move files off device |
| Sync to iCloud | **Indirect** | Via HTTP API or shared folder + cloud service | No native iCloud on Android |
| Read any note's content | **Yes** | `getElements(page, notePath)` with any path | Full read access |
| Write to any note | **Yes** | `insertElements(notePath, page, elements)` | Can write to notes not currently open |
| Create new notes | **Yes** | `createNote()` + `insertNotePage()` + `insertText()` | Full programmatic note generation |
| Search across all notes | **Yes** | `getFileList(['.note'])` → iterate → `recognizeElements()` | Performance: may be slow on large libraries |
| Replace built-in apps | **No** | Can build alternatives, not replace system apps | Plugin UI only in note/doc toolbar context |
| Background sync | **No** | Plugin only runs on button press | No daemon/service capability |
| Real-time pen tracking | **No** | Only `event_pen_up` available | Can't stream live pen data |
| Modify device settings | **No** | No system-level access | Sandboxed to note/doc context |
| Inter-app communication | **Limited** | Can write files other apps might read | No direct IPC/intents from plugins |
| Custom page templates | **Yes** | Create notes with specific templates, or generate content that acts as a template | Limited to built-in template paths for `insertNotePage` |
| PDF text extraction | **Yes** | `getCurrentDocText(page)` | DOC viewer must be open |
| Cross-note linking | **Yes** | `insertTextLink()` with `linkType: 1` (NOTE file) | Full bi-directional linking possible |
| Image insertion | **Yes** | `insertImage(pngPath)` — PNG only | Must be a PNG file on device storage |
| Geometric shapes | **Yes** | Lines, circles, ellipses, polygons | Pixel coordinates, min width 100 |
| Layer management | **Yes** | Create/modify/delete layers 1-3 | Max 3 custom layers per page |
| Offline operation | **Yes** | All SDK APIs work offline; network is optional | Only network calls need connectivity |

---

## The "ghost layer" pattern: non-destructive digital augmentation

One of the most powerful architectural patterns enabled by the layer system:

```
Layer 0 (main):    User's original handwriting — NEVER TOUCH
Layer 1 (custom):  Plugin-generated content (task checkboxes, status text, links, synced data)
Layer 2 (custom):  Visual overlays (highlights, borders, connection lines)
Layer 3 (custom):  Temporary/diagnostic info (recognition results, debug)
```

**Why this matters:** Your plugin can add rich digital content to handwritten notes without ever modifying the user's original work. If the user doesn't want plugin content, they toggle the layer off. If they want to remove it entirely, you clear the layer. The handwriting stays pristine.

This is the foundation for all three plugin ideas: NotesBridge, TaskHarvest, and DayBridge all use this pattern.

---

## Performance considerations

| Operation | Expected speed | Notes |
|---|---|---|
| `getElements()` for one page | Fast (~100ms) | Typical page has 10-100 elements |
| `recognizeElements()` | Slow (1-5s per page) | On-device ML inference; depends on stroke count |
| `generateNotePng()` | Moderate (200-500ms) | Rendering pipeline |
| `getFileList(['.note'])` | Fast | Filesystem scan |
| Full notebook scan (50 pages) | 1-5 minutes | Recognition is the bottleneck |
| `fetch()` to external API | Depends on network | WiFi on Supernote is typically 2.4GHz |

**Implication:** Batch operations (scan all notes, recognize all pages) should show progress UI and allow cancellation. Real-time recognition of individual selections is fast enough to feel interactive.
