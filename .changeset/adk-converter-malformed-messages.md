---
"@assistant-ui/react-google-adk": patch
---

fix: skip ADK messages, tool calls, and media parts that are missing required fields instead of crashing the thread or rendering broken images and files
