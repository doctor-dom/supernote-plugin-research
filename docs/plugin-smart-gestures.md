# Smart Gestures — Inline Editing & Markup Overlay Plugin

> Two modes: **Realtime Mode** silently watches pen strokes for editing gestures while you write. **Markup Mode** opens a full overlay with multi-finger gesture support for adding metadata, tags, and annotations to existing content.

## The problem

The Supernote's two-finger tap switches between erase and lasso, but pens without a side button have no way to quickly toggle modes. You have to navigate menus. This breaks writing flow for simple edits — scratch out a word, circle something to move it, draw a line through a sentence.

## Two modes, one plugin

### Realtime Mode (inline, no UI)

Runs silently while you write. Registers with `showType: 0` — no plugin UI opens. The plugin listens for `event_pen_up`, analyzes each stroke's point data, and if it matches a known editing gesture, performs the action and deletes the gesture stroke. Normal handwriting passes through untouched.

**You never leave writing mode.** The gestures are things you'd naturally do when editing on paper.

### Markup Mode (overlay, full gesture support)

Tap the plugin's toolbar button to enter markup mode. The plugin renders the current page as an image background. Now `TouchView` is active — the plugin can distinguish pen from finger, detect multi-finger taps, swipes, and complex gestures. This is for adding metadata: tagging sections as tasks, marking importance, categorizing content for sync.

Write everything first. Mark it up after.

---

## Realtime Mode

### How it works

```
You write normally
        │
    pen lifts
        │
        ▼
Plugin receives event_pen_up
        │
        ▼
getLastElement() → stroke point data
        │
        ▼
classifyGesture(points)
        │
   ┌────┴────────────────────┐
   │                         │
 'writing'              gesture detected
   │                         │
   ▼                         ▼
 do nothing          execute action
                     delete gesture stroke
                     (ink disappears)
```

### Critical requirement: detecting "on top of existing content"

A scratch-out only makes sense if it's drawn **over existing writing**. A line through empty space is just a line. The plugin needs to know what's underneath the gesture.

**How this works with the SDK:**

Every element on the page has spatial data. Stroke elements have point coordinates accessible via `stroke.points`. The plugin can compute bounding boxes for every existing element on the page. When a gesture stroke is detected, it checks spatial overlap:

```typescript
// On plugin init (or on page change), build a spatial index of existing elements
async function buildPageIndex(notePath: string, page: number): Promise<ElementIndex> {
  const elements = await PluginFileAPI.getElements(page, notePath);
  const index: ElementIndex = { elements: [], boxes: [] };

  for (const el of elements.result) {
    if (el.type === Element.TYPE_STROKE && el.stroke) {
      // Get bounding box from the element's maxX/maxY and contour data
      // Element has: maxX, maxY fields
      // For precise bounds: read stroke.points to get actual coordinate range
      const pointCount = await el.stroke.points.size();
      const points = await el.stroke.points.getRange(0, pointCount);
      const bbox = computeBoundingBox(points);
      index.elements.push(el);
      index.boxes.push(bbox);
    }
  }
  return index;
}

// Check what existing elements a gesture overlaps with
function findOverlapping(gestureBbox: Rect, pageIndex: ElementIndex): Element[] {
  return pageIndex.elements.filter((el, i) =>
    rectsOverlap(gestureBbox, pageIndex.boxes[i])
  );
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left &&
         a.top < b.bottom && a.bottom > b.top;
}
```

**The granularity question: characters vs. words vs. strokes**

The SDK operates at the **stroke** level, not the character or word level. Each stroke is one continuous pen-down-to-pen-up motion. A single letter might be 1-3 strokes. A word is typically 1 stroke (cursive) or 3-8 strokes (print).

So when you scratch out over a region:

- The plugin finds all **stroke elements** whose bounding boxes overlap the scratch-out zone
- Those strokes are removed as whole units
- You don't get character-level precision — you get stroke-level precision

In practice this works well for handwriting because:
- Cursive: one word = one stroke. Scratch over it, the whole word goes.
- Print: letters are small strokes close together. A scratch-out that covers a word covers all its letter strokes.
- Whole paragraph: a big scratch-out covers many strokes. They all go.

For finer control (erase just one letter in a word written in one continuous stroke), you'd need the lasso gesture instead — the native lasso tool can split strokes at a boundary.

### Gesture vocabulary

#### 1. Scratch-out (zigzag) → Erase

```
    /\/\/\/\/\
    \/\/\/\/\/     drawn over existing text
```

**Detection:** High X-direction reversal count relative to bounding box width. Handwriting rarely has more than 2-3 reversals per word-width. A scratch-out has 5+.

**Must be on top of content.** A zigzag in empty space is ignored (treated as writing — maybe a decorative line).

**Action:** Find all stroke elements overlapping the scratch-out's bounding box. Remove them via `replaceElements()` (get all page elements, filter out overlapping ones + the gesture itself, replace). Call `PluginNoteAPI.saveCurrentNote()` to persist.

```typescript
async function handleScratchOut(gestureElement: Element, gesturePoints: Point[]) {
  const gestureBbox = computeBoundingBox(gesturePoints);
  const page = (await PluginCommAPI.getCurrentPageNum()).result;
  const notePath = (await PluginCommAPI.getCurrentFilePath()).result;

  // Find what's underneath
  const overlapping = findOverlapping(gestureBbox, pageIndex);

  if (overlapping.length === 0) {
    // Nothing underneath — this is just handwriting, not a gesture
    return;
  }

  // Get ALL elements on the page
  const allElements = (await PluginFileAPI.getElements(page, notePath)).result;

  // Filter out: overlapping targets + the gesture stroke itself
  const toRemove = new Set([
    ...overlapping.map(el => el.numInPage),
    gestureElement.numInPage,
  ]);

  const remaining = allElements.filter(el => !toRemove.has(el.numInPage));

  // Replace page contents with the filtered list
  await PluginFileAPI.replaceElements(notePath, page, remaining);
  await PluginNoteAPI.saveCurrentNote();

  // Rebuild the spatial index
  pageIndex = await buildPageIndex(notePath, page);
}
```

#### 2. Strikethrough (single horizontal line) → Erase

```
    ──────────────     drawn through a line of text
```

**Detection:** Low reversal count (0-1), high width-to-height ratio (>5:1), relatively straight. Must overlap existing content.

**Advantage over scratch-out:** Easier to draw, more precise. A horizontal line through a sentence erases that sentence. The bounding box is narrow vertically, so it only hits strokes on that line — not the line above or below.

**Action:** Same as scratch-out — find overlapping strokes, remove them.

```typescript
function isStrikethrough(points: Point[], overlapping: Element[]): boolean {
  if (overlapping.length === 0) return false; // must be on content

  const bbox = computeBoundingBox(points);
  const aspectRatio = (bbox.right - bbox.left) / (bbox.bottom - bbox.top);
  const reversals = countXReversals(points);

  // Wide, flat, straight, and on top of content
  return aspectRatio > 5 && reversals <= 1 && points.length > 5;
}
```

#### 3. Circle / Loop → Lasso (select and move)

```
     ╭───────╮
     │       │     drawn around content
     ╰───────╯
```

**Detection:** Start and end points close together (closed shape). Path length much longer than start-to-end distance. Must enclose existing content.

**Action:** Compute the bounding rect of the circled area. Call `lassoElements(rect)` to activate the native lasso on that region. Delete the circle stroke. The lasso UI takes over — user can move/resize the selection natively.

```typescript
async function handleCircleLasso(gestureElement: Element, gesturePoints: Point[]) {
  const bbox = computeBoundingBox(gesturePoints);
  const page = (await PluginCommAPI.getCurrentPageNum()).result;
  const notePath = (await PluginCommAPI.getCurrentFilePath()).result;

  // Check that the circle encloses content
  const enclosed = findEnclosed(bbox, pageIndex);
  if (enclosed.length === 0) return; // empty circle — treat as handwriting

  // Remove the circle gesture stroke first
  const allElements = (await PluginFileAPI.getElements(page, notePath)).result;
  const remaining = allElements.filter(el => el.numInPage !== gestureElement.numInPage);
  await PluginFileAPI.replaceElements(notePath, page, remaining);
  await PluginNoteAPI.saveCurrentNote();

  // Activate native lasso on the enclosed region
  await PluginCommAPI.setLassoBoxState(0); // 0 = show lasso
  await PluginCommAPI.updateLassoRect(bbox);

  // Rebuild index
  pageIndex = await buildPageIndex(notePath, page);
}
```

#### 4. Rectangle → Lasso (select region)

```
    ┌─────────┐
    │         │     drawn around content
    └─────────┘
```

**Detection:** Similar to circle (closed shape), but with 3-4 distinct direction changes forming corners. More precise selection boundary than a circle.

**Action:** Same as circle — compute bounding rect, activate lasso.

**Distinguishing circle from rectangle:** Not critical — both trigger lasso. The bounding rect is what matters for the selection area. Can treat them as the same gesture class: "closed shape around content."

#### 5. Caret / Arrow (^) → Insert space

```
         ^
        / \        drawn between lines of text
```

**Detection:** Two strokes meeting at an apex, or a single V/caret shape. Located between existing content vertically.

**Action:** This is a stretch goal. Would need to programmatically move strokes below the caret down to create space. Possible via reading all elements, adjusting Y coordinates for those below the insertion point, and writing back with `replaceElements()`. Complex but doable.

#### 6. Potential future gestures

| Gesture | Shape | Action | Complexity |
|---|---|---|---|
| **Underline** | Straight line below text | Highlight / mark important | Medium — needs "below content" detection |
| **Bracket** | `[` or `{` in margin | Group content as a section | Medium — margin detection |
| **Arrow** | `→` between elements | Create a link between content | Hard — arrow direction detection |
| **Question mark** | `?` in margin | Flag for review | Medium — character recognition |
| **Checkmark** | `✓` next to content | Mark as done / task complete | Medium — shape matching |

### Gesture classification system

```typescript
interface GestureClassification {
  type: 'scratchout' | 'strikethrough' | 'circle' | 'rectangle' | 'caret' | 'writing';
  confidence: number;  // 0-1
  bbox: Rect;
  overlapping: Element[];  // existing content under/around the gesture
}

function classifyGesture(
  points: Point[],
  pageIndex: ElementIndex,
): GestureClassification {
  if (points.length < 3) return { type: 'writing', confidence: 1, bbox: null, overlapping: [] };

  const bbox = computeBoundingBox(points);
  const overlapping = findOverlapping(bbox, pageIndex);
  const enclosed = findEnclosed(bbox, pageIndex);

  const width = bbox.right - bbox.left;
  const height = bbox.bottom - bbox.top;
  const aspectRatio = width / Math.max(height, 1);
  const reversals = countXReversals(points);
  const pathLength = totalPathLength(points);
  const startEndDist = distance(points[0], points[points.length - 1]);
  const closedness = startEndDist / Math.max(pathLength, 1);

  // SCRATCH-OUT: many reversals, over existing content
  if (reversals >= 5 && overlapping.length > 0 && height / width < 0.6) {
    return {
      type: 'scratchout',
      confidence: Math.min(reversals / 8, 1),
      bbox, overlapping,
    };
  }

  // STRIKETHROUGH: straight horizontal line, over existing content
  if (aspectRatio > 5 && reversals <= 1 && overlapping.length > 0) {
    return {
      type: 'strikethrough',
      confidence: Math.min(aspectRatio / 10, 1),
      bbox, overlapping,
    };
  }

  // CIRCLE/RECTANGLE: closed shape enclosing content
  if (closedness < 0.15 && enclosed.length > 0 && points.length > 10) {
    // Distinguish circle from rectangle by corner detection
    const corners = countCorners(points);
    return {
      type: corners >= 3 ? 'rectangle' : 'circle',
      confidence: 1 - closedness,
      bbox, overlapping: enclosed,
    };
  }

  return { type: 'writing', confidence: 1, bbox, overlapping: [] };
}
```

### Handling false positives

The biggest risk: the plugin eats a stroke that was actually handwriting. Safeguards:

1. **Must overlap existing content.** A zigzag in empty space is always treated as writing. A circle with nothing inside is writing. This single rule eliminates most false positives.

2. **Confidence threshold.** Only act on gestures with confidence > 0.7. Ambiguous strokes are left alone.

3. **Undo support.** Before performing any destructive action, save the pre-action state. If the user immediately draws another scratch-out in the same spot (nothing to overlap now), interpret it as "undo" and restore the deleted elements.

4. **Visual feedback.** After deleting strokes, briefly flash the affected area (if the SDK supports visual feedback — needs testing). At minimum, the deletion happening instantly is feedback enough.

5. **Toggle off.** The plugin should have a quick way to disable realtime mode. A `showType: 0` button tap could toggle it — first tap enables gesture detection, second tap disables it. A small sidebar indicator shows the current state.

### Performance considerations

The plugin runs `getLastElement()` on every pen-up. Is this fast enough?

| Operation | Expected latency | Notes |
|---|---|---|
| `getLastElement()` | ~10-50ms | Single element fetch from native cache |
| Read stroke points (`getRange`) | ~10-50ms | Points are in native cache |
| `classifyGesture()` | <1ms | Pure math on point arrays |
| Spatial overlap check | <1ms | Bounding box comparisons |
| `replaceElements()` (on delete) | ~50-200ms | Rewrites page element list |
| `saveCurrentNote()` | ~100-500ms | Disk write |
| **Total (non-gesture)** | **~20-100ms** | Unnoticeable — just classification, no action |
| **Total (gesture + delete)** | **~200-800ms** | Brief pause while content is removed |

The key number: **20-100ms per pen-up for strokes that are just handwriting.** That's invisible to the user. The heavier operations only run when a gesture is actually detected.

**Building the page index** (`buildPageIndex`) is more expensive — reading all elements and their point data. This should run once when the plugin initializes (or when the page changes), then update incrementally as gestures add/remove elements.

---

## Markup Mode

### The workflow

```
1. WRITE (normal Supernote, realtime gestures active for quick edits)
        │
2. TAP PLUGIN BUTTON (toolbar sidebar)
        │
        ▼
3. MARKUP MODE OPENS
   ┌─────────────────────────────────────────┐
   │  Smart Gestures — Markup Mode     [Done] │
   ├─────────────────────────────────────────┤
   │                                           │
   │  ┌─────────────────────────────────────┐ │
   │  │                                     │ │
   │  │  [Page image rendered as background]│ │
   │  │                                     │ │
   │  │  Your handwriting is visible here   │ │
   │  │  as a PNG. TouchView overlay on top │ │
   │  │  detects pen and finger gestures.   │ │
   │  │                                     │ │
   │  │  One finger tap = select region     │ │
   │  │  Two finger tap = cycle tag type    │ │
   │  │  Swipe right = mark as task         │ │
   │  │  Pen circle = precise selection     │ │
   │  │                                     │ │
   │  └─────────────────────────────────────┘ │
   │                                           │
   │  Active tags: [task] [important] [todo]   │
   │  Selected: "discussed the Q2 timeline..." │
   │                                           │
   │  Actions:                                 │
   │  [Tag as Task] [Star] [Link] [Keyword]    │
   │                            [Cancel] [Done] │
   └─────────────────────────────────────────┘
```

### How the overlay works

1. Plugin calls `generateNotePng()` to render the current page
2. Displays the PNG as the background of a React Native view
3. Wraps the view in `TouchViewNativeComponent` to distinguish pen from finger
4. Maps touch coordinates back to page element coordinates
5. Finger gestures select/tag; pen gestures annotate

### Multi-finger gestures (via TouchView + React Native gesture system)

| Gesture | Input | Action |
|---|---|---|
| **One finger tap** on a region | Touch | Select the stroke elements at that position. Show recognized text. |
| **One finger drag** | Touch | Draw a selection rectangle. All enclosed elements are selected. |
| **Two finger tap** on selection | Touch | Cycle through tag types: task → important → reference → clear |
| **Two finger spread** | Touch | Expand selection to include surrounding context (neighboring strokes) |
| **Three finger tap** | Touch | Quick-tag as task (most common action, deserves a shortcut) |
| **Swipe right** on selection | Touch | Mark as action item / task |
| **Swipe left** on selection | Touch | Dismiss / clear tags |
| **Pen tap** on a point | Pen (via TouchView) | Precise element selection (pen is more accurate than finger) |
| **Pen circle** around content | Pen | Precise selection of enclosed elements, with OCR preview |

### Connecting gestures to metadata

When content is selected and tagged in markup mode, the plugin:

1. Runs `recognizeElements()` on the selected strokes → gets text
2. Applies the tag as a keyword via `insertKeyWord(notePath, page, tag)`
3. Optionally inserts a visual indicator on Layer 1 (ghost layer):
   - Small `[T]` icon next to task-tagged content
   - `⭐` via `insertFiveStar()` for important items
   - A colored underline (geometry element) under tagged regions
4. Stores tag metadata in the plugin's local state (for sync pipeline)

```typescript
interface TaggedRegion {
  notePath: string;
  page: number;
  rect: Rect;                    // bounding box of tagged content
  recognizedText: string;        // OCR result
  tags: string[];                // ['task', 'important', etc.]
  elementIds: number[];          // numInPage of the tagged strokes
  timestamp: string;
}

// On tag action in markup mode
async function tagSelection(
  selectedElements: Element[],
  tag: string,
) {
  const page = (await PluginCommAPI.getCurrentPageNum()).result;
  const notePath = (await PluginCommAPI.getCurrentFilePath()).result;

  // Recognize the selected content
  const recognized = await PluginCommAPI.recognizeElements(selectedElements);

  // Apply keyword to the page
  await PluginFileAPI.insertKeyWord(notePath, page, tag);

  // Insert visual indicator on Layer 1
  const bbox = computeBoundingBoxFromElements(selectedElements);
  if (tag === 'task') {
    // Insert a small [T] marker
    await PluginNoteAPI.insertText({
      textContentFull: '[T]',
      textRect: {
        left: bbox.left - 40,
        top: bbox.top,
        right: bbox.left - 5,
        bottom: bbox.top + 25,
      },
      fontSize: 14,
      textBold: 1,
      textAlign: 0,
      textItalics: 0,
      textFrameWidthType: 1,
      textFrameStyle: 0,
      textEditable: 1,
    });
  }

  if (tag === 'important') {
    await PluginCommAPI.insertFiveStar();
  }

  // Store in local tag database
  const taggedRegion: TaggedRegion = {
    notePath, page,
    rect: bbox,
    recognizedText: recognized.result,
    tags: [tag],
    elementIds: selectedElements.map(el => el.numInPage),
    timestamp: new Date().toISOString(),
  };
  await saveTaggedRegion(taggedRegion);
}
```

### Coordinate mapping: touch → page elements

The overlay displays a PNG of the page. Finger/pen touches land on screen coordinates. These need to map back to element coordinates to determine what was touched.

```typescript
// The page PNG is rendered at a known scale
const pageSize = await PluginFileAPI.getPageSize(notePath, page);
// pageSize gives pixel dimensions of the actual page

// The PNG is displayed in a React Native Image component at some screen size
// Calculate the scale factor
const scale = {
  x: pageSize.width / imageDisplayWidth,
  y: pageSize.height / imageDisplayHeight,
};

// On touch event, convert screen coords to page coords
function screenToPage(screenX: number, screenY: number): Point {
  return {
    x: screenX * scale.x,
    y: screenY * scale.y,
  };
}

// Find elements at a touch point
function elementsAtPoint(pagePoint: Point, pageIndex: ElementIndex): Element[] {
  // Find all elements whose bounding box contains the touch point
  // Use a tolerance radius since finger taps are imprecise
  const tolerance = 30; // pixels of page coordinate space
  const touchRect: Rect = {
    left: pagePoint.x - tolerance,
    top: pagePoint.y - tolerance,
    right: pagePoint.x + tolerance,
    bottom: pagePoint.y + tolerance,
  };
  return findOverlapping(touchRect, pageIndex);
}
```

---

## How this feeds the sync pipeline

Tagged regions from markup mode flow directly into NotesBridge sync:

- Regions tagged `task` → extracted as tasks for Todoist sync
- Regions tagged `important` → starred content, highlighted in Obsidian export
- All tags → become keywords → become Obsidian frontmatter tags
- Recognized text from tagged regions → structured data in the Markdown export

The sync pipeline doesn't need to guess what's important — the user has explicitly marked it up.

---

## Button registration

```typescript
// Realtime mode: silent listener, no UI
PluginManager.registerButton(1, ['NOTE'], {
  id: 100,
  name: 'Smart Gestures',
  icon: Image.resolveAssetSource(require('./assets/gesture-icon.png')).uri,
  showType: 0,  // NO UI — toggles realtime gesture detection on/off
});

// Markup mode: full overlay UI
PluginManager.registerButton(1, ['NOTE'], {
  id: 101,
  name: 'Markup',
  icon: Image.resolveAssetSource(require('./assets/markup-icon.png')).uri,
  showType: 1,  // Full-screen plugin UI
  editDataTypes: [0, 1, 2, 3, 4, 5],
});
```

---

## Open questions

1. **Can `showType: 0` receive `event_pen_up` continuously?** The docs say the plugin can "run background logic" without showing UI. If pen_up events fire while the plugin UI is hidden, realtime mode works perfectly. If not, realtime mode would need to be a transparent overlay (if possible) or a different approach entirely. **Needs on-device testing.**

2. **`replaceElements()` while the note is open for writing.** The docs warn: "If APIs like replaceElements operate on the currently opened file, call `saveCurrentNote()` first to avoid data inconsistencies." This means there's a save → replace → the-note-refreshes cycle. How visible is the refresh? Does the screen flash? Does the pen input get interrupted? **Needs on-device testing.**

3. **Page index rebuild cost.** Reading all elements and their point data for a page with 200+ strokes could take 1-2 seconds. This should only happen on page change or after a gesture action, not on every pen-up. But if the user adds strokes between gestures, the index gets stale. Solution: on pen-up, if it's normal writing, just add the new element to the index incrementally via `getLastElement()`.

4. **Coordinate systems.** Element coordinates may be in EMR units (hardware pen digitizer) rather than pixel coordinates. The conversion factor is device-specific (A5X2: 15819x11864, Manta: 21632x16224). The page PNG is in pixel coordinates. Need to verify which coordinate system `stroke.points` uses and whether `getPageSize()` returns EMR or pixel dimensions.

5. **Gesture stroke visibility.** Between pen-up and the plugin deleting the gesture stroke, the user will briefly see their scratch-out/circle as ink on the page. With ~200-800ms total processing time, this should be a barely noticeable flash. But on a slow e-ink refresh, it might linger. Acceptable? **Needs on-device testing.**

6. **Conflict with system two-finger gestures.** The system still handles two-finger tap for erase/lasso toggle. Realtime mode's gestures are single-pen-stroke gestures, so there's no conflict. But users need to understand which gestures are "system" (two-finger) and which are "plugin" (pen shapes).

---

## Implementation plan

### Phase 1: Realtime Mode MVP
1. Register `showType: 0` button, listen for `event_pen_up`
2. Implement `getLastElement()` → point data extraction
3. Build page element spatial index
4. Implement scratch-out detection (zigzag + overlap check)
5. Implement erase action via `replaceElements()`
6. Test false positive rate on actual handwriting samples

### Phase 2: Realtime Mode Full
7. Add strikethrough detection (horizontal line + overlap)
8. Add circle/loop detection (closed shape + enclosed content check)
9. Implement lasso action via `setLassoBoxState()` + `updateLassoRect()`
10. Add undo support (save pre-action state, detect "undo gesture")
11. Add toggle indicator (sidebar icon shows realtime mode on/off)

### Phase 3: Markup Mode MVP
12. Full-screen overlay with page PNG background
13. `TouchView` integration for pen/finger distinction
14. Single-finger tap → element selection with OCR preview
15. Basic tagging: task, important, reference
16. Visual indicators on Layer 1 (text markers, stars)
17. Tag storage in plugin local state

### Phase 4: Markup Mode Full
18. Multi-finger gestures (two-finger cycle, three-finger quick-tag)
19. Drag-to-select (finger draws selection rectangle)
20. Tag database integration with NotesBridge sync pipeline
21. Batch operations: tag all starred content, tag by keyword search
22. Gesture customization: let user remap gestures to actions
