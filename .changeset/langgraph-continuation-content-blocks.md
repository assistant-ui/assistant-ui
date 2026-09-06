---
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
---

fix: keep supported content blocks from continuation chunks

Keep earlier reasoning text when summaries arrive. Omit empty reasoning parts and retain provider signatures during chunk accumulation.
