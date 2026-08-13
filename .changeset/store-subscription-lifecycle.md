---
"@assistant-ui/store": patch
---

feat: subscription-owned lifecycle for createAssistantClient. the handle now rides tap's mountOnSubscribe: scopes render lazily on first read, mount when the first subscriber attaches, and soft unmount one task after the last subscriber releases (effects clean up, state is retained, a later subscriber remounts the same scopes). state updates before the first subscriber throw; an imperative consumer without a reactive framework holds a no-op subscription. destroy() remains as an immediate, permanent teardown.
