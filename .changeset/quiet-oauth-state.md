---
"@assistant-ui/react-mcp": patch
---

Scope persisted OAuth tokens and client registrations to their originating client. Credentials stored by earlier versions carry no client identity, so they are dropped on first load and every existing OAuth connection re-authenticates once.
