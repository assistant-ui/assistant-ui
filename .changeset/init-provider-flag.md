---
"assistant-ui": patch
---

`init --provider anthropic` (or `google`) scaffolds the chat route on that provider, so the project ends with its AI SDK package only and no `@ai-sdk/openai`. Without the flag, `init` scaffolds OpenAI as before. A chat route the project already has is left as it is.
