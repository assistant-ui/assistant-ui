---
"assistant-cloud": minor
"@assistant-ui/react": patch
---

Add format parameter support to assistant-cloud client library

- Add optional `format` query parameter to `AssistantCloudThreadMessages.list()` method
- Update cloud history adapter to pass format parameter when loading messages
- Enables backend-level message format conversion when supported by the cloud backend
