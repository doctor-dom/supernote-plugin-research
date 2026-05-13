# SuperTask: Capture Workflow Design

## Problem

The current lasso capture flow has friction and reliability issues:
1. OCR can misread handwriting (`"Testing again"` -> `"i /i"`) with no safeguard
2. The mark applied to handwriting (Title/Header) interferes with Table of Contents
3. No option to convert handwriting to typed text after capture
4. The workflow is one-size-fits-all with no user configuration

## Current flow

```
Lasso handwriting -> Tap "Add Task" (button 200)
  -> Capture.tsx: OCR via recognizeElements()
  -> setLassoTitle({style: 1})  [applies black header -- TO BE REPLACED]
  -> Navigate to TaskAdd (pre-filled with OCR text)
  -> User reviews/edits, hits "Add to Todoist"
  -> Task created in Todoist
  -> insertText "T" badge on note
  -> Post-create overlay: Add Another / View Task / Done
```

Problems:
- Title header pollutes TOC
- If OCR is wrong and user doesn't notice, bad task gets created
- No way to convert handwriting to text after the fact
- User must edit OCR text before submission if they want accuracy

## Proposed flow

```
Lasso handwriting -> Tap "Add Task" (button 200)
  -> Capture.tsx: OCR via recognizeElements()
  -> Apply visual mark (stroke link border, no TOC impact)
  -> Navigate to TaskAdd (pre-filled with OCR text)
  -> User reviews/edits, hits "Add to Todoist"
  -> Task created in Todoist
  -> Post-create overlay: Add Another / Mark as Text / View Task / Done
```

Key changes:
1. **Replace setLassoTitle with setLassoStrokeLink** -- visual border without TOC pollution
2. **Add "Mark as Text" post-action** -- converts handwriting region to typed text after task is confirmed
3. **Single workflow, optional post-actions** -- no upfront friction, text conversion is opt-in

## "Mark as Text" feature

### What it does

After a task is created, the user can optionally replace the handwriting on the note page with typed text. This:
- Makes the task scannable as typed text across handwritten notes
- Uses the final task title from TaskAdd (possibly edited from raw OCR), so the text is correct
- Replaces the handwriting in-place at the same position
- Leaves the text lasso'd so the user can immediately resize or edit if needed

### How it works

```
User taps "Mark as Text" on post-create overlay
  -> Delete original handwriting strokes (lasso context still active from capture)
  -> insertText({
       textContentFull: taskTitle,
       textRect: {original handwriting bounds},
       fontSize: 20,      // clean default, user can resize via lasso
       textBold: 1,
       textFrameStyle: 3,  // border
     })
  -> Text replaces handwriting at the same position
  -> Text remains lasso'd for immediate user adjustment
```

### Design decisions

- **Handwriting is deleted, not preserved.** The typed text replaces the handwriting entirely. This is a deliberate conversion, not an annotation. The user chose "Mark as Text" to convert.
- **No font size computation.** Fixed size (18-20px) is clean and readable on e-ink. If the user wants it larger or smaller, the text is left lasso'd so they can adjust immediately using Supernote's native resize.
- **Placement is in-place.** The text goes at the same position as the original handwriting bounds. No "below" or "overlay" decision needed -- it's a replacement.
- **Content is the final task title.** Whatever the user submitted to Todoist (edited or not) is what appears on the page. This ensures the note text matches the Todoist task.
- **Text is left lasso'd.** After insertion, the text element stays selected so the user can resize, reposition, or edit it before tapping away to confirm. This gives the user final control without adding UI steps.

### Lasso context requirement

"Mark as Text" needs the lasso context to be active in order to delete the original handwriting strokes. This means the lasso context must survive from Capture.tsx through TaskAdd and the post-create overlay.

If lasso context is lost by post-create time:
- We can still insert the typed text (via `insertText`)
- But we can't delete the handwriting (it would overlay)
- In that case, fall back to placing text below the handwriting with a note to the user

This is a key thing to test on-device: does the lasso selection persist while the plugin UI is showing and across screen navigations within the plugin?

## Visual marking strategy

### Replacing setLassoTitle

Instead of the Title header (TOC pollution), use `setLassoStrokeLink`:

```typescript
// In Capture.tsx, after OCR:
await PluginNoteAPI.setLassoStrokeLink({
  destPath: todoistTaskUrl,  // or dashboard note path
  destPage: 0,
  style: 2,      // dashed border
  linkType: 4,   // URL (Todoist task link)
});
```

This gives:
- Dashed border around handwriting (visually distinct)
- No TOC interference
- Todoist URL stored (useful in exports)
- "T" badge still placed via insertText after task creation

### Visual result on note page

```
Before capture:
    Buy groceries        (handwriting, no decoration)

After capture + task creation:
  T |Buy groceries|      (dashed border on handwriting, "T" badge to left)

After "Mark as Text":
  T [Buy groceries]      (typed text replaces handwriting, bordered, lasso'd for editing)
```

## Configuration

### Preference: "After creating a task"

Located in Config > Preferences. Controls the post-create overlay options.

| Setting | Behavior |
|---------|----------|
| Prompt (default) | Shows overlay with Add Another / Mark as Text / View Task / Done |
| Auto-close | Creates task and closes plugin (current "auto-back" behavior) |

### Future preference: "Mark text automatically"

| Setting | Behavior |
|---------|----------|
| Off (default) | User chooses "Mark as Text" manually |
| On | Automatically converts handwriting to text after every capture |

This is a v2 setting once the basic flow is validated.

## Implementation plan

### Phase 1: Replace title with stroke link (immediate)

1. In Capture.tsx: replace `setLassoTitle({style: 1})` with `setLassoStrokeLink({style: 2, linkType: 4, destPath: todoistUrl})`
   - Problem: we don't have the Todoist URL yet (task not created). Options:
     a. Use a placeholder URL, update later (can't -- no link update API for stroke links after lasso context is gone)
     b. Skip the URL, use `linkType: 1` with a generic destPath (just for the visual border)
     c. Move stroke linking to TaskAdd (but lasso context may be gone)
     d. Use `setLassoStrokeLink` in Capture with a generic note link, accept that the URL won't match
   - **Best option**: Call `setLassoStrokeLink` in Capture.tsx with a placeholder. The visual border is the primary value. The link destination is secondary.
   - **Alternative**: If we don't need the link to go anywhere useful, we could set `linkType: 0` and point to the current note/page (self-link). The border still appears.

2. Keep "T" badge via `insertText` in TaskAdd after task creation.

3. Test on-device to verify:
   - `setLassoStrokeLink` works from lasso context (same timing as `setLassoTitle`)
   - Dashed border is visible on e-ink
   - No TOC interference

### Phase 2: Add "Mark as Text" post-action

1. Add "Mark as Text" button to post-create overlay in TaskAdd (between View Task and Done).
2. On tap:
   a. Delete original handwriting strokes (requires lasso context -- test if still active)
   b. Call `insertText` with the final task title at the original handwriting bounds, fontSize 20, bold, bordered
   c. Text remains lasso'd for user to resize/edit
3. If lasso context is gone (can't delete strokes), fall back to inserting text below handwriting with a message.
4. Update overlay to show confirmation ("Converted to text"), then return to remaining options.

### Phase 3: Test and iterate

1. Test the full flow on-device -- especially lasso context survival through plugin navigation
2. Verify stroke deletion works from post-create timing
3. Verify inserted text is left in a lasso'd/selected state
4. Add config option if needed

## Edge cases

- **Lasso context lost by post-create time**: Can't delete handwriting strokes. Fall back to placing text below with both visible. Key risk -- needs on-device testing.
- **Very wide handwriting**: Text box at fixed font size may be narrower than original bounds. Use `textFrameWidthType: 1` (auto width) so text box sizes to content, or keep fixed width matching handwriting bounds and let text wrap.
- **Empty OCR / user-typed content**: If OCR failed and user typed their own content, "Mark as Text" uses whatever was submitted. This is correct -- the typed text should match the Todoist task.
- **Multiple captures on same area**: Each capture replaces its own handwriting. If "Mark as Text" is used, previous handwriting is gone and replaced with text. If not used, strokes accumulate with borders and badges.
- **User cancels after "Mark as Text"**: Handwriting is already deleted and text inserted. No undo from the plugin. User would need Supernote's native undo (if available) or manually re-write.

## Timing concern: setLassoStrokeLink and the Todoist URL

The fundamental timing issue:
- `setLassoStrokeLink` must be called while lasso context is active (in Capture.tsx)
- The Todoist task URL isn't known until the task is created (in TaskAdd.tsx)
- Once we leave Capture, the lasso context is gone

Options:
1. **Self-link**: Link to current note/page. The border is visual-only. No useful navigation.
2. **Dashboard link**: Link to SuperTask.note (if/when it exists). Requires knowing the target page.
3. **Todoist URL anyway**: Use a generic Todoist URL like `https://todoist.com/app`. Not task-specific but at least points somewhere relevant in exports.
4. **Skip linking, just use the border**: Is there a way to get the visual border without a real link? Probably not -- the SDK requires valid params.

**Recommendation**: Use option 3 for now (generic Todoist URL). The visual border is the real value. If the dashboard concept materializes, switch to option 2.
