# SuperTask: Changelog

> Archive of completed features and resolved bugs. Items move here from `tracker.md` when done.
>
> **Related docs:**
> - Tracker: `docs/tracker.md` -- active features and bugs
> - Design docs: `docs/design-*.md` -- deep dives on specific features
> - Session state: `PROGRESS.md` -- current session handoff notes

## 2026-05-14

### B-002: Convert to Text fails to delete strokes
**Resolution:** Root cause was that `insertText` (T badge) + `saveCurrentNote` during auto-mark killed the original lasso context. The re-lasso attempt using EMR-computed bounds failed (`result: false`, 0 elements). Fixed by deferring all marking until the user chooses Done or Convert to Text, so `deleteLassoElements` operates on the still-active original lasso.

### B-003: T badge position inconsistent
**Resolution:** Replaced EMR-to-pixel coordinate math (~60 lines of stroke point sampling) with `getLassoRect()`, which returns exact pixel bounds of the active lasso selection. T badge now consistently positioned relative to the lasso rect.

### Lasso persistence after Done/Convert
**Resolution:** Added `lassoElements(bounds)` re-lasso at the end of both Done and Convert to Text paths. For configON Convert, the link is applied first (which dismisses the lasso), then a second `lassoElements` call re-selects the text. Selection persists after plugin closes so user can reposition.

### Race condition: Done pressed during Convert
**Resolution:** Added `marking` state guard to `handleDone` and disabled Done button during conversion. Prevents duplicate T badges and double link application.
