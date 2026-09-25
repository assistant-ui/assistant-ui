---
"@assistant-ui/core": patch
"assistant-stream": patch
---

fix: a message sent while a local run is paused ends the pause instead of stranding it: open approvals record `resolution: "cancelled"`, the paused message settles as cancelled, and a result added to it later no longer resumes the run and drops the turns after it; `toGenericMessages` closes out the calls of an earlier or settled message as not completed
