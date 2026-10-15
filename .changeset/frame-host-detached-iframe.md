---
"@assistant-ui/react": patch
---

`useAssistantFrameHost` disposes the host when its iframe is removed from the page, so the frame's tools leave the model context and its pending calls reject right away, and it serves a new iframe mounted into the same ref.
