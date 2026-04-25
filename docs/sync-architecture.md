# Sync Architecture: On-Device Plugin vs. Off-Device Companion

> Where should the sync logic live? **Revised answer: on-device plugin first**, with an optional Mac companion for automation. The community off-device solutions predate the plugin SDK — they solved OCR the only way they could. Now there's a better option.

## Why this document was revised

Our original analysis recommended "mostly off-device" — build a Mac companion script first, treat the plugin as an optional enhancement. That recommendation was heavily influenced by existing community projects:

| Project | Approach | Why off-device |
|---|---|---|
| [supernote-to-obsidian](https://github.com/heyScully/supernote-to-obsidian) | Hazel + Dropbox + Gemini OCR | **No plugin SDK existed** |
| [supernote_note_to_tasks](https://github.com/FloppyDisck/supernote_note_to_tasks) | supernotelib → Claude Vision → Markdown | **No plugin SDK existed** |
| [supynote](https://github.com/Thopiax/supynote) | .note → TrOCR/LLaVA OCR | **No plugin SDK existed** |
| [supernote-obsidian-plugin](https://github.com/philips/supernote-obsidian-plugin) | Obsidian-side .note viewer | **No plugin SDK existed** |

**Every one of these projects was built before Supernote released the on-device plugin SDK.** They parse `.note` files off-device and run external OCR because that was the *only* path available. Now there's `recognizeElements()` — free, on-device, no API costs, and by user report, the quality is good.

This changes the calculus significantly.

---

## The three approaches, re-evaluated

### Approach A: Plugin-first (on-device conversion, standard sync delivers output)

```
┌─────────────────────────────────────────────────┐
│  SUPERNOTE DEVICE                                │
│                                                   │
│  Plugin does the heavy lifting:                   │
│    1. Reads note elements via SDK                 │
│    2. Runs recognizeElements() — free OCR         │
│    3. Extracts titles, keywords, links, stars     │
│    4. Assembles Markdown + YAML frontmatter       │
│    5. Renders page PNGs via generateNotePng()     │
│    6. Writes .md + .png to /EXPORT/Obsidian/      │
│    7. Tracks sync state (MD5 change detection)    │
│                                                   │
│  Output folder:                                   │
│    /EXPORT/Obsidian/                              │
│    ├── Meeting Notes.md                           │
│    ├── Project Ideas.md                           │
│    └── _assets/                                   │
│        ├── meeting-notes/page_0.png               │
│        └── project-ideas/page_0.png               │
└──────────────┬──────────────────────────────────┘
               │  Supernote Cloud / Dropbox / USB
               │  (syncs .md and .png — not .note)
               ▼
┌─────────────────────────────────────────────────┐
│  YOUR MAC                                        │
│                                                   │
│  Obsidian vault (on iCloud):                     │
│    Already contains the .md files.               │
│    iCloud syncs to iPhone/iPad automatically.    │
│                                                   │
│  No companion script needed for basic sync.      │
│  No .note parsing. No external OCR. No API cost. │
└─────────────────────────────────────────────────┘
```

**What the plugin produces (already fully formed Markdown):**

```markdown
---
title: "Meeting Notes - Project Alpha"
source: "/Note/Meetings/Project Alpha.note"
pages: 3
exported: 2026-04-11T14:30:00
tags:
  - meeting
  - project-alpha
supernote-md5: "a1b2c3d4e5f6..."
---

# Meeting Notes - Project Alpha

## Page 1

![Page 1](_assets/project-alpha/page_0.png)

Discussed the Q2 timeline and agreed on three milestones.
Sarah will own the API redesign. Due date: April 25.

**Keywords:** meeting, project-alpha
**Stars:** ⭐ (page 1)

---

## Page 2
...
```

**Pros:**
- **Free OCR** — `recognizeElements()` runs on-device, no API calls, no per-page costs
- **OCR quality is good** — user reports Supernote's built-in recognition works well
- **Single piece of software** — one plugin, no companion script to install/maintain/debug
- **Rich structured data** — SDK gives direct access to titles, keywords, links, stars, text boxes, geometry. No binary format parsing needed.
- **Write-back capability** — can insert visual overlays, links, status indicators back into notes
- **Offline capable** — works on airplane, at a desk, anywhere. Sync happens whenever connectivity returns.
- **Markdown output is portable** — the output is standard files (`.md` + `.png`). Any sync service can deliver them. Not locked to a specific pipeline.
- **Interactive features** — lasso capture, task UI, NoteForge browser all live in the same plugin

**Cons:**
- **Manual trigger** — you tap the plugin button to sync. No background daemon.
- **Sync delay** — changes don't reach Obsidian until you: (1) open plugin and export, (2) wait for cloud sync to deliver files
- **Device processing time** — OCR on ARM processor takes 1-5s per page. A 50-page note takes a few minutes. But this is a one-time cost per page change; incremental sync skips unchanged pages.
- **No real-time watching** — can't detect the moment you finish writing. You decide when to sync.

### Approach B: Companion-first (off-device parsing + external OCR)

```
Supernote native sync → .note files on Mac
     → Companion script watches for file changes
     → supernotelib parses .note binary format
     → External OCR (Gemini/Claude Vision/TrOCR) for handwriting
     → Generates Markdown → Obsidian vault
```

**Pros:**
- Continuous background sync — file watching triggers automatically
- Can process entire library in bulk
- Extensible to any downstream service

**Cons:**
- **OCR costs real money** — Gemini at ~$0.01/page, Claude Vision at ~$0.01-0.03/page. A daily habit of 5 pages = $1.50-4.50/month. Heavy note-takers: much more. *This was the only option before the plugin SDK.*
- **OR uses pre-computed recognition text** — free, but requires real-time recognition enabled on-device, and the quality is the same as `recognizeElements()`. So you're getting the same OCR output, just extracted from the `.note` binary instead of called live. *No quality advantage.*
- **More moving parts** — Python script + supernotelib + watchdog + launchd daemon + potentially API keys. Each is a failure point.
- **No write-back** — cannot insert text, links, or overlays into Supernote notes. The `.note` format is reverse-engineered for reading, not writing.
- **Depends on cloud sync latency** — Supernote Cloud → Mac can take seconds to minutes
- **No interactive capture** — no lasso-select, no on-device task UI
- **Binary format dependency** — if Supernote changes the `.note` format, supernotelib breaks until someone patches it. The plugin SDK is the *official* API — it's maintained by Ratta.

### Approach C: Plugin-first hybrid (revised recommendation)

```
┌─────────────────────────────────────────────────┐
│  SUPERNOTE DEVICE                                │
│                                                   │
│  Plugin (does everything):                        │
│    • OCR via recognizeElements() — free           │
│    • Markdown generation with full metadata       │
│    • Page PNG rendering                           │
│    • Task extraction + Todoist sync via fetch()   │
│    • Writes output to /EXPORT/Obsidian/           │
│    • Interactive: lasso capture, task UI,          │
│      NoteForge browser, visual overlays           │
│    • Tracks sync state per-note via MD5           │
└──────────────┬──────────────────────────────────┘
               │  Supernote Cloud / Dropbox
               │  (syncs the /EXPORT/ folder)
               ▼
┌─────────────────────────────────────────────────┐
│  YOUR MAC                                        │
│                                                   │
│  Option 1 — Zero companion (simplest):           │
│    Supernote Cloud syncs /EXPORT/Obsidian/       │
│    directly into your Obsidian vault path.       │
│    Done. iCloud handles the rest.                │
│                                                   │
│  Option 2 — Thin companion (polish):             │
│    A simple file-mover script that:              │
│    • Watches the Supernote sync destination      │
│    • Copies .md + .png into Obsidian vault       │
│    • Optionally renames/reorganizes files         │
│    • NO .note parsing. NO OCR. Just file ops.    │
│                                                   │
│  Option 3 — Smart companion (future):            │
│    Same as Option 2, plus:                       │
│    • Watches Todoist for task completions         │
│    • Writes status updates to a sync-back file   │
│    • Watches Obsidian for import-tagged .md files │
│    Plugin reads these on next open                │
└─────────────────────────────────────────────────┘
```

**The key shift:** The companion script goes from "the brain" (parsing `.note` files, running OCR, generating Markdown) to "the courier" (moving already-finished `.md` files into the right folder). Most of the intelligence lives on-device.

---

## Why plugin-first wins on your criteria

You said: efficient, reliable, and doesn't cost significant money.

| Criterion | Plugin-first | Companion-first |
|---|---|---|
| **Cost** | Free. `recognizeElements()` is built into the device. | $0.01-0.03/page for LLM OCR, or free if using pre-computed recognition (same quality as plugin OCR). |
| **Efficiency** | One tap → export. Incremental sync skips unchanged notes. | Automatic after cloud sync delivers files. Faster for continuous sync, but adds latency for the cloud hop. |
| **Reliability** | One codebase. Official SDK — maintained by Ratta. Offline capable. | Multiple dependencies: supernotelib (community-maintained), watchdog, cloud sync, possibly API keys. `.note` format could change. |
| **OCR quality** | `recognizeElements()` — you report it's "quite great" | Same engine (pre-computed recognition), OR external LLM (better but costs money) |
| **Maintenance** | Update one plugin when SDK updates | Update Python deps, API clients, watch for supernotelib breaking changes |

### The "manual trigger" tradeoff — is it actually a problem?

The biggest argument for companion-first was "no background execution = manual trigger = friction." But consider:

1. **You already open your notes on the Supernote.** Adding a "sync" tap when you're done writing is low friction. It's comparable to hitting Cmd+S.
2. **You don't need real-time sync for most workflows.** Meeting notes from this morning don't need to be in Obsidian within seconds. Within the hour is fine — and that's what "sync when I'm done" gives you.
3. **The companion approach isn't instant either.** Supernote Cloud → Mac has its own latency. Then parsing, OCR, Markdown generation. The total delay may be similar.
4. **Batch sync handles the library.** "Sync all changed notes" with MD5 change detection processes only what's new. A quick daily sync covers everything.

The manual trigger is real friction, but it's *low* friction, and it eliminates the entire companion stack.

### When you DO want a companion

A thin Mac companion still has value for:

- **File routing** — if Supernote Cloud doesn't sync `/EXPORT/` to the exact folder your Obsidian vault expects, a simple script copies files over. This is 20 lines of Python, not a full pipeline.
- **Todoist bidirectional sync** — watching Todoist for task completions and writing a status file for the plugin to read on next open. The plugin can push tasks to Todoist via `fetch()`, but it can't *watch* Todoist continuously.
- **Obsidian → Supernote import** — watching a folder for `.md` files the user wants imported back into Supernote notes. Plugin reads these on next open.

But none of these require `.note` parsing or OCR. The companion is a lightweight automation helper, not the sync engine.

---

## OCR strategy comparison (revised)

| Method | Where | Quality | Cost | Speed | Offline | Needs companion |
|---|---|---|---|---|---|---|
| **`recognizeElements()` (SDK)** | **On-device** | **Good (user-confirmed)** | **Free** | **~1-5s/page** | **Yes** | **No** |
| Pre-computed recognition text | Off-device (from .note) | Same as above | Free | Instant (already computed) | Yes | Yes (needs supernotelib) |
| Claude Vision (Sonnet) | Off-device (API) | Excellent | ~$0.01-0.03/page | ~2-5s/page | No | Yes |
| Gemini 2.5 Pro | Off-device (API) | Excellent | ~$0.01/page | ~2-5s/page | No | Yes |
| TrOCR/LLaVA (local) | Off-device (Mac) | Good | Free | ~5-10s/page | Yes | Yes |

**Revised recommendation:** Use `recognizeElements()` on-device as the primary OCR. It's free, it's good quality, and it requires zero infrastructure. The pre-computed recognition text (extracted by supernotelib off-device) gives the *same output* from the *same engine* — there's no quality advantage to going off-device for OCR unless you pay for an LLM.

The only scenario where LLM OCR wins: if you need *contextual understanding* of messy handwriting (e.g., "this squiggle is probably 'API' because the surrounding words are about software"). For standard note-taking, on-device recognition is sufficient.

---

## Revised implementation order

### Step 1: On-device plugin — full export (NotesBridge MVP)

Build the Supernote plugin with basic full-file export:

1. Scans all `.note` files via `FileUtils.getFileList(['.note'])`
2. Detects changes via `FileUtils.getFileMD5()` against stored sync state
3. For changed notes: iterates pages, runs `recognizeElements()` on strokes
4. Extracts titles (`getTitles`), keywords (`getKeyWords`), links, stars (`searchFiveStars`)
5. Assembles Markdown with merge zone markers (`<!-- snb:page:N -->`)
6. Renders page PNGs via `generateNotePng()`
7. Writes `.md` + `.png` to sync folder
8. Shows progress UI with per-page status, supports cancellation via `cancelRecognize()`
9. Caches recognition results per page (keyed by content hash)

**This alone gives you Supernote → Obsidian sync.** Cloud sync or USB delivers the Markdown to your Mac.

### Step 1b: Incremental sync + direct push

Extend the MVP with:

1. **Per-page change detection** — hash each page's elements, only re-OCR changed pages
2. **Merge zone parsing** — read existing `.md`, preserve user content outside markers
3. **Direct HTTPS push** — `fetch()` to Dropbox API or local Mac server, bypassing cloud sync delay
4. **Frontmatter namespace** — `snb-*` prefix for plugin-managed keys, leave user keys untouched

```typescript
// The core sync loop
async function syncChangedNotes(syncFolder: string) {
  const allNotes = await FileUtils.getFileList(['.note']);
  const syncState = await loadSyncState();
  const changed: string[] = [];

  // Phase 1: Detect changes (fast — just MD5 checks)
  for (const notePath of allNotes.result) {
    const md5 = await FileUtils.getFileMD5(notePath);
    if (syncState[notePath]?.md5 !== md5) {
      changed.push(notePath);
    }
  }

  // Phase 2: Export changed notes (slower — OCR involved)
  for (const notePath of changed) {
    const totalPages = (await PluginFileAPI.getNoteTotalPageNum(notePath)).result;
    const noteName = sanitizeFilename(notePath);
    let markdown = assembleFrontmatter(notePath);

    for (let page = 0; page < totalPages; page++) {
      updateProgress(notePath, page, totalPages);

      // Get elements and recognize handwriting
      const elements = await PluginFileAPI.getElements(page, notePath);
      const strokes = elements.result.filter(e => e.type === 0);
      const recognized = await PluginCommAPI.recognizeElements(strokes);

      // Extract structured metadata
      const titles = await PluginFileAPI.getTitles(notePath, [page]);
      const keywords = await PluginFileAPI.getKeyWords(notePath, [page]);
      const stars = await PluginFileAPI.searchFiveStars(notePath);

      // Render page image
      const pngPath = `${syncFolder}/_assets/${noteName}/page_${page}.png`;
      await FileUtils.makeDir(`${syncFolder}/_assets/${noteName}`);
      await PluginFileAPI.generateNotePng({
        notePath, page, times: 1, pngPath, type: 1,
      });

      // Assemble page Markdown
      markdown += `## Page ${page + 1}\n\n`;
      markdown += `![Page ${page + 1}](_assets/${noteName}/page_${page}.png)\n\n`;

      for (const title of titles.result || []) {
        markdown += `### ${title.text}\n\n`;
      }

      markdown += `${recognized.result}\n\n`;

      const pageKeywords = keywords.result?.map(k => k.keyword) || [];
      if (pageKeywords.length > 0) {
        markdown += `**Keywords:** ${pageKeywords.join(', ')}\n\n`;
      }

      if (stars.result?.some(s => s.page === page)) {
        markdown += `⭐ **Starred**\n\n`;
      }

      markdown += '---\n\n';
    }

    // Write the Markdown file
    await writeFile(`${syncFolder}/${noteName}.md`, markdown);

    // Update sync state
    const md5 = await FileUtils.getFileMD5(notePath);
    syncState[notePath] = { md5, lastExported: new Date().toISOString(), pages: totalPages };
    await saveSyncState(syncState);
  }
}
```

### Step 2: Task extraction + Todoist push (plugin extension)

Extend the same plugin to:

1. Identify task-like content in recognized text (bullet patterns, "TODO", "action item")
2. Find starred pages as priority indicators
3. Push tasks to Todoist REST API via `fetch()` — this works from the plugin
4. Track task sync state locally

```typescript
// Push tasks directly from the device — no companion needed
async function pushTaskToTodoist(task: ExtractedTask) {
  const response = await fetch('https://api.todoist.com/rest/v2/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${todoistApiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: task.title,
      description: `From: ${task.sourcePath} (page ${task.page + 1})`,
      priority: task.starred ? 4 : 1,
      due_string: task.dueDate || undefined,
    }),
  });
  return response.json();
}
```

### Step 3: Interactive features (plugin enhancement)

1. Lasso → recognize → capture as task (instant on-device feedback)
2. NoteForge browser with custom note creation + `openFilePath` handoff
3. Visual overlays on Layer 1 (checkmarks, status indicators)
4. Quick-action buttons (insert date, insert folder context)

### Step 4: Thin Mac companion (optional automation)

Only if needed:

1. **File router** — watch Supernote Cloud sync destination, copy `.md`/`.png` to Obsidian vault if paths don't align. ~20 lines of Python.
2. **Todoist watcher** — poll Todoist API for task completions, write a `task-status.json` to the sync folder. Plugin reads it on next open.
3. **Import watcher** — watch Obsidian vault for files tagged `supernote-import: true`, copy to a folder the plugin scans.

```python
# The "companion" is now trivially simple — just a file mover
import shutil
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

SUPERNOTE_SYNC = "~/Supernote/EXPORT/Obsidian/"
OBSIDIAN_VAULT = "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/MyVault/Supernote/"

class SyncHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith(('.md', '.png')):
            dest = event.src_path.replace(SUPERNOTE_SYNC, OBSIDIAN_VAULT)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(event.src_path, dest)
```

Compare this to the *previous* companion recommendation: supernotelib for binary parsing, watchdog, OCR API calls, Markdown assembly, YAML generation, image rendering. That entire pipeline now lives on-device via the official SDK.

---

## Direct push: bypassing cloud sync latency

Supernote Cloud sync is convenient but introduces an unknown delay — seconds to minutes before your Markdown files reach your Mac. The plugin has `fetch()`, so it can **push files directly** the moment export finishes.

### Delivery options

| Method | Latency | Setup effort | Offline fallback |
|---|---|---|---|
| **Write to sync folder** (Supernote Cloud / Dropbox delivers) | Minutes | None | Yes — files wait on device |
| **Dropbox API upload** | Seconds | Dropbox app token | No — needs WiFi |
| **S3 / Cloudflare R2 PUT** | Seconds | Bucket + credentials | No — needs WiFi |
| **WebDAV PUT** | Seconds | WebDAV server | No — needs WiFi |
| **Local HTTP push** (Mac on same WiFi) | Instant | Tiny receiver script on Mac | No |
| **GitHub API** (push to a repo) | Seconds | Personal access token | No |

**Note on WebDAV:** Supernote now supports WebDAV natively for file sync. This means both the native `.note` sync and the plugin's `fetch()` output could target the same WebDAV server — one destination for everything. Cloud-hosted options include InfiniCLOUD (20GB free, WebDAV native), Koofr (10GB free), and Nextcloud providers (2-5GB free). Self-hosted options include a Synology/QNAP NAS, `rclone serve webdav`, or Nextcloud on Docker.

### Recommended: Write locally + push when online

The best approach is a two-phase delivery. Always write to the local sync folder (so nothing is lost if you're offline), then *also* push via HTTPS if WiFi is available:

```typescript
async function deliverExport(noteName: string, markdown: string, pngPaths: string[]) {
  const syncFolder = await getSyncFolder();

  // Phase 1: Always write locally (offline-safe)
  await writeFile(`${syncFolder}/${noteName}.md`, markdown);

  // Phase 2: Push via HTTPS if network is available (skip cloud sync wait)
  try {
    await pushToDropbox(noteName, markdown, pngPaths);
    // OR: await pushToLocalServer(noteName, markdown, pngPaths);
  } catch (e) {
    // Network unavailable — that's fine, cloud sync will pick it up later
    console.log('Direct push unavailable, relying on folder sync');
  }
}

// Dropbox API upload — files land in your Dropbox instantly
async function pushToDropbox(noteName: string, markdown: string, pngPaths: string[]) {
  // Upload Markdown
  await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${dropboxToken}`,
      'Dropbox-API-Arg': JSON.stringify({
        path: `/Obsidian/Supernote/${noteName}.md`,
        mode: 'overwrite',
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: markdown,
  });

  // Upload page PNGs
  for (const pngPath of pngPaths) {
    const pngData = await readFileAsBytes(pngPath);
    const pngName = pngPath.split('/').pop();
    await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: `/Obsidian/Supernote/_assets/${noteName}/${pngName}`,
          mode: 'overwrite',
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: pngData,
    });
  }
}
```

### Local push to Mac (fastest possible)

If your Supernote and Mac are on the same WiFi, a tiny HTTP server on the Mac gives you instant delivery:

```python
# Mac side: ~15 lines, run as a launchd daemon
from http.server import HTTPServer, BaseHTTPRequestHandler
import os

VAULT = os.path.expanduser("~/Library/Mobile Documents/iCloud~md~obsidian/Documents/MyVault/Supernote")

class SyncReceiver(BaseHTTPRequestHandler):
    def do_PUT(self):
        path = os.path.join(VAULT, self.path.lstrip('/'))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            f.write(self.rfile.read(int(self.headers['Content-Length'])))
        self.send_response(200)
        self.end_headers()

HTTPServer(('0.0.0.0', 9876), SyncReceiver).serve_forever()
```

```typescript
// Plugin side: push directly to Mac
async function pushToLocalServer(noteName: string, markdown: string) {
  await fetch(`http://192.168.1.XX:9876/${noteName}.md`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/markdown' },
    body: markdown,
  });
}
```

Files land in your Obsidian vault *instantly* — no cloud hop. iCloud picks them up from there.

**Open question:** The Mac's local IP needs to be discoverable. Options: mDNS/Bonjour (`notebridge.local`), hardcoded IP, or stored in plugin config. Needs testing to see if Supernote's Android resolves `.local` hostnames.

---

## Incremental updates and Obsidian merge zones

### The problem

The basic export model is: plugin generates a full Markdown file, overwrites the previous version. This works fine until you start **adding content in Obsidian** — annotations, links to other notes, commentary, tags you added manually. A full overwrite destroys that work.

What's needed: the plugin owns certain sections of the Markdown file (the "from Supernote" content), and Obsidian owns the rest. Updates from Supernote replace only the Supernote sections.

### The merge zone model

Use HTML comments as boundary markers. Content between `<!-- snb:start -->` and `<!-- snb:end -->` is owned by the plugin. Everything else is owned by the user in Obsidian.

```markdown
---
title: "Meeting Notes - Project Alpha"
snb-source: "/Note/Meetings/Project Alpha.note"
snb-exported: 2026-04-11T14:30:00
snb-md5: "a1b2c3d4e5f6..."
snb-pages: 3
snb-page-hashes:
  0: "aaa111"
  1: "bbb222"
  2: "ccc333"
tags:
  - meeting
  - project-alpha
  - my-custom-tag       ← user added this in Obsidian, preserved on re-export
---

# Meeting Notes - Project Alpha

This is my summary of the meeting. I added this in Obsidian after the
initial export. **The plugin will never touch this section.**

<!-- snb:page:0 hash:aaa111 -->
## Page 1

![Page 1](_assets/project-alpha/page_0.png)

Discussed the Q2 timeline and agreed on three milestones.
Sarah will own the API redesign. Due date: April 25.

**Keywords:** meeting, project-alpha
**Stars:** ⭐
<!-- snb:end:0 -->

Here are my Obsidian notes about page 1. I linked this to [[Q2 Roadmap]]
and added context the handwriting didn't capture. **Plugin won't touch this.**

<!-- snb:page:1 hash:bbb222 -->
## Page 2

![Page 2](_assets/project-alpha/page_1.png)

Budget discussion. Approved $50k for new tooling.
Need to follow up with finance team.

**Keywords:** meeting, budget
<!-- snb:end:1 -->

My thoughts on the budget: we should prioritize the API tooling first.
See also [[Budget Tracker 2026]].

<!-- snb:page:2 hash:ccc333 -->
## Page 3

![Page 3](_assets/project-alpha/page_2.png)

Action items:
- Sarah: API redesign proposal by Apr 18
- Mike: vendor evaluation by Apr 25
- Team: review proposal in next standup
<!-- snb:end:2 -->
```

### How incremental update works

**On re-export, the plugin:**

1. Reads the previously exported `.md` file from the sync folder
2. Parses the `snb-page-hashes` from YAML frontmatter
3. Compares each page's stored hash against current content
4. For unchanged pages: skip entirely (don't re-recognize, don't touch the Markdown)
5. For changed pages: re-run OCR, replace *only the content between that page's markers*
6. Preserve everything outside the markers untouched
7. Update the frontmatter hashes and export timestamp
8. Write the merged file back

```typescript
interface PageSyncState {
  hash: string;           // Content hash of this page's elements
  recognizedText: string; // Cached recognition result
}

interface NoteSyncState {
  notePath: string;
  noteMd5: string;        // Whole-file MD5 for quick "anything changed?" check
  pageHashes: Record<number, PageSyncState>;
  lastExported: string;
}

async function incrementalExport(notePath: string, syncFolder: string) {
  const noteName = sanitizeFilename(notePath);
  const mdPath = `${syncFolder}/${noteName}.md`;
  const state = await loadNoteSyncState(notePath);

  // Quick check: has anything changed at all?
  const currentMd5 = await FileUtils.getFileMD5(notePath);
  if (state?.noteMd5 === currentMd5) return; // nothing changed, skip entirely

  const totalPages = (await PluginFileAPI.getNoteTotalPageNum(notePath)).result;

  // Read existing Markdown if it exists (to preserve user content)
  let existingMd: string | null = null;
  if (await FileUtils.exists(mdPath)) {
    existingMd = await readFile(mdPath);
  }

  // Determine which pages changed
  const changedPages: number[] = [];
  const pageContents: Record<number, string> = {};

  for (let page = 0; page < totalPages; page++) {
    const elements = await PluginFileAPI.getElements(page, notePath);
    const pageHash = hashElements(elements.result);

    if (state?.pageHashes[page]?.hash === pageHash) {
      // Page unchanged — reuse cached recognition
      pageContents[page] = state.pageHashes[page].recognizedText;
    } else {
      // Page changed — re-recognize
      changedPages.push(page);
      const strokes = elements.result.filter(e => e.type === 0);
      const recognized = await PluginCommAPI.recognizeElements(strokes);
      pageContents[page] = recognized.result;

      // Re-render the page PNG (content changed)
      const pngPath = `${syncFolder}/_assets/${noteName}/page_${page}.png`;
      await FileUtils.makeDir(`${syncFolder}/_assets/${noteName}`);
      await PluginFileAPI.generateNotePng({
        notePath, page, times: 1, pngPath, type: 1,
      });
    }
  }

  // Build the new Markdown
  let newMd: string;

  if (existingMd && changedPages.length < totalPages) {
    // Merge: replace only changed page blocks, preserve user content
    newMd = mergeMarkdown(existingMd, notePath, totalPages, pageContents, changedPages);
  } else {
    // First export or full rewrite: generate from scratch
    newMd = generateFullMarkdown(notePath, totalPages, pageContents);
  }

  await writeFile(mdPath, newMd);

  // Update sync state with per-page hashes
  const newState: NoteSyncState = {
    notePath,
    noteMd5: currentMd5,
    pageHashes: {},
    lastExported: new Date().toISOString(),
  };
  for (let page = 0; page < totalPages; page++) {
    const elements = await PluginFileAPI.getElements(page, notePath);
    newState.pageHashes[page] = {
      hash: hashElements(elements.result),
      recognizedText: pageContents[page],
    };
  }
  await saveNoteSyncState(notePath, newState);
}
```

### The merge function

```typescript
function mergeMarkdown(
  existingMd: string,
  notePath: string,
  totalPages: number,
  pageContents: Record<number, string>,
  changedPages: number[],
): string {
  let result = existingMd;

  for (const page of changedPages) {
    const startMarker = `<!-- snb:page:${page} `;
    const endMarker = `<!-- snb:end:${page} -->`;

    const startIdx = result.indexOf(startMarker);
    const endIdx = result.indexOf(endMarker);

    if (startIdx !== -1 && endIdx !== -1) {
      // Replace the content between markers
      const newHash = `hash:${hashElements(/* ... */)}`;
      const newBlock = buildPageBlock(page, notePath, pageContents[page], newHash);
      result = result.substring(0, startIdx) + newBlock + result.substring(endIdx + endMarker.length);
    } else {
      // Markers not found — this page is new (note grew). Append before the end.
      const newBlock = buildPageBlock(page, notePath, pageContents[page], '');
      result += '\n' + newBlock + '\n';
    }
  }

  // Update frontmatter timestamps and hashes
  result = updateFrontmatter(result, notePath, totalPages, pageContents);

  return result;
}

function buildPageBlock(page: number, notePath: string, text: string, hash: string): string {
  const noteName = sanitizeFilename(notePath);
  return `<!-- snb:page:${page} ${hash} -->
## Page ${page + 1}

![Page ${page + 1}](_assets/${noteName}/page_${page}.png)

${text}

<!-- snb:end:${page} -->`;
}
```

### What this enables in practice

**Your workflow:**

1. Write meeting notes on Supernote
2. Tap NotesBridge → "Sync Changed" → Markdown exported with merge markers
3. Open note in Obsidian. Add your own commentary between pages. Link to other notes. Add tags.
4. Next week: add more pages to the same Supernote note
5. Tap NotesBridge → plugin detects only the new pages changed
6. Only new pages get OCR'd and inserted. Your Obsidian commentary is untouched.

**What gets preserved on re-export:**
- Any text you wrote between page blocks in Obsidian
- Tags you added to the YAML frontmatter (plugin only touches `snb-*` prefixed keys)
- Links, comments, formatting you added outside the markers
- Dataview annotations, Obsidian properties, etc.

**What gets replaced:**
- Content inside `<!-- snb:page:N -->` ... `<!-- snb:end:N -->` markers
- Page images (re-rendered if content changed)
- `snb-*` frontmatter keys (export timestamp, MD5, page hashes)

### The frontmatter namespace convention

To avoid clobbering user-managed frontmatter, all plugin-managed keys use the `snb-` prefix:

```yaml
---
# Plugin-managed (will be updated on re-export)
snb-source: "/Note/Meetings/Project Alpha.note"
snb-exported: 2026-04-11T14:30:00
snb-md5: "a1b2c3d4e5f6..."
snb-pages: 3
snb-page-hashes:
  0: "aaa111"
  1: "bbb222"
  2: "ccc333"

# User-managed (preserved across re-exports)
title: "Meeting Notes - Project Alpha"
tags:
  - meeting
  - project-alpha
  - my-custom-tag
aliases:
  - "Alpha kickoff"
---
```

The plugin reads the existing frontmatter, updates only `snb-*` keys, and writes back everything else unchanged.

### Edge cases and decisions needed

| Situation | Behavior |
|---|---|
| User deletes a page marker in Obsidian | Plugin can't find it → re-appends the page at the end. User content above is safe. |
| User moves page blocks around in Obsidian | Plugin finds markers by ID, not position. Order changes are preserved. |
| Page is deleted from Supernote note | Plugin detects page count decreased. Options: (a) leave orphaned block with a `[page deleted]` note, or (b) remove block. Needs a config preference. |
| Note is renamed on Supernote | MD5 changes, old path in sync state is stale. Plugin could detect this via content similarity or just treat it as a new note. |
| First export (no existing Markdown) | No merge needed — generate from scratch with markers. |
| User manually edits content inside markers | Gets overwritten on next export of that page. This is by design — markers mean "plugin-owned." |
| Merge conflict (file was being edited in Obsidian at the moment of sync) | Write to a `.md.snb-new` file instead. Let the user diff and merge. Or: always write locally first, push takes precedence. |

### Performance impact of incremental sync

| Operation | Full export (10 pages) | Incremental (2 pages changed) |
|---|---|---|
| MD5 check | ~50ms | ~50ms |
| Element hashing (per page) | ~100ms x 10 = 1s | ~100ms x 10 = 1s |
| OCR recognition | ~3s x 10 = 30s | ~3s x 2 = 6s |
| PNG rendering | ~300ms x 10 = 3s | ~300ms x 2 = 600ms |
| Markdown merge | N/A | ~50ms |
| **Total** | **~34s** | **~8s** |

For a typical "I edited one page" scenario, incremental sync saves 75%+ of the processing time. The element hashing pass is the overhead — it reads every page's elements to check for changes — but it's fast compared to OCR.

---

## Addressing the sync folder question

A critical practical question: **does Supernote Cloud sync the `/EXPORT/` folder?**

Community reports suggest Supernote Cloud syncs the folders you configure. The key paths:

- `/Note/` — note files (always synced)
- `/Document/` — PDFs and documents
- `/EXPORT/` — exported files (needs verification)
- `/MyStyle/` — custom templates and plugins

**If `/EXPORT/Obsidian/` syncs:** Zero companion needed. Files flow directly from device to Mac.

**If it doesn't sync:** Options:
1. Write output to a folder that *does* sync (e.g., `/Document/Obsidian/`)
2. Use Dropbox as the sync intermediary (Supernote supports Dropbox sync)
3. Use a thin Mac companion to handle the file routing
4. Use USB transfer (manual but reliable)

This needs on-device testing to confirm. The plugin can let the user configure the output folder path.

## File delivery: getting Markdown to your Obsidian vault

The plugin generates standard files (`.md` + `.png`) and can `fetch()` to any HTTPS endpoint. Everything downstream is a commodity file sync problem. The choice depends on what you already use and how much setup you want.

### The general pattern

```
Supernote plugin ──fetch()──► [any cloud storage with an HTTP API]
                                         │
                                    [any sync client]
                                         │
                                         ▼
                                   Obsidian vault
                                   (wherever it lives)
```

The plugin doesn't need to know or care what's downstream. It writes Markdown, PUTs to a configured endpoint, done.

### Cloud storage options

| Service | Free tier | Protocol | Plugin pushes via | Mac-side sync |
|---|---|---|---|---|
| **Dropbox** | 2 GB | Dropbox API | `fetch()` to Dropbox HTTP API | Dropbox desktop app |
| **Cloudflare R2** | 10 GB (zero egress) | S3-compatible | `fetch()` S3 PUT | Remotely Save plugin, `rclone sync`, or Mac script |
| **AWS S3** | 5 GB (12 months) | S3 | `fetch()` S3 PUT | Same as R2 |
| **Google Drive** | 15 GB | Google Drive API | `fetch()` to GDrive API | Google Drive desktop app |
| **OneDrive** | 5 GB | Microsoft Graph API | `fetch()` to Graph API | OneDrive desktop app |
| **WebDAV server** | Varies (see below) | WebDAV | `fetch()` PUT | Mount as network drive, Remotely Save, or `rclone` |

### WebDAV specifically

Supernote now supports WebDAV natively for file sync. This is interesting because both the native `.note` file sync and the plugin's Markdown output could target the **same WebDAV server** — one destination for everything.

**Cloud-hosted WebDAV providers:**

| Provider | Free tier | Paid | Notes |
|---|---|---|---|
| **InfiniCLOUD** (formerly TeraCLOUD) | 20 GB | +300GB at $9/mo | Japanese service, popular in the e-ink community. WebDAV native. |
| **Koofr** | 10 GB | 25GB at €0.50/mo | EU-based (Slovenia), privacy-focused. Cheapest paid tiers. |
| **Nextcloud providers** | 2-5 GB | Varies by host | Multiple certified hosts. WebDAV is Nextcloud's native protocol. |
| **Hetzner Storage Box** | None (starts ~€3.81/mo) | 1 TB minimum | German hosting, extremely reliable. WebDAV + SFTP + rsync. |

**Self-hosted WebDAV:**

| Option | Setup | Notes |
|---|---|---|
| **Synology / QNAP NAS** | Toggle WebDAV on in settings | If you own a NAS, this is one checkbox. |
| **`rclone serve webdav`** | One command: `rclone serve webdav /path/to/vault` | Lightweight, points at any local folder. |
| **Nextcloud (Docker)** | `docker run nextcloud` | Full-featured but heavyweight for just file sync. |
| **macOS Apache + mod_dav** | Config file editing | Already on your Mac, but fiddly to configure. |

### Obsidian-side sync options

On the Mac, something needs to pull files from cloud storage into the Obsidian vault folder:

| Method | How it works | Complexity |
|---|---|---|
| **Dropbox / GDrive / OneDrive desktop app** | Point Obsidian vault at the synced folder | Zero — just change vault path |
| **Remotely Save** (Obsidian plugin) | Syncs vault via S3, WebDAV, Dropbox, OneDrive | Install plugin, enter credentials |
| **Mount WebDAV as network drive** | Finder → Connect to Server → vault on network | One-time Finder setup |
| **`rclone sync` cron job** | Pulls from any cloud storage to local folder | ~3 lines of config |
| **Thin companion script** | `watchdog` or `fswatch` copies files to vault | ~20 lines of Python |

### A note on iCloud

**Apple does not offer a public REST API for iCloud Drive.** There's no HTTPS endpoint where the plugin can PUT a file and have it appear in iCloud. CloudKit JS accesses app-specific database containers, not the filesystem. `rclone` has an experimental iCloud backend but it requires your real Apple ID password, 2FA re-auth every 30 days, and Advanced Data Protection disabled — too fragile.

**iCloud is optional, not a requirement.** If your Obsidian vault is synced via Dropbox, Remotely Save, or any other service, you don't need iCloud at all. If you do want iCloud involved, any of the above paths can deliver files to a local folder on your Mac — once they're there, iCloud picks them up if the folder is in iCloud Drive.

### What we ruled out

| Approach | Why not |
|---|---|
| **CloudKit JS** | Accesses app-specific CloudKit containers, not iCloud Drive. Files never appear in Finder. |
| **rclone iCloud backend** | Experimental, requires real Apple ID password, 2FA re-auth every 30 days. Too fragile. |
| **Syncthing on Supernote** | Requires sideloading an app. Mixing Syncthing + iCloud on the same folder causes conflicts. |
| **Obsidian Sync** | Requires Obsidian running on both endpoints. Can't install Obsidian on Supernote. |

---

## When companion-first still makes sense

To be fair, there are scenarios where the off-device approach has advantages:

| Scenario | Why companion wins |
|---|---|
| You want sync without *ever* opening the plugin | Companion watches automatically; plugin requires a tap |
| You want LLM-quality OCR for messy handwriting | Claude Vision/Gemini understand context better than on-device recognition |
| You have hundreds of legacy notes to bulk-process | Running OCR on 500 notes on the device would take hours; off-device can parallelize |
| You want complex NLP on recognized text | Mac has full Python/Node ecosystem for text processing |
| You want to integrate with services beyond Todoist/Obsidian | Companion can talk to any API without plugin size constraints |

But for the stated goals — efficient, reliable, low cost — **plugin-first is the better foundation.** You can always add a companion later for specific automation needs.

---

## Summary of what changed

| Aspect | Previous recommendation | Revised recommendation |
|---|---|---|
| **Build order** | Mac companion first, plugin optional | Plugin first, companion optional |
| **OCR strategy** | supernotelib + LLM API (or pre-computed) | `recognizeElements()` on-device |
| **OCR cost** | $0.01-0.03/page or free (pre-computed) | Free |
| **Markdown generation** | Mac companion | On-device plugin |
| **Companion role** | The sync engine (parsing, OCR, Markdown) | File courier (copy `.md` to vault) |
| **Companion complexity** | ~500 lines (parser + OCR + Markdown + state) | ~20 lines (file copy on change) |
| **Dependencies** | supernotelib, watchdog, anthropic/google SDK | sn-plugin-lib (official SDK) only |
| **Why it changed** | Community projects predated the plugin SDK | Plugin SDK provides official, free, on-device OCR + full metadata access |

## Existing community projects — still useful, different role

| Project | Previous role | Revised role |
|---|---|---|
| [supernote-tool](https://github.com/jya-dev/supernote-tool) | Core of the pipeline (.note parser) | Reference for understanding .note format; not needed at runtime |
| [supernote-typescript](https://github.com/philips/supernote-typescript) | Potential parser for Node companion | Not needed — SDK handles everything |
| [supernote-obsidian-plugin](https://github.com/philips/supernote-obsidian-plugin) | View .note in Obsidian | Still useful for viewing raw .note files; complementary to NotesBridge |
| [supernote-to-obsidian](https://github.com/heyScully/supernote-to-obsidian) | Template for the companion pipeline | Historical reference; our approach supersedes this |
| [snlib (Rust)](https://github.com/Walnut356/snlib) | Binary format docs | Reference documentation for the .note format |
