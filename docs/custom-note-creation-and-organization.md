# Custom Note Creation & Folder Organization via Plugin

> Can you modify the "new note" screen? Can you change how notes are sorted in folders? Here's what the APIs actually let you do.

## The short answer

You **can't modify the system's new-note dialog or file browser**. Those are part of the Supernote OS, not the NOTE/DOC apps that plugins extend. But you can build a **parallel workflow that's arguably better** — a plugin-powered note creation and organization system that replaces the need to use the system screens at all.

## What the APIs give you

### Note creation (full programmatic control)

| API | What it does |
|---|---|
| `PluginFileAPI.createNote({ notePath, template, mode, isPortrait })` | Create a new `.note` file at any path with any template |
| `PluginFileAPI.insertNotePage({ notePath, page, template })` | Add pages to an existing note |
| `PluginCommAPI.getNoteSystemTemplates()` | List all available system templates (returns `Template[]` with name, portrait URI, landscape URI) |
| `PluginNoteAPI.insertText(textBox)` | Insert pre-formatted text on a page |
| `PluginNoteAPI.insertTextLink(textLink)` | Insert navigable links |
| `PluginNoteAPI.insertImage(pngPath)` | Insert images |
| `PluginFileAPI.insertKeyWord(notePath, page, keyword)` | Add keywords/tags |

**You choose the file path.** `notePath` is a full path like `/storage/emulated/0/Note/Projects/Q2 Planning.note`. This means you control the folder structure entirely.

### File organization (full filesystem access)

| API | What it does |
|---|---|
| `FileUtils.getFileList(['.note'])` | Find all note files on the device |
| `FileUtils.listFiles(dirPath)` | List contents of any directory |
| `FileUtils.makeDir(dirPath)` | Create folders |
| `FileUtils.renameToFile(src, dest)` | Move/rename files (this IS the sort/organize mechanism) |
| `FileUtils.copyFile(src, dest)` | Duplicate files |
| `FileUtils.deleteFile(path)` | Remove files |
| `FileUtils.exists(path)` | Check before operating |
| `FileUtils.getFileMD5(path)` | Change detection |
| `RattaFileSelector.selectFile(params)` | Show a file picker dialog with custom title, filters, folder navigation |

### Template system

The SDK bundles 40+ templates (portrait + landscape variants):

```
Blank (white)             Daily calendar          Meeting notes
College ruled             Weekly calendar         Task list
Wide ruled                Hand drawn diary        Reading note
8mm/9mm/10mm ruled        Letter format           Sheet format
5mm dots                  List format             Staff (music)
5mm/10mm grid             Four quadrants          Arabic lined
5mm engineering grid      3x3 grid                French Seyes
Cornell note (9mm/10mm)   Four wire               Tian Zi Ge
```

`getNoteSystemTemplates()` returns these as `Template` objects with `name`, `vUri` (portrait), and `hUri` (landscape) paths. You can also use custom templates — `getNotePageTemplate()` returns a `NoteTemplateInfo` with the template name and an MD5 hash (system templates use MD5 `"0"`, custom templates have their actual hash).

---

## Plugin concept: "NoteForge" — Custom Note Creation & Organization

### What it replaces

Instead of: **Settings → New Note → pick template → it goes in whatever folder**

You get: **Tap NoteForge → pick from your custom workflows → note is created exactly where you want it, with the template you want, pre-populated with content you define**

### New note workflows

#### 1. Quick-create with smart defaults

```
┌─────────────────────────────────────────┐
│  NoteForge                    [⚙ Config] │
├─────────────────────────────────────────┤
│                                           │
│  Quick Create:                           │
│  ┌─────────────────────────────────────┐ │
│  │  📋 Meeting Note                    │ │
│  │  → /Note/Meetings/2026-04-11.note   │ │
│  │  Template: Meeting notes             │ │
│  │  Pre-filled: date, attendees field   │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │  💡 Project Note                    │ │
│  │  → /Note/Projects/{name}.note       │ │
│  │  Template: Cornell 9mm               │ │
│  │  Pre-filled: project header          │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │  📝 Daily Journal                   │ │
│  │  → /Note/Journal/2026-04-11.note    │ │
│  │  Template: Hand drawn diary          │ │
│  │  Pre-filled: date, mood tracker      │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │  📖 Reading Note                    │ │
│  │  → /Note/Reading/{title}.note       │ │
│  │  Template: Reading note              │ │
│  │  Pre-filled: title, author field     │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │  + Custom Template...               │ │
│  └─────────────────────────────────────┘ │
│                                           │
│                            [Close]        │
└─────────────────────────────────────────┘
```

Each workflow is a saved configuration:
```typescript
interface NoteWorkflow {
  name: string;
  icon: string;
  // Path template (supports variables)
  pathTemplate: string;  // e.g., "/Note/Meetings/{date}.note"
  // Which system template to use
  noteTemplate: string;  // e.g., "meeting_notes"
  mode: 0 | 1;          // 0=normal, 1=recognition
  isPortrait: boolean;
  // Content to pre-populate
  prefill: PrefillConfig[];
}

interface PrefillConfig {
  type: 'text' | 'title' | 'link' | 'keyword';
  // For text:
  textBox?: Partial<TextBox>;
  // For keywords:
  keywords?: string[];
  // Variables: {date}, {time}, {name} (prompted)
  template?: string;
}
```

#### 2. Pre-populated content

When creating a meeting note, the plugin could automatically insert:

```typescript
// Create the note file
await PluginFileAPI.createNote({
  notePath: '/storage/emulated/0/Note/Meetings/2026-04-11.note',
  template: meetingTemplate.vUri,
  mode: 0,
  isPortrait: true,
});

// Insert date header as TextBox
await PluginNoteAPI.insertText({
  textContentFull: 'April 11, 2026',
  textRect: { left: 50, top: 50, right: 400, bottom: 90 },
  fontSize: 28,
  textBold: 1,
  textAlign: 0,
  textItalics: 0,
  textFrameWidthType: 1,
  textFrameStyle: 0,
  textEditable: 1, // non-editable header
});

// Insert section labels
await PluginNoteAPI.insertText({
  textContentFull: 'Attendees:',
  textRect: { left: 50, top: 110, right: 300, bottom: 140 },
  fontSize: 20,
  textBold: 1,
  // ...
});

await PluginNoteAPI.insertText({
  textContentFull: 'Agenda:',
  textRect: { left: 50, top: 250, right: 300, bottom: 280 },
  fontSize: 20,
  textBold: 1,
  // ...
});

await PluginNoteAPI.insertText({
  textContentFull: 'Action Items:',
  textRect: { left: 50, top: 900, right: 300, bottom: 930 },
  fontSize: 20,
  textBold: 1,
  // ...
});

// Add keywords for organization
await PluginFileAPI.insertKeyWord(notePath, 0, 'meeting');
await PluginFileAPI.insertKeyWord(notePath, 0, '2026-04-11');
```

The user gets a note that's already structured — they just start writing in the blank areas between the pre-placed headers.

#### 3. Multi-page templates

The system "new note" creates one page. Your plugin can create a full multi-page notebook in one tap:

```typescript
// Create note
await PluginFileAPI.createNote({ notePath, template: coverTemplate, mode: 0, isPortrait: true });

// Add a table-of-contents page
await PluginFileAPI.insertNotePage({ notePath, page: 1, template: blankTemplate });
// Insert "Table of Contents" header
// Insert placeholder text links that will be filled as user adds content

// Add 5 section pages with different templates
for (const section of ['Planning', 'Notes', 'Research', 'Action Items', 'References']) {
  const page = await getNextPage();
  await PluginFileAPI.insertNotePage({ notePath, page, template: sectionTemplate });
  // Insert section title
  // Insert section-specific headers
}
```

### Note organization features

#### File browser with custom sorting

The system file browser sorts by... whatever Supernote decides. Your plugin can offer:

```
┌─────────────────────────────────────────┐
│  Note Browser               [Sort ▾]     │
├─────────────────────────────────────────┤
│  Sort: [Recent ▾] [Name ▾] [Size ▾]     │
│        [Stars ▾] [Tags ▾]               │
│  Filter: [All ▾] [Meeting ▾] [Project ▾]│
│                                           │
│  📁 Meetings/                            │
│    📄 2026-04-11.note (3 pages, ⭐)      │
│    📄 2026-04-09.note (5 pages)          │
│    📄 2026-04-07.note (2 pages)          │
│                                           │
│  📁 Projects/                            │
│    📄 Alpha Roadmap.note (12 pages, ⭐⭐) │
│    📄 Beta Spec.note (8 pages)           │
│                                           │
│  📁 Journal/                             │
│    📄 2026-04-11.note (1 page)           │
│    📄 2026-04-10.note (2 pages)          │
│                                           │
│  Actions:                                │
│  [Move selected] [Rename] [Tag]          │
│                            [Close]        │
└─────────────────────────────────────────┘
```

Implementation:
```typescript
// Scan all notes
const allNotes = await FileUtils.getFileList(['.note']);

// Build metadata index
const noteIndex = [];
for (const path of allNotes.result) {
  const pageCount = await PluginFileAPI.getNoteTotalPageNum(path);
  const stars = await PluginFileAPI.searchFiveStars(path);
  const keywords = await PluginFileAPI.getKeyWords(path, [0]); // first page keywords
  const md5 = await FileUtils.getFileMD5(path);

  noteIndex.push({
    path,
    name: path.split('/').pop(),
    folder: path.split('/').slice(0, -1).join('/'),
    pages: pageCount.result,
    hasStars: stars.result?.length > 0,
    starCount: stars.result?.length || 0,
    keywords: keywords.result?.map(k => k.keyword) || [],
    md5,
  });
}

// Sort by whatever the user chooses
noteIndex.sort((a, b) => {
  switch (sortMode) {
    case 'stars': return b.starCount - a.starCount;
    case 'pages': return b.pages - a.pages;
    case 'name': return a.name.localeCompare(b.name);
    case 'folder': return a.folder.localeCompare(b.folder);
  }
});
```

#### Batch move/reorganize

```typescript
// Move a note to a different folder
async function moveNote(currentPath: string, newFolder: string) {
  const filename = currentPath.split('/').pop();
  const newPath = `${newFolder}/${filename}`;

  // Ensure target folder exists
  await FileUtils.makeDir(newFolder);

  // Move the file
  await FileUtils.renameToFile(currentPath, newPath);
}

// Batch organize: move all meeting notes to /Note/Meetings/
async function organizeByKeyword() {
  const allNotes = await FileUtils.getFileList(['.note']);
  for (const path of allNotes.result) {
    const keywords = await PluginFileAPI.getKeyWords(path, [0]);
    if (keywords.result?.some(k => k.keyword === 'meeting')) {
      await moveNote(path, '/storage/emulated/0/Note/Meetings');
    }
  }
}
```

#### Auto-tagging

When a note is created through NoteForge, it's automatically tagged. But you can also retroactively tag existing notes:

```typescript
// Scan a note's content and auto-tag
async function autoTag(notePath: string) {
  const totalPages = await PluginFileAPI.getNoteTotalPageNum(notePath);
  const allText = [];

  for (let page = 0; page < totalPages.result; page++) {
    const elements = await PluginFileAPI.getElements(page, notePath);
    // Recognize text from strokes
    const strokes = elements.result.filter(e => e.type === 0);
    if (strokes.length > 0) {
      const recognized = await PluginCommAPI.recognizeElements(strokes);
      allText.push(recognized.result);
    }
  }

  const fullText = allText.join(' ').toLowerCase();

  // Apply keyword rules
  const tagRules = [
    { pattern: /meeting|agenda|attendees|action items/i, tag: 'meeting' },
    { pattern: /project|milestone|deadline|sprint/i, tag: 'project' },
    { pattern: /journal|diary|today|mood/i, tag: 'journal' },
    { pattern: /reading|book|chapter|author/i, tag: 'reading' },
    { pattern: /todo|task|checkbox|urgent/i, tag: 'tasks' },
  ];

  for (const rule of tagRules) {
    if (rule.pattern.test(fullText)) {
      await PluginFileAPI.insertKeyWord(notePath, 0, rule.tag);
    }
  }
}
```

---

## What you CAN'T do (system limitations)

| Want to do | Possible? | Why / workaround |
|---|---|---|
| Replace the system "New Note" button | No | System UI is outside plugin scope. Workaround: make the plugin toolbar button your new default for creating notes. |
| Change the system file browser sort order | No | System file browser is not extensible. Workaround: build your own browser in the plugin. |
| Add folders to the system sidebar | No | System navigation is fixed. |
| Auto-create notes on device boot | No | No background execution. |
| Open a specific note from within the plugin | **Likely yes** | `FileUtils.openFilePath(path)` fires an `ACTION_VIEW` intent with `only_open_file` extra — see [critical discovery below](#critical-discovery-openfilepath-can-likely-open-notes-directly). Call `closePluginView()` first, then `openFilePath()`. Needs on-device testing to confirm. |
| Change the default template for new notes | No | System setting, not plugin-accessible. |
| Trigger note creation from a pen gesture | No | Only `event_pen_up` available, no custom gesture recognition. |
| Create notes in response to calendar events | No | No background execution, no calendar API. This would be a Mac companion feature. |

### Critical discovery: `openFilePath` can likely open notes directly

We initially assumed `openFilePath` just opened the file manager. Reading the native Java implementation in `android/src/main/java/.../RTNFileModule.java` revealed the actual intent dispatch:

```java
// RTNFileModule.java — the actual native implementation behind FileUtils.openFilePath()
@ReactMethod
public void openFilePath(String path, Promise promise) {
    Intent intent = new Intent();
    intent.setComponent(new ComponentName(
        "com.ratta.supernote.inbox",
        "com.ratta.supernote.explorer.FileManagerMainActivity"
    ));
    intent.putExtra("folder_path",
        HostDataCacheAPI.getInstance().getCurrentFilePath());
    intent.putExtra("source_type", 2);
    intent.putExtra("only_open_file", path);   // ← KEY: tells file manager to open this specific file
    intent.setAction(Intent.ACTION_VIEW);
    HostContext.getInstance().startActivity(intent);
    promise.resolve(true);
}
```

**Why this matters:** The `only_open_file` extra passes the full file path to the system file manager with an `ACTION_VIEW` intent. On Android, `ACTION_VIEW` dispatches to whatever activity handles that file type — for `.note` files, that's the NOTE app. This strongly suggests the flow is: plugin → file manager → NOTE app opens the specific note.

**The create-then-open flow:**

```typescript
// 1. Create the note with template and content
await PluginFileAPI.createNote({
  notePath: '/storage/emulated/0/Note/Meetings/2026-04-11.note',
  template: meetingTemplate.vUri,
  mode: 0,
  isPortrait: true,
});

// 2. Pre-populate content
await PluginNoteAPI.insertText({
  textContentFull: 'April 11, 2026 — Team Standup',
  textRect: { left: 50, top: 50, right: 600, bottom: 90 },
  fontSize: 28,
  textBold: 1,
  textAlign: 0,
  textItalics: 0,
  textFrameWidthType: 1,
  textFrameStyle: 0,
  textEditable: 1,
});

// 3. Close plugin, then hand off to NOTE app
PluginManager.closePluginView();
await FileUtils.openFilePath(notePath);
// NOTE app should open with your freshly created, pre-populated note
```

**Alternative approach — internal link:** If `openFilePath` turns out to only open the file manager (needs on-device testing), you can instead insert a `linkType: 1` text link in the *current* note that points to the newly created note. Tapping the link navigates there within the NOTE app.

> **Status:** Needs on-device testing to confirm. The Java implementation strongly suggests direct note opening works, but the intent routing depends on how Supernote's file manager handles the `only_open_file` extra.

---

## How this fits with the hybrid sync architecture

NoteForge doesn't need to be a separate plugin. It could be a feature within NotesBridge or TaskHarvest:

**NotesBridge + NoteForge:**
- Create structured notes from Obsidian templates
- Mac companion detects a "create note" request in a sync file
- Next time user opens plugin, it creates the note on-device

**TaskHarvest + NoteForge:**
- "New Meeting Note" creates a note pre-tagged with `meeting` and pre-structured with action item sections
- Tasks captured from that note automatically inherit the `meeting` project tag
- The task list plugin doubles as a note organizer

**Standalone NoteForge:**
- Pure note creation and organization tool
- Custom workflows for different note types
- Batch operations: tag, move, reorganize
- Search across all notes via keywords and recognized text

---

## Plugin concept: "NoteForge Browser" — Custom File Browser + Note Creator

The core idea: replace the system file browser entirely with a plugin-powered browser that's faster to navigate, shows richer context, creates notes with better defaults, and hands off directly to the NOTE app via `openFilePath`.

### Why the system browser falls short

- File names default to ISO timestamps (`20260411143022.note`) — functional but hard to scan
- No metadata preview (page count, stars, keywords) without opening each note
- Sorting is whatever Supernote decides — no user control
- No quick-create from the current context (folder, date, template)
- No folder-aware conventions or visual cues

### The browser UI

```
┌─────────────────────────────────────────────────┐
│  NoteForge Browser                    [⚙] [✕]  │
├─────────────────────────────────────────────────┤
│  📁 /Note/Meetings/                             │
│  ─────────────────────────────────────────────  │
│  Sort: [Date ▾]  Filter: [All ▾]               │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  Apr 11 — Team Standup                  │    │
│  │  3 pages · ⭐ · meeting, sprint-42      │    │
│  │  Last edited: 2:30 PM                   │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │  Apr 9 — Client Review                  │    │
│  │  5 pages · meeting, client-acme         │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │  Apr 7 — 1:1 with Sarah                │    │
│  │  2 pages · ⭐⭐ · meeting, 1on1          │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ─────────────────────────────────────────────  │
│  Quick Actions:                                  │
│  [+ New in this folder]  [+ Meeting]  [+ Daily] │
│  ─────────────────────────────────────────────  │
│  Navigation:                                     │
│  [← Back]  [📁 Note/]  [📁 Projects/]          │
│            [📁 Journal/]  [📁 Reading/]          │
└─────────────────────────────────────────────────┘
```

### Better note naming

Instead of `20260411143022.note`, the plugin generates human-readable names:

```typescript
interface NamingConvention {
  // What gets generated
  format: string;
  // Examples:
  // "Apr 11 — {title}.note"        → "Apr 11 — Team Standup.note"
  // "{date} {title}.note"           → "2026-04-11 Team Standup.note"
  // "{title}.note"                  → "Team Standup.note"
  // "Week {week} — {title}.note"   → "Week 15 — Sprint Review.note"
}

// Built-in naming presets
const namingPresets = {
  // Readable date + title (default)
  dateTitle: (date: Date, title: string) =>
    `${formatDate(date, 'MMM DD')} — ${title}.note`,

  // ISO date + title (sortable)
  isoTitle: (date: Date, title: string) =>
    `${formatDate(date, 'YYYY-MM-DD')} ${title}.note`,

  // Title only (for non-dated notes like projects)
  titleOnly: (_date: Date, title: string) =>
    `${title}.note`,

  // Journal style
  journal: (date: Date) =>
    `${formatDate(date, 'YYYY-MM-DD ddd')}.note`,
    // → "2026-04-11 Fri.note"
};

// Folder-specific defaults
const folderConventions: Record<string, NamingConvention> = {
  '/Note/Meetings/':  { format: 'dateTitle' },   // "Apr 11 — Standup.note"
  '/Note/Journal/':   { format: 'journal' },      // "2026-04-11 Fri.note"
  '/Note/Projects/':  { format: 'titleOnly' },    // "Alpha Roadmap.note"
  '/Note/Reading/':   { format: 'titleOnly' },    // "Thinking Fast and Slow.note"
};
```

**Sorting is now trivial** — human-readable names sort naturally when you use consistent prefixes. "Apr 11" sorts chronologically within a month; ISO dates sort across months. The browser can also sort by metadata (stars, page count, keywords) regardless of filename.

### Quick-action buttons: context-aware note creation

The quick-action bar is the key UX improvement. Buttons are **context-aware** — they know the current folder and date and use both to generate the right note:

```typescript
// "Current Folder" button — creates a note in the folder you're browsing
async function createInCurrentFolder(currentFolder: string, title: string) {
  const convention = folderConventions[currentFolder] || namingPresets.dateTitle;
  const filename = convention(new Date(), title);
  const notePath = `${currentFolder}${filename}`;
  const template = folderTemplates[currentFolder] || defaultTemplate;

  await PluginFileAPI.createNote({
    notePath,
    template: template.vUri,
    mode: 0,
    isPortrait: true,
  });

  // Auto-tag based on folder convention
  const folderTag = currentFolder.split('/').filter(Boolean).pop()?.toLowerCase();
  if (folderTag) {
    await PluginFileAPI.insertKeyWord(notePath, 0, folderTag);
  }

  // Insert date header
  await PluginNoteAPI.insertText({
    textContentFull: formatDate(new Date(), 'MMMM DD, YYYY'),
    textRect: { left: 50, top: 50, right: 500, bottom: 85 },
    fontSize: 24,
    textBold: 1,
    textAlign: 0,
    textItalics: 0,
    textFrameWidthType: 1,
    textFrameStyle: 0,
    textEditable: 1,
  });

  // Hand off to NOTE app
  PluginManager.closePluginView();
  await FileUtils.openFilePath(notePath);
}

// "Current Date" button — inserts today's date as text in the active note
async function insertCurrentDate() {
  const dateStr = formatDate(new Date(), 'MMMM DD, YYYY — dddd');
  // "April 11, 2026 — Friday"
  await PluginNoteAPI.insertText({
    textContentFull: dateStr,
    textRect: { left: 50, top: 50, right: 600, bottom: 85 },
    fontSize: 22,
    textBold: 1,
    textAlign: 0,
    textItalics: 0,
    textFrameWidthType: 1,
    textFrameStyle: 0,
    textEditable: 1,
  });
}

// "Current Folder" button — inserts folder path as context breadcrumb
async function insertFolderContext() {
  const currentPath = await PluginCommAPI.getCurrentFilePath();
  const folder = currentPath.result.split('/').slice(-2, -1)[0];
  // e.g., "Meetings" from "/Note/Meetings/standup.note"
  await PluginNoteAPI.insertText({
    textContentFull: `📁 ${folder}`,
    textRect: { left: 50, top: 20, right: 250, bottom: 45 },
    fontSize: 16,
    textBold: 0,
    textAlign: 0,
    textItalics: 1,
    textFrameWidthType: 1,
    textFrameStyle: 0,
    textEditable: 1,
  });
}
```

### Contextual overlays: folder-aware note headers

When the plugin creates a note, it can stamp contextual information based on which folder the note lives in:

```typescript
// Folder conventions define what gets auto-inserted
interface FolderConvention {
  namingFormat: string;
  template: string;           // Which system template to use
  autoKeywords: string[];     // Tags applied to every note in this folder
  headerOverlay: HeaderConfig; // What gets stamped at the top of new notes
}

interface HeaderConfig {
  showDate: boolean;          // "April 11, 2026"
  showFolder: boolean;        // "📁 Meetings"
  showTitle: boolean;         // Large title area
  customFields: string[];     // ["Attendees:", "Agenda:", "Action Items:"]
}

const conventions: Record<string, FolderConvention> = {
  '/Note/Meetings/': {
    namingFormat: 'dateTitle',
    template: 'meeting_notes',
    autoKeywords: ['meeting'],
    headerOverlay: {
      showDate: true,
      showFolder: true,
      showTitle: true,
      customFields: ['Attendees:', 'Agenda:', 'Action Items:'],
    },
  },
  '/Note/Journal/': {
    namingFormat: 'journal',
    template: 'hand_drawn_diary',
    autoKeywords: ['journal'],
    headerOverlay: {
      showDate: true,
      showFolder: false,
      showTitle: false,
      customFields: [],  // Journal is freeform
    },
  },
  '/Note/Projects/': {
    namingFormat: 'titleOnly',
    template: 'cornell_9mm',
    autoKeywords: ['project'],
    headerOverlay: {
      showDate: true,
      showFolder: true,
      showTitle: true,
      customFields: ['Status:', 'Next milestone:'],
    },
  },
};

// Apply the convention when creating a note
async function applyConvention(notePath: string, convention: FolderConvention, title: string) {
  let yOffset = 30;

  if (convention.headerOverlay.showFolder) {
    const folder = notePath.split('/').slice(-2, -1)[0];
    await PluginNoteAPI.insertText({
      textContentFull: `📁 ${folder}`,
      textRect: { left: 50, top: yOffset, right: 300, bottom: yOffset + 25 },
      fontSize: 16, textBold: 0, textAlign: 0, textItalics: 1,
      textFrameWidthType: 1, textFrameStyle: 0, textEditable: 1,
    });
    yOffset += 35;
  }

  if (convention.headerOverlay.showDate) {
    await PluginNoteAPI.insertText({
      textContentFull: formatDate(new Date(), 'MMMM DD, YYYY — dddd'),
      textRect: { left: 50, top: yOffset, right: 600, bottom: yOffset + 30 },
      fontSize: 22, textBold: 1, textAlign: 0, textItalics: 0,
      textFrameWidthType: 1, textFrameStyle: 0, textEditable: 1,
    });
    yOffset += 40;
  }

  if (convention.headerOverlay.showTitle) {
    await PluginNoteAPI.insertText({
      textContentFull: title,
      textRect: { left: 50, top: yOffset, right: 700, bottom: yOffset + 40 },
      fontSize: 32, textBold: 1, textAlign: 0, textItalics: 0,
      textFrameWidthType: 1, textFrameStyle: 0, textEditable: 1,
    });
    yOffset += 55;
  }

  // Separator line
  yOffset += 10;

  // Custom fields for this folder type
  for (const field of convention.headerOverlay.customFields) {
    await PluginNoteAPI.insertText({
      textContentFull: field,
      textRect: { left: 50, top: yOffset, right: 400, bottom: yOffset + 25 },
      fontSize: 18, textBold: 1, textAlign: 0, textItalics: 0,
      textFrameWidthType: 1, textFrameStyle: 0, textEditable: 1,
    });
    yOffset += 80; // Leave writing space between fields
  }

  // Apply auto-keywords
  for (const kw of convention.autoKeywords) {
    await PluginFileAPI.insertKeyWord(notePath, 0, kw);
  }
}
```

### The complete flow: browse → create → open

```
User taps plugin button
        │
        ▼
┌─────────────────────────────┐
│  NoteForge Browser opens    │
│  Shows current folder with  │
│  rich metadata per note     │
└──────────┬──────────────────┘
           │
     User taps [+ Meeting]
           │
           ▼
┌─────────────────────────────┐
│  Plugin:                    │
│  1. Reads folder convention │
│  2. Generates filename:     │
│     "Apr 11 — Standup.note" │
│  3. createNote() with       │
│     meeting template        │
│  4. insertText() headers:   │
│     📁 Meetings             │
│     April 11, 2026 — Friday │
│     Team Standup             │
│     Attendees:              │
│     Agenda:                 │
│     Action Items:           │
│  5. insertKeyWord('meeting')│
│  6. closePluginView()       │
│  7. openFilePath(notePath)  │
│     ↓                       │
│     Intent: ACTION_VIEW     │
│     + only_open_file        │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  NOTE app opens with the    │
│  freshly created note       │
│  Pre-structured, pre-tagged │
│  User starts writing        │
│  immediately in the blank   │
│  areas between headers      │
└─────────────────────────────┘
```

### Building the metadata index

The browser needs to be fast. Build an index on plugin open and cache it:

```typescript
interface NoteEntry {
  path: string;
  displayName: string;    // Human-readable, parsed from filename
  folder: string;
  pages: number;
  starCount: number;
  keywords: string[];
  md5: string;            // For change detection
  lastModified?: number;  // From file metadata if available
}

async function buildIndex(rootPath: string): Promise<NoteEntry[]> {
  const allNotes = await FileUtils.getFileList(['.note']);
  const entries: NoteEntry[] = [];

  for (const path of allNotes.result) {
    const filename = path.split('/').pop() || '';
    const folder = path.split('/').slice(0, -1).join('/');

    // Parse display name from filename
    // "Apr 11 — Team Standup.note" → "Apr 11 — Team Standup"
    // "20260411143022.note" → "Apr 11, 2:30 PM" (parse ISO timestamp)
    const displayName = parseDisplayName(filename);

    const [pageResult, starsResult, keywordsResult, md5] = await Promise.all([
      PluginFileAPI.getNoteTotalPageNum(path),
      PluginFileAPI.searchFiveStars(path),
      PluginFileAPI.getKeyWords(path, [0]),
      FileUtils.getFileMD5(path),
    ]);

    entries.push({
      path,
      displayName,
      folder,
      pages: pageResult.result,
      starCount: starsResult.result?.length || 0,
      keywords: keywordsResult.result?.map(k => k.keyword) || [],
      md5,
    });
  }

  return entries;
}

// Make legacy ISO filenames readable
function parseDisplayName(filename: string): string {
  const name = filename.replace('.note', '');

  // Check if it's an ISO timestamp: "20260411143022"
  const isoMatch = name.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d, h, min] = isoMatch;
    const date = new Date(+y, +m - 1, +d, +h, +min);
    return formatDate(date, 'MMM DD, h:mm A');
    // "20260411143022" → "Apr 11, 2:30 PM"
  }

  return name; // Already human-readable
}
```

### Toolbar button registration

The browser could be triggered from the toolbar or the side panel:

```typescript
// Register as a side-panel button (always visible)
PluginManager.registerButton(0, ['NOTE', 'DOC'], {
  id: 100,
  name: 'NoteForge',
  icon: Image.resolveAssetSource(require('./assets/noteforge-icon.png')).uri,
  editDataTypes: [],
  showType: 0,
});

// Also register as a lasso-context button for quick actions on selected content
PluginManager.registerButton(2, ['NOTE'], {
  id: 200,
  name: 'Quick Actions',
  icon: Image.resolveAssetSource(require('./assets/quick-action-icon.png')).uri,
  editDataTypes: [0, 1, 2, 3, 4, 5],
  showType: 1,
});
```

### Quick-action buttons summary

| Button | What it does | API used |
|---|---|---|
| **+ New in this folder** | Creates a note using the current folder's convention, opens it | `createNote` → `insertText` → `closePluginView` → `openFilePath` |
| **+ Meeting** | Creates a meeting note in `/Note/Meetings/` with full template | Same flow, hardcoded to meeting convention |
| **+ Daily** | Creates today's journal entry in `/Note/Journal/` | Same flow, journal convention |
| **Insert Date** | Stamps "April 11, 2026 — Friday" into the current note | `insertText` only (no navigation) |
| **Insert Folder** | Stamps "📁 Meetings" context breadcrumb into current note | `insertText` with `getCurrentFilePath` |
| **Open note** | Taps a note in the browser list → opens it in NOTE app | `closePluginView` → `openFilePath` |
