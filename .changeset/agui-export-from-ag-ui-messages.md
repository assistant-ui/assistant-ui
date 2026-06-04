---
"@assistant-ui/react-ag-ui": patch
---

feat: export `fromAgUiMessages` from the package root

Converting persisted AG-UI messages to assistant-ui messages (e.g. when
restoring a conversation from a `GET /agents/state` endpoint on page load)
previously required reaching into package internals. `fromAgUiMessages` is now
a public export, typed to return `ThreadMessageLike[]` so its output plugs
directly into `ExportedMessageRepository.fromArray` inside a history adapter.
