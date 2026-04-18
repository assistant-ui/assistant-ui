---
"@assistant-ui/react-langgraph": patch
---

fix: tool call status briefly flickers `requires-action` (error icon) before settling on `complete` during LangGraph streaming with subgraphs. The final reconcile now merges the values snapshot with tuple-accumulated state instead of replacing it, so tool results and subgraph-internal messages aren't dropped; metadata survives reconcile; `isRunning` flips to `false` atomically with the final message update (via new `onComplete` callback); and subgraph-level `error` events (pipe-namespaced) no longer mark parent AI messages as incomplete. Pipe-separated subgraph event names (e.g. `messages|tools:call_abc`) are now handled by stripping the namespace before matching.
