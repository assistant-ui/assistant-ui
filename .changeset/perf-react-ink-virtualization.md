---
"@assistant-ui/react-ink": patch
---

perf: virtualized message list and diff-aware reconciler for long ink threads

Two internal changes that drop per-frame work in long ink threads. No public
API change — all new knobs are optional and backward-compatible.

- `ThreadPrimitive.Messages` now accepts `windowSize` / `windowOverscan`. When
  set, only the most recent `windowSize + windowOverscan` messages stay
  mounted and subscribed; older messages remain in the terminal scrollback
  but no longer contribute to per-token reconciliation. Defaults preserve
  legacy behavior (render all).
- Each rendered message is wrapped in a memoized boundary keyed by `(index,
  render)`. Re-renders triggered by streaming a single message no longer
  walk every other message's subtree. With a stable render callback, this
  collapses an O(n) reconcile per token into O(1).

Microbenchmark (`benchmarks/long-thread.bench.tsx`, 1000 messages, ~10 s of
streaming at 62 tokens/sec, three runs each):

| metric        | baseline | windowed (50) | delta |
|---------------|----------|---------------|-------|
| frames        | ~600     | ~600          | flat  |
| mean ms/frame | ~17      | ~17           | flat  |
| peak ms/frame | ~78      | ~22           | -71%  |

Peak frame time is the user-visible "stutter" metric; cutting it ~3.5× is
what eliminates the flicker reported in adjacent ink-on-terminal projects.
