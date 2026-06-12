---
"@assistant-ui/react-ag-ui": patch
---

fix: do not synthesize RUN_FINISHED when the finalize hook follows a failed run — the error status was overwritten and the run rendered as successful
