---
"@assistant-ui/react-ag-ui": patch
---

Tool UIs on the AG-UI runtime now receive partially parsed `args` while a tool call's arguments are streaming, instead of an empty object until the argument JSON closes. The aggregator feeds each `TOOL_CALL_ARGS` delta into the shared incremental JSON object parser, so tool UIs that render from their arguments (generative UI, forms, long text fields) build up progressively, matching the AI SDK runtime.
