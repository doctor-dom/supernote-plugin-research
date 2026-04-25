# Supernote Official Plugin Documentation - Full Extraction
# Extracted: 2026-04-11
# Source: https://docs.supernote.com

---

## Page 1: Plugin Principles
**URL:** https://docs.supernote.com/en/principle

### Architecture - Three Core Components

1. **Plugin**: Developer-built extension that does NOT run directly in NOTE/DOC. Runs within PluginHost's React Native runtime.
2. **PluginHost**: Manages plugin lifecycle (install/uninstall), provides the React Native runtime environment, and mediates all plugin-app communication.
3. **Plugin-enabled App**: Host applications (NOTE and DOC) that display plugin buttons and dispatch events to PluginHost.

### Installation Flow (Step-by-Step)

1. Navigate to Settings -> Apps -> Plugins
2. Select plugin package and tap "Install"
3. NOTE/DOC transmits the package to PluginHost
4. PluginHost parses the package configuration and installs it
5. Code and assets are copied to the plugin runtime directory
6. PluginHost initializes the React Native runtime
7. PluginHost activates plugins and executes JS/TS entry logic
8. PluginHost syncs button metadata back to NOTE/DOC
9. NOTE/DOC renders buttons in designated locations (toolbar, lasso toolbar, etc.)

### Event Execution Flow (Step-by-Step)

1. User taps a plugin button in NOTE/DOC
2. NOTE/DOC sends an event message to PluginHost via **Android AIDL** (Android Interface Definition Language)
3. PluginHost validates the message
4. PluginHost forwards the event to the target plugin listener
5. Plugin executes business logic in the listener callback
6. Plugin calls SDK APIs to operate on NOTE/DOC content

### Communication Protocol
- **Android AIDL** (Android Interface Definition Language) between NOTE/DOC and PluginHost

### Runtime Environment
- React Native runtime, managed by PluginHost

### Key Constraints
- Plugins do NOT run directly inside NOTE/DOC
- "Calling C/C++ directly from JS/TS is not supported"
- Plugins must use Java capabilities through **React Native TurboModules** to access underlying C/C++ functionality
- "Plugin business logic is implemented by the plugin itself"

### Diagrams (4 diagrams present on page)
1. Overall installation flow: NOTE/DOC -> PluginHost -> runtime directory
2. Plugin initialization and button registration: PluginHost lifecycle and sync to NOTE/DOC
3. Event handling flow: button tap -> AIDL message -> PluginHost -> plugin listener
4. API call chain: plugin logic -> Java TurboModules -> C/C++ layer

### Device/Firmware References
- No specific device models or firmware versions mentioned on this page

---

## Page 2: Environment Setup
**URL:** https://docs.supernote.com/en/environment

### Operating System
- Guide is written for **Windows** (with Windows-specific screenshots and paths)

### Required Dependencies

| Dependency | Version Requirement |
|---|---|
| Node.js | Current LTS, >= 18 |
| JDK | 19 or higher (Oracle or OpenJDK) |
| Android Studio | Narwhal \| 2025.1.2 or newer |
| Android SDK | Version 15 (VanillaIceCream) |
| Build-Tools | 35.0.0 |
| Yarn | (recommended, installed via `npm install -g yarn`) |

### Android SDK Components Required
- Android SDK Platform 35
- Intel x86 Atom_64 System Image (optional if using third-party emulator)
- Android SDK Build-Tools 35.0.0

### Environment Variables

| Variable | Value |
|---|---|
| `ANDROID_HOME` | `C:\Users\<username>\AppData\Local\Android\Sdk` (default Windows path) |

Set via: Control Panel -> System and Security -> System -> Advanced system settings -> Environment Variables -> New

### PATH Entries Required
- Add: `%ANDROID_HOME%\platform-tools`

### Verification Commands
```bash
node -v
javac -version
```

### Important Notes from the Page
- "React Native currently requires the Android 15 (VanillaIceCream) SDK to build"
- "SDK version is not the same as the Android OS version; RN supports Android 6+ devices"
- If using a third-party emulator, Intel x86 image installation is optional
- Multiple Build-Tools versions are installable if needed

### URLs Referenced
- React Native docs: https://reactnative.dev/docs/0.79/getting-started
- Android Studio: https://developer.android.com/studio

---

## Page 3: Your First Plugin
**URL:** https://docs.supernote.com/en/first-plugin

### Create a Plugin Project

A plugin project is essentially a React Native project. Create via the community CLI with `npx`.

First, uninstall any older global CLI:
```bash
npm uninstall -g react-native-cli react-native
```

Create the project:
```bash
npx @react-native-community/cli init project_name --template @supernote-plugin/sn-plugin-template --version 0.79.2
```

**CRITICAL:** The plugin framework uses React Native **0.79.2**. Your plugin project must use the same version; otherwise it may fail to run or be incompatible with the host.

### Project Structure
```
plugin\
|-- .bundle\                           # Bundle configuration directory
|   \-- config
|-- .eslintrc.js                       # ESLint configuration file
|-- .gitignore                         # Git ignore file configuration
|-- .prettierrc.js                     # Prettier code formatting configuration
|-- .watchmanconfig                    # Watchman configuration file
|-- *App.tsx                           # Main application component
|-- Gemfile                            # Ruby dependency management file
|-- README.md                          # Project documentation
|-- __tests__\                         # Test files directory
|   \-- App.test.tsx                   # App component test file
|-- *android\                          # Android platform related files
|   |-- app\                           # Android application configuration
|   |   |-- build.gradle               # App-level Gradle build file
|   |   |-- debug.keystore             # Debug signing file
|   |   |-- proguard-rules.pro         # ProGuard obfuscation rules
|   |   \-- src\                       # Android source code directory
|   |       |-- debug\                 # Debug version configuration
|   |       |   \-- AndroidManifest.xml
|   |       \-- main\                  # Main source code
|   |           |-- AndroidManifest.xml
|   |           |-- java\              # Java/Kotlin source code
|   |           \-- res\               # Android resource files
|   |-- build.gradle                   # Project-level Gradle build file
|   |-- gradle\                        # Gradle Wrapper
|   |   \-- wrapper\
|   |       |-- gradle-wrapper.jar
|   |       \-- gradle-wrapper.properties
|   |-- gradle.properties              # Gradle properties configuration
|   |-- gradlew                        # Gradle Wrapper script (Unix)
|   |-- gradlew.bat                    # Gradle Wrapper script (Windows)
|   \-- settings.gradle                # Gradle settings file
|-- app.json                           # React Native application configuration
|-- babel.config.js                    # Babel transpiler configuration
|-- buildPlugin.ps1                    # PowerShell build script
|-- buildPlugin.sh                     # Shell build script
|-- *index.js                          # Application entry point
|-- ios\                               # iOS platform related files (present but not used)
|-- jest.config.js                     # Jest testing framework configuration
|-- metro.config.js                    # Metro bundler configuration
|-- package-lock.json                  # npm dependency lock file
|-- *package.json                      # Project dependencies and scripts configuration
|-- *buildPlugin.ps1                   # Plugin packaging script (Windows)
|-- *buildPlugin.sh                    # Plugin packaging script (Linux/macOS)
\-- tsconfig.json                      # TypeScript configuration file
```

Key files (starred):
- `index.js`: plugin entry (initialization + button registration)
- `App.tsx`: plugin UI entry (React component)
- `package.json`: dependencies and scripts
- `android/`: Android native code (when you need native capabilities)
- `buildPlugin.ps1` / `buildPlugin.sh`: plugin packaging scripts

The template includes the plugin SDK: **npm package `sn-plugin-lib`**. Import APIs via `import ... from 'sn-plugin-lib'`.

### Plugin Initialization

`index.js` is both the React Native entry and the plugin entry. You MUST call `PluginManager.init()` first; otherwise other plugin APIs will not work.

```ts
import { AppRegistry, Image } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { PluginManager } from 'sn-plugin-lib';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();
```

`PluginManager.init()` is called AFTER `AppRegistry.registerComponent(...)`.

### Button Registration

Plugins support three entry button types:

1. **Toolbar button** (type=1): shown in NOTE/DOC toolbars
2. **Lasso toolbar button** (type=2): shown after user creates a lasso selection
3. **Selection toolbar button** (type=3): DOC only; shown after selecting text

#### API: `PluginManager.registerButton(type, appTypes, buttonConfig)`

Parameters:
- `type`: button type. `1` = toolbar, `2` = lasso toolbar, `3` = selection toolbar (DOC only)
- `appTypes`: supported app types array: `['NOTE', 'DOC']` or subset
- `buttonConfig`: button properties object

#### buttonConfig fields:
```
{
  id: unique button id; keep stable once defined
  name: button label
  icon: icon path (absolute path or uri)
  showType: display mode. 0: do not show plugin UI; 1: show plugin UI (default 1)
}
```

- `showType=1`: tapping the button opens a full-screen container in PluginHost and renders the plugin UI
- `showType=0`: no UI is shown; plugin still receives the button event and can run background logic

#### Register a Toolbar Button (type=1)
```ts
import { AppRegistry, Image } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { PluginManager } from 'sn-plugin-lib';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

PluginManager.registerButton(1, ['NOTE', 'DOC'], {
  id: 100,
  name: 'Side Button',
  icon: Image.resolveAssetSource(
    require('./assets/icon/icon.png'),
  ).uri,
  showType: 1,
});
```

#### Register a Lasso Toolbar Button (type=2)

Lasso buttons add `editDataTypes` to control when the button should appear:
```ts
PluginManager.registerButton(2, ['NOTE', 'DOC'], {
  id: 200,
  name: 'Lasso Button',
  icon: Image.resolveAssetSource(
    require('./assets/icon/icon.png'),
  ).uri,
  editDataTypes: [0, 1, 2, 3, 4, 5],
  showType: 1,
});
```

#### editDataTypes values:
```
0: handwritten strokes
1: title
2: image
3: text
4: link
5: geometric shapes
```

The button is shown only when the lasso selection matches one of these data types.

#### Register a Selection Toolbar Button (type=3, DOC only)
```ts
PluginManager.registerButton(3, ['NOTE', 'DOC'], {
  id: 300,
  name: 'Selection Button',
  icon: Image.resolveAssetSource(
    require('./assets/icon/icon.png'),
  ).uri,
  showType: 1,
});
```

### Implement the Plugin UI

`App.tsx` is the UI entry component. Template provides Hello World:

```ts
import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#000000' : '#ffffff'}
      />
      <Text
        style={[styles.helloText, {color: isDarkMode ? '#ffffff' : '#000000'}]}
      >
        Hello World
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  helloText: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default App;
```

### Package the Plugin

Two packaging scripts: `buildPlugin.ps1` (Windows) and `buildPlugin.sh` (Linux/macOS).

Windows:
```bash
.\buildPlugin.ps1
```

Linux/macOS:
```bash
./buildPlugin.sh
```

On first run, generates `PluginConfig.json` in project root:
```json
{
  "name": "plugin",
  "pluginKey": "plugin",
  "pluginID": "98blcl1mp5fxamrm",
  "iconPath": "",
  "desc": "",
  "versionCode": "1",
  "versionName": "0.0.1",
  "jsMainPath": "index"
}
```

#### PluginConfig.json Fields

| Field | Description |
|---|---|
| `name` | Plugin name. Editable. |
| `pluginKey` | Must match the first argument of `AppRegistry.registerComponent(...)`, otherwise the plugin won't run. |
| `pluginID` | Unique plugin id generated by the packaging script. Do not change it after generation, or it will be treated as a different plugin. |
| `iconPath` | Plugin icon path (relative to project root). Fill it manually. |
| `versionCode` | Plugin version code. |
| `versionName` | Plugin version name. |
| `desc` | Plugin description. |
| `jsMainPath` | JS entry filename (without extension). Example: `index`. Keep it unchanged. |
| `author` | Optional. Add manually; packaging does not generate it. |

#### Build Output Structure
```
build\
|-- generated\
|   |-- PluginConfig.json
|   |-- drawable-mdpi\
|   |   \-- assets_icon_icon.png
|   \-- plugin.bundle
\-- outputs\
    \-- plugin.snplg
```

The final plugin package is: `build/outputs/plugin.snplg`

### Install the Plugin

1. Copy `build/outputs/plugin.snplg` to the **`MyStyle`** directory on the Supernote device
2. Open Settings -> Apps -> Plugins
3. Tap "Add Plugin"
4. Select the package and install
5. After installation, NOTE/DOC will show your registered buttons in the toolbar, lasso toolbar, or text-selection toolbar

---

## Page 4: Coordinate System
**URL:** https://docs.supernote.com/en/plugin-base/coordinate-system

### Overview

Supernote devices use **two coordinate systems** because they are e-ink devices with EMR handwriting:

1. **EMR coordinate system** (digitizer / handwriting coordinates): hardware-defined coordinate space from the EMR (Electro-Magnetic Resonance) handwriting system. Describes absolute position of pen tip on the sensing surface (2D and extended dimensions).
2. **Pixel coordinate system** (screen coordinates): describes pixel positions in UI rendering.

They coexist because they serve different hardware layers and use cases. Plugin development frequently requires converting between them.

### EMR Coordinate System (Digitizer / Handwriting)

**Definition:**
- Unit is NOT pixels, but the digitizer's **hardware coordinate unit** (a finer grid)
- Typically higher precision: one screen pixel may correspond to multiple EMR units
- Axes and origin may differ from screen coordinates (varies by device and orientation), so conversion is required

**Characteristics:**
- Strongly tied to handwriting data: stroke sampling points, outline points, angle points are usually more stable in EMR coordinates and better suited for storage and computation
- Not equivalent to UI pixels: cannot use EMR values as px for layout directly

**Common Use Cases:**
- Geometry computation for strokes/elements: move, scale, etc.
- Working with native cached point data accessors (large point sets are better represented in EMR coordinates)

### Pixel Coordinate System (Screen)

**Definition:**
- Unit is **pixels (px)**
- **Top-left is the origin**: `x` increases to the right, `y` increases downward
- `width/height` represent pixel dimensions of the screen/page

**Common Page Sizes:**
- A5X: `1404x1872`
- Manta: `1920x2560`

**Characteristics:**
- Strongly tied to UI rendering: layout, scaling, rotation, and page composition can change where the "same logical point" ends up
- Suitable for UI interactions: tap/drag positions, view layout rectangles, screenshot pixels

**Common Use Cases:**
- Drawing/positioning UI elements in React Native (popups, buttons, selection boxes)
- Interactions based on touch/tap position
- Working with API-returned page sizes (pixels), e.g. `PluginFileAPI.getPageSize(...)`

### Why Two Coordinate Systems?

- EMR pen is sampled by digitizer hardware => produces **high-precision handwriting coordinates**. Does not depend on UI rendering and does not change with screen scaling/layout.
- Screen rendering is driven by display system (Android/rendering engine) => uses **pixel coordinates**. Affected by resolution, rotation, page composition, scaling, and other display strategies.

### Comparison Table

| Dimension | EMR coordinate system | Pixel coordinate system |
|---|---|---|
| Data source | Digitizer/EMR sampling | Screen rendering/layout |
| Unit | Hardware units (not px) | Pixels (px) |
| Precision | Usually higher | Limited by screen resolution |
| Suitable for storing handwriting | Yes | No (affected by rendering strategies) |
| Suitable for UI layout | Not directly | Best suited |
| When conversion is needed | When interacting with UI | When computing strokes/elements |

### SDK Conversion: PointUtils

The SDK provides `PointUtils` for converting between coordinate systems. It infers mapping ratio from page pixel size and applies axis transforms.

**Tip:** If you only have the page pixel size, pass `{ width, height }` as `pageSize` to the conversion functions.

```ts
import { PluginFileAPI, PointUtils } from 'sn-plugin-lib';

/**
 * Convert a pixel-coordinate point to an EMR-coordinate point.
 */
export async function pixelToEmr(notePath: string, page: number, pixelPoint: { x: number; y: number }) {
  const res = await PluginFileAPI.getPageSize(notePath, page);
  if (!res?.success || !res.result) {
    throw new Error('Failed to get page pixel size');
  }

  return PointUtils.androidPoint2Emr(pixelPoint, res.result);
}

/**
 * Convert an EMR-coordinate point to a pixel-coordinate point.
 */
export async function emrToPixel(notePath: string, page: number, emrPoint: { x: number; y: number }) {
  const res = await PluginFileAPI.getPageSize(notePath, page);
  if (!res?.success || !res.result) {
    throw new Error('Failed to get page pixel size');
  }

  return PointUtils.emrPoint2Android(emrPoint, res.result);
}
```

### EMR Max Ranges by Device (from SDK built-in constants)

| Page pixel size (pageSize) | EMR max range (maxX, maxY) |
|---|---|
| `1404x1872` (A5X portrait) | `15819x11864` |
| `1872x1404` (A5X landscape) | `11864x15819` |
| `1920x2560` (Manta portrait) | `21632x16224` |
| `2560x1920` (Manta landscape) | `16224x21632` |

**Note:** If `pageSize` is not in the supported mapping table, conversion throws an error (`unknown pageSize`). Confirm you are using the "page pixel size" (not a scaled view size), and check whether there are special sizes caused by page composition.

---

## Page 5: Lasso
**URL:** https://docs.supernote.com/en/plugin-base/lasso

### Overview

Lasso is a common selection interaction in NOTE/DOC. After the user draws a region on the page, the system computes the selected element set and shows the lasso toolbar. Plugins can display their registered buttons in the lasso toolbar.

### Workflow

1. User completes a lasso selection on the page
2. The system shows the lasso toolbar (plugin-registered buttons may appear)
3. User taps a plugin button and enters the plugin UI
4. The plugin reads the lasso rectangle and selected elements, then runs business logic (e.g., modify selected TextBox elements, titles, geometries, stars, etc.)
5. The plugin can show/hide/remove the lasso box as needed

### Data Model

Selected element list obtained via `PluginCommAPI.getLassoElements()`. Return value is `Element[]`.

- Use `Element.type` to distinguish element categories (constants: `ElementType`)
- For large point datasets (angle points, contour points), `Element` fields are provided as **accessors** (`ElementDataAccessor`) to avoid transferring large point sets to RN at once

### Common APIs

| Goal | API | Description |
|---|---|---|
| Get lasso rectangle | `getLassoRect()` | Returns lasso rectangle (`Rect`) |
| Create lasso selection | `lassoElements(rect)` | Creates a lasso selection from a rectangle (pixel coordinates) |
| Resize lasso rectangle | `resizeLassoRect(rect)` | Resizes the lasso rectangle. Currently only proportional scaling is supported |
| Get selected elements | `getLassoElements()` | Returns `Element[]` (accessor fields are filled on success) |
| Control lasso box | `setLassoBoxState(state)` | `0` = show, `1` = hide, `2` = remove completely |

**Tip:** The lasso rectangle is a UI interaction rectangle and is typically expressed in the **pixel coordinate system**, while stroke point data uses the **EMR coordinate system**. If you need to align them, confirm the coordinate systems first and convert as needed.

### Element Type Constants Used in Example

From the example code:
- `type === 100`: Title elements -> `PluginNoteAPI.modifyLassoTitle({ style: 1 })`
- `type === 500, 501, 502`: TextBox elements -> `PluginNoteAPI.modifyLassoText({...})`
- `type === 700`: Geometry elements -> `PluginCommAPI.modifyLassoGeometry(geometry)`
- `type === 800`: FiveStar elements -> access `fiveStar.points`

### Full Example Code

```ts
import { PluginCommAPI, PluginNoteAPI } from 'sn-plugin-lib';

type Rect = { left: number; top: number; right: number; bottom: number };

/**
 * Get the current lasso rectangle.
 */
export async function fetchLassoRect(): Promise<Rect> {
  const res = await PluginCommAPI.getLassoRect();
  if (!res?.success || !res.result) {
    throw new Error(res?.error?.message ?? 'Failed to get lasso rectangle');
  }
  return res.result as Rect;
}

/**
 * Create a new Rect by scaling around the center point.
 */
export function scaleRectKeepAspect(rect: Rect, scale: number): Rect {
  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;
  const cx = rect.left + width / 2;
  const cy = rect.top + height / 2;
  const newWidth = width * scale;
  const newHeight = height * scale;

  return {
    left: cx - newWidth / 2,
    top: cy - newHeight / 2,
    right: cx + newWidth / 2,
    bottom: cy + newHeight / 2,
  };
}

/**
 * Scale the lasso rectangle proportionally and submit the resize.
 */
export async function resizeLassoRectByScale(scale: number): Promise<boolean> {
  const rect = await fetchLassoRect();
  const nextRect = scaleRectKeepAspect(rect, scale);
  const res = await PluginCommAPI.resizeLassoRect(nextRect);
  return !!res?.success && !!res.result;
}

/**
 * Fetch lasso elements and dispatch by type (example).
 */
export async function fetchLassoElementsAndDispatch(): Promise<void> {
  const res = (await PluginCommAPI.getLassoElements()) as any;
  if (!res?.success || !Array.isArray(res.result)) {
    throw new Error(res?.error?.message ?? 'Failed to get lasso elements');
  }

  const elements = res.result as any[];
  for (const el of elements) {
    if (el.type === 100) {
      await PluginNoteAPI.modifyLassoTitle({ style: 1 });
    } else if (el.type === 500 || el.type === 501 || el.type === 502) {
      const textBox = el.textBox;
      if (textBox) {
        await PluginNoteAPI.modifyLassoText({ ...textBox, textContentFull: 'Updated by plugin' });
      }
    } else if (el.type === 700) {
      const geometry = el.geometry;
      if (geometry) {
        await PluginCommAPI.modifyLassoGeometry(geometry);
      }
    } else if (el.type === 800) {
      const fiveStar = el.fiveStar;
      if (fiveStar?.points) {
        void fiveStar.points;
      }
    }
  }
}

/**
 * Control lasso box visibility.
 * - 0: show
 * - 1: hide
 * - 2: remove completely
 */
export async function setLassoBoxState(state: 0 | 1 | 2): Promise<boolean> {
  const res = await PluginCommAPI.setLassoBoxState(state);
  return !!res?.success && !!res.result;
}
```

### Constraints and Recommendations

- `resizeLassoRect` currently only supports **proportional scaling**: call `getLassoRect` first, scale around the center, then submit the resize
- `getLassoElements` may return elements with **accessor fields**: do not assume point sets are fully in JS; use accessors to fetch data on demand
- `setLassoBoxState(2)` removes the lasso state completely: typically used at the end of an operation; after removal, the lasso toolbar will close on the user side

---

## Page 6: Plugin UI
**URL:** https://docs.supernote.com/en/plugin-base/plugin-ui

### Where the Plugin UI Renders

After a button is tapped, the event is sent to PluginHost. PluginHost selects the target plugin UI by plugin identifier and renders it into its own container view.

React Native UIs are described in JS/TS, but must be rendered by a native container view on Android. The typical approach uses `ReactRootView` as the root container, which loads JS/TS and renders to the screen.

PluginHost maintains a `ReactRootView` (or equivalent container). All plugin UIs are mounted into this container; PluginHost uses the plugin identifier in the event to decide which plugin `App` entry to render.

**Diagram present:** Shows the event handling flow from button tap through PluginHost to plugin UI rendering.

### Button Event Listener

Plugins can register multiple buttons. To distinguish "which button was pressed", listen for button events and read `id` from the event.

```ts
import { PluginManager } from 'sn-plugin-lib';

/**
 * Listen for native button press events.
 */
const subscription = PluginManager.registerButtonListener({
  onButtonPress: event => {
    console.log('button press:', event);
    console.log('button id:', event.id);
  },
});
```

### ButtonEvent Type

```ts
type ButtonEvent = {
  id: number;    // id passed during button registration
  name: string;  // button name
  icon: string;  // icon path passed during registration
};
```

Assign a unique `id` to each button, and dispatch by `id` in the callback (e.g., `switch (event.id)`).

---

## Complete API Index (from llms.txt)

### PluginCommAPI (Common APIs - NOTE & DOC)
- cancelRecognize
- clearElementCache
- convertElement2Sticker
- createElement
- deleteLassoElements
- generateStickerThumbnail
- getCurrentFilePath
- getCurrentPageNum
- getLassoElements
- getLassoElementTypeCounts
- getLassoGeometries
- getLassoRect
- getNoteSystemTemplates
- getPenInfo
- getStickerSize
- insertFiveStar
- insertGeometry
- insertSticker
- lassoElements
- modifyLassoGeometry
- recognizeElements
- recycleElement
- reloadFile
- resizeLassoRect
- saveStickerByLasso
- setLassoBoxState

### PluginFileAPI (File Operations)
- clearMarkElements
- clearLayerElements
- createNote
- deleteElements
- deleteKeyWord
- deleteLayers
- generateMarkThumbnails
- generateNotePng
- generateNoteTemplatePng
- getElement
- getElementCounts
- getElementNumList
- getFileMachineType
- getKeyWords
- getLastElement
- getLayers
- getMarkPages
- getNotePageTemplate
- getNoteTotalPageNum
- getNoteType
- getPageSize
- getElements
- getTitles
- insertKeyWord
- insertLayer
- insertNotePage
- insertElements
- modifyLayers
- modifyElements
- removeNotePage
- replaceElements
- searchFiveStars
- sortLayers

### PluginNoteAPI (NOTE-specific)
- getLassoLinks
- getLassoText
- getLassoTitles
- insertImage
- insertText
- insertTextLink
- modifyLassoLink
- modifyLassoText
- modifyLassoTitle
- saveCurrentNote
- setLassoStrokeLink
- setLassoTitle

### PluginDocAPI (DOC-specific)
- getCurrentDocText
- getCurrentTotalPages
- getLastSelectedText

### PluginManager (Lifecycle & Registration)
- closePluginView
- getButtonState
- getDeviceType
- getPluginDirPath
- getPluginName
- init
- registerButton (Plugin Button Registration and Listener)
- registerConfigButton (Config Button Registration and Listener)
- registerEventListener
- registerLangListener
- setButtonState
- unregisterButton

### Types
- APIResponse
- Element
- ElementDataAccessor
- Geometry
- KeyWord
- LassoLink
- Layer
- Link
- PenInfo
- Picture
- PluginButton
- Point
- RecogResultData
- RecognData
- Rect
- Size
- Stroke
- Template
- TextBox
- TextLink
- Title

### Utils
- PointUtils (androidPoint2Emr, emrPoint2Android)

### Additional Guide Pages (not yet fetched)
- Element Operations: /en/plugin-base/file-op/element-op
- Geometry: /en/plugin-base/plugin-comm/geometry
- Translation: /en/plugin-base/plugin-doc/translations
- Links: /en/plugin-base/plugin-note/link
- TextBox: /en/plugin-base/plugin-note/textbox
- Title: /en/plugin-base/plugin-note/title

---

# DETAILED API REFERENCE (Method Signatures, Parameters, Return Types)
## Extracted from individual documentation pages on 2026-04-11

---

## PluginManager

```ts
import { PluginManager } from 'sn-plugin-lib';
```

Central management entry for plugin operations: initialization, lifecycle events, button registration, and event listening.

### PluginManager.init()

```ts
async init(): Promise<void>;
```

Initialize the plugin environment. **MUST be invoked before the plugin can function.** Call once early at startup (multiple calls are ignored), preferably immediately after `AppRegistry.registerComponent`.

### PluginManager.registerButton()

```ts
registerButton(type: number, appTypes: string[], button: PluginButton): Promise<boolean>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `number` | Button type: `1`=toolbar, `2`=lasso toolbar, `3`=selection toolbar (DOC only) |
| `appTypes` | `string[]` | Array of supported app types: `['NOTE']`, `['DOC']`, or `['NOTE', 'DOC']` |
| `button` | `PluginButton` | Button configuration object |

**PluginButton fields:**
- `id` (number): unique button ID; keep stable once defined
- `name` (string): button label
- `icon` (string): icon path (absolute path or URI)
- `showType` (number): `0` = no UI, `1` = show plugin UI (default 1)
- `editDataTypes` (number[], lasso buttons only): `[0]=strokes, [1]=title, [2]=image, [3]=text, [4]=link, [5]=geometric shapes`

**Returns:** `Promise<boolean>` indicating registration success.

**Key:** "Register the button first (registerButton), then register the click listener (registerButtonListener)."

### PluginManager.registerButtonListener()

```ts
registerButtonListener(buttonListener: ButtonListener): ButtonSubscription;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `buttonListener` | `ButtonListener` | Object with `onButtonPress(event)` callback |

**ButtonListener interface:**
```ts
interface ButtonListener {
  onButtonPress(event: { id: number; name: string; icon: string }): void;
}
```

**Returns:** `ButtonSubscription` with `remove()` method to unregister.

### PluginManager.registerConfigButton()

```ts
registerConfigButton(): Promise<boolean>;
```

Registers the config button, enabling it to appear on the plugin management page.

### PluginManager.registerConfigButtonListener()

```ts
registerConfigButtonListener(listener: ConfigButtonListener): ConfigButtonSubscription;
```

**ConfigButtonListener interface:**
```ts
interface ConfigButtonListener {
  onClick(): void;
}
```

**Returns:** `ConfigButtonSubscription` with `remove()` method.

**Key:** Register the button first, then attach the listener.

### PluginManager.registerEventListener()

```ts
registerEventListener(
  event: string,
  registerType: number,
  penUpListener: PluginEventListener
): PluginEventSubscription;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `string` | Event type. Currently only `'event_pen_up'` is supported |
| `registerType` | `number` | Registration priority: `0` = always first, `1` = normal order, `2` = always last |
| `penUpListener` | `PluginEventListener` | Callback object implementing `onMsg(msg)`. For `event_pen_up`, `msg` is an array of `Element` objects |

**Returns:** `PluginEventSubscription` with `remove()` method to unregister.

```ts
// Example
const sub = PluginManager.registerEventListener('event_pen_up', 1, {
  onMsg(msg) {
    const elements = msg as Element[];
    console.log('pen_up elements length:', elements.length);
    console.log('first element uuid:', elements[0]?.uuid);
  },
});
```

### PluginManager.registerLangListener()

```ts
registerLangListener(langListener: PluginEventListener): PluginEventSubscription;
```

Monitors system language changes. `onMsg(msg)` receives the language code string.

**Supported language codes:** `en`, `zh_CN`, `zh_TW`, `ja`

**Returns:** `PluginEventSubscription` with `remove()` method.

### PluginManager.getButtonState()

```ts
getButtonState(id: number): Promise<boolean>;
```

Returns `true` if the button is enabled (visible in toolbar), `false` if disabled (hidden).

### PluginManager.setButtonState()

```ts
setButtonState(id: number, state: boolean): Promise<boolean>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `number` | Button identifier from registration |
| `state` | `boolean` | `true` = enable (show), `false` = disable (hide) |

**Returns:** `Promise<boolean>` indicating operation success.

### PluginManager.unregisterButton()

```ts
unregisterButton(id: number): Promise<boolean>;
```

Removes a previously registered plugin button.

### PluginManager.getPluginDirPath()

```ts
getPluginDirPath(): Promise<string | null | undefined>;
```

Returns the plugin installation directory path.

### PluginManager.getPluginName()

```ts
getPluginName(): Promise<string | null | undefined>;
```

Returns the plugin name.

### PluginManager.getDeviceType()

```ts
getDeviceType(): Promise<number>;
```

Returns device type: `0`=A5, `1`=A6, `2`=A6X, `3`=A5X, `4`=Nomad, `5`=Manta.

### PluginManager.closePluginView()

```ts
closePluginView(): Promise<boolean>;
```

Closes the currently displayed plugin UI. Returns `true` on success.

---

## PluginCommAPI

```ts
import { PluginCommAPI } from 'sn-plugin-lib';
```

Common APIs callable in both NOTE and DOC modes. Most async methods return `APIResponse<T>`. Check `success === true` before reading `result`; when `success === false`, `error` provides failure details.

### PluginCommAPI.createElement()

```ts
static createElement(type: number): Promise<APIResponse<Element>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `number` | Element type. See `ElementType` constants (0=Stroke, 100=Title, 200=Picture, 500=TextBox, etc.) |

Creates a new Element object. Returns `APIResponse<Element>` with the created element. The element will have accessor fields (angles, contoursSrc, and stroke sub-accessors for stroke type) initialized.

### PluginCommAPI.recycleElement()

```ts
static recycleElement(uuid: string): void;
```

Recycles an Element object by UUID. Clears native cached data.

### PluginCommAPI.clearElementCache()

```ts
static clearElementCache(): void;
```

Clears the Android local cache for all Element objects. After clearing, old Element objects become unusable.

### PluginCommAPI.saveStickerByLasso()

```ts
static saveStickerByLasso(path: string): Promise<APIResponse<boolean>>;
```

Saves lasso-selected strokes or geometries as a sticker file. **Only strokes and geometries can be converted**; other element types cause failure.

### PluginCommAPI.getStickerSize()

```ts
static getStickerSize(path: string): Promise<APIResponse<Size>>;
```

Returns the dimensions of a sticker file.

### PluginCommAPI.generateStickerThumbnail()

```ts
static generateStickerThumbnail(
  stickerPath: string,
  thumbnailPath: string,
  size: Size
): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `stickerPath` | `string` | Source sticker file path |
| `thumbnailPath` | `string` | Output path (must end with `.png`) |
| `size` | `Size` | Thumbnail dimensions (preserves original aspect ratio) |

### PluginCommAPI.convertElement2Sticker()

```ts
static convertElement2Sticker(params: {
  machineType: number;
  elements: Object[];
  stickerPath: string;
}): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `params.machineType` | `number` | Device type: 0=A5, 1=A6, 2=A6X, 3=A5X, 4=Nomad, 5=Manta |
| `params.elements` | `Object[]` | Element data array |
| `params.stickerPath` | `string` | Output sticker file path |

### PluginCommAPI.insertSticker()

```ts
static insertSticker(path: string): Promise<APIResponse<boolean>>;
```

Inserts a `.sticker` file into the current page.

### PluginCommAPI.setLassoBoxState()

```ts
static setLassoBoxState(state: number): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `number` | `0`=show lasso box, `1`=hide lasso box, `2`=remove completely |

**Prerequisite:** A lasso selection must exist.

### PluginCommAPI.getLassoRect()

```ts
static getLassoRect(): Promise<APIResponse<Rect>>;
```

Returns the bounding rectangle of the active lasso selection in pixel coordinates. **Prerequisite:** A lasso selection must exist.

### PluginCommAPI.lassoElements() -- NEW (not in existing source)

```ts
static lassoElements(rect: Rect): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `rect` | `Rect` | Selection rectangle in pixel coordinates |

Creates or modifies the current lasso selection within a rectangular region. After success, you can use related lasso methods like `getLassoRect()` or `getLassoElements()`.

```ts
const rect = { left: 100, top: 120, right: 600, bottom: 400 };
const res = await PluginCommAPI.lassoElements(rect);
```

### PluginCommAPI.resizeLassoRect() -- NEW (not in existing source)

```ts
static resizeLassoRect(rect: Rect): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `rect` | `Rect` | New lasso rectangle in pixel coordinates |

**Prerequisite:** A lasso selection must exist. Currently supports proportional scaling.

### PluginCommAPI.getLassoElements()

```ts
static getLassoElements(): Promise<APIResponse<Element[]>>;
```

Returns selected elements with accessor fields populated. **Prerequisite:** A lasso selection must exist.

### PluginCommAPI.getLassoElementTypeCounts()

```ts
static getLassoElementTypeCounts(): Promise<APIResponse<LassoElementTypeNum>>;
```

Returns counts of each element type in the lasso selection.

### PluginCommAPI.deleteLassoElements()

```ts
static deleteLassoElements(): Promise<APIResponse<boolean>>;
```

Deletes all elements in the current lasso selection.

### PluginCommAPI.getLassoGeometries()

```ts
static getLassoGeometries(): Promise<APIResponse<Geometry[]>>;
```

Returns geometry objects from the lasso selection. **Prerequisite:** A lasso selection must exist.

### PluginCommAPI.getCurrentPageNum()

```ts
static getCurrentPageNum(): Promise<APIResponse<number>>;
```

Returns the current page index of the currently opened file.

### PluginCommAPI.getCurrentFilePath()

```ts
static getCurrentFilePath(): Promise<APIResponse<string>>;
```

Returns the file path of the currently opened file.

### PluginCommAPI.reloadFile()

```ts
static reloadFile(): Promise<APIResponse<boolean>>;
```

Reloads the currently open NOTE/DOC file.

### PluginCommAPI.recognizeElements() -- NEW (not in existing source)

```ts
static recognizeElements(
  elements: Object[] | null | undefined,
  size: { width: number; height: number }
): Promise<APIResponse<string>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `elements` | `Object[] | null | undefined` | Element list (currently supports only strokes and text boxes) |
| `size` | `{ width: number; height: number }` | The note page size that elements are based on (pixels) |

**Returns:** `APIResponse<string>` -- recognized text.

### PluginCommAPI.cancelRecognize() -- NEW (not in existing source)

```ts
static cancelRecognize(): Promise<APIResponse<boolean>>;
```

Halts an ongoing recognition task started by `recognizeElements()`. Returns `result === true` on successful cancellation.

### PluginCommAPI.getPenInfo() -- NEW (not in existing source)

```ts
static getPenInfo(): Promise<APIResponse<PenInfo>>;
```

Retrieves current pen information from the device. Returns `APIResponse<PenInfo>`.

### PluginCommAPI.insertGeometry()

```ts
static insertGeometry(geometry: Geometry): Promise<APIResponse<boolean>>;
```

Inserts a geometric shape into the current page of the open file.

### PluginCommAPI.modifyLassoGeometry()

```ts
static modifyLassoGeometry(geometry: Geometry): Promise<APIResponse<boolean>>;
```

Modifies a lasso-selected geometry. **The selection must contain exactly one geometry.**

### PluginCommAPI.getNoteSystemTemplates()

```ts
static getNoteSystemTemplates(): Promise<Template[] | null | undefined>;
```

Retrieves system note templates. Returns array of `Template` objects.

### PluginCommAPI.insertFiveStar()

```ts
static insertFiveStar(starPoints: Point[]): Promise<APIResponse<boolean>>;
```

Inserts a five-point star into the current file/page/layer. Requires exactly 6 points in pixel coordinates; first and last points must be identical (to close the star).

---

## PluginNoteAPI

```ts
import { PluginNoteAPI } from 'sn-plugin-lib';
```

NOTE-specific APIs. Only callable within NOTE environments (not DOC). Most return `APIResponse<T>`.

### PluginNoteAPI.insertText()

```ts
static insertText(textBox: {
  fontSize?: number;
  fontPath?: string;
  textContentFull: string;
  textRect: Rect;
  textAlign?: number;
  textBold?: number;
  textItalics?: number;
  textFrameWidthType?: number;
  textFrameStyle?: number;
  textEditable?: number;
}): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `textContentFull` | `string` (required) | Text content to display |
| `textRect` | `Rect` (required) | Positioning rectangle with non-zero area (pixels) |
| `fontSize` | `number` | Text size (positive) |
| `fontPath` | `string` | Font file path |
| `textAlign` | `number` | `0`=left, `1`=center, `2`=right |
| `textBold` | `number` | `0`=normal, `1`=bold |
| `textItalics` | `number` | `0`=normal, `1`=italic |
| `textFrameWidthType` | `number` | `0`=fixed, `1`=auto |
| `textFrameStyle` | `number` | `0`=none, `3`=stroke border |
| `textEditable` | `number` | `0`=editable, `1`=locked |

Inserts a text box into the main layer with undo/redo support.

### PluginNoteAPI.insertImage()

```ts
static insertImage(pngPath: string): Promise<APIResponse<boolean>>;
```

Inserts a PNG image into the currently active layer. The path must point to an existing, readable file.

### PluginNoteAPI.insertTextLink()

```ts
static insertTextLink(link: TextLink): Promise<APIResponse<number>>;
```

Inserts a text link into the main layer with undo/redo support.

**Return values:** `0` = success, `-1` = failure, `-2` = upgrade required.

**Limitation:** Links can only be inserted into the main layer. Digest links (linkType=6) are read-only.

### PluginNoteAPI.setLassoStrokeLink()

```ts
static setLassoStrokeLink(params: {
  destPath: string;
  destPage: number;
  style: number;
  linkType: number;
}): Promise<APIResponse<number>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `destPath` | `string` | File path or URL (URL when linkType=4) |
| `destPage` | `number` | Target page number |
| `style` | `number` | `0`=solid underline, `1`=solid border, `2`=dashed border |
| `linkType` | `number` | `0`=note page, `1`=note file, `2`=document, `3`=image, `4`=URL |

Converts lasso-selected elements (strokes, geometries, TextBox on main layer) into hyperlinks. Returns `0`=success, `-1`=failure, `-2`=target needs upgrade. Does not support digest links (linkType=6).

### PluginNoteAPI.modifyLassoLink()

```ts
static modifyLassoLink(modifyLink: {
  destPath: string;
  destPage?: number;
  linkType: number;
  style: number;
  fullText?: string;
  showText?: string;
}): Promise<APIResponse<boolean>>;
```

Modifies link data for a single lasso-selected link. **Exactly one link must be selected.** Cannot convert between text and stroke links. linkType 0-4 only; digest (6) is read-only.

### PluginNoteAPI.setLassoTitle()

```ts
static setLassoTitle(params: { style: number }): Promise<APIResponse<boolean>>;
```

Applies title styling to lasso-selected strokes/geometries/TextBox on the main layer.

| style | Description |
|-------|-------------|
| `0` | Remove title |
| `1` | Black background |
| `2` | Gray-white |
| `3` | Gray-black |
| `4` | Shadow |

### PluginNoteAPI.modifyLassoTitle()

```ts
static modifyLassoTitle(params: { style: number }): Promise<APIResponse<boolean>>;
```

Modifies the title style for a single lasso-selected title. **Selection must contain exactly one title.** Same style values as `setLassoTitle`.

### PluginNoteAPI.getLassoText()

```ts
static getLassoText(): Promise<APIResponse<TextBox[]>>;
```

Returns text elements from the lasso selection. **Prerequisite:** A lasso selection must exist.

### PluginNoteAPI.modifyLassoText()

```ts
static modifyLassoText(textBox: {
  textContentFull: string;
  textRect: Rect;
  fontSize?: number;
  fontPath?: string;
  textAlign?: number;
  textBold?: number;
  textItalics?: number;
  textFrameWidthType?: number;
  textFrameWidth?: number;
  textFrameStyle?: number;
  textEditable?: number;
}): Promise<APIResponse<boolean>>;
```

Modifies the TextBox selected by the current lasso selection. **Selection must contain exactly one TextBox.** `textContentFull` must be non-empty; `textRect` must have non-zero area. Supports undo/redo.

### PluginNoteAPI.saveCurrentNote()

```ts
static saveCurrentNote(): Promise<APIResponse<boolean>>;
```

Persists changes from in-memory cache to the note file. **Should be called before file-level operations** like `replaceElements`, `insertElements`, or `modifyElements` to prevent data inconsistency.

---

## PluginDocAPI

```ts
import { PluginDocAPI } from 'sn-plugin-lib';
```

DOC-specific APIs. Only callable within DOC environments (not NOTE).

### PluginDocAPI.getLastSelectedText()

```ts
static getLastSelectedText(): Promise<APIResponse<string>>;
```

Retrieves the last selected text content from a document. **Text selection must occur within the DOC app before invoking.**

### PluginDocAPI.getCurrentDocText()

```ts
static getCurrentDocText(page: number): Promise<APIResponse<string>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | `number` | Page index (starts from `0`) |

Returns text content from the specified page of the currently open document.

### PluginDocAPI.getCurrentTotalPages()

```ts
static getCurrentTotalPages(): Promise<APIResponse<number>>;
```

Returns the total page count of the currently open document.

---

## PluginFileAPI

```ts
import { PluginFileAPI } from 'sn-plugin-lib';
```

File-related operations. Most async methods return `APIResponse<T>`.

### PluginFileAPI.getElement()

```ts
static getElement(notePath: string, page: number, num: number): Promise<APIResponse<Element>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `notePath` | `string` | Note file path |
| `page` | `number` | Page index (starts from `0`) |
| `num` | `number` | Element index within the page (starts from `0`) |

### PluginFileAPI.getLastElement()

```ts
static getLastElement(): Promise<APIResponse<Element>>;
```

Returns the last element of the current note page.

### PluginFileAPI.getElementCounts()

```ts
static getElementCounts(notePath: string, page: number): Promise<APIResponse<number>>;
```

Returns the number of elements on a note page.

### PluginFileAPI.getElementNumList()

```ts
static getElementNumList(notePath: string, page: number): Promise<APIResponse<number[]>>;
```

Returns array of element identifiers for a page.

### PluginFileAPI.deleteElements() -- NEW (not in existing source)

```ts
static deleteElements(NOTEPath: string, page: number, numsInPage: number[]): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `NOTEPath` | `string` | NOTE/DOC file path |
| `page` | `number` | Page index (starts from `0`) |
| `numsInPage` | `number[]` | Element indices in the page to delete |

### PluginFileAPI.getFileMachineType()

```ts
static getFileMachineType(notePath: string): Promise<APIResponse<number>>;
```

Returns the device type that created the note/annotation file: `0`=A5, `1`=A6, `2`=A6X, `3`=A5X, `4`=Nomad, `5`=Manta.

### PluginFileAPI.getNoteType()

```ts
static getNoteType(NOTEPath: string): Promise<APIResponse<number>>;
```

Returns note type: `0` = normal note, `1` = recognition note.

### PluginFileAPI.getPageSize()

```ts
static getPageSize(NOTEPath: string, page: number): Promise<APIResponse<Size>>;
```

Returns the page size in pixels.

### PluginFileAPI.getNoteTotalPageNum()

```ts
static getNoteTotalPageNum(NOTEPath: string): Promise<APIResponse<number>>;
```

Returns the total page count of a NOTE file.

### PluginFileAPI.insertNotePage()

```ts
static insertNotePage(notePath: string, page: number, template: string): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `notePath` | `string` | Note file path |
| `page` | `number` | Page position for insertion (starts from `0`) |
| `template` | `string` | Template name (e.g., `'style_blank'`) |

### PluginFileAPI.removeNotePage()

```ts
static removeNotePage(NOTEPath: string, page: number): Promise<APIResponse<boolean>>;
```

Removes a page from a NOTE file.

### PluginFileAPI.getNotePageTemplate()

```ts
static getNotePageTemplate(NOTEPath: string, page: number): Promise<APIResponse<NoteTemplateInfo>>;
```

Returns template info: `{ name: string, md5: string }`. System templates use md5 `"0"`.

### PluginFileAPI.generateNotePng()

```ts
static generateNotePng(params: {
  NOTEPath: string;
  page: number;
  times: number;
  pngPath: string;
  type: number;
}): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `NOTEPath` | `string` | Note file path |
| `page` | `number` | Page index (starts from `0`) |
| `times` | `number` | Scale factor (typically `1` or `2`) |
| `pngPath` | `string` | Output PNG path (must end with `.png`) |
| `type` | `number` | Background: `0`=transparent, `1`=white |

### PluginFileAPI.generateMarkThumbnails()

```ts
static generateMarkThumbnails(
  markPath: string,
  page: number,
  pngPath: string,
  size: Size
): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `markPath` | `string` | DOC file path |
| `page` | `number` | Page index (starts from `0`) |
| `pngPath` | `string` | Output PNG path (must end with `.png`) |
| `size` | `Size` | Output image dimensions |

Generates a thumbnail for a DOC mark file page.

### PluginFileAPI.generateNoteTemplatePng()

```ts
static generateNoteTemplatePng(
  NOTEPath: string,
  page: number,
  pngPath: string
): Promise<APIResponse<boolean>>;
```

Generates a background-template PNG for a note page.

### PluginFileAPI.clearMarkElements()

```ts
static clearMarkElements(filePath: string, page: number): Promise<APIResponse<boolean>>;
```

Removes handwriting elements from a DOC file's associated mark file (handwriting is stored separately from the main document).

### PluginFileAPI.getMarkPages()

```ts
static getMarkPages(filePath: string): Promise<APIResponse<number[]>>;
```

Returns page indices that contain mark pages within a DOC file.

### PluginFileAPI.searchFiveStars()

```ts
static searchFiveStars(filePath: string): Promise<APIResponse<number[]>>;
```

Returns list of page indices that contain five-star elements.

### PluginFileAPI.createNote()

```ts
static createNote(params: {
  notePath: string;
  template: string;
  mode: number;
  isPortrait: boolean;
}): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `notePath` | `string` | File path for the new note |
| `template` | `string` | System template name (from `getNoteSystemTemplates`) or custom template image path |
| `mode` | `number` | `0`=normal, `1`=recognition layout |
| `isPortrait` | `boolean` | Portrait orientation |

### PluginFileAPI.getTitles()

```ts
static getTitles(NOTEPath: string, pageList: number[]): Promise<APIResponse<Title[]>>;
```

Returns title data from NOTE files (not available for DOC).

### PluginFileAPI.getKeyWords()

```ts
static getKeyWords(NOTEPath: string, pageList: number[]): Promise<APIResponse<KeyWord[]>>;
```

Returns keywords from NOTE/DOC files.

### PluginFileAPI.insertKeyWord()

```ts
static insertKeyWord(NOTEPath: string, page: number, keyword: string): Promise<APIResponse<boolean>>;
```

### PluginFileAPI.deleteKeyWord()

```ts
static deleteKeyWord(NOTEPath: string, page: number, index: number): Promise<APIResponse<boolean>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | `number` | Page index (starts from `0`) |
| `index` | `number` | Keyword index within page (starts from `1`) |

### PluginFileAPI.getLayers()

```ts
static getLayers(NOTEPath: string, page: number): Promise<APIResponse<Layer[]>>;
```

Returns layer data from a NOTE file page.

### PluginFileAPI.modifyLayers()

```ts
static modifyLayers(NOTEPath: string, page: number, layers: Layer[]): Promise<APIResponse<boolean>>;
```

Updates layer data. Only NOTE files support layers. Main layer and background layer names cannot be modified.

### PluginFileAPI.insertLayer()

```ts
static insertLayer(NOTEPath: string, page: number, layer: Layer): Promise<APIResponse<boolean>>;
```

### PluginFileAPI.deleteLayers()

```ts
static deleteLayers(NOTEPath: string, page: number, layerIds: number[]): Promise<APIResponse<boolean>>;
```

Layer IDs 1-3 can be deleted. Background (-1) and main (0) layers cannot.

### PluginFileAPI.sortLayers()

```ts
static sortLayers(NOTEPath: string, page: number, layerIds: number[]): Promise<APIResponse<boolean>>;
```

Reorders layers. The first layer ID in the array is on top. Supports IDs 0-3.

---

## Types

### APIResponse<T>

```ts
interface APIResponse<T> {
  success: boolean;
  result: T | null;
  error: { code: number; message: string } | null;
}
```

- `success`: Whether the API call succeeded
- `result`: Present only when `success === true`; `null` on failure
- `error`: Present only when `success === false`; `null` on success

### Point

```ts
interface Point {
  x: number;  // X coordinate
  y: number;  // Y coordinate
}
```

### Rect

```ts
interface Rect {
  left: number;    // left boundary
  top: number;     // top boundary
  right: number;   // right boundary
  bottom: number;  // bottom boundary
}
```

### Size

```ts
interface Size {
  width: number;
  height: number;
}
```

### Element (Trail)

Represents all visible elements in Supernote documents. `type` field determines which sub-object is populated.

**Element Type Constants:**

| Constant | Value | Description | Supported Layers |
|----------|-------|-------------|------------------|
| `TYPE_STROKE` | `0` | Handwritten strokes | Main + custom |
| `TYPE_TITLE` | `100` | Titles | Main only |
| `TYPE_PICTURE` | `200` | Images | Main + custom |
| `TYPE_TEXTBOX` | `500` | Regular text | Main + custom |
| `TYPE_DIGEST_QUOTE_TEXTBOX` | `501` | Digest quoted text | Main only |
| `TYPE_DIGEST_CREATED_TEXTBOX` | `502` | Digest generated text | Main only |
| `TYPE_LINK` | `600` | Hyperlinks (text/stroke) | Main only |
| `TYPE_GEOMETRY` | `700` | Geometric shapes | Main + custom |
| `TYPE_FIVE_STAR` | `800` | Five-star rating | Main only |

**Core Fields:**
- `uuid` (string): unique identifier
- `type` (number): element category
- `pageNum` (number): page number
- `layerNum` (number): layer number
- `thickness` (number): element thickness
- `maxX`, `maxY` (number): coordinates
- `status` (number): element status
- `recognizeResult` (`RecogResultData | null`): recognition result data

**Type-specific sub-objects:** `stroke`, `title`, `textBox`, `link`, `geometry`, `picture`, `fiveStar` -- populated based on `type`.

**Large data fields (accessor objects):**
- `angles` (`ElementDataAccessor<Point>`): angle data
- `contoursSrc` (`ElementDataAccessor<Point[]>`): contour data

**Method:**
- `recycle(): Promise<void>` -- clears native cached data and accessor caches

### ElementDataAccessor<T>

Accessor for large datasets. Data must be fetched asynchronously to prevent JS memory issues.

**Methods:**
- `size(): Promise<number>` -- returns total element count
- `get(index: number): Promise<T>` -- returns element at index
- `getRange(start: number, count: number): Promise<T[]>` -- returns range of elements

### Stroke

Raw stroke data (when Element type is `TYPE_STROKE`):

| Field | Type | Description |
|-------|------|-------------|
| `penColor` | `number` | `0x00`=black, `0x9D`=dark gray, `0xC9`=light gray, `0xFE`=white |
| `penType` | `number` | `10`=technical/fineliner, `1`=pressure pen, `11`=marker, `14`=calligraphy |
| `points` | `ElementDataAccessor<Point>` | Sample points in EMR coordinates |
| `pressures` | `ElementDataAccessor<number>` | Pressure values 0-4096 |
| `eraseLineTrailNums` | `ElementDataAccessor<number>` | Erase line data |
| `flagDraw` | `ElementDataAccessor<boolean>` | Write flag |
| `markPenDirection` | `ElementDataAccessor<Point>` | Marker pen direction |
| `recognPoints` | `ElementDataAccessor<RecognData>` | Recognition point data (pixel coordinates) |

### PenInfo

```ts
interface PenInfo {
  type: number;   // Pen type: 10=fineliner, 1=pressure pen, 11=marker, 14=calligraphy
  color: number;  // Pen color: 0x00=black, 0x9D=dark gray, 0xC9=light gray, 0xFE=white
  width: number;  // Pen width (minimum 100)
}
```

### RecognData

```ts
interface RecognData {
  X: number;         // X coordinate (pixel coordinates)
  Y: number;         // Y coordinate (pixel coordinates)
  Flag: number;      // Flag
  timestamp: number; // Timestamp
}
```

### RecogResultData

Element recognition result data. Appears as `recognizeResult` field on `Element`.

| Field | Type | Description |
|-------|------|-------------|
| `predict_name` | `string` | Category name (default: `'others'`) |
| `up_left_point_x` | `number` | Top-left X (pixel coordinates) |
| `up_left_point_y` | `number` | Top-left Y (pixel coordinates) |
| `key_point_x` | `number` | Key point X (pixel coordinates) |
| `key_point_y` | `number` | Key point Y (pixel coordinates) |
| `down_right_point_x` | `number` | Bottom-right X (pixel coordinates) |
| `down_right_point_y` | `number` | Bottom-right Y (pixel coordinates) |

### Geometry

| Field | Type | Description |
|-------|------|-------------|
| `showLassoAfterInsert` | `boolean` | Show lasso state after insertion |
| `penColor` | `number` | `0x00`=black, `0x9D`=dark gray, `0xC9`=light gray, `0xFE`=white |
| `penType` | `number` | `10`=technical, `1`=pressure, `11`=marker, `14`=calligraphy |
| `penWidth` | `number` | Minimum value `100` |
| `type` | `string` | Geometry type constant |
| `points` | `Point[]` | Polygon vertices in pixel coordinates |
| `ellipseCenterPoint` | `Point | null` | Center point (pixel coordinates) |
| `ellipseMajorAxisRadius` | `number` | Major axis radius (pixels) |
| `ellipseMinorAxisRadius` | `number` | Minor axis radius (pixels) |
| `ellipseAngle` | `number` | Rotation angle (radians) |

**Geometry Type Constants:**

| Constant | Value | Description |
|----------|-------|-------------|
| `Geometry.TYPE_STRAIGHT_LINE` | `'straightLine'` | Straight line |
| `Geometry.TYPE_CIRCLE` | `'GEO_circle'` | Circle |
| `Geometry.TYPE_ELLIPSE` | `'GEO_ellipse'` | Ellipse |
| `Geometry.TYPE_POLYGON` | `'GEO_polygon'` | Polygon |

### TextBox

| Field | Type | Description |
|-------|------|-------------|
| `fontSize` | `number` | Font size |
| `fontPath` | `string | null` | Font path |
| `textContentFull` | `string | null` | Text content |
| `textRect` | `Rect` | TextBox rectangle (pixels) |
| `textDigestData` | `string | null` | Digest data (present on digest TextBox elements) |
| `textAlign` | `number` | `0`=left, `1`=center, `2`=right |
| `textBold` | `number` | `0`=normal, `1`=bold |
| `textItalics` | `number` | `0`=normal, `1`=italic |
| `textFrameWidthType` | `number` | `0`=fixed, `1`=auto |
| `textFrameStyle` | `number` | `0`=none, `3`=stroke border |
| `textEditable` | `number` | `0`=editable, `1`=non-editable |

### Title

| Field | Type | Description |
|-------|------|-------------|
| `X` | `number` | Top-left X (pixels) |
| `Y` | `number` | Top-left Y (pixels) |
| `width` | `number` | Width (pixels) |
| `height` | `number` | Height (pixels) |
| `page` | `number` | Page number |
| `style` | `number` | `0`=remove, `1`=black bg, `2`=gray-white, `3`=gray-black, `4`=shadow |
| `controlTrailNums` | `number[]` | Stroke indices belonging to the title |

### Picture

| Field | Type | Description |
|-------|------|-------------|
| `picturePath` | `string` | Image file path |
| `rect` | `Rect` | Image rectangle (pixel coordinates) |

### Link

When `Element.type === 600`, the `element.link` property provides link details.

| Field | Type | Description |
|-------|------|-------------|
| `category` | `number` | `0`=text link, `1`=stroke link |
| `X` | `number` | Top-left X (pixels) |
| `Y` | `number` | Top-left Y (pixels) |
| `width` | `number` | Width (pixels) |
| `height` | `number` | Height (pixels) |
| `page` | `number` | Page number |
| `style` | `number` | `0`=solid underline, `1`=solid border, `2`=dashed border |
| `linkType` | `number` | `0`=note page, `1`=note file, `2`=document, `3`=image, `4`=URL, `6`=digest |
| `destPath` | `string` | Destination path (URL when linkType=4) |
| `destPage` | `number` | Destination page |
| `fontSize` | `number` | Font size (text link) |
| `fullText` | `string` | Full text (text link) |
| `showText` | `string` | Display text (text link) |
| `italic` | `number` | `0`=no, `1`=yes (text link) |
| `controlTrailNums` | `number[]` | Stroke index list (stroke link) |

### TextLink (for insertTextLink)

| Field | Type | Description |
|-------|------|-------------|
| `destPath` | `string` | Destination path/URL |
| `destPage` | `number` | Destination page (valid for linkType 0 or 2) |
| `style` | `number` | `0`=solid underline, `1`=solid border, `2`=dashed border |
| `linkType` | `number` | `0`=note page, `1`=note file, `2`=document, `3`=image, `4`=URL |
| `rect` | `Rect` | Text region (pixel coordinates, non-zero area) |
| `fontSize` | `number` | Positive number |
| `showText` | `string` | Displayed text |
| `fullText` | `string` | Complete text content |
| `isItalic` | `number` | `0`=no, `1`=yes |

### LassoLink (returned from lasso selections)

| Field | Type | Description |
|-------|------|-------------|
| `category` | `number` | `0`=text link, `1`=stroke link |
| `style` | `number` | `0`=solid underline, `1`=solid border, `2`=dashed border |
| `linkType` | `number` | `0`=note page, `1`=note file, `2`=document, `3`=image, `4`=URL, `6`=digest |
| `destPath` | `string` | Destination path/URL |
| `destPage` | `number` | Destination page number |
| `fullText` | `string` | Full text (text links) |
| `showText` | `string` | Display text (text links) |
| `italic` | `number` | `0`=no, `1`=yes |

### Layer

Only applies to `.note` files.

| Field | Type | Description |
|-------|------|-------------|
| `layerId` | `number` | `-1`=background (cannot delete/rename/reorder/set current, can toggle visibility), `0`=main (cannot delete/rename, can reorder/set current), `1-3`=custom (full control) |
| `name` | `string` | Layer name |
| `isCurrentLayer` | `boolean` | Whether this is the active layer |
| `isVisible` | `boolean` | Whether the layer is visible |

### Template

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Template name |
| `vUri` | `string` | Portrait template URI (React Native Image compatible) |
| `hUri` | `string` | Landscape template URI (React Native Image compatible) |

### KeyWord

| Field | Type | Description |
|-------|------|-------------|
| `keyword` | `string` | Keyword text |
| `page` | `number` | Page index (starts from `0`) |
| `index` | `number` | Keyword index within the page (starts from `1`) |

---

## PointUtils

```ts
import { PointUtils } from 'sn-plugin-lib';
```

Conversion utilities between pixel coordinates and EMR coordinates.

### Constants

**Page Orientation:**

| Constant | Value | Description |
|----------|-------|-------------|
| `ROTATION_0` | `1000` | 0 deg portrait |
| `ROTATION_0_LR` | `2000` | 0 deg portrait with left/right split |
| `ROTATION_90` | `1090` | 90 deg landscape |
| `ROTATION_90_UD` | `2090` | 90 deg landscape with top/bottom split |
| `ROTATION_180` | `1180` | 180 deg portrait |
| `ROTATION_180_LR` | `2180` | 180 deg portrait with left/right split |
| `ROTATION_270` | `1270` | 270 deg landscape |
| `ROTATION_270_UD` | `2270` | 270 deg landscape with top/bottom split |

**Device Models:**

| Constant | Value |
|----------|-------|
| `MACHINE_TYPE_A5` | `0` |
| `MACHINE_TYPE_A6` | `1` |
| `MACHINE_TYPE_A6X` | `2` |
| `MACHINE_TYPE_A5X` | `3` |
| `MACHINE_TYPE_NOMAD` | `4` |
| `MACHINE_TYPE_MANTA` | `5` |

**Page Sizes:**

| Constant | Value |
|----------|-------|
| `NORMAL_PAGE_SIZE` | `{ width: 1404, height: 1872 }` |
| `A5X2_PAGE_SIZE` | `{ width: 1920, height: 2560 }` |

### PointUtils.androidPoint2Emr()

```ts
static androidPoint2Emr(point: Point, pageSize: { width: number; height: number }): Point;
```

Converts screen pixel coordinates to EMR coordinates.

### PointUtils.emrPoint2Android()

```ts
static emrPoint2Android(point: Point, pageSize: { width: number; height: number }): Point;
```

Converts EMR coordinates to screen pixel coordinates.

---

## NEW APIs Not In Existing sn-plugin-lib Source Code

The following methods appear in the official documentation but are **NOT present** in the current sn-plugin-lib source code in this repository. They represent new or unreleased API additions:

### 1. PluginCommAPI.recognizeElements()
- **Purpose:** Handwriting-to-text recognition
- **Signature:** `static recognizeElements(elements: Object[] | null | undefined, size: { width: number; height: number }): Promise<APIResponse<string>>`
- **Impact:** Enables plugins to perform OCR/handwriting recognition on strokes and text boxes

### 2. PluginCommAPI.cancelRecognize()
- **Purpose:** Cancel an ongoing recognition task
- **Signature:** `static cancelRecognize(): Promise<APIResponse<boolean>>`

### 3. PluginCommAPI.getPenInfo()
- **Purpose:** Get current pen type, color, and width from the device
- **Signature:** `static getPenInfo(): Promise<APIResponse<PenInfo>>`
- **Impact:** Enables plugins to read the user's current pen settings

### 4. PluginCommAPI.lassoElements()
- **Purpose:** Programmatically create a lasso selection
- **Signature:** `static lassoElements(rect: Rect): Promise<APIResponse<boolean>>`
- **Impact:** Plugins can create lasso selections without user interaction

### 5. PluginCommAPI.resizeLassoRect()
- **Purpose:** Resize an existing lasso selection rectangle
- **Signature:** `static resizeLassoRect(rect: Rect): Promise<APIResponse<boolean>>`

### 6. PluginFileAPI.deleteElements()
- **Purpose:** Delete specific elements from a note page by index
- **Signature:** `static deleteElements(NOTEPath: string, page: number, numsInPage: number[]): Promise<APIResponse<boolean>>`
- **Impact:** Enables programmatic element removal from note files

### Methods in docs but already in source (with possibly updated signatures):
- `getFileMachineType`, `getNoteType`, `getPageSize`, `generateMarkThumbnails`, `clearMarkElements`, `generateNoteTemplatePng` -- these exist in the source code already
