# SuperTask: Settings Redesign

> Compact settings UI for e-ink and persistent config via MyStyle JSON file.
>
> **Related docs:**
> - Tracker: `docs/tracker.md` -- T-001 (settings redesign), F-007 (config persistence)
> - Changelog: `docs/changelog.md` -- completed/resolved items
> - Capture design: `docs/design-capture-workflow.md` -- capture flow config options

## Problem

The current settings screen is vertically stacked and wastes space on the e-ink display. Configuration is also ephemeral -- the API token is injected at build time via `config.local.js` in the gradle build, and preferences reset between installs.

## UI Redesign

Compact horizontal layout. Wireframe reference: `CleanShot 2026-05-14 at 16.35.31.png`

### Header
- "Settings" title with **Save** and **Close** buttons inline (right-aligned)

### Tabs: Connections / Preferences

#### Connections tab
- API token status (connected/disconnected indicator)
- Token source display (MyStyle config file path)
- "Test Connection" button to validate token
- Project sync status

#### Preferences tab

| Setting | Control type | Options |
|---------|-------------|---------|
| Default tab | Horizontal toggle row | Today, Upcoming, Projects |
| After creating a task | Inline radio | Ask (Add/Done), Go back |
| Open plugin to | Inline radio | Task Home, Last Used |
| Show projects | 2-column checkbox grid | Fetched from Todoist |
| Default project | Horizontal button row (wrapping) | None + project names |
| Mark as text font size | Horizontal size picker | 24, 28, 32, 36, 40 |
| Link to Todoist task | Checkbox with description | "Add Todoist link to replaced text" |

### Layout principles
- No vertical stacking of label + control when they fit inline
- Horizontal button rows and toggles instead of dropdowns (e-ink friendly, large tap targets)
- 2-column grids for checkbox lists
- Minimal scrolling -- everything visible on one screen if possible

## Config Persistence via MyStyle JSON

### Current approach (build-time injection)
- `config.local.js` at plugin root, gitignored
- Bundled into Hermes build by Metro
- Contains API token, debug server URL
- Requires rebuild to change

### Proposed approach (MyStyle JSON)

A `supertask-config.json` file in the MyStyle/ directory on the Supernote filesystem.

```
MyStyle/
  SuperTask.snplg
  supertask-config.json    <-- persistent config
```

#### File format
```json
{
  "todoist_token": "abc123...",
  "debug_server_url": "http://192.168.68.68:3000/log",
  "default_tab": "today",
  "default_project_id": null,
  "mark_as_text_font_size": 32,
  "mark_as_text_link": false,
  "hidden_projects": [],
  "after_create": "ask",
  "open_to": "task-home"
}
```

#### How it works
1. **Initial setup:** User creates `supertask-config.json` in MyStyle/ via USB with at minimum the `todoist_token` field
2. **Plugin startup:** Plugin reads the config file from a known path (needs SDK path resolution -- likely `/storage/emulated/0/MyStyle/supertask-config.json`)
3. **Settings UI:** Connections tab shows token status. Preferences tab shows current values. Changes are applied in-memory for the session.
4. **Saving:** If the SDK gains file write capability, Save button persists changes back to the JSON file. Until then, base config persists across installs via the file, and session-only changes are noted in the UI.

#### Reading the config file
Need to determine how to read the file from JS:
- `FileUtils.exists()` + what read method? `FileUtils` has no `readFile()` in the current SDK source
- `fetch('file:///storage/emulated/0/MyStyle/supertask-config.json')` -- file:// URLs haven't worked in testing
- `require()` only works for bundled JS modules
- **Needs SDK investigation:** check if newer SDK version exposes file read, or if there's an Android native module path

#### Benefits over current approach
- No rebuild to change tokens or settings
- Survives plugin reinstalls (file is separate from .snplg)
- User can edit on their computer and copy via USB
- Can remove the gradle build-time config injection step
- Future: if writeFile becomes available, full round-trip persistence

#### Migration path
1. Keep `config.local.js` as fallback for development builds
2. At startup: check for MyStyle JSON first, fall back to config.local.js
3. Connections tab shows which config source is active
4. Eventually deprecate config.local.js once MyStyle approach is proven
