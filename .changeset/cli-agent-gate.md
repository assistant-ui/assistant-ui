---
"assistant-ui": patch
---

`init`, `create` and `add` now stop when a coding agent runs them outside a setup session, and point it to `npx assistant-ui@latest setup` with exit code 2. `setup` marks its session, so the `init`, `create` and `add` steps it gives the agent still run. Pass `--force` or set `ASSISTANT_UI_ALLOW_AGENT=1` to run them under an agent anyway. People in a terminal and CI without agent markers see no change.
