---
"@assistant-ui/react-ag-ui": patch
---

fix: accept explicitly undefined optional fields on the message-like input of `toAgUiMessages`, so the messages `fromAgUiMessages` returns can be passed straight back under `exactOptionalPropertyTypes`
