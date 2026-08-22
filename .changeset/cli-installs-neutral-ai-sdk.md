---
"assistant-ui": patch
---

chore: install `@assistant-ui/ai-sdk` instead of `@assistant-ui/react-ai-sdk`

the AI SDK and edge install helpers now add the framework-neutral package. an import of the previous name still installs that package, since the two are separate npm packages and the neutral one would not make the old import resolvable. `assistant-ui info` reports both names while users are split across them.
