---
"assistant-ui": patch
---

`setup` run by a coding agent now tells it which model provider to plan on: the one the project already uses (an AI SDK provider package in `package.json`, or the provider's API key in an `.env` file), which it keeps instead of switching providers. Only a project with no provider gets the default, OpenAI.
