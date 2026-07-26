---
"@assistant-ui/x-generative-compiler": patch
---

fix: give namespace-import toolkit spreads a specific compile error pointing at the default-import form

A `defineToolkit({ ... })` spread through a namespace import (`import * as kit from "..."; ...kit.default` or `...kit`) of a generative module used to fall through to the generic unsafe-spread message. It now gets a dedicated callout naming the import style and pointing at the supported default-import form (`import kit from "..."` then `...kit`), since only the default export crosses the build-split boundary.