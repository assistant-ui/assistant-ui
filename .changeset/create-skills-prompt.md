---
"assistant-ui": patch
---

feat: prompt to add assistant-ui agent skills when creating a project. `npx assistant-ui create` now asks whether to add the agent skills and, on yes, delegates to the `skills` CLI (`skills add assistant-ui/skills`) so it installs into your chosen agent platforms (Claude Code, Cursor, Zed, etc.). Use `--skills` / `--no-skills` to skip the prompt; non-interactive runs default to adding them.
