---
"@assistant-ui/react-langchain": patch
---

fix: stop reconverting messages and subagent transcripts on custom events that carry no UI update, and keep live UI messages whose events have left the custom channel buffer
