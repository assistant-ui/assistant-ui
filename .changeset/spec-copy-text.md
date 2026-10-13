---
"generative-frame": patch
---

feat: specs gain the built-in action `copyText` (`{ text }`), validated in every catalog, documented when `catalog.prompt({ hostApi: { clipboard: true } })` says the host handles it, and reserved in `defineCatalog`. The web build of the assistant-ui spec toolkit writes it to the clipboard with `navigator.clipboard.writeText`, only from a user's event, never from `watch`; the React Native build leaves it out of the guidance.
