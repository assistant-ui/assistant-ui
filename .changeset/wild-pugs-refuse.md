---
"@assistant-ui/react-ag-ui": patch
---

fix: keep reasoning across the AG-UI round trip. `toAgUiMessages` built the run input from `extractText`, which reads text parts only, so an imported reasoning-only assistant message was discarded as a blank turn and a live assistant message silently lost its reasoning; reloading a thread and sending one more message deleted the reasoning history from what the agent received. Reasoning parts now leave as the standalone `reasoning` records they arrived as, and a `ReasoningMessage` carrying `encryptedValue` keeps it at `providerMetadata.agui.encryptedValue` so a provider that signs its reasoning can replay it.
