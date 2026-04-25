# TaskHarvest v2 — Lasso-to-Todoist with Built-in Viewer

> A Supernote plugin for capturing handwritten tasks directly into Todoist and browsing your task list on-device. Todoist is the source of truth. No local database, no sync engine, no conflict resolution.

## Why v2

The original TaskHarvest design (v1) was a standalone task manager that happened to sync with Todoist -- local JSON database, bidirectional sync engine, conflict resolution, 6 implementation phases. That's a lot of moving parts for what is fundamentally: "I wrote a task, get it into Todoist."

v2 strips it down:
- **Todoist IS the database.** No local task store, no sync logic, no conflicts.
- **Two workflows.** Lasso capture (handwriting to Todoist) and task viewer (browse/edit Todoist tasks).
- **Builds on proven patterns.** SmartGestures proved the build toolchain and event system. Endpoint Lasso proved lasso-to-HTTP works. This combines both with OCR in the middle.

This is a separate plugin from SmartGestures. SmartGestures hit a stopping point due to inherent SDK refresh latency (1-2s delay after deleteElements). TaskHarvest doesn't have that problem -- every action is user-initiated, so a brief network round-trip feels natural.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                 Supernote Device                  │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │            TaskHarvest Plugin                │ │
│  │                                              │ │
│  │  ┌──────────────┐    ┌───────────────────┐  │ │
│  │  │ Lasso Capture │    │ Task Viewer       │  │ │
│  │  │               │    │                   │  │ │
│  │  │ getLasso() →  │    │ GET /tasks →      │  │ │
│  │  │ recognize() → │    │ render list       │  │ │
│  │  │ confirm UI →  │    │ tap → edit/done   │  │ │
│  │  │ POST /tasks   │    │ POST updates      │  │ │
│  │  └───────┬───────┘    └────────┬──────────┘  │ │
│  │          │                     │              │ │
│  │          ▼                     ▼              │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │         Todoist REST API v2             │ │ │
│  │  │        (source of truth)                │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  │                                              │ │
│  │  Local storage (plugin dir):                 │ │
│  │    config.json — API token + preferences     │ │
│  │    projects-cache.json — cached project list │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### What's NOT here (compared to v1)
- No tasks.json local database
- No sync-log.json or sync engine
- No bidirectional sync or conflict resolution
- No batch scanning across notes
- No visual overlays on note pages (Layer 1)
- No pen_up event listener

These can all be added later as enhancements. v2 ships the core value first.

---

## Plugin entry points

### Button 1: Toolbar — "Tasks" (Type 1, NOTE)
- **showType:** 1 (full-screen UI)
- **Purpose:** Open the task viewer. Shows your Todoist tasks in a simple list. Browse, edit, complete, add new tasks.
- **appTypes:** ['NOTE']

### Button 2: Lasso toolbar — "Add Task" (Type 2, NOTE)
- **showType:** 1 (full-screen UI for confirmation)
- **editDataTypes:** [0, 1, 3] (strokes, titles, text)
- **Purpose:** Quick capture. Lasso handwriting, recognize it, confirm and send to Todoist.

### Button 3: Toolbar — "Add Task" (Type 1, DOC)
- **showType:** 1
- **Purpose:** Capture selected/highlighted text from a PDF as a Todoist task.

### Config button
- **Purpose:** Enter Todoist API token, set default project, preferences.

---

## Workflow 1: Lasso capture

The core flow. User writes a task by hand, lassos it, taps "Add Task" in the lasso toolbar.

### Flow

```
User writes task by hand
  ↓
User activates lasso, selects the handwriting
  ↓
User taps "Add Task" in lasso toolbar
  ↓
Plugin receives lasso elements via getLassoElements()
  ↓
Plugin runs recognizeElements() on the lasso elements
  ↓
Plugin shows confirmation UI (showType: 1):
  - Recognized text (editable)
  - Project picker (from cached Todoist projects)
  - Priority selector (P1-P4)
  - Due date (optional, simple text input)
  ↓
User confirms → Plugin calls POST /rest/v2/tasks
  ↓
Success toast → Plugin closes (closePluginView)
```

### Confirmation UI

```
┌─────────────────────────────────────────┐
│  Add Task to Todoist           [Cancel] │
├─────────────────────────────────────────┤
│                                         │
│  Recognized text:                       │
│  ┌─────────────────────────────────────┐│
│  │ Call Sarah about Q2 budget          ││
│  └─────────────────────────────────────┘│
│  (tap to edit if recognition is wrong)  │
│                                         │
│  Project:    [ Inbox            ▾ ]     │
│  Priority:   [ ○1 ○2 ●3 ○4       ]     │
│  Due date:   [ tomorrow           ]     │
│                                         │
│  Description (optional):                │
│  ┌─────────────────────────────────────┐│
│  │ From: Meeting Notes p.3             ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │        [ Add to Todoist ]           ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### Capture implementation

```javascript
async function handleLassoCapture() {
  // 1. Get what the user selected
  const elements = await PluginCommAPI.getLassoElements();
  if (!elements.success || !elements.result?.length) {
    showError('No elements selected');
    return;
  }

  // 2. Get context for the description
  const filePath = await PluginCommAPI.getCurrentFilePath();
  const pageNum = await PluginCommAPI.getCurrentPageNum();

  // 3. Recognize handwriting
  const recognized = await PluginCommAPI.recognizeElements(elements.result);
  if (!recognized.success || !recognized.result) {
    showError('Could not recognize handwriting');
    return;
  }

  // 4. Show confirmation UI with recognized text pre-filled
  showCaptureForm({
    title: recognized.result.trim(),
    description: `From: ${fileName(filePath.result)} p.${pageNum.result}`,
    project: defaultProject,
    priority: 4, // normal
    dueDate: '',
  });
}
```

### DOC text capture (Button 3)

Same flow but simpler -- no OCR needed:

```javascript
async function handleDocCapture() {
  // getLastSelectedText for highlighted text in PDFs
  const selected = await PluginDocAPI.getLastSelectedText();
  if (!selected.success || !selected.result) {
    // Fallback for older SDK
    const fallback = await PluginDocAPI.getSelectedText();
    // ...
  }

  showCaptureForm({
    title: selected.result.trim(),
    description: `From: ${fileName(filePath)} p.${pageNum}`,
    project: defaultProject,
    priority: 4,
    dueDate: '',
  });
}
```

---

## Workflow 2: Task viewer

User taps "Tasks" in the toolbar to browse their Todoist tasks.

### Flow

```
User taps "Tasks" toolbar button
  ↓
Plugin opens full-screen UI (showType: 1)
  ↓
Plugin calls GET /rest/v2/tasks → fetches active tasks
  ↓
Renders task list grouped by project
  ↓
User can:
  - Tap a task → edit title, project, priority, due date → POST update
  - Swipe/tap checkbox → complete task (POST /tasks/{id}/close)
  - Tap "+ Add Task" → manual text entry → POST new task
  - Pull to refresh
  ↓
Close button → closePluginView()
```

### Task list view

```
┌─────────────────────────────────────────┐
│  Tasks                    [+]  [Close]  │
├─────────────────────────────────────────┤
│  ┌─ [ Filter ▾ ] ─────────────────────┐│
│  │  All | Today | This week           ││
│  └─────────────────────────────────────┘│
│                                         │
│  TODAY (2)                              │
│  ┌─────────────────────────────────────┐│
│  │ ○ Call Sarah about Q2 budget       ││
│  │   Inbox · P3 · today               ││
│  │ ○ Review design spec v2            ││
│  │   Project Alpha · P1 · today       ││
│  └─────────────────────────────────────┘│
│                                         │
│  UPCOMING (3)                           │
│  ┌─────────────────────────────────────┐│
│  │ ○ Send timeline to client          ││
│  │   Project Alpha · P2 · Apr 28      ││
│  │ ○ Book team lunch venue            ││
│  │   Inbox · P4 · Apr 30              ││
│  │ ○ Prepare quarterly report         ││
│  │   Work · P2 · May 2                ││
│  └─────────────────────────────────────┘│
│                                         │
│  NO DATE (4)                            │
│  ┌─────────────────────────────────────┐│
│  │ ○ Research new CI tooling           ││
│  │   DevOps · P3                       ││
│  │ ○ Clean up test fixtures            ││
│  │   Project Alpha · P4                ││
│  │   ...                               ││
│  └─────────────────────────────────────┘│
│                                         │
│  5 tasks today · 12 active             │
└─────────────────────────────────────────┘
```

### Task edit view (on tap)

```
┌─────────────────────────────────────────┐
│  ← Back                      [Delete]   │
├─────────────────────────────────────────┤
│                                         │
│  Title:                                 │
│  ┌─────────────────────────────────────┐│
│  │ Call Sarah about Q2 budget          ││
│  └─────────────────────────────────────┘│
│                                         │
│  Project:    [ Inbox            ▾ ]     │
│  Priority:   [ ○1 ○2 ●3 ○4       ]     │
│  Due date:   [ today              ]     │
│                                         │
│  Description:                           │
│  ┌─────────────────────────────────────┐│
│  │ From: Meeting Notes p.3             ││
│  │ Discuss revised numbers from the    ││
│  │ finance team meeting.               ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │       [ Mark Complete ]             ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │       [ Save Changes  ]             ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

---

## Todoist API integration

### Endpoints used

| Operation | Method | Endpoint | When |
|---|---|---|---|
| List tasks | GET | `/rest/v2/tasks` | Opening task viewer |
| List projects | GET | `/rest/v2/projects` | Populating project picker |
| Create task | POST | `/rest/v2/tasks` | After lasso capture confirm |
| Update task | POST | `/rest/v2/tasks/{id}` | After editing in viewer |
| Complete task | POST | `/rest/v2/tasks/{id}/close` | Tapping checkbox |
| Delete task | DELETE | `/rest/v2/tasks/{id}` | Delete button in edit view |
| Reopen task | POST | `/rest/v2/tasks/{id}/reopen` | Undo completion |

### API helper

```javascript
const TODOIST_API = 'https://api.todoist.com/rest/v2';

async function todoistFetch(path, options = {}) {
  const config = await loadConfig();
  if (!config.apiToken) {
    throw new Error('No API token configured. Use the config button to set it.');
  }

  const response = await fetch(`${TODOIST_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Todoist API error ${response.status}: ${text}`);
  }

  // Some endpoints (close, delete) return 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

// Convenience wrappers
async function getTasks(filter) {
  const params = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  return todoistFetch(`/tasks${params}`);
}

async function getProjects() {
  return todoistFetch('/projects');
}

async function createTask({ content, description, projectId, priority, dueString }) {
  return todoistFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      content,
      description,
      project_id: projectId,
      priority,        // 1=normal ... 4=urgent (Todoist's numbering is inverted)
      due_string: dueString,  // "tomorrow", "every monday", "Jan 5", etc.
    }),
  });
}

async function updateTask(taskId, updates) {
  return todoistFetch(`/tasks/${taskId}`, {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

async function completeTask(taskId) {
  return todoistFetch(`/tasks/${taskId}/close`, { method: 'POST' });
}

async function deleteTask(taskId) {
  return todoistFetch(`/tasks/${taskId}`, { method: 'DELETE' });
}
```

### Priority mapping

Todoist's priority numbering is inverted from what users expect:

| User sees | Todoist API value | Color |
|---|---|---|
| P1 (urgent) | `priority: 4` | Red |
| P2 (high) | `priority: 3` | Orange |
| P3 (medium) | `priority: 2` | Blue |
| P4 (normal) | `priority: 1` | No color |

The UI should show P1/P2/P3/P4 labels and map internally.

### Due date handling

Todoist's `due_string` field accepts natural language: "tomorrow", "next monday", "Jan 5", "every week". This is ideal for a simple text input rather than building a full date picker. Let Todoist's parser do the work.

### Rate limits

Todoist allows ~450 requests/minute for personal API tokens. For a single user browsing and adding tasks, this is effectively unlimited. No throttling logic needed.

---

## Configuration

### Config button flow

```
User taps gear icon (config button)
  ↓
Plugin shows config UI:
  - API Token field (password-masked)
  - "How to get your token" help text
  - Default project picker
  - Test connection button
  ↓
Save to config.json in plugin directory
```

### Config UI

```
┌─────────────────────────────────────────┐
│  TaskHarvest Settings          [Close]  │
├─────────────────────────────────────────┤
│                                         │
│  Todoist API Token:                     │
│  ┌─────────────────────────────────────┐│
│  │ ●●●●●●●●●●●●●●●●●●●●              ││
│  └─────────────────────────────────────┘│
│  Find your token at:                    │
│  todoist.com/prefs/integrations         │
│                                         │
│  Default project:                       │
│  [ Inbox                          ▾ ]   │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │       [ Test Connection ]           ││
│  └─────────────────────────────────────┘│
│  Status: Connected (12 active tasks)    │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │       [ Save Settings  ]            ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### config.json

```json
{
  "apiToken": "abc123...",
  "defaultProjectId": "2203456",
  "defaultPriority": 1
}
```

Stored in the plugin directory via `getPluginDirPath()`. The token is stored in plaintext -- the plugin directory is not user-accessible through normal file browsing, and the Supernote doesn't have other apps that could read it.

### Project cache

To avoid fetching the project list on every capture, cache it:

```json
// projects-cache.json
{
  "projects": [
    { "id": "2203456", "name": "Inbox", "color": "grey" },
    { "id": "2203789", "name": "Work", "color": "blue" },
    { "id": "2203999", "name": "Project Alpha", "color": "green" }
  ],
  "fetchedAt": "2026-04-25T10:00:00Z"
}
```

Refresh when: cache is older than 1 hour, or user pulls to refresh in the task viewer, or user taps "Test Connection" in config.

---

## Implementation plan

### Phase 1: Scaffold + config (get connected)
1. Create plugin from React Native template (same toolchain as SmartGestures)
2. Register all 4 entry points (toolbar, lasso, doc, config)
3. Build config UI -- API token input, test connection, save
4. Implement todoistFetch() helper and verify fetch() works on-device
5. Fetch and cache project list

**Ship check:** Config button works, can enter token and see "Connected (N active tasks)".

### Phase 2: Lasso capture (the core value)
6. Lasso button handler: getLassoElements() + recognizeElements()
7. Capture confirmation UI: editable text, project picker, priority, due date
8. POST to Todoist on confirm, show success/error feedback
9. DOC text capture variant (getLastSelectedText instead of recognize)

**Ship check:** Lasso handwriting, see recognized text, assign to project, tap "Add to Todoist", task appears in Todoist app.

### Phase 3: Task viewer (browse and manage)
10. Task list view: fetch tasks, group by date (today/upcoming/no date)
11. Task edit view: tap to open, edit fields, save changes
12. Complete task: checkbox tap calls /close endpoint
13. Add task manually: text input form (no lasso, just typed)
14. Filter: all / today / this week

**Ship check:** Open plugin, see your Todoist tasks, complete one, add one, edit one.

### Phase 4: Polish
15. Loading states, error handling, empty states
16. Pull-to-refresh in task list
17. Prevent device sleep during API calls (setSystemDormancyState)
18. Handle no-network gracefully (show last-fetched data or clear error)

---

## What this borrows from Endpoint Lasso

Endpoint Lasso (guibor/supernote-endpoint-lasso) validated several patterns that apply here:

| Pattern | How Endpoint Lasso does it | How TaskHarvest uses it |
|---|---|---|
| Lasso payload | Captures rect, elements, contours as JSON | Same getLassoElements() call, but we add recognizeElements() |
| Auth headers | Build-time env vars (SN_AUTH_HEADER_NAME/VALUE) | Runtime config.json (user enters token in config UI) |
| HTTP transport | Generic multipart/JSON to any endpoint | Direct fetch() to Todoist REST API v2 |
| Build toolchain | buildPlugin.sh/ps1 producing .snplg | Same pattern, inherited from SmartGestures scaffold |
| DOC text capture | getLastSelectedText with SDK fallback | Identical approach for PDF task capture |

Key difference: Endpoint Lasso is headless (showType: 0, fire-and-forget). TaskHarvest needs showType: 1 for the confirmation UI and task viewer, because assigning a project/priority/date requires user interaction.

---

## What this leaves for later

These features from the original v1 design are intentionally deferred. They can be added as enhancements once the core works:

| Feature | Why deferred | When to add |
|---|---|---|
| Local JSON task database | Todoist IS the database for now | If offline-first becomes important |
| Bidirectional sync engine | No local DB means no sync needed | If local DB is added |
| Visual overlays (Layer 1) | Adds complexity, marginal value in v2 | When capture workflow is proven |
| Batch scan (stars/marks) | Nice-to-have, not core workflow | After viewer is solid |
| pen_up quick capture | Needs gesture classification (SmartGestures territory) | If latency issues are resolved |
| Date parsing from handwriting | "call Sarah by Thursday" -> due date | After basic capture is reliable |
| Conflict resolution | No conflicts when Todoist is source of truth | If local DB is added |
| Subtasks, labels, sections | Todoist API supports them, but adds UI complexity | After core CRUD is solid |

---

## Technical notes

### React Native on Supernote
- React 19.0.0, React Native 0.79.2 (locked versions, same as SmartGestures)
- sn-plugin-lib ^0.1.19 for all Supernote SDK APIs
- Full-screen plugin view for showType: 1 -- this is where the task list and forms render
- E-ink considerations: no animations, high contrast, minimal redraws

### E-ink UI guidelines
- Black text on white background (no grayscale gradients)
- Large tap targets (fingers on e-ink are less precise)
- No color -- use typography (bold, size) and borders for hierarchy
- Priority indicators: P1 [!!!!], P2 [!!!], P3 [!!], P4 (no indicator)
- Minimize full-screen refreshes -- update only changed elements where possible
- Use clear section dividers (horizontal rules, headers) instead of subtle shading

### File structure

```
plugins/TaskHarvest/
├── index.js              # Entry point: button registration, routing
├── App.tsx               # Root React component (view router)
├── src/
│   ├── api/
│   │   └── todoist.js    # todoistFetch() and all API wrappers
│   ├── screens/
│   │   ├── TaskList.tsx  # Main task list view
│   │   ├── TaskEdit.tsx  # Task detail/edit view
│   │   ├── Capture.tsx   # Lasso capture confirmation
│   │   └── Config.tsx    # Settings/API token
│   ├── components/
│   │   ├── TaskItem.tsx  # Single task row in list
│   │   ├── ProjectPicker.tsx
│   │   └── PriorityPicker.tsx
│   └── utils/
│       ├── config.js     # Read/write config.json
│       └── projects.js   # Project cache management
├── assets/
│   └── icon.png          # Toolbar icon
├── PluginConfig.json
├── package.json
├── app.json
├── buildPlugin.sh
└── android/              # Standard RN android scaffold
```

### Supernote SDK APIs used

| API | Where used |
|---|---|
| `PluginManager.init()` | Startup |
| `PluginManager.registerButton()` | 3 buttons (toolbar NOTE, lasso NOTE, toolbar DOC) |
| `PluginManager.registerConfigButton()` | Config/settings entry |
| `PluginManager.closePluginView()` | After successful capture, close button |
| `PluginCommAPI.getLassoElements()` | Lasso capture flow |
| `PluginCommAPI.recognizeElements()` | Handwriting OCR |
| `PluginCommAPI.getCurrentFilePath()` | Source tracking in task description |
| `PluginCommAPI.getCurrentPageNum()` | Source tracking in task description |
| `PluginCommAPI.setSystemDormancyState()` | Keep alive during API calls |
| `PluginDocAPI.getLastSelectedText()` | DOC text capture |
| `PluginManager.getPluginDirPath()` | Config + cache storage |
| `fetch()` | All Todoist API calls |
