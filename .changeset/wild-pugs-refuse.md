---
"@assistant-ui/react-ag-ui": patch
---

fix: keep reasoning, and its signature, across the AG-UI round trip. `toAgUiMessages` built the run input from `extractText`, which reads text parts only, so an imported reasoning-only assistant message was discarded as a blank turn and a live assistant message silently lost its reasoning; reloading a thread and sending one more message deleted the reasoning history from what the agent received. Reasoning parts now leave as the standalone `reasoning` records they arrived as. The runtime also consumes `REASONING_ENCRYPTED_VALUE` and stores the blob at `providerMetadata.agui.encryptedValue`, so reasoning from a live run and from an imported `ReasoningMessage` are both re-emitted with their signature intact rather than replayed unsigned.
