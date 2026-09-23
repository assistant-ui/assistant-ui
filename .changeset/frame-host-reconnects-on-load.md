---
"@assistant-ui/react": patch
---

fix(react): `useAssistantFrameHost` reconnects when the iframe loads a new document, so a navigated or reloaded frame's old tools disappear and calls waiting on it are rejected
