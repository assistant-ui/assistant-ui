---
"@assistant-ui/core": patch
---

Expose `allPropsStatus` from `useToolArgsStatus` to distinguish incomplete argument objects from completed arguments while a tool is still running.

Read `argsText` when argument objects have no parser metadata, including AI SDK tool calls whose input is available while execution continues.
