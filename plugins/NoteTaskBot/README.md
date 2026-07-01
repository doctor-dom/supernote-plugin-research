# NoteTaskBot

Capture handwritten task lists from Supernote notes and send them to Todoist.

## Flow

1. Write a list in a note (one task per line)
2. Lasso the handwriting
3. Tap **Capture Tasks** in the lasso menu
4. The plugin OCRs your writing, creates a parent task named `Task Capture <note file> | <date>`, and adds each line as a subtask in your **EMAIL/SN TaskBot 📨📓🤖** Todoist project
5. A review screen shows the recognized text, project, parent task, and subtasks created

## Requirements

- Supernote with plugin support
- Wi-Fi for Todoist API
- A Todoist project for captures (default project ID `6fVCFGxCf6MVJwm8` = **EMAIL/SN TaskBot 📨📓🤖**)
- Todoist API token

## Token setup

NoteTaskBot uses its **own** config file (separate from SuperTask):

`/MyStyle/NoteTaskBot/notetaskbot-config.json`

On first run, the plugin creates a template with `YOUR_TOKEN_HERE`. Edit via USB:

```json
{
  "apiToken": "your_todoist_token_here",
  "targetProjectId": "6fVCFGxCf6MVJwm8"
}
```

If SuperTask is already configured on the same device, newer builds can reuse that token automatically (fallback reads `MyStyle/SuperTask/supertask-config.json`).

`targetProjectId` is optional — it defaults to **EMAIL/SN TaskBot 📨📓🤖** (`6fVCFGxCf6MVJwm8`). Override only if you use a different project.

Get your token at [Todoist Developer Settings](https://todoist.com/app/settings/integrations/developer).

## Build (requires native module)

NoteTaskBot uses `react-native-fs` for config storage. Use the **native** build on Windows:

```powershell
cd plugins/NoteTaskBot
npm install
powershell -ExecutionPolicy Bypass -File .\build-native.ps1
```

The output `.snplg` should be ~7 MB (includes `app.npk`). A ~260 KB build is JS-only and **cannot read your config file**.

## Troubleshooting

| Symptom | Likely cause | Fix |
|--------|----------------|-----|
| "No Todoist API token" | Config not edited or JS-only build | Set token in `notetaskbot-config.json`, or rebuild with `build-native.ps1` |
| "Could not recognize handwriting" | OCR failed | Lasso again with clearer writing; check Log screen |
| "Todoist 401" | Invalid/expired token | Regenerate token in Todoist developer settings |
| Success on device but no tasks in Todoist | Wrong project or viewing subtasks | Look in **EMAIL/SN TaskBot 📨📓🤖** for parent `Task Capture <note> \| <date>` — subtasks are nested under it |
| Plugin crashes on open | Installed JS-only build without RNFS | Rebuild with `build-native.ps1` and reinstall |

Copy `build/outputs/NoteTaskBot.snplg` to `MyStyle/` on the device, then install via Settings > Apps > Plugins.

## Debug

```bash
node dev-server.js
```

Add `debugServerUrl` in a local `config.local.js` (gitignored) for log streaming during development.
