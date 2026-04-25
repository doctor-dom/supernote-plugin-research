# SuperTask Progress

> Lasso-to-Todoist plugin for Supernote. Design doc: `docs/plugin-taskharvest-v2.md`

## Phase overview

- [ ] **Phase 1: Scaffold + config** -- plugin structure, button registration, config UI, Todoist API connection
- [ ] **Phase 2: Lasso capture** -- handwriting OCR, confirmation UI, POST to Todoist
- [ ] **Phase 3: Task viewer** -- fetch/display tasks, complete, edit, manual add
- [ ] **Phase 4: Polish** -- loading states, error handling, empty states, no-network handling

## Session log

### 2026-04-25 -- Initial scaffold

**What was done:**
- Created SuperTask plugin directory from SDK template (not copied from SmartGestures)
- Renamed all HelloWorld references to SuperTask (android package, ios, configs)
- Registered all 4 entry points in index.js:
  - Button 100 (toolbar, NOTE): "Tasks" -- task viewer (showType: 1)
  - Button 200 (lasso, NOTE): "Add Task" -- capture handwriting (showType: 1)
  - Button 300 (toolbar, DOC): "Add Task" -- capture PDF text (showType: 1)
  - Config button: settings/API token
- Built App.tsx with screen routing based on button ID
- Created Todoist REST API v2 client (`src/api/todoist.js`)
  - getTasks, getProjects, createTask, updateTask, completeTask, deleteTask, testConnection
- Created config utility (`src/utils/config.js`)
  - Reads/writes config.json and projects-cache.json to plugin directory
- Created 3 screens:
  - Config.tsx -- API token entry, test connection, save settings
  - TaskList.tsx -- fetch and display active tasks, complete tasks, refresh
  - Capture.tsx -- lasso OCR or DOC text capture, priority/due date/project, submit to Todoist
- Created repo CLAUDE.md with plugin development practices and learnings
- Created PluginConfig.json (supertask001, v0.1.0)

**File structure:**
```
plugins/SuperTask/
  index.js              -- entry point, button registration
  App.tsx               -- root component, screen router
  PluginConfig.json     -- plugin metadata
  package.json          -- dependencies (RN 0.79.2, sn-plugin-lib)
  PROGRESS.md           -- this file
  src/
    api/todoist.js      -- Todoist REST API v2 client
    utils/config.js     -- config + project cache management
    screens/
      TaskList.tsx      -- task list viewer
      Capture.tsx       -- lasso/doc capture confirmation UI
      Config.tsx        -- settings/API token
  android/              -- standard RN android scaffold
  ios/                  -- standard RN ios scaffold
  assets/icon.png       -- toolbar icon (placeholder)
  buildPlugin.sh        -- build script
```

**Status:** Scaffold complete. Needs npm install + build test.

**Open questions:**
1. Does FileUtils.writeFile exist in sn-plugin-lib? The config write pattern may need adjustment based on what's actually available.
2. Need to verify the global.__superTaskButtonId routing pattern works on device (button press -> App mount -> read global).
3. Project picker not yet implemented in Capture screen (just uses default for now).

### Known risks
- Config file write mechanism (`FileUtils.writeFile`) is assumed from the SDK but hasn't been tested. May need to use a different storage approach (AsyncStorage, direct file write via native module, etc.).
- The `PluginDocAPI.getLastSelectedText()` API has a known SDK version fallback (`getSelectedText`). Need to test on device.
