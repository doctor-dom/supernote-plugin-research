# TaskHarvest — Handwritten Tasks → Todoist (with Built-in To-Do UI)

> A Supernote plugin that replaces your task workflow: capture handwritten tasks, manage them in a built-in to-do interface, and sync bidirectionally with Todoist. Your handwriting becomes your inbox, and your plugin becomes your task manager.

## Why this plugin

The gap: you write tasks by hand on your Supernote throughout the day — in meetings, while reading, during brainstorms. But those tasks stay trapped on paper. You forget them, or you manually re-type them into Todoist later. TaskHarvest closes the loop:

- **Capture**: lasso a handwritten task → it's recognized and added to your task list
- **Batch scan**: find all starred/marked items across your notes → bulk import
- **Manage**: a full to-do interface built right into the plugin — no need to open Todoist on another device
- **Sync**: two-way sync with Todoist → tasks flow between handwritten notes and your digital system
- **Visual feedback**: completed tasks get visual indicators on the note page (on a non-destructive layer)

## The custom to-do app angle

This isn't just a "send to Todoist" button. It's a **standalone task management interface** that happens to sync with Todoist. Even without network access, it works as a local to-do app:

- Full React Native task list UI with projects, priorities, due dates
- Local JSON database in the plugin directory
- Tasks can be created from handwriting OR typed directly in the UI
- Visual task status overlays on note pages
- Todoist sync is an optional add-on, not a requirement

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Supernote Device                        │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │                   TaskHarvest Plugin                   ││
│  │                                                        ││
│  │  ┌────────────┐  ┌───────────┐  ┌─────────────────┐ ││
│  │  │ Capture     │  │ Task      │  │ Todoist Sync    │ ││
│  │  │ Engine      │  │ Manager   │  │ Engine          │ ││
│  │  │             │  │           │  │                 │ ││
│  │  │ lasso →     │  │ CRUD ops  │  │ fetch() →      │ ││
│  │  │ recognize → │  │ local DB  │  │ Todoist API    │ ││
│  │  │ parse →     │  │ UI render │  │ bidirectional  │ ││
│  │  │ add task    │  │           │  │                 │ ││
│  │  └──────┬──────┘  └─────┬─────┘  └────────┬────────┘ ││
│  │         │               │                  │          ││
│  │         ▼               ▼                  ▼          ││
│  │  ┌──────────────────────────────────────────────────┐ ││
│  │  │              Local Task Database                  │ ││
│  │  │         (JSON in plugin directory)                 │ ││
│  │  │                                                    │ ││
│  │  │  tasks.json — master task list                    │ ││
│  │  │  projects.json — project/folder structure         │ ││
│  │  │  sync-log.json — Todoist sync state               │ ││
│  │  │  config.json — API token, preferences             │ ││
│  │  └──────────────────────────────────────────────────┘ ││
│  └──────────────────────────────────────────────────────┘│
│                                                            │
│  Note pages:                                               │
│    Layer 0: User's handwriting (untouched)                 │
│    Layer 1: Task status overlays (checkmarks, links)       │
└──────────────────────────────────────────────────────────┘
```

### Local database schema

```typescript
// tasks.json
interface TaskDatabase {
  tasks: Task[];
  lastModified: string; // ISO timestamp
  version: number;
}

interface Task {
  id: string;              // UUID, generated locally
  todoistId?: string;      // Todoist task ID, if synced
  title: string;           // Recognized or typed text
  description?: string;    // Additional notes
  project?: string;        // Project name
  priority: 1 | 2 | 3 | 4; // 1=urgent, 4=none (Todoist convention)
  dueDate?: string;        // ISO date
  completed: boolean;
  completedAt?: string;    // ISO timestamp
  createdAt: string;       // ISO timestamp
  source: {                // Where this task came from
    type: 'handwriting' | 'typed' | 'todoist';
    notePath?: string;     // Source note file
    page?: number;         // Source page
    elementIndices?: number[]; // Which elements were recognized
    rect?: Rect;           // Bounding box on page (for overlay placement)
  };
  syncState: 'local' | 'synced' | 'modified' | 'conflict';
  lastSynced?: string;
}

// projects.json
interface ProjectDatabase {
  projects: Project[];
}

interface Project {
  name: string;
  todoistId?: string;
  color?: string;
}
```

---

## Plugin entry points

### Button 1: Toolbar (Type 1, NOTE)
- **Name:** "Tasks"
- **showType:** 1 (full-screen UI)
- **Purpose:** Main task management interface — view all tasks, manage projects, sync with Todoist

### Button 2: Lasso toolbar (Type 2, NOTE)
- **Name:** "Capture Task"
- **showType:** 1
- **editDataTypes:** [0, 1, 3, 5] (strokes, titles, text, geometry)
- **Purpose:** Quick capture — recognize selected handwriting, create a task from it

### Button 3: Toolbar (Type 1, DOC)
- **Name:** "Capture from Doc"
- **showType:** 1
- **Purpose:** Capture tasks from PDF/document text selections

### Config button
- **Purpose:** Store Todoist API token, default project, sync preferences

---

## Feature: built-in to-do interface

The plugin's toolbar button opens a full task management UI. This works entirely offline — Todoist sync is optional.

### Main task list view
```
┌─────────────────────────────────────────┐
│  TaskHarvest                  [⚙] [Sync] │
├─────────────────────────────────────────┤
│  ┌─ Filter: [All ▾] [Due today ▾] ───┐ │
│  │          [Search tasks...]          │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  INBOX (3)                               │
│  ┌─────────────────────────────────────┐ │
│  │ ○ Call Sarah about Q2 budget        │ │
│  │   📝 Meeting Notes p.3 · Due Apr 14 │ │
│  │ ○ Review design spec v2             │ │
│  │   📝 Project Alpha p.1 · ⭐ High    │ │
│  │ ○ Book team lunch venue             │ │
│  │   ⌨ Typed · No date                │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  PROJECT: Alpha (2)                      │
│  ┌─────────────────────────────────────┐ │
│  │ ○ Send updated timeline to client   │ │
│  │   📝 Sprint Review p.2 · Due Apr 12 │ │
│  │ ● Draft feature spec [completed]    │ │
│  │   Todoist · Completed Apr 10        │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │        [+ Add Task]                  │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ⭐ 2 starred  ·  📋 5 active  ·  ✓ 12  │
│                                           │
│                            [Close]        │
└─────────────────────────────────────────┘
```

### Task detail view (on tap)
```
┌─────────────────────────────────────────┐
│  ← Back                       [Delete]    │
├─────────────────────────────────────────┤
│                                           │
│  ○ Call Sarah about Q2 budget            │
│                                           │
│  Project:   [Inbox          ▾]           │
│  Priority:  [⭐ High        ▾]           │
│  Due date:  [Apr 14, 2026   ▾]           │
│                                           │
│  Description:                            │
│  ┌─────────────────────────────────────┐ │
│  │ Discuss revised numbers from the     │ │
│  │ finance team meeting.                │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  Source:                                 │
│  📝 Meeting Notes, page 3               │
│  [Go to source page]                     │
│                                           │
│  Todoist: Synced ✓                       │
│  Last sync: Apr 11, 10:30 AM            │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │     [  Mark Complete  ]              │ │
│  └─────────────────────────────────────┘ │
│                                           │
└─────────────────────────────────────────┘
```

### Add task view (manual entry)
```
┌─────────────────────────────────────────┐
│  New Task                      [Cancel]   │
├─────────────────────────────────────────┤
│                                           │
│  Title:                                  │
│  ┌─────────────────────────────────────┐ │
│  │ [                                  ] │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  Project:   [Inbox          ▾]           │
│  Priority:  [Normal         ▾]           │
│  Due date:  [No date        ▾]           │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │        [  Save Task  ]               │ │
│  └─────────────────────────────────────┘ │
│                                           │
└─────────────────────────────────────────┘
```

---

## Feature: handwriting capture

### Lasso capture flow

1. User writes tasks by hand in a note
2. User activates lasso tool and selects the handwritten task
3. User taps "Capture Task" button in the lasso toolbar
4. Plugin receives lasso elements
5. Plugin runs `recognizeElements()` → gets text
6. Plugin shows a confirmation screen:

```
┌─────────────────────────────────────────┐
│  Capture Task                  [Cancel]   │
├─────────────────────────────────────────┤
│                                           │
│  Recognized text:                        │
│  ┌─────────────────────────────────────┐ │
│  │ Call Sarah about Q2 budget          │ │
│  └─────────────────────────────────────┘ │
│  [Edit text if recognition is wrong]     │
│                                           │
│  Project:   [Inbox          ▾]           │
│  Priority:  [Normal         ▾]           │
│  Due date:  [No date        ▾]           │
│                                           │
│  ☑ Add visual indicator on note page     │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │      [  Save & Close  ]             │ │
│  └─────────────────────────────────────┘ │
│                                           │
└─────────────────────────────────────────┘
```

7. User confirms (can edit text, set project/priority/date)
8. Task is saved to local database
9. If "visual indicator" is checked: plugin inserts a small checkmark geometry or TextBox link on **Layer 1** near the original handwriting, pointing to the task

### Batch scan flow

1. User opens TaskHarvest from toolbar
2. User taps "Scan Notes for Tasks"
3. Plugin scans current note (or all notes, user choice):
   - `searchFiveStars(filePath)` → find starred pages
   - `getMarkPages(filePath)` → find marked pages
   - For each flagged page:
     - `getElements(page, notePath)` → get all elements
     - Filter for stroke elements
     - `recognizeElements(strokes)` → recognized text
     - Apply heuristics to identify task-like text (starts with dash, bullet, checkbox pattern, etc.)
4. Plugin shows candidate tasks:

```
┌─────────────────────────────────────────┐
│  Scan Results                  [Cancel]   │
├─────────────────────────────────────────┤
│                                           │
│  Found 5 potential tasks:                │
│                                           │
│  ☑ "Call Sarah about Q2 budget"          │
│    📝 Meeting Notes p.3  ⭐              │
│                                           │
│  ☑ "Review design spec v2"              │
│    📝 Project Alpha p.1  ⭐              │
│                                           │
│  ☑ "Send timeline to client"            │
│    📝 Sprint Review p.2                  │
│                                           │
│  ☐ "Great presentation today" (skip?)   │
│    📝 Meeting Notes p.2                  │
│                                           │
│  ☑ "Order new pens"                     │
│    📝 Daily Log p.5  ⭐                  │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │   [  Import Selected (4)  ]         │ │
│  └─────────────────────────────────────┘ │
│                                           │
└─────────────────────────────────────────┘
```

5. User reviews, unchecks false positives, confirms import
6. Tasks are saved to local database with source references

### Task detection heuristics

How to identify task-like content in recognized text:

| Pattern | Detection method |
|---|---|
| Starts with `- `, `* `, `• ` | String prefix matching |
| Contains "TODO", "TASK", "ACTION" | Keyword matching (case-insensitive) |
| Near a five-star element | `searchFiveStars()` → `getElements()` nearby |
| Near a checkbox-like geometry | Detect small square geometry elements |
| Short, imperative sentence | NLP heuristic: starts with verb, < 20 words |
| On a "task list" template page | `getNotePageTemplate()` check |

---

## Feature: visual overlays on note pages

When a task is captured from a note page, the plugin can add visual feedback on **Layer 1** (non-destructive):

### Task captured indicator
- Small TextBox link near the handwritten task: "→ Tasks" (clickable? depends on link behavior with plugins)
- Or: a small geometry element (line or border) around the task area

### Task completed indicator
- When a task is marked complete (in plugin UI or via Todoist sync):
  - Insert a strikethrough-style geometry line across the task area
  - Or: change the TextBox indicator to "✓ Done"
  - All on Layer 1 — user's handwriting on Layer 0 stays untouched

### Toggle overlays
- User can toggle Layer 1 visibility via the native layer controls to see their clean handwriting
- Plugin could also offer a "clear all overlays" option that calls `clearLayerElements(notePath, page, 1)`

---

## Feature: Todoist bidirectional sync

### Sync strategy

```
Local DB (tasks.json)  ←→  Todoist REST API v2
```

**Sync direction and conflict resolution:**

| Scenario | Action |
|---|---|
| New local task, not in Todoist | → Create in Todoist (`POST /rest/v2/tasks`) |
| New Todoist task, not local | ← Create locally with `source.type: 'todoist'` |
| Local modified, Todoist unchanged | → Update Todoist (`POST /rest/v2/tasks/{id}`) |
| Todoist modified, local unchanged | ← Update local |
| Both modified | Flag as conflict, show in UI for manual resolution |
| Local completed | → Complete in Todoist (`POST /rest/v2/tasks/{id}/close`) |
| Todoist completed | ← Mark local as completed, update note overlay |
| Local deleted | → Delete from Todoist (or move to "completed") |

### Todoist API integration

```typescript
const TODOIST_API = 'https://api.todoist.com/rest/v2';

// Create a task
const response = await fetch(`${TODOIST_API}/tasks`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: task.title,
    description: `[Supernote: ${task.source.notePath} p.${task.source.page}]`,
    project_id: projectMapping[task.project],
    priority: task.priority,
    due_date: task.dueDate,
  }),
});

// Get all tasks (for sync)
const tasks = await fetch(`${TODOIST_API}/tasks`, {
  headers: { 'Authorization': `Bearer ${apiToken}` },
});

// Complete a task
await fetch(`${TODOIST_API}/tasks/${todoistId}/close`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiToken}` },
});
```

### Sync flow

1. User taps "Sync" button in TaskHarvest UI
2. Plugin prevents device sleep: `setSystemDormancyState(true)`
3. **Pull from Todoist:**
   - `GET /rest/v2/tasks` → all active tasks
   - `GET /rest/v2/projects` → all projects
   - Compare against local DB
   - Create/update local tasks as needed
4. **Push to Todoist:**
   - Find local tasks with `syncState: 'local'` or `syncState: 'modified'`
   - Create/update in Todoist
   - Update `todoistId` and `syncState` in local DB
5. **Handle completions:**
   - Local completions → close in Todoist
   - Todoist completions → mark local as completed, update note overlays
6. Re-enable sleep: `setSystemDormancyState(false)`
7. Update UI with sync results

---

## Implementation plan

### Phase 1: Local task manager (no sync)
1. **Plugin scaffold** — register toolbar + lasso buttons
2. **Local database** — JSON read/write to plugin directory
3. **Task list UI** — React Native FlatList with task items
4. **Add task UI** — manual text entry form
5. **Task detail/edit view** — tap to expand, edit, complete, delete
6. **Config button** — set preferences

### Phase 2: Handwriting capture
7. **Lasso capture** — `getLassoElements()` → `recognizeElements()` → confirm → save
8. **Source tracking** — store note path, page, element indices for each captured task
9. **Capture confirmation UI** — show recognized text, let user edit before saving

### Phase 3: Visual overlays
10. **Layer management** — create Layer 1 if needed, insert indicators
11. **Task captured indicators** — small TextBox or geometry near captured handwriting
12. **Task completed indicators** — visual strikethrough/checkmark on completion
13. **Overlay toggle** — clear/restore overlays

### Phase 4: Batch scanning
14. **Star scanner** — `searchFiveStars()` across notes
15. **Mark scanner** — `getMarkPages()` across notes
16. **Task detection heuristics** — identify task-like text in recognized content
17. **Batch review UI** — show candidates, let user select which to import

### Phase 5: Todoist sync
18. **API token storage** — config button, encrypted/obfuscated in config.json
19. **Project mapping** — sync Todoist projects to local project list
20. **Push sync** — create/update tasks in Todoist
21. **Pull sync** — import new/changed Todoist tasks
22. **Completion sync** — bidirectional completion handling
23. **Conflict resolution UI** — show conflicts, let user choose

### Phase 6: Polish
24. **Due date parsing** — attempt to extract dates from recognized text ("call Sarah by Thursday")
25. **Priority inference** — five-star items → priority 1, marked pages → priority 2
26. **Quick actions** — pen_up event listener for instant capture of last stroke
27. **Statistics view** — tasks completed this week, capture sources breakdown

---

## Key API usage patterns

### Capture from lasso selection
```typescript
// Lasso button handler
async function handleLassoCapture() {
  // Get selected elements
  const elementsRes = await PluginCommAPI.getLassoElements();
  if (!elementsRes.success) return;

  // Get context
  const fileRes = await PluginCommAPI.getCurrentFilePath();
  const pageRes = await PluginCommAPI.getCurrentPageNum();
  const rectRes = await PluginCommAPI.getLassoRect();

  // Recognize handwriting
  const recognized = await PluginCommAPI.recognizeElements(elementsRes.result);

  // Show capture UI with recognized text
  setCaptureState({
    recognizedText: recognized.result,
    notePath: fileRes.result,
    page: pageRes.result,
    rect: rectRes.result,
    elements: elementsRes.result,
  });
}
```

### Batch scan for starred tasks
```typescript
async function scanForTasks() {
  const noteFiles = await FileUtils.getFileList(['.note']);
  const candidates = [];

  for (const notePath of noteFiles.result) {
    // Find starred pages
    const starredPages = await PluginFileAPI.searchFiveStars(notePath);
    if (!starredPages.success || !starredPages.result?.length) continue;

    for (const page of starredPages.result) {
      // Get elements near stars
      const elements = await PluginFileAPI.getElements(page, notePath);
      const strokes = elements.result.filter(e => e.type === 0);

      if (strokes.length === 0) continue;

      // Recognize text
      const recognized = await PluginCommAPI.recognizeElements(strokes);

      // Parse for task-like patterns
      const lines = recognized.result.split('\n');
      for (const line of lines) {
        if (looksLikeTask(line)) {
          candidates.push({
            text: line.trim(),
            notePath,
            page,
            priority: 1, // starred = high priority
          });
        }
      }
    }
  }

  return candidates;
}

function looksLikeTask(text: string): boolean {
  const taskPatterns = [
    /^[-*•]\s+/,           // bullet point
    /^(?:TODO|TASK|ACTION)/i,
    /^(?:\d+[.)]\s+)/,     // numbered list
    /^(?:\[\s?\]\s+)/,     // checkbox pattern
  ];
  return taskPatterns.some(p => p.test(text.trim()));
}
```

### Add visual overlay for captured task
```typescript
async function addTaskOverlay(notePath: string, page: number, rect: Rect, taskId: string) {
  // Ensure Layer 1 exists
  const layers = await PluginFileAPI.getLayers(notePath, page);
  const hasLayer1 = layers.result?.some(l => l.layerId === 1);
  if (!hasLayer1) {
    await PluginFileAPI.insertLayer(notePath, page, {
      layerId: 1,
      name: 'TaskHarvest',
      isCurrentLayer: false,
      isVisible: true,
    });
  }

  // Create a small indicator TextBox on Layer 1
  const indicator = await PluginCommAPI.createElement(500); // TYPE_TEXT
  const element = indicator.result;
  element.pageNum = page;
  element.layerNum = 1;
  element.textBox = {
    textContentFull: `[Task: ${taskId.slice(0, 8)}]`,
    textRect: {
      left: rect.right + 10,
      top: rect.top,
      right: rect.right + 200,
      bottom: rect.top + 30,
    },
    fontSize: 16,
    textEditable: 1, // non-editable
    textFrameStyle: 3, // bordered
    textAlign: 0,
    textBold: 0,
    textItalics: 0,
    textFrameWidthType: 1, // auto width
  };

  await PluginFileAPI.insertElements(notePath, page, [element]);
}
```

---

## Edge cases and considerations

### Recognition accuracy
- Always let users edit recognized text before saving as a task
- Store original element indices so users can "re-recognize" if needed
- For batch scan, err on the side of showing more candidates (let user deselect false positives)

### Todoist API limits
- Todoist API has rate limits (currently ~450 requests per minute for personal use)
- Batch sync should be efficient: fetch all tasks in one call, push changes in batches
- Store sync state to avoid redundant API calls

### Offline operation
- The entire local task manager works offline
- Todoist sync queues changes when offline, pushes on next sync
- Visual overlays work regardless of network state

### Task deduplication
- When batch scanning, check if a task with similar text already exists (fuzzy match)
- Use source location (notePath + page + rect) as a secondary key
- Show a warning if a near-duplicate is detected

### Performance
- Task list UI should be fast — JSON database is tiny compared to note files
- Recognition is the slow part — show progress, allow cancellation
- Batch scan of 10+ notes could take minutes — background with progress UI

### Todoist features NOT supported (for now)
- Subtasks / task hierarchy
- Labels (could map to keywords in future)
- Comments (could map to task description)
- Recurring tasks (would need date parsing from handwriting)
- Sections within projects

---

## Comparison: built-in Supernote to-do vs. TaskHarvest

| Feature | Built-in to-do | TaskHarvest |
|---|---|---|
| Task list UI | Basic, within note app | Full React Native to-do app |
| Handwriting capture | Manual | Lasso → recognize → save |
| Batch scan across notes | No | Yes, with star/mark detection |
| External sync | Supernote Cloud only | Todoist API (expandable to others) |
| Projects/folders | No | Yes |
| Due dates | No | Yes |
| Priority levels | No | Yes (4 levels, mapped to stars) |
| Search/filter | No | Yes |
| Visual task status on pages | No | Yes, on dedicated layer |
| Offline support | Yes | Yes |
| Cross-device access | Supernote only | Via Todoist on any device |
| Task from PDF text | No | Yes, via DOC selection button |

---

## Future extensions

### Other task services
The architecture is service-agnostic. The sync engine could be swapped:
- **Notion** — create database items via Notion API
- **Linear** — create issues for development tasks
- **Apple Reminders** — via a bridge server (no direct API from Android)
- **Google Tasks** — via Google Tasks API
- **Plain Markdown** — write tasks to a `tasks.md` file in a sync folder (like NotesBridge)

### Smart date parsing
Use simple NLP on recognized text to extract dates:
- "call Sarah by Thursday" → due date = next Thursday
- "Q2 review on April 15" → due date = 2026-04-15
- "urgent: fix bug" → priority = 1

### Pen-up quick capture
Register `event_pen_up` with priority 0. When the user finishes a stroke that looks like a checkbox (small square), immediately capture the nearby text as a task. Ultra-fast capture without even opening the plugin UI.

### Task templates
Pre-built task structures for common scenarios:
- Meeting action items (auto-detect from "Meeting Notes" template)
- Reading list items (capture from DOC highlights)
- Shopping list items (simple list recognition)
