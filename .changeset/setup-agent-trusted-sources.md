---
"setup-agent": minor
"assistant-ui": patch
---

fix: a link holds one setup, so a later `checkout/create` is refused, and a product added from the browser keeps its guide only on the setup's own guide origin. `npx setup-agent <url>` accepts only the official setup server or one on this machine (`runSetupCommand` takes `servers` for an embedding CLI), and `--setup-app-url` only the official setup page. A coding agent the CLI starts runs from its absolute path, skipping `PATH` entries a project could plant a binary in.
