---
"@assistant-ui/react-langgraph": patch
---

fix: preserve run configuration across interrupt commands and automatic
tool-result resumes, and keep pending tool batches scoped to the run that
emitted them

fix: keep synthesized tool-call IDs collision-free across AI messages

fix: canonicalize pending tool results when a streaming tool call receives its
final ID

fix: preserve pending-tool ownership across loaded message ID materialization,
interrupt interleaving, and graph message removal
