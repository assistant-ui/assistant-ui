---
"assistant-ui": patch
---

chore: remove the `agent` command and the bundled Claude Code plugin. the plugin carried a second, stale copy of the assistant-ui skill; `npx skills add assistant-ui/skills` (offered by `create`) installs the maintained skills.
