---
"generative-frame": patch
---

feat: a rendered UI can tell the model what the user chose. Specs gain the built-in actions `sendMessage` and `updateModelContext` (validated in every catalog, documented when `catalog.prompt({ hostApi })` says the host handles them, and reserved in `defineCatalog`), widget guidance documents `genframe.updateModelContext` behind `hostApi.modelContext`, and the assistant-ui toolkits handle both: what a UI shares goes into the system prompt of later requests, marked as data and capped at 4,000 characters, and is saved with the call's state so it survives a reload. `sendMessage` runs only from a user's event, never from `watch`.
