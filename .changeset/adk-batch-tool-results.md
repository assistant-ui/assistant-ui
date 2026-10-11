---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): send the answers to one run's long-running tool calls in one request once that run ends, instead of letting a later answer abort an earlier one; answers still held when the run is cancelled, reloaded or switched away from are dropped
