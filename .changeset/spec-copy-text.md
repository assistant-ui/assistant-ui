---
"generative-frame": patch
---

feat: specs gain the built-in action `copyText` (`{ text }`), validated in every catalog, documented when `catalog.prompt({ hostApi: { clipboard: true } })` says the host handles it, and reserved in `defineCatalog`. The assistant-ui spec toolkits for the web and for Vue write it to the clipboard with `navigator.clipboard.writeText`, only from an event a component emits, never from `watch`, and a copy that does not happen fails, so an action after it in the list, such as a confirmation, does not run. The React Native build leaves it out of the guidance unless an app passes `handlers.copyText` and `specPrompt.hostApi.clipboard`.
