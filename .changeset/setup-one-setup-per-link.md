---
"setup-agent": patch
"assistant-ui": patch
---

A setup link now holds one setup: a later `checkout/create` is refused with `already-created`, so another link holder can't replace a setup's products, guides or instructions, and a product added from the browser keeps its guide only when it comes from the setup's own guide origin. `wait start` returns at once for a finished or cancelled setup, printing `{"ok":false,"status":"done"}` or `{"ok":false,"status":"cancelled"}`, and the stream (`npx setup-agent <url> stream` and `assistant-ui setup`) stops once the setup closes.
