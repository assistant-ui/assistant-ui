---
"@assistant-ui/react-ag-ui": patch
---

fix: keep failed and aborted runs visible. the synthetic RUN_FINISHED from onRunFinalized used to overwrite RUN_ERROR with a successful status, so failed runs rendered as complete and MessagePrimitive.Error never showed. aborts (which @ag-ui/client routes through onRunFailed) now map to RUN_CANCELLED instead of RUN_ERROR, so the run lands as incomplete/cancelled.
