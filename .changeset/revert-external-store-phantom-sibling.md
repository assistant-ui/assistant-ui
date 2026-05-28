---
"@assistant-ui/react": patch
---

revert: roll back #4040 (drop phantom siblings on external-store id swap). the `_lastSyncedMessageIds` diff was deleting legitimate sibling branches created by `onEdit` / `onReload` / `switchToBranch`, causing `BranchPicker` to disappear on edits and reloads (#4131). this revert restores the additive sync behavior; the AI SDK v6 mid-stream id swap (#4037) regresses and will be addressed in the AI SDK adapter instead.
