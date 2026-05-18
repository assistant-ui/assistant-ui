---
"assistant-cloud": patch
---

feat(cloud): allow custom `baseUrl` with API key auth. Previously the apiKey config branch hard-coded `https://backend.assistant-api.com`; you can now pass `baseUrl` to point an apiKey-authenticated `AssistantCloud` at a self-hosted or staging backend.
