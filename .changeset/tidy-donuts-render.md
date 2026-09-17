---
"@assistant-ui/core": patch
---

fix: render numeric and nested-array generative UI children

`GenerativeUINode` now also accepts `number` and `readonly GenerativeUINode[]`. Code that narrows the union exhaustively needs cases for the new members; component `children` remains a `readonly GenerativeUINode[]`.
