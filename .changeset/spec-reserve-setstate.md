---
"generative-frame": patch
---

fix: `defineCatalog` rejects a host action named `setState`, as it does the other built-in action names, instead of letting the built-in shadow it in validation and guidance while a handler replaced it at runtime.
