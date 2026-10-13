---
"generative-frame": patch
---

feat: specs gain the built-in action `copyText` (`{ text }`), validated in every catalog, documented when `catalog.prompt({ hostApi: { clipboard: true } })` says the host handles it, and reserved in `defineCatalog`. The web build of the assistant-ui spec toolkit writes it to the clipboard with `navigator.clipboard.writeText`, only from an event a component emits, never from `watch`. The React Native build leaves it out of the guidance unless an app passes `handlers.copyText` and `specPrompt.hostApi.clipboard`.
