---
"@assistant-ui/react-langchain": patch
---

feat(react-langchain): keep finalized voice transcripts in the thread and send them to the graph with the next run, which writes them to the thread state; an edit or regenerate after them forks from before them and sends them again
