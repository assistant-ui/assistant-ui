---
"@assistant-ui/react": patch
---

perf: cut per-message overhead in long threads

Two changes to `MessagePrimitive.Root` that remove work that scaled with message count:

- Defer the `parseCssLength` call inside the top-anchor target ref to the next animation frame. The synchronous `getComputedStyle` read used to force a full-tree layout during the bulk-mount of a long thread (observed as a 335 ms forced reflow at 100 messages); deferring past first paint lets the browser do that layout naturally.
- Split the root into a default and a top-anchor path. Threads using the default `turnAnchor="bottom"` no longer subscribe to the top-anchor `useAuiState` selectors per message, eliminating O(messages × 2) selector evaluations on every state change.

Behavior is unchanged. Top-turn anchoring still works the same way; the only observable difference is that the anchor target registration is now async (one frame).
