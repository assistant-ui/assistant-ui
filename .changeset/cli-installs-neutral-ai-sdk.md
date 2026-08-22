---
"assistant-ui": patch
---

chore: install `@assistant-ui/ai-sdk` instead of `@assistant-ui/react-ai-sdk`

the AI SDK and edge install helpers now add the framework-neutral package. both helpers still detect the old import name and treat an existing `@assistant-ui/react-ai-sdk` install as satisfying the requirement, so a project already on the old name is left alone rather than gaining a duplicate. `assistant-ui info` reports both names while users are split across them.
