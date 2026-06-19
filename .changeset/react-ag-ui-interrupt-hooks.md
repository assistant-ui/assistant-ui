---
"@assistant-ui/react-ag-ui": patch
---

feat(react-ag-ui): expose pending interrupts through the shared createRuntimeExtras + hooks.ts surface (`useAgUiInterrupts`, `useAgUiSubmitInterruptResponses`); the equivalent `unstable_getPendingInterrupts` / `unstable_submitInterruptResponses` runtime methods are now deprecated but keep working
