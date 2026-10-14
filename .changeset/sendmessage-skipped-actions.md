---
"generative-frame": patch
---

fix: the assistant-ui spec toolkits fail a `sendMessage` that a `watch` dispatches or whose `text` is empty, as `copyText` does, so an action list stops there instead of confirming a message that was never sent.
