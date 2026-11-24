---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

Adds `ThreadPrimitive.Resume`, which answers a thread whose last message is the user's once `useThreadReplyState()` reads `"interrupted"`: it runs from that message, so the answer is its first reply and no branch is left. `ActionBarPrimitive.Resume` and `useActionBarResume` are deprecated; they stay enabled only for an empty stale reply that an earlier client stored. The default `Thread` shows "Generating in another tab" or an interrupted bar with Resume at its end, and a stale reply with content shows Regenerate instead of Resume.
