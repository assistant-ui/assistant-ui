---
"@assistant-ui/react-langgraph": patch
---

fix: preserve run configuration across automatic tool-result resumes and keep
pending tool batches scoped to the run that emitted them

fix: keep synthesized tool-call IDs collision-free within an AI message

fix: canonicalize pending tool results when a streaming tool call or its parent
message receives a final ID

fix: preserve pending-tool ownership across loaded message ID materialization,
tool-call ID upgrades, and graph message removal
