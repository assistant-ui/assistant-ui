---
"setup-agent": patch
---

Fetch the agent's instructions from the setup server. Each command that prints guidance asks `<setup-url>/guide` for the briefing, the stream's messages, the next-command hints and the standard questions, sending its protocol version and what it can do. A fix to that wording or flow now reaches every CLI as soon as the server deploys, without waiting for people to upgrade. The CLI keeps a bundled copy and uses it when the server is unreachable, has no guide, no longer serves its protocol, or sends something it refuses. The guide is data only: text, questions, and steps from a fixed set of local actions (`print`, `print-status`, `announce-agent`). The CLI rejects any other action, unknown placeholders, control characters and redirects. Set `SETUP_AGENT_GUIDE=bundled` to skip the server. The new `setup-agent/guide` export holds the guide builder the setup server serves.
