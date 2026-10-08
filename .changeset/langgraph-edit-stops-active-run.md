---
"@assistant-ui/react-langgraph": patch
---

fix(react-langgraph): stop the active run when a message is edited or reloaded, keep the thread running while the checkpoint is looked up, show the edited message during the lookup, and restore the previous thread if Stop cancels an edit or reload before it is sent
