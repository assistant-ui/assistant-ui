---
"@assistant-ui/react-ag-ui": patch
---

fix(react-ag-ui): preserve arrival order of parts in RunAggregator

The aggregator now strictly preserves the order events arrive from the upstream stream. Each `REASONING_START`, `TOOL_CALL_START`, and `TEXT_MESSAGE_END` acts as a boundary that closes the current active part, so consecutive events of the same type are grouped into one part while interleaved events of a different type produce separate parts in chronological order.

Previously, the first reasoning block was always moved before the first text part regardless of arrival order, and multiple reasoning cycles were merged into a single block. Both behaviours have been removed.
