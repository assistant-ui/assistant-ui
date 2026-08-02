---
"@assistant-ui/react-langgraph": patch
---

fix: make `cancelRun` a hard stop. the abort signal is handed to the caller's `stream`, so a callback that does not check it kept feeding chunks into the thread after cancellation; the consume loop now stops on its own.
