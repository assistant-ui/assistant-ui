---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: add localStorage persistence support and thread list reload

- Wire `createLocalStorageAdapter` into `useLocalRuntime` via `storage` option
- Export `createLocalStorageAdapter`, `AsyncStorageLike`, `TitleGenerationAdapter` publicly
- Add `reload()` method to `ThreadListRuntime` for re-fetching thread list
- Add optional `metadata` field to `RemoteThreadMetadata` and `ThreadListItemState`
