---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
---

Expose `allPropsStatus` from `useToolArgsStatus` to distinguish incomplete argument objects from completed arguments while a tool is still running.

Mark settled AI SDK tool input as complete while execution continues. This also lets `propStatus` report received fields as complete, rather than streaming, once the input is final.

Settled AI SDK `args` are re-parsed from `part.input`, carry enumerable parser metadata, and no longer retain the `part.input` object identity.
