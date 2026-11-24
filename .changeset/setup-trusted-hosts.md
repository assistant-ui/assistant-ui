---
"setup-agent": patch
"assistant-ui": patch
---

`npx setup-agent <url>` now talks only to the official setup server or one on this machine (`runSetupCommand` takes `servers` for a CLI that embeds setup), and `--setup-app-url` opens only the official setup page or one on this machine. `assistant-ui setup` refuses any other setup server or page before it creates a setup. A coding agent the CLI starts runs from its absolute path, skipping `PATH` entries a project could plant a binary in.
