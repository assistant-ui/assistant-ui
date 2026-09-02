---
"@assistant-ui/core": patch
---

fix: never run a frontend tool on a call the provider is about to answer or gate

a tool call whose name matched a registered tool closed its args stream, and therefore executed, as soon as `argsText` parsed. providers that answer or gate a call do so one or more snapshots later, so in that window a frontend `execute` fired on a call the provider was about to take: the AG-UI interrupt protocol carries the outcome only on `RUN_FINISHED`, so the gate landed on a call the client had already run.

closing the args stream now waits until the provider can no longer speak about the call. `unstable_isClientToolCall` decides that per call: a call the adapter reports as client-owned closes as soon as its arguments parse, and a call whose ownership is unknown closes when the run ends. `@assistant-ui/react-google-adk` supplies the predicate and keeps its previous timing; every other runtime defers a frontend tool to the end of the run. `streamCall` still fires once and still streams partial arguments as they arrive, so rendering is unchanged, but a tool that pairs `streamCall` with `execute` (interactables) now commits its authoritative merge when the run settles.
