---
"@assistant-ui/core": patch
"@assistant-ui/react-ag-ui": patch
---

fix: keep an explicit null parent when a thread appends a message

An explicit `parentId: null` selects a root branch instead of the current tail. This also applies to AG-UI steering and the tap `ExternalThread` client.

For AG-UI, this includes a normalized `AppendMessage` with `parentId: null` passed to `steerAway` or `useAgUiSteerAway`. Such a message starts a root branch. To continue the current branch, omit `parentId` or pass `undefined`.

On a nonempty `useExternalStoreRuntime` thread, an explicit null parent calls `onEdit` instead of `onNew`. Without `onEdit`, the runtime reports that it cannot edit messages. To append at the current tail, omit `parentId` or pass `undefined`.

The tap `ExternalThread` client instead passes the null parent straight to `onNew`. Its `thread.append` has no `onEdit` route, so the host owns what a root append means there.
