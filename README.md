# Supernote Plugin SDK — Research & Quick-Start Guide

> **Last updated:** April 2026 — now based on [official Supernote documentation](https://docs.supernote.com/en) (launched ~March 2026), cross-referenced with npm package source code analysis from Feb 2026.

## What changed from official docs (April 2026 update)

The official documentation at [docs.supernote.com/en](https://docs.supernote.com/en) confirmed much of our reverse-engineering and revealed several things we got wrong or didn't know:

### Major corrections
- **Deployment no longer requires ADB** — There is a native **Settings → Apps → Plugins** UI for installation, plus the **MyStyle** directory method. Our Feb 2026 analysis that said "ADB is required" was incorrect.
- **Architecture is three-component** — Plugins don't run "inside" NOTE/DOC. They run in a separate **PluginHost** process that communicates with NOTE/DOC via **Android AIDL**. Our architecture diagram showed a simpler model.
- **editDataTypes includes 5 (geometry)** — We only documented 0-4. Value 5 for geometric shapes was missing.
- **Environment requirements are stricter** — JDK >= 19 (not just "Java JDK"), Android Studio Narwhal 2025.1.2+, SDK Platform 35 specifically.
- **Template version flag required** — `--version 0.79.2` must be passed when scaffolding.

### New APIs discovered (not in npm packages as of Feb 2026)
| API | What it does |
|---|---|
| `PluginCommAPI.recognizeElements()` | **Built-in handwriting recognition** — converts strokes to text |
| `PluginCommAPI.cancelRecognize()` | Cancel ongoing recognition |
| `PluginCommAPI.getPenInfo()` | Get current pen type, color, and width |
| `PluginCommAPI.lassoElements(rect)` | Programmatic lasso selection (no user interaction needed) |
| `PluginCommAPI.resizeLassoRect(rect)` | Resize an existing lasso selection |
| `PluginFileAPI.deleteElements()` | Delete specific elements by index |
| `PluginFileAPI.getNoteType()` | Detect normal (0) vs recognition (1) notes |
| `PluginFileAPI.getPageSize()` | Get page pixel dimensions |
| `PluginFileAPI.getFileMachineType()` | Get which device type created the file |
| `PluginFileAPI.generateNoteTemplatePng()` | Generate template preview images |
| `PluginFileAPI.generateMarkThumbnails()` | Generate mark thumbnails |
| `PluginFileAPI.clearMarkElements()` | Clear mark elements |

### New types documented
- **`PenInfo`** — Consolidated pen state (type, color, width)
- **`RecogResultData`** — ML recognition results with bounding boxes and category
- **`RecognData`** — Recognition point data compatible with MyScript
- **`APIResponse<T>`** — Standard response wrapper (success/result/error)
- **`ElementDataAccessor<T>`** — Async accessor pattern for large datasets
- **`TYPE_FIVE_STAR` (800)** — Five-star element type (previously undocumented)

### New details confirmed
- Layer system: -1 (background), 0 (main), 1-3 (custom) with specific permission matrix
- Pen colors: `0x00` black, `0x9D` dark gray, `0xC9` light gray, `0xFE` white
- Pen types: `10` fineliner, `1` pressure, `11` marker, `14` calligraphy, min width `100`
- Link types: 0 NOTE page, 1 NOTE file, 2 DOC, 3 image, 4 URL, 6 digest (read-only)
- Event listener priorities: 0=first, 1=normal, 2=last
- Language codes: `en`, `zh_CN`, `zh_TW`, `ja`
- createNote modes: 0=normal, 1=recognition layout
- EMR coordinate ranges: A5X=15819x11864, Manta=21632x16224

---

## What is this?

Supernote (by Ratta) makes premium e-ink tablets designed for handwriting, note-taking, and document reading. They have released an **open plugin SDK** with official documentation at [docs.supernote.com](https://docs.supernote.com/en). Developers can build React Native plugins that run inside the Supernote note-taking and document reading apps.

This directory contains the extracted source code from the published npm packages, plus research notes comparing them against the official documentation.

| Package | Version | What it is |
|---|---|---|
| `sn-plugin-lib` | 0.1.23+ | Core plugin framework library — the APIs your plugin calls |
| `@supernote-plugin/sn-plugin-template` | 1.0.12+ | Project template for scaffolding new plugins (use with `--version 0.79.2`) |

The SDK is maintained by Ratta engineers (`developer@supernote.com`) and is MIT licensed.

---

## Supported devices

The SDK defines six device types with two distinct page coordinate systems:

| Constant | ID | Device | Display | Page resolution (px) | EMR max (portrait) |
|---|---|---|---|---|---|
| `MACHINE_TYPE_A5` | 0 | Supernote A5 | 10.2" e-ink | 1404 x 1872 | 15819 x 11864 |
| `MACHINE_TYPE_A6` | 1 | Supernote A6 | 7.8" e-ink | 1404 x 1872 | 15819 x 11864 |
| `MACHINE_TYPE_A6X` | 2 | Supernote A6X | 7.8" e-ink | 1404 x 1872 | 15819 x 11864 |
| `MACHINE_TYPE_A5X` | 3 | Supernote A5X | 10.2" e-ink | 1404 x 1872 | 15819 x 11864 |
| `MACHINE_TYPE_A6X2` | 4 | Supernote A6X2 (Nomad) | 7.8" e-ink | 1404 x 1872 | 15819 x 11864 |
| `MACHINE_TYPE_A5X2` | 5 | Supernote A5X2 (Manta) | 10.2" e-ink | 1920 x 2560 | 21632 x 16224 |

The A5X2 (Manta) has a higher-resolution display and larger EMR coordinate space. All other devices share the 1404x1872 pixel / 15819x11864 EMR coordinate system. The SDK handles coordinate conversion between pixel space (top-left origin) and EMR space (hardware pen digitizer units) via `PointUtils.androidPoint2Emr()` and `PointUtils.emrPoint2Android()` — both require the page pixel size as a parameter.

---

## How it works

### Architecture (official three-component model)

The official docs describe a **three-component architecture**:

```
┌───────────────────────────────────────────────────────────────┐
│                    Supernote Device                            │
│                                                               │
│  ┌────────────────┐    Android AIDL    ┌──────────────────┐  │
│  │ Plugin-enabled  │◄────────────────► │   PluginHost      │  │
│  │ App (NOTE/DOC)  │  events/results   │                   │  │
│  │                 │                   │  ┌──────────────┐ │  │
│  │ • Renders       │                   │  │ React Native │ │  │
│  │   plugin buttons│                   │  │ Runtime      │ │  │
│  │ • Dispatches    │                   │  │              │ │  │
│  │   events        │                   │  │ ┌──────────┐│ │  │
│  └────────────────┘                   │  │ │  Plugin   ││ │  │
│                                        │  │ │ (Your     ││ │  │
│                                        │  │ │  Code)    ││ │  │
│                                        │  │ │           ││ │  │
│                                        │  │ │ sn-plugin ││ │  │
│                                        │  │ │ -lib APIs ││ │  │
│                                        │  │ └──────────┘│ │  │
│                                        │  └──────────────┘ │  │
│                                        └──────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

1. **Plugin** — Your React Native code. Runs inside PluginHost's runtime, NOT directly inside NOTE/DOC.
2. **PluginHost** — Manages plugin lifecycle (install/uninstall), provides the React Native runtime, and mediates all communication between plugins and host apps.
3. **Plugin-enabled App** — The NOTE and DOC applications. They render plugin buttons in their UI and dispatch user events to PluginHost via **Android AIDL** (Android Interface Definition Language).

Plugins communicate with the host apps through React Native TurboModules (JS/TS → Java) and then via AIDL (Java → NOTE/DOC). The SDK exposes APIs for manipulating notes, pages, layers, strokes, text, images, links, geometries, and more. Direct C/C++ calls from JS/TS are not supported — you must go through TurboModules to Java first.

### Plugin packaging

Plugins compile to `.snplg` files, which are ZIP archives containing:

```
MyPlugin.snplg
├── PluginConfig.json        # Manifest (name, ID, version, etc.)
├── MyPlugin.bundle          # React Native JS bundle (Hermes bytecode)
├── icon.png                 # Plugin icon
├── assets/                  # Images and other assets
└── app.npk                  # Native APK (only if plugin uses native code)
```

### Plugin installation flow (official)

This is now documented in the official docs — **no ADB or rooting required**:

1. Navigate to **Settings → Apps → Plugins** on the device
2. Select the `.snplg` plugin package and tap "Install"
3. NOTE/DOC transmits the package to PluginHost
4. PluginHost parses `PluginConfig.json` and installs the plugin
5. Code and assets are copied to the plugin runtime directory
6. PluginHost initializes the React Native runtime and activates the plugin
7. Button metadata is synced back to NOTE/DOC
8. NOTE/DOC renders buttons in their designated toolbar locations

Alternatively, plugins can be installed by placing the `.snplg` file in the **MyStyle** directory on the device.

### Plugin UI entry points

Plugins register **buttons** that appear in three locations:

| Type | Location | When it appears | App support |
|---|---|---|---|
| Type 1 — Toolbar | Left toolbar in note/doc view | Always visible when note/doc is open | NOTE + DOC |
| Type 2 — Lasso toolbar | Appears after lasso-selecting content | Only when user selects elements | NOTE only |
| Type 3 — Selection toolbar | Appears on text/content selection | Only when user selects in documents | DOC only |

The `showType` parameter controls UI behavior:
- `showType: 0` — No UI (background operation only)
- `showType: 1` — Full-screen plugin UI

When a user taps a plugin button, the PluginHost renders the plugin's React Native view via a `ReactRootView` container. The plugin's `onButtonPress` listener receives a `ButtonEvent` with the button's `id`, `name`, and `icon`.

---

## Quick start — build your first plugin

### Prerequisites (updated per official docs)

- **Node.js >= 18**
- **JDK >= 19** (Java Development Kit)
- **Android Studio Narwhal 2025.1.2+**
- **Android SDK Platform 35** (VanillaIceCream), Build-Tools 35.0.0
- `ANDROID_HOME` environment variable set, with `platform-tools` in PATH
- `jq` or `python3` (for build script JSON parsing)

### 1. Scaffold a new project

```bash
npx @react-native-community/cli init MyPlugin \
  --template @supernote-plugin/sn-plugin-template --version 0.79.2
cd MyPlugin
npm install
```

### 2. Edit `PluginConfig.json`

```json
{
  "name": "MyPlugin",
  "desc": "What your plugin does",
  "iconPath": "assets/icon.png",
  "versionName": "1.0.0",
  "versionCode": "1",
  "pluginID": "my16charpluginid",
  "pluginKey": "MyPlugin",
  "jsMainPath": "index"
}
```

The `pluginID` must be a unique 16-character alphanumeric string. If you don't set one, the build script generates a random one.

### 3. Register your buttons (`index.js`)

```javascript
import { AppRegistry, Image } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { PluginManager } from 'sn-plugin-lib';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

// Toolbar button — visible in note and document views
PluginManager.registerButton(1, ['NOTE', 'DOC'], {
  id: 100,
  name: 'My Tool',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  showType: 1,  // 1 = full-screen UI, 0 = background/no UI
});

// Lasso toolbar button — appears when user selects content (NOTE only)
PluginManager.registerButton(2, ['NOTE'], {
  id: 200,
  name: 'Process Selection',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  editDataTypes: [0, 1, 2, 3, 4, 5], // strokes, titles, images, text, links, geometry
  showType: 1,
});

// Selection toolbar button — DOC only
PluginManager.registerButton(3, ['DOC'], {
  id: 300,
  name: 'Translate Selection',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  showType: 1,
});
```

**Important:** `PluginManager.init()` must be called **after** `AppRegistry.registerComponent()`. The `pluginKey` in `PluginConfig.json` must match the `appName` registered with AppRegistry.

### 4. Build your plugin UI (`App.tsx`)

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PluginManager, PluginNoteAPI, PluginCommAPI } from 'sn-plugin-lib';

function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<number | null>(null);

  useEffect(() => {
    // Get current page number when plugin opens
    PluginCommAPI.getCurrentPageNum().then(result => {
      if (result) setCurrentPage(result);
    });
  }, []);

  const handleInsertText = async () => {
    await PluginNoteAPI.insertText({
      textContentFull: 'Inserted by my plugin!',
      textRect: { left: 100, top: 100, right: 500, bottom: 160 },
      fontSize: 24,
    });
    PluginManager.closePluginView();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Plugin</Text>
      <Text>Current page: {currentPage}</Text>
      <Pressable style={styles.button} onPress={handleInsertText}>
        <Text>Insert Text</Text>
      </Pressable>
      <Pressable style={styles.close} onPress={() => PluginManager.closePluginView()}>
        <Text>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 20 },
  button: { padding: 12, backgroundColor: '#e0e0e0', borderRadius: 8, marginVertical: 8 },
  close: { padding: 12, marginTop: 16 },
});

export default App;
```

### 5. Build the `.snplg` package

```bash
# macOS / Linux
bash buildPlugin.sh

# Windows
powershell -ExecutionPolicy Bypass -File buildPlugin.ps1
```

Output: `build/outputs/MyPlugin.snplg`

### 6. Deploy to your Supernote

Transfer the `.snplg` file to your Supernote device (via USB, cloud sync, or Supernote's file transfer). The device's plugin loader will pick it up.

---

## Full API reference

### PluginManager — lifecycle and buttons

```typescript
PluginManager.init()                                    // Initialize (call once)
PluginManager.closePluginView()                         // Close plugin UI
PluginManager.getDeviceType()                           // → 0-5 (device model)
PluginManager.getPluginDirPath()                        // → plugin storage path
PluginManager.getPluginName()                           // → plugin name string

// Button management
PluginManager.registerButton(type, appTypes, config)    // Register UI button
PluginManager.unregisterButton(id)                      // Remove button
PluginManager.getButtonState(id)                        // → enabled/disabled
PluginManager.setButtonState(id, enabled)               // Toggle button
PluginManager.registerConfigButton()                    // Add settings button

// Event listeners
PluginManager.addPluginLifeListener({ onStart, onStop })
PluginManager.registerButtonListener({ onButtonPress })
PluginManager.registerConfigButtonListener({ onClick })
PluginManager.registerLangListener({ onMsg })
PluginManager.registerEventListener(event, registerType, { onMsg })
```

### PluginNoteAPI — note content manipulation

```typescript
// Text
PluginNoteAPI.insertText(textBox)                       // Insert text box
PluginNoteAPI.getLassoText()                             // Get selected text
PluginNoteAPI.modifyLassoText(textBox)                  // Update selected text

// Titles
PluginNoteAPI.setLassoTitle({ style })                  // Create title from selection
PluginNoteAPI.getLassoTitles()                           // Get selected titles
PluginNoteAPI.modifyLassoTitle({ style })               // Change title style

// Links
PluginNoteAPI.getLassoLinks()                            // Get selected links
PluginNoteAPI.setLassoStrokeLink({ destPath, destPage, style, linkType })
PluginNoteAPI.insertTextLink(textLink)                  // Insert text-based link
PluginNoteAPI.modifyLassoLink(modifyLink)               // Update link

// Images
PluginNoteAPI.insertImage(pngPath)                      // Insert PNG image

// Save
PluginNoteAPI.saveCurrentNote()                         // Save open note
```

### PluginFileAPI — file and page operations

```typescript
// Elements (strokes, text, images, etc.)
PluginFileAPI.getElements(page, notePath)               // Get all elements on page
PluginFileAPI.insertElements(notePath, page, elements)  // Add elements
PluginFileAPI.modifyElements(notePath, page, elements)  // Update elements
PluginFileAPI.replaceElements(notePath, page, elements) // Replace all elements
PluginFileAPI.deleteElements(notePath, page, indices)   // ⭐ NEW: Delete specific elements

// Pages and templates
PluginFileAPI.getNoteTotalPageNum(notePath)              // Total pages
PluginFileAPI.insertNotePage({ notePath, page, template })
PluginFileAPI.removeNotePage(notePath, page)
PluginFileAPI.createNote({ notePath, template, mode, isPortrait })
PluginFileAPI.getNotePageTemplate(notePath, page)
PluginFileAPI.generateNotePng({ notePath, page, times, pngPath, type })
PluginFileAPI.generateNoteTemplatePng(...)               // ⭐ NEW: Generate template preview PNG
PluginFileAPI.getNoteType(notePath)                      // ⭐ NEW: 0=normal, 1=recognition note
PluginFileAPI.getPageSize(notePath, page)                // ⭐ NEW: Get page dimensions
PluginFileAPI.getFileMachineType(notePath)               // ⭐ NEW: Get file's device type

// Layers
PluginFileAPI.getLayers(notePath, page)
PluginFileAPI.insertLayer(notePath, page, layer)
PluginFileAPI.modifyLayers(notePath, page, layers)
PluginFileAPI.deleteLayers(notePath, page, layerIds)
PluginFileAPI.sortLayers(notePath, page, layerIds)
PluginFileAPI.clearLayerElements(notePath, page, layer)

// Titles and keywords
PluginFileAPI.getTitles(notePath, pageList)
PluginFileAPI.getKeyWords(notePath, pageList)
PluginFileAPI.insertKeyWord(notePath, page, keyword)
PluginFileAPI.deleteKeyWord(notePath, page, index)

// Marks and stars
PluginFileAPI.searchFiveStars(filePath)
PluginFileAPI.getMarkPages(filePath)
PluginFileAPI.generateMarkThumbnails(...)                // ⭐ NEW: Generate mark thumbnails
PluginFileAPI.clearMarkElements(...)                     // ⭐ NEW: Clear mark elements

// Element-level access
PluginFileAPI.getElementCounts(notePath, page)
PluginFileAPI.getElementNumList(notePath, page)
PluginFileAPI.getElement(notePath, page, num)
PluginFileAPI.getLastElement()
```

### PluginDocAPI — PDF/document operations

```typescript
PluginDocAPI.getSelectedText()                          // Get selected text in document
PluginDocAPI.getCurrentDocText(page)                    // Get text on page
PluginDocAPI.getCurrentTotalPages()                     // Total document pages
```

### PluginCommAPI — common operations, recognition, and stickers

```typescript
// Lasso (selection) operations
PluginCommAPI.getLassoElements()                         // All selected elements
PluginCommAPI.getLassoElementTypeCounts()                // Count by type
PluginCommAPI.deleteLassoElements()                     // Delete selection
PluginCommAPI.getLassoRect()                             // Selection bounding box (pixel coords)
PluginCommAPI.lassoElements(rect)                       // ⭐ NEW: Programmatic lasso selection
PluginCommAPI.resizeLassoRect(rect)                     // ⭐ NEW: Resize lasso selection
PluginCommAPI.setLassoBoxState(state)                   // Control selection UI

// Handwriting recognition ⭐ NEW
PluginCommAPI.recognizeElements(elements)               // ⭐ NEW: Handwriting-to-text recognition
PluginCommAPI.cancelRecognize()                         // ⭐ NEW: Cancel ongoing recognition

// Pen information ⭐ NEW
PluginCommAPI.getPenInfo()                              // ⭐ NEW: Get current pen type/color/width

// Geometry
PluginCommAPI.insertGeometry(geometry)                  // Insert shape
PluginCommAPI.modifyLassoGeometry(geometry)             // Update shape
PluginCommAPI.getLassoGeometries()                       // Get selected shapes

// Stickers
PluginCommAPI.saveStickerByLasso(path)                  // Save selection as sticker
PluginCommAPI.insertSticker(path)                       // Insert sticker
PluginCommAPI.getStickerSize(path)                      // Get sticker dimensions
PluginCommAPI.generateStickerThumbnail(stickerPath, thumbPath, size)
PluginCommAPI.convertElement2Sticker({ machineType, elements, stickerPath })

// Elements
PluginCommAPI.createElement(type)                       // Create new element
PluginCommAPI.recycleElement(uuid)                      // Free element memory
PluginCommAPI.clearElementCache()                       // Clear all cached elements

// Navigation and state
PluginCommAPI.getCurrentPageNum()                       // Current page number
PluginCommAPI.getCurrentFilePath()                      // Current file path
PluginCommAPI.reloadFile()                              // Reload from disk
PluginCommAPI.getNoteSystemTemplates()                  // Available templates
PluginCommAPI.insertFiveStar(starPoints)                // Insert rating

// UI control
PluginCommAPI.setSlideBarStatus(status)                 // Show/hide sidebar
PluginCommAPI.setSystemDormancyState(enable)            // Prevent/allow sleep
PluginCommAPI.setStatusBarAndSlideBarState(isLock)      // Lock UI elements
```

### FileUtils — filesystem access

```typescript
FileUtils.exists(filePath)                              // Check file exists
FileUtils.makeDir(dirPath)                              // Create directory
FileUtils.copyFile(sourcePath, destPath)                // Copy file
FileUtils.renameToFile(sourceFile, destFile)            // Move/rename
FileUtils.deleteFile(filePath)                          // Delete file
FileUtils.deleteDir(dirPath)                            // Delete directory
FileUtils.listFiles(dirPath)                            // List directory contents
FileUtils.getFileMD5(filePath)                          // File hash
FileUtils.getExternalDirPath()                          // External storage paths
FileUtils.getExportPath()                               // Export directory
FileUtils.getFileList(suffixList)                       // Find files by extension
FileUtils.getImageList()                                // Find all images
FileUtils.openFilePath(path)                            // Open file in system
FileUtils.getStorageAvailableSpace()                    // Available disk space
```

### NativeUIUtils — dialogs and toasts

```typescript
NativeUIUtils.showErrorTipDialog(tag)                   // Show error dialog
NativeUIUtils.showRattaDialog(tip, leftBtn, rightBtn, isSuccess) // Confirm dialog
```

### RattaFileSelector — file picker

```typescript
RattaFileSelector.selectImage()                         // Image picker → path
RattaFileSelector.selectFile(params)                    // File picker → paths
```

---

## Data model

### Element types

| Type constant | Value | Description | Detail field | Allowed layers |
|---|---|---|---|---|
| `TYPE_STROKE` | 0 | Handwritten stroke (pen data) | `stroke` | Main + Custom |
| `TYPE_TITLE` | 100 | Title/heading element | `title` | Main only |
| `TYPE_PICTURE` | 200 | Embedded image | `picture` | Main + Custom |
| `TYPE_TEXT` | 500 | Text box | `textBox` | Main + Custom |
| `TYPE_TEXT_DIGEST_QUOTE` | 501 | Quoted text digest | `textBox` | Main only |
| `TYPE_TEXT_DIGEST_CREATE` | 502 | Created text digest | `textBox` | Main only |
| `TYPE_LINK` | 600 | Internal/external link | `link` | Main only |
| `TYPE_GEO` | 700 | Geometric shape | `geometry` | Main + Custom |
| `TYPE_FIVE_STAR` | 800 | Five-star annotation | `fiveStar` | Main only |

### Layer system

| Layer ID | Name | Can delete | Can rename | Can reorder | Notes |
|---|---|---|---|---|---|
| -1 | Background | No | No | No | Limited operations; visibility toggle only |
| 0 | Main | No | No | Yes | Required for titles, links, digests |
| 1-3 | Custom | Yes | Yes | Yes | Full control |

### Pen properties (confirmed values)

| Property | Values |
|---|---|
| **Colors** | `0x00` (black), `0x9D` (dark gray), `0xC9` (light gray), `0xFE` (white) |
| **Types** | `10` (fineliner), `1` (pressure pen), `11` (marker), `14` (calligraphy) |
| **Width** | Minimum `100` pixels |

### Link types

| Value | Target |
|---|---|
| 0 | NOTE page |
| 1 | NOTE file |
| 2 | DOC |
| 3 | Image |
| 4 | URL |
| 6 | Digest link (read-only) |

### Geometry shapes

| Type | Constant |
|---|---|
| Straight line | `straightLine` |
| Circle | `GEO_circle` |
| Ellipse | `GEO_ellipse` |
| Polygon | `GEO_polygon` |

### Lasso `editDataTypes` (for button registration)

| Value | Element type |
|---|---|
| 0 | Strokes |
| 1 | Titles |
| 2 | Images |
| 3 | Text |
| 4 | Links |
| 5 | Geometric shapes |

### New types from official docs

**`PenInfo`** — Consolidated pen state object:
- `type: number` — pen type
- `color: number` — pen color
- `width: number` — pen width

**`RecogResultData`** — ML recognition results on `Element.recognizeResult`:
- `predict_name: string` — category (defaults to `"others"`)
- Bounding box: `up_left_point_x/y`, `down_right_point_x/y`
- Anchor: `key_point_x/y`

**`RecognData`** — Recognition point data for `Stroke.recognPoints` accessor (compatible with MyScript):
- `X, Y: number` — pixel coordinates
- `Flag: number` — flag indicator
- `timestamp: number` — time value

**`APIResponse<T>`** — Standard response wrapper for all API calls:
- `success: boolean`
- `result: T | null` — on success
- `error: { code: number; message: string } | null` — on failure

**`ElementDataAccessor<T>`** — Async accessor for large datasets (stroke points, pressures, etc.):
- `size()`, `get(index)`, `getRange(start, count)` — read
- `add(index, value)`, `set(index, value)`, `setRange(...)` — write
- `preload(start, count)`, `isCached(index)`, `clearCache()` — cache management

---

## Integration ideas

The API surface — especially with the newly documented recognition APIs — is rich enough to build meaningful integrations. Here are practical concepts, with three detailed plugin designs at the end.

### What's newly possible with official APIs

The official docs reveal capabilities that weren't apparent from the npm packages alone:

- **Built-in handwriting recognition** (`recognizeElements()`) — no external OCR service needed for basic text extraction
- **Programmatic lasso** (`lassoElements(rect)`) — select content without user interaction, enabling batch processing
- **Pen state access** (`getPenInfo()`) — read current pen type/color/width for context-aware plugins
- **Recognition point data** (`Stroke.recognPoints` with `RecognData`) — compatible with MyScript for advanced recognition
- **ML categorization** (`Element.recognizeResult` with `RecogResultData`) — element classification with bounding boxes
- **Note type detection** (`getNoteType()`) — distinguish normal vs recognition-layout notes
- **Page size query** (`getPageSize()`) — adapt layout to actual page dimensions

### General integration categories

**Handwriting-to-digital workflows** — OCR export, handwriting search, translation (now possible with built-in recognition)

**Productivity** — Task extraction, calendar sync, meeting note templates

**Content manipulation** — Custom templates, batch operations, sticker libraries

**Cloud and sync** — Cloud backup, real-time sync, email notes

**AI-powered** — Summarization, smart formatting, diagram recognition

**Document annotation** — PDF markup, cross-referencing, vocabulary building

---

## Detailed plugin designs

### Plugin 1: Supernote → Obsidian Sync ("NotesBridge")

**Goal:** Convert handwritten Supernote notes to Markdown files in an Obsidian vault, preserving structure, titles, links, and keywords.

**How it works:**

1. **Toolbar button** (Type 1, NOTE + DOC) opens the plugin UI
2. User selects export scope: current page, current note, or all starred/marked notes
3. For each page:
   - Get all elements via `PluginFileAPI.getElements(page, notePath)`
   - Use `PluginCommAPI.recognizeElements(elements)` to convert handwritten strokes to text
   - Extract titles via `PluginFileAPI.getTitles(notePath, [page])` → Markdown `## headings`
   - Extract keywords via `PluginFileAPI.getKeyWords(notePath, [page])` → YAML frontmatter `tags:`
   - Extract links via element traversal → Obsidian `[[wikilinks]]`
   - Generate page PNG via `PluginFileAPI.generateNotePng(...)` → embed as `![[image]]`
4. Assemble Markdown with frontmatter (tags, source note path, date, page range)
5. Write to a shared sync folder (e.g., `/storage/emulated/0/Obsidian/SupernoteSync/`)
6. Obsidian's file watcher picks up new/updated files automatically

**Key APIs used:** `recognizeElements`, `getElements`, `getTitles`, `getKeyWords`, `generateNotePng`, `searchFiveStars`, `getMarkPages`, `getCurrentFilePath`, `getNoteTotalPageNum`

**Sync folder structure:**
```
Obsidian/SupernoteSync/
├── MyNotebook/
│   ├── MyNotebook.md          # Full note (all pages concatenated)
│   ├── MyNotebook_p1.png      # Page image
│   ├── MyNotebook_p2.png
│   └── ...
├── MeetingNotes/
│   └── ...
└── _index.md                  # Auto-generated index of all synced notes
```

**Bidirectional (stretch goal):** Watch the sync folder for `.md` files with a `[supernote-import]` tag. Parse Markdown headings/bullets and insert as TextBox elements into a new Supernote note via `PluginNoteAPI.insertText()`.

---

### Plugin 2: Handwritten Task Capture → Todoist ("TaskHarvest")

**Goal:** Extract handwritten tasks from Supernote notes and push them to Todoist with context links back to the source page.

**How it works:**

1. **Two button types:**
   - **Lasso button** (Type 2, NOTE) — user selects specific handwritten items to capture as tasks
   - **Toolbar button** (Type 1, NOTE) — batch scan: find all five-star and marked items across the note

2. **Lasso mode (targeted capture):**
   - Get selected elements via `PluginCommAPI.getLassoElements()`
   - Run `PluginCommAPI.recognizeElements(elements)` on the selection
   - Present recognized text for review/edit in plugin UI
   - User sets Todoist project, priority, due date
   - Push to Todoist REST API (`POST /rest/v2/tasks`)
   - Insert a visual confirmation: add a small link element or TextBox annotation next to the original handwriting via `PluginNoteAPI.insertTextLink(...)` linking back to the Todoist task URL

3. **Batch scan mode:**
   - Scan all pages: `PluginFileAPI.searchFiveStars(filePath)` for starred items
   - Get marked pages: `PluginFileAPI.getMarkPages(filePath)`
   - For each flagged page, use `PluginCommAPI.lassoElements(rect)` to programmatically select regions near stars
   - Recognize text in those regions
   - Present a task list in the plugin UI for batch review before pushing to Todoist

4. **Priority mapping:**
   - Five-star rating → Todoist priority 1 (urgent)
   - Marked pages → Todoist priority 2 (high)
   - Manual selection → Todoist priority 3 (normal)

**Key APIs used:** `recognizeElements`, `getLassoElements`, `lassoElements`, `searchFiveStars`, `getMarkPages`, `insertTextLink`, `getCurrentFilePath`, `getCurrentPageNum`

**Todoist integration:** Uses Todoist REST API v2. Task description includes `[Supernote: NoteName p.X]` with the source file path for reference. A config button (`registerConfigButton`) stores the Todoist API token.

---

### Plugin 3: Smart Daily Digest ("DayBridge")

**Goal:** A daily workflow hub that bridges handwritten notes with digital productivity tools — generates a morning briefing page and an evening summary.

**How it works:**

**Morning mode (insert digital content into Supernote):**
1. Toolbar button creates a new note page via `PluginFileAPI.insertNotePage(...)`
2. Fetches today's tasks from Todoist API, calendar events from a configured API
3. Inserts structured content as TextBox elements:
   - Date header as a Title (`PluginNoteAPI.setLassoTitle`)
   - Task checklist via `PluginNoteAPI.insertText()` with checkbox-style formatting
   - Calendar events with times
   - Links to relevant Supernote notes from yesterday via `PluginNoteAPI.insertTextLink()`
4. Leaves blank space below for handwritten additions during the day

**Evening mode (extract and sync):**
1. Scans today's note pages for completed/new content
2. Uses `recognizeElements()` to extract any handwritten additions
3. Pushes completed tasks back to Todoist (mark done)
4. Exports the day's notes to Obsidian sync folder as Markdown
5. Generates a PNG summary of all pages worked on today

**Key APIs used:** `insertNotePage`, `createNote`, `insertText`, `insertTextLink`, `setLassoTitle`, `recognizeElements`, `getElements`, `generateNotePng`, `getNoteSystemTemplates`, `getCurrentPageNum`

**Config:** Uses `registerConfigButton` for settings — Todoist API token, Obsidian sync folder path, calendar API endpoint, morning template preference.

---

## Deployment (updated April 2026)

### TL;DR: Official installation is now documented. No ADB required.

The official docs confirm a native plugin installation UI exists:

### Official installation method

1. Transfer the `.snplg` file to the device (via USB, cloud sync, or Supernote Partner app)
2. Navigate to **Settings → Apps → Plugins** on the device
3. Select the plugin package and tap **Install**
4. The plugin's buttons will appear in the NOTE/DOC toolbars

Alternatively, place the `.snplg` file in the **MyStyle** directory and the device will pick it up.

### Key facts

| Detail | Value |
|---|---|
| Plugin file format | `.snplg` (ZIP archive) |
| Install UI | **Settings → Apps → Plugins** |
| Alternative install | Copy to **MyStyle** directory |
| Official documentation | [docs.supernote.com/en](https://docs.supernote.com/en) |
| Plugin sandboxing | Each plugin isolated to its own runtime directory |

### Previous ADB-based research (Feb 2026, now largely superseded)

Our earlier reverse-engineering identified the plugin directory at `/data/data/com.ratta.supernote.testfile/files/plugins/` and concluded ADB was required. The official docs now show that plugin installation is handled natively through the Settings UI and MyStyle directory. ADB-based deployment may still work for development/debugging but is no longer the primary path.

For ADB debugging, sideloading must be enabled:
```
Settings → Security & Privacy → Sideloading → On
```

---

## Constraints and limitations

### Platform
- **Android only** — Supernote devices run a custom Android OS. The iOS template exists in the scaffold but is not functional for deployment.
- **arm64-v8a only** — The build script strips all other architectures. Plugins run on ARM64 hardware exclusively.
- **React Native 0.79.2** — Locked version. The `--version 0.79.2` flag is required when scaffolding.

### API
- **Pen events limited** — `registerEventListener` currently only supports `event_pen_up` with priority levels (0=first, 1=normal, 2=last). Callback receives `Element[]`. No real-time stroke tracking during writing.
- **Language support** — `registerLangListener` provides language codes: `en`, `zh_CN`, `zh_TW`, `ja`.
- **No network API** — The SDK doesn't include a networking module. You'd need to add a React Native networking library (e.g., `axios`, `fetch`) as a dependency.
- **Sandboxed storage** — Plugins can only directly access their own storage directory. Other file access requires the file selector dialog or known paths.
- **E-ink refresh** — The display is e-ink; heavy animations or frequent UI updates will cause ghosting. Design for static/minimal UI.
- **Layer constraints** — Links, titles, and digests must be on the main layer (layer 0). DOC files do not support inserting TextBox, titles, or links.
- **createNote mode** — `mode: 0` = normal, `mode: 1` = recognition layout.
- **insertTextLink return codes** — `0` = success, `-1` = failure, `-2` = upgrade required.

### Build
- **JDK >= 19** required
- **Android Studio Narwhal 2025.1.2+** with SDK Platform 35
- Requires `jq` or `python3` for JSON parsing during build
- Windows builds need PowerShell 5.0+

### Maturity
- The SDK is at version **0.1.x** — expect breaking changes
- **Official documentation now available** at [docs.supernote.com/en](https://docs.supernote.com/en)
- No known plugin marketplace yet, but installation UI exists on device
- The npm packages have been published since July 2025, with active updates through April 2026

---

## Project structure (this directory)

```
supernote-plugin-research/
├── README.md                    # This file
├── package.json                 # sn-plugin-lib package metadata
├── LICENSE                      # MIT
├── template.config.js           # Template CLI configuration
├── RtnSupernotePluginCore.podspec
├── src/                         # TypeScript source (sn-plugin-lib)
│   ├── index.tsx                # Main exports
│   ├── PluginManager.ts         # Core lifecycle/button manager
│   ├── sdk/
│   │   ├── PluginNoteAPI.ts     # Note manipulation API
│   │   ├── PluginDocAPI.ts      # Document/PDF API
│   │   ├── PluginFileAPI.ts     # File/page operations API
│   │   ├── PluginCommAPI.ts     # Common operations API
│   │   └── utils/
│   │       └── VerifyUtils.ts   # Parameter validation
│   ├── module/
│   │   ├── NativePluginManager.ts  # TurboModule: plugin management
│   │   ├── NativePluginAPI.ts      # TurboModule: note operations
│   │   ├── NativeFileUtils.ts      # TurboModule: file I/O
│   │   ├── NativeFileSelector.ts   # TurboModule: file picker
│   │   └── NativeUIUtils.ts        # TurboModule: dialogs
│   ├── model/
│   │   ├── Element.ts           # Element data model (strokes, text, etc.)
│   │   ├── Layer.ts             # Layer model
│   │   ├── KeyWord.ts           # Keyword model
│   │   ├── LassoData.ts         # Selection data models
│   │   ├── Template.ts          # Template model
│   │   └── lasso/
│   │       └── LassoElementTypeNum.ts
│   ├── bean/
│   │   └── PluginButton.ts      # Button config models
│   ├── listener/                # Event listener interfaces
│   └── utils/
│       ├── PointUtils.ts        # Coordinate conversion
│       └── Utils.js             # px/dp conversion
├── lib/                         # Compiled JS output (module + types)
├── android/
│   ├── libs/
│   │   └── plugincommonlib.aar  # Precompiled native bridge
│   ├── build.gradle
│   ├── gradle.properties
│   └── src/main/               # Resources (drawables, strings, dimens)
└── template/                    # Plugin project template
    ├── App.tsx                  # Sample plugin UI
    ├── index.js                 # Entry point with button registration
    ├── app.json                 # App name config
    ├── package.json             # Dependencies (react-native + sn-plugin-lib)
    ├── buildPlugin.sh           # Build script (macOS/Linux)
    ├── buildPlugin.ps1          # Build script (Windows)
    ├── assets/
    │   └── icon.png             # Default plugin icon
    └── android/                 # Android project scaffold
```
