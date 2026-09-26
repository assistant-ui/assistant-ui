---
"@assistant-ui/react-langgraph": patch
---

fix(react-langgraph): stop the active run when a message is edited or reloaded, keep the thread running while the checkpoint is looked up, show the edited message from the edit on so a Stop during an edit's lookup leaves it on screen unsent, and put the previous answer back when a Stop lands during a reload's lookup
