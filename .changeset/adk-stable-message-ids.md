---
"@assistant-ui/react-google-adk": patch
---

A message keeps the same id while it streams and after the session reloads. Assistant and user message ids now derive from the ADK invocation when the event carries one, so messages loaded from an existing session get new ids once.
