---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-langchain": patch
---

feat: add an opt-in cache to `convertExternalMessages` so a source message that has not changed keeps its `ThreadMessage` object across calls (`createExternalMessageConversionCache`, exported as `unstable_createExternalMessageConversionCache` from react and react-native); react-langchain uses it for subagent transcripts, so a streamed token no longer rebuilds every message of the nested transcript
