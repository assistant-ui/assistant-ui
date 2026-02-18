---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat(core): introduce @assistant-ui/core package

Extract framework-agnostic core from @assistant-ui/react. Replace React ComponentType references with framework-agnostic types and decouple AssistantToolProps/AssistantInstructionsConfig from React hook files.
