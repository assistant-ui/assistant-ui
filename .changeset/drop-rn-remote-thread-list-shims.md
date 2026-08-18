---
"@assistant-ui/react-native": patch
---

chore: drop two unreachable re-export shims from react-native

`src/runtimes/RemoteThreadListHookInstanceManager.tsx` and
`src/runtimes/RemoteThreadListThreadListRuntimeCore.tsx` each re-exported one
symbol from `@assistant-ui/core/react`, but nothing imported them, they were
absent from `src/index.ts` and `src/internal.ts`, and the `"."`/`"./internal"`
exports map made them unreachable to consumers. The public API surface is
unchanged.
