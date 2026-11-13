---
"@assistant-ui/react-ag-ui": patch
---

`resumeRun` without a `stream` follows the run in flight through the history adapter's `resume()` or the agent's `connect()`, instead of starting the agent again. It starts a new run only when the agent has no `connect()` and the adapter has no `resume()`.
