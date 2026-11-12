---
"assistant-ui": patch
---

`assistant-ui setup` now runs the setup's stream itself, so agents run one long-running command in the background instead of a separate `npx setup-agent … stream`. It opens the browser only when the setup needs the user (a question, the plan, the finish), opens it again for the next question if the user closed it, and never opens two tabs within 30 seconds; the agent can then ask in its own chat and answer with `npx assistant-ui@latest setup <url> answer …`. The other setup commands run as `npx assistant-ui@latest setup <url> <command>`.
