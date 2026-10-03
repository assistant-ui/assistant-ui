---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
"assistant-stream": patch
---

Expose `allPropsStatus` from `useToolArgsStatus` to distinguish incomplete argument objects from completed arguments while a tool is still running.

Mark settled AI SDK tool input as complete while execution continues. This also lets `propStatus` report received fields as complete, rather than streaming, once the input is final.

Settled AI SDK `args` are shallow copies of `part.input` with enumerable completion metadata: the top-level object identity changes, while nested values retain their identity. Prototype-named JSON fields remain intact without changing safe parser policy.
