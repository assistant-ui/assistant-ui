---
"@assistant-ui/react-ink": patch
---

perf: virtualized message list and diff-aware reconciler for long ink threads

Two internal changes that drop per-frame work in long ink threads. No public
API change — all new knobs are optional and backward-compatible.

- `ThreadPrimitive.Messages` now accepts `windowSize` / `windowOverscan`. When
  set, only the most recent `windowSize + windowOverscan` messages stay
  mounted and subscribed; messages above the live region graduate into Ink's
  `<Static>`, which writes them to stdout exactly once and lets the terminal
  commit them to scrollback before unmounting the React subtree. Per-token
  reconciliation work is bounded by the window size regardless of thread
  length, while scrolled-past output remains in the terminal backbuffer for
  native scroll. Defaults preserve legacy behavior (render all dynamically).
- Each rendered message is wrapped in a memoized boundary keyed by `(index,
  render)`. Re-renders triggered by streaming a single message no longer
  walk every other message's subtree. With a stable render callback, this
  collapses an O(n) reconcile per token into O(1).

Microbenchmark (`benchmarks/long-thread.bench.tsx`, 1000-message thread,
~5 s of streaming at 62 tokens/sec, append-and-mutate per token, two
trials each, averaged):

| mode          | mean ms/frame | peak ms/frame |
|---------------|---------------|---------------|
| legacy        | 231           | 608           |
| memo only     | 189 (-18%)    | 476 (-22%)    |
| windowed (50) | 110 (-53%)    | 252 (-59%)    |

Memo alone collapses the per-token reconcile cost on unchanged messages.
Windowing layers on top by removing the bulk of the live tree from each
flush. Peak frame time is the user-visible "stutter" metric; cutting it
~2.4× is what eliminates the flicker reported in adjacent ink-on-terminal
projects.
