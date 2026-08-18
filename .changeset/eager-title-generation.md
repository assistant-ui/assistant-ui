---
"@assistant-ui/core": patch
---

fix: generate the thread title as soon as the thread exists. the automatic title generation for a new thread fires when initialization resolves, concurrent with the first run, instead of at the first runEnd, so the sidebar stops showing "New Chat" for the whole first response and a thread abandoned mid-run no longer stays untitled forever. the title request carries the messages present at that moment, typically just the user message.
