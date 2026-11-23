---
"assistant-ui": patch
---

`init` scaffolds the chat route on the model provider `--provider` names (`openai`, `anthropic` or `google`), or on the one the project already uses (an `@ai-sdk/*` provider package, or its API key in an `.env` file) instead of always OpenAI, and prints which provider and key it set up. A chat route the project already has is left as it is.
