---
"@assistant-ui/react-ag-ui": patch
---

fix(react-ag-ui): keep reasoning across the AG-UI round trip

`toAgUiMessages` dropped every reasoning part when building the run input: `extractText` reads text parts only, so an imported reasoning-only assistant message was discarded as an empty turn and a live assistant message silently lost its reasoning. Reloading a thread and sending one more message deleted the reasoning history from what the agent received. Reasoning parts now leave as standalone `reasoning` records the same way they arrive, and a `ReasoningMessage` carrying `encryptedValue` keeps it at `providerMetadata.agui.encryptedValue` so signed reasoning can be replayed.
