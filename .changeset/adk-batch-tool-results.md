---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): send the answers to one run's long-running tool calls in one request once that run ends, instead of letting a later answer abort an earlier one; answers still held when the run is cancelled or the thread reloads are dropped, and `onError` and `onCustomEvent` now also fire for snake_case events
