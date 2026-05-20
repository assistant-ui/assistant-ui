---
"@assistant-ui/react-ag-ui": patch
---

fix: support multiple reasoning blocks per run in RunAggregator

Models that emit multiple REASONING_START/REASONING_END cycles (e.g. one per LLM sub-call when tool results trigger re-evaluation) now produce separate reasoning parts interleaved with tool-call and text parts in chronological order, rather than having all reasoning content merged into a single block at position 0.
