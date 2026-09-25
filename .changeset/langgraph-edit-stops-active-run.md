---
"@assistant-ui/react-langgraph": patch
---

fix(react-langgraph): stop the active run when a message is edited or reloaded, keep the thread running while the checkpoint is looked up, and show the edited message from the edit on, so a Stop during the lookup leaves it on screen unsent
