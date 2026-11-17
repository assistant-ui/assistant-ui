---
"@assistant-ui/react-ag-ui": patch
---

fix: set `isRunning` to false at `RUN_FINISHED` instead of when the response closes, so a server that keeps the stream open for cleanup no longer leaves the composer disabled and Stop visible
