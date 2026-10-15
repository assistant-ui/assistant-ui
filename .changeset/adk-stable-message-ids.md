---
"@assistant-ui/react-google-adk": patch
---

A message keeps the same id while it streams, across continuation runs, and after the session reloads. Assistant message ids follow the ADK invocation, so assistant messages loaded from an existing session get new ids once. A user message keeps the id it was sent with when the server stores the run's custom metadata.
