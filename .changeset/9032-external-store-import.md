---
"@assistant-ui/core": patch
---

`thread.import()` on an external store without an `onImport` handler now throws instead of changing the runtime repository without updating the store. To load a branch tree, pass it as `messageRepository` or implement `onImport` to write imported messages back to your store.
