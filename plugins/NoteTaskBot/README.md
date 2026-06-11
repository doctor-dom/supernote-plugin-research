# NoteTaskBot

Capture handwritten task lists from Supernote notes and send them to Todoist.

## Flow

1. Write a list in a note (one task per line)
2. Lasso the handwriting
3. Tap **Capture Tasks** in the lasso menu
4. The plugin OCRs your writing, creates a parent task named `Task Capture <note file> | <date>`, and adds each line as a subtask in your **NOTE TaskBot** Todoist project
5. A checkbox marker is drawn on the note to confirm capture

## Requirements

- Supernote with plugin support
- Wi-Fi for Todoist API
- A Todoist project named **NOTE TaskBot** (exact name)
- Todoist API token

## Token setup

On first run, the plugin creates:

`/MyStyle/NoteTaskBot/notetaskbot-config.json`

Edit via USB:

```json
{
  "apiToken": "your_todoist_token_here"
}
```

Get your token at [Todoist Developer Settings](https://todoist.com/app/settings/integrations/developer).

## Build

```bash
cd plugins/NoteTaskBot
npm install
bash buildPlugin.sh
```

Copy `build/outputs/NoteTaskBot.snplg` to `MyStyle/` on the device, then install via Settings > Apps > Plugins.

## Debug

```bash
node dev-server.js
```

Add `debugServerUrl` in a local `config.local.js` (gitignored) for log streaming during development.
