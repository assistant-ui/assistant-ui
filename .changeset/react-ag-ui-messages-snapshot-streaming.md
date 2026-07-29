---
"@assistant-ui/react-ag-ui": patch
---

fix: recreate the in-flight assistant placeholder when a mid-run MESSAGES_SNAPSHOT evicts it, so TEXT_MESSAGE_CONTENT deltas keep streaming instead of rendering in one shot at RUN_FINISHED