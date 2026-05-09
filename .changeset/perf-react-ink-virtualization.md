---
"@assistant-ui/react-ink": patch
---

perf: Virtualize message list and memoize per-message render in long ink threads

`ThreadPrimitive.Messages` now accepts optional `windowSize` / `windowOverscan`. When set, the live render region keeps the last `windowSize + windowOverscan` messages; older ones graduate through Ink's `<Static>` into terminal scrollback. Each rendered message is wrapped in a memoized boundary keyed by `(index, render)`, so streaming a single message no longer reconciles the full list. Defaults preserve legacy behavior; negative values clamp to 0.
