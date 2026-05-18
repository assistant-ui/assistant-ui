---
"@assistant-ui/core": patch
---

fix(core): fire `streamCall` for already-resolved tool calls observed after the initial snapshot, and promote in-progress tool calls from the initial snapshot once they change. Previously the runtime silently skipped `streamCall` whenever a tool-call part arrived already-resolved (history reload, thread switch, mid-run resume, PTC sub-call surfacing), forcing fragile render-effect fallbacks. `execute` stays suppressed for these cases so side effects don't double-run.

Also collapses the per-tool-call ref soup inside `useToolInvocations` into a single discriminated `ToolCallEntry` map keyed by logical tool-call id, with execution-lifecycle bookkeeping tracked separately by physical stream id. Removes `ignoredToolIds`, `lastToolStates`, `toolCallIdAliasesRef` identity entries, the parallel `restoredSignaturesRef`/`preResolvedToolCallIdsRef`/`startedExecutionToolCallIdsRef` sets, and the early-return that suppressed `streamCall` for already-resolved tool calls. `reset()` semantics are unchanged; integrators that already call `reset()` on history reload don't need to change.
