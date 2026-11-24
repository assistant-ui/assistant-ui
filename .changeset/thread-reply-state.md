---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

Adds `useThreadReplyState()` for a thread whose last message is the user's and that this tab is not running. It reads `"in-progress"` while another tab's fresh Assistant Cloud run lease answers that message, and `"interrupted"` once none does. The Assistant Cloud run tracker reads the thread's run from message lists, re-reads a thread another tab is answering until its reply shows or its run goes quiet, and keeps the state per runtime, so two providers on the same thread do not share it.
