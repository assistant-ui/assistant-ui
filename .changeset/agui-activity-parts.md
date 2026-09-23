---
"@assistant-ui/react-ag-ui": patch
---

fix: preserve unrendered activity snapshots as scoped `agui-activity/<type>` data parts across live runs and restored transcripts, keep a2ui surface rebuild operations in `artifact.a2ui`, and persist each run's final agent state on its settled assistant message
