---
"@assistant-ui/react-ag-ui": patch
---

feat(react-ag-ui): surface AG-UI interrupt-aware run lifecycle

`event-parser` reads the optional `outcome` on `RUN_FINISHED` and forwards both `success` and `interrupt` variants; the subscriber subscribes to `onRunFinishedEvent` (with `onRunFinalized` as a fallback for older servers). `RunAggregator` maps `outcome.type === "interrupt"` to `requires-action` with `reason: "interrupt"` and writes the interrupts to `metadata.custom.agui.interrupts`. `useAgUiRuntime` returns an `AgUiAssistantRuntime` augmented with `unstable_getPendingInterrupts` and `unstable_submitInterruptResponses`; the latter validates coverage and expiry on the client, then issues a fresh run with `RunAgentInput.resume` populated. the runtime state snapshot is also synced onto the agent before each run so `state` actually reaches the protocol layer.
