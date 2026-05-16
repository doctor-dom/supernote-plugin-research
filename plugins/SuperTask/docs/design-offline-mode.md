# Design: Offline Mode (F-006)

> Placeholder. Full design TBD.

## Problem

SuperTask requires wifi to create, complete, or fetch tasks from Todoist. The Supernote is frequently used offline (commuting, meetings, travel). Tasks captured offline are lost if the plugin can't reach the API.

## Goals

- Capture tasks offline with full lasso-to-task flow
- Queue creates, completes, and edits locally
- Sync to Todoist automatically when connectivity returns
- Handle conflicts (task modified on both sides)

## Open questions

- How to detect connectivity? `fetch` failure vs proactive check?
- Conflict resolution strategy: last-write-wins, or prompt user?
- How much of the Todoist state to cache locally? (projects, labels, task list)
- Should offline tasks get supertask:// links immediately or on sync?
- Storage: task registry JSON is already on disk. Extend it, or separate queue file?
- UI: how to indicate offline state and pending sync count?

## Related

- Task registry: `src/utils/taskRegistry.js`
- Config persistence: `design-settings.md`
- Todoist API: `src/api/todoist.js`
