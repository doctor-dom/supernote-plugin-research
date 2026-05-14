# SuperTask: Task Marker Design

> How tasks are visually marked on the note page after capture.
>
> **Related docs:**
> - Tracker: `docs/tracker.md` -- F-001 (inline markers), F-003 (subtask markers)
> - Changelog: `docs/changelog.md` -- resolved marker bugs
> - Linking design: `docs/design-task-linking.md` -- dashed borders, Todoist links

## Problem

Currently the T badge is a separate text element from the handwriting/text it marks. When the user lassos and moves the content, the T badge stays behind. There's no SDK-level grouping mechanism to bind them together.

## Current approach (separate T badge)

- `insertText("T")` as a boxed text element positioned left of the content
- Separate element: doesn't move with content when relocated
- Works for both handwriting (Done path) and typed text (Convert to Text path)
- ConfigON adds a dashed border + Todoist link to the content itself

## Proposed: Inline markers

Embed the marker directly into the text content as a prefix, making it a single element that moves as a unit.

### For Convert to Text (typed text)
Instead of two elements (T badge + text box), insert one text box:
```
T  Test 2
```
or with a separator:
```
T | Test 2
```

**Advantages:**
- Single element, moves together
- No positioning math for the badge
- Naturally scales with font size

**Open questions:**
- Can we style the "T" differently (bold, different size) within a single `insertText` call? The SDK's `textBold` applies to the entire text box.
- Should the marker be visually distinct (boxed, circled) or just a bold prefix?

### For handwriting (Done path, no conversion)
The handwriting is untouched strokes, not a text box. Options:
- Insert a small text element overlapping the top-left corner of the handwriting
- Accept that it's separate (current behavior) since the user chose not to convert
- Use a sticker/icon if the SDK supports it

### Future: Marker types
| Marker | Meaning | Use case |
|--------|---------|----------|
| T | Task | Standard Todoist task |
| ST | Subtask | Child task under a parent (F-003) |
| Custom icon/sticker | Visual marker | If SDK supports sticker insertion |

### Sticker approach (exploration needed)
If the SDK supports inserting stickers or small images inline, a custom icon could replace the text marker entirely. Benefits:
- Visually distinct from user content
- Could use color/shape to indicate status (open, completed)
- Language-independent

**SDK investigation needed:** Check if `insertElements` or similar can place image/sticker elements.
