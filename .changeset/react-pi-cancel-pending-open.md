---
"@assistant-ui/react-pi": patch
---

fix(react-pi): cancel a send while its session is still opening

Pressing Stop immediately after sending, while a cold Pi session was still opening, returned success but launched the prompt anyway. `cancelRun` only aborted a live session record, and during a cold open the thread lives in `pendingOpens` with no record yet, so the cancel no-opped and the prompt fired once the open resolved. `sendMessage` now carries a per-send cancellation token that `cancelRun` flips, so a cancel during startup skips the prompt without disposing the opened session.
