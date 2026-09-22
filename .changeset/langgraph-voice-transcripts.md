---
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-langchain": patch
---

feat(react-langgraph): keep finalized voice transcripts in the thread and send them to the graph with the next run, which writes them to the thread state; `@assistant-ui/react-langchain/converter` gains `getMessageModality`, which reads the `additional_kwargs.modality` a transcript carries
