---
"@assistant-ui/core": patch
"@assistant-ui/react-a2a": patch
"@assistant-ui/react-data-stream": patch
"@assistant-ui/react-google-adk": patch
---

fix: let cancellation interrupt asynchronous request preparation, keep later resolver failures out of `onError`, and reuse the shared abort-race behavior in the A2A and Google ADK adapters
