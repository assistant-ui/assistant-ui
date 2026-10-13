---
"generative-frame": patch
---

feat: a rendered UI can tell the model what the user chose. Specs gain the built-in actions `sendMessage` and `updateModelContext` (validated in every catalog, documented when `catalog.prompt({ hostApi })` says the host handles them, and reserved in `defineCatalog`), widget guidance documents `genframe.updateModelContext` behind `hostApi.modelContext`, and the assistant-ui toolkits handle both: what a UI shares goes into the system prompt of later requests as a labeled line of at most 4,000 characters and is recorded on the call so it survives a reload.
