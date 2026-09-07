---
"@assistant-ui/core": patch
"@assistant-ui/react-ag-ui": patch
---

fix: keep an explicit null parent when a thread appends a message

An explicit `parentId: null` selects a root branch instead of the current tail. This also applies to AG-UI steering and the tap `ExternalThread` client.

On a nonempty `useExternalStoreRuntime` thread, an explicit null parent calls `onEdit` instead of `onNew`. Without `onEdit`, the runtime reports that it cannot edit messages. To append at the current tail, omit `parentId` or pass `undefined`.
