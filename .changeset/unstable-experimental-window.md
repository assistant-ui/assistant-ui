---
"@assistant-ui/ai-sdk": patch
"assistant-stream": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-data-stream": patch
"@assistant-ui/react-generative-ui": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-native": patch
---

docs: give every unstable_ API a dated experimental window

every `unstable_` declaration now carries `@deprecated Experimental since <date>. Not scheduled for removal; the API may change in any release.`, replacing six free-prose wordings for the same idea. the date opens a three month window during which the API will not be removed; extending it is an explicit `, extended <date>` in the same tag.
