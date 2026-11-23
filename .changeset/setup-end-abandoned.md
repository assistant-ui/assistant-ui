---
"setup-agent": patch
---

A setup whose coding agent's stream has been gone for an hour while its setup page stayed awake (the agent stopped it, or its machine or sandbox went away) now ends as cancelled, with a note to run setup again, instead of staying half-finished. A sleep that silences both the page and the agent does not end it.
