---
"@assistant-ui/react-pi": patch
---

fix(react-pi): cancel a send while its session is still opening

Pressing Stop immediately after sending, while a cold Pi session was still opening, returned success but launched the prompt anyway and left the thread spinning with an un-sent message. `cancelRun` only aborted a live session record, and during a cold open the thread lives in `pendingOpens` with no record yet, so the cancel no-opped. `sendMessage` now tracks each in-flight send's cancellation and `cancelRun` flips every send sharing the cold open; a cancelled send rejects rather than resolving silently, so the caller rolls back its optimistic message and clears the run instead of firing the prompt.
