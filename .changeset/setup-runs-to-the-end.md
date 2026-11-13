---
"setup-agent": patch
---

Keep the coding agent working until the setup is done. The briefing and the stream's `browser.opened` and `input.needed` messages now tell the agent that nothing wakes it once it ends its turn, so it blocks on answers with `wait` instead of stopping to wait for the browser. `wait <input-id>`, `wait plan` and `--wait` return after 100 seconds with `{"ok":false,"status":"waiting","next":"<command>"}` so an agent shell's own time limit does not kill them; `--timeout <seconds>` sets another limit and `0` waits as long as it takes.
