---
"@assistant-ui/react-google-adk": patch
---

feat: `threads.reloadMainThread()` refetches an ADK session in place

The ADK runtime never registered `onRefetchThread`, so `reloadMainThread()` fell back to remounting the runtime hook and discarded unsent composer input. It now refetches in place, matching `react-langgraph`: the runtime is reused, the draft survives, and messages stay rendered while the fresh session loads.

`load` gains a second argument carrying an abort signal, and returns the per-turn state the session events imply alongside the messages, so a refetch swaps the thread over in one commit instead of blanking a tool confirmation before the replacement arrives. Both are additive; a `load` that ignores the argument and returns only `{ messages }` behaves as before.

Where this diverges from `react-langgraph`, and why: a refetch that lands while a run is in flight, or after one has touched the thread, defers to the run rather than merging into it. Langgraph reconciles the two by message id, which relies on the server preserving the id the client sent. ADK assigns its own event ids, so an optimistic message cannot be correlated with the one the session stored for it, and a merge would duplicate it.
