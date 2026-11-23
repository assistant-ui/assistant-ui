---
"setup-agent": patch
---

A setup whose coding agent's stream has been gone for an hour (the agent stopped it, or its machine or sandbox went away) now ends as cancelled on the next heartbeat from the setup page or an agent, with a note to run setup again, instead of staying half-finished.
