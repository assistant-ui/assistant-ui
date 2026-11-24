---
"assistant-ui": patch
---

`setup` run by a coding agent now tells it which model provider to plan on: any provider the project already uses (an AI SDK provider package in `package.json`, or a non-empty provider API key in an `.env` file), which it keeps instead of switching providers. With none found there, the agent keeps a provider the app it installs into uses, and only an app with none gets the default, OpenAI.
