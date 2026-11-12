---
"assistant-ui": patch
---

fix(cli): scope the agent gate's setup session to the folder a command acts on (`--cwd` and the project directory), key it per project, end it when setup exits or two hours after it starts, and tell the agent to pass `--force` when setup cannot record it
