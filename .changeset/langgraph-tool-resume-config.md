---
"@assistant-ui/react-langgraph": patch
---

fix: preserve run configuration across interrupt commands and automatic
tool-result resumes, and keep pending tool batches scoped to the run that
emitted them
