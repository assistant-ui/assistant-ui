---
"@assistant-ui/core": patch
"@assistant-ui/react-langgraph": patch
---

fix(react-langgraph): gate the streamed `partial_json` carry on the incoming args so a server-side tool-args rewrite or a truncated stream no longer masks the server's args. `mergeStreamedToolCallArgs` carries the prior `partial_json` only when it parses to the same value as the incoming `toolCall.args` (compared with `isJSONValueEqual`); `resolveToolCallArgs` reads `partial_json` first, so a divergent carry previously discarded `chunk.args`. Exposes `isJSONValueEqual` from `@assistant-ui/core/internal`.