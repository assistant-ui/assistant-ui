---
"assistant-ui": patch
---

When `init` or `create` runs without a terminal and no coding agent is detected (an agent the CLI does not recognize, CI, or a script), it now prints the note recommending `npx assistant-ui@latest setup` before it starts instead of after it finishes, and ends with a one-line pointer to it. Inside a setup session for the folder it acts on, or with `--force`, the note is left out.
