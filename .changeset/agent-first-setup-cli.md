---
"assistant-ui": patch
---

Add `assistant-ui setup`. Run by a coding agent, it starts a guided setup, opens it in the user's browser, and prints the steps the agent follows. Run in a terminal, it asks which coding agent you use and starts it with the setup prompt, or copies the prompt for an agent it cannot start. Help for the CLI, `create` and `init` now opens with a pointer to `setup` when an agent reads it, and `create` and `init` print the same line before they run under an agent.
