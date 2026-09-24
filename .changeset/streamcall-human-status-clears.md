---
"@assistant-ui/core": patch
---

fix(core): clear a tool call's status when a human-input request made from streamCall is resumed or aborted, so the runtime stops reporting it as running or waiting; an execute that keeps running after its request is aborted now shows as executing instead of waiting
