---
"@assistant-ui/react-langgraph": patch
---

feat: expose subgraph (namespaced) events to `useLangGraphRuntime` / `useLangGraphMessages` callers. `onMessageChunk` now receives a `namespace` field in `tupleMetadata` for pipe-namespaced `messages|<subgraph>` events, and three new `eventHandlers` are available: `onSubgraphValues(namespace, values)`, `onSubgraphUpdates(namespace, updates)`, and `onSubgraphError(namespace, error)`. Previously `values|<ns>` and `updates|<ns>` events were silently dropped, and `error|<ns>` events could not be attributed to a specific subgraph. Fully additive: top-level `onValues` / `onUpdates` / `onError` behaviour is unchanged (including the existing guarantee that subgraph errors do not mark the parent message as incomplete).
