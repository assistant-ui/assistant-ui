---
"assistant-ui": patch
---

Run without a terminal by a coding agent the CLI does not detect, `init` and `create` now print the note recommending `npx assistant-ui@latest setup` before they start instead of after they finish, and end with a one-line pointer to it. Inside a setup session or with `--force`, the note is left out.
