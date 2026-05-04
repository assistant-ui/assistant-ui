---
"@assistant-ui/react": patch
---

perf: cut per-message overhead in long threads

Two `MessagePrimitive.Root` changes remove work that scaled with message count:

- Defer the `parseCssLength` call inside the top-anchor target ref to the next animation frame. The synchronous `getComputedStyle` read previously forced a full-tree layout during the bulk-mount of a long thread (a 335 ms forced reflow at 100 messages in our trace). Deferring past first paint lets the browser do the layout naturally.
- Split the root into a default and a top-anchor path. Threads using the default `turnAnchor="bottom"` no longer subscribe to the top-anchor `useAuiState` selectors per message.

The only observable change is that top-anchor target registration is now async by one frame.

Note: `@assistant-ui/ui` (private, copy-into-project) gains a `content-visibility: auto` default on message wrappers in the same PR. On a cold load with pre-existing history taller than the viewport, the placeholder-based `scrollHeight` can transiently disagree with the at-bottom check until off-screen messages are measured. `useOnResizeContent` resyncs within a frame, and the auto-scroll path uses an explicit "scrolling" flag rather than trusting `isAtBottom` alone, so run-start scrolling is unaffected.
