---
"@assistant-ui/react": patch
---

a server rendered message's `data-message-id` now switches to the client runtime's id once hydration finishes, so selection quotes reference a message the client knows
