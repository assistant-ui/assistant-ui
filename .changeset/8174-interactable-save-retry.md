---
"@assistant-ui/core": patch
---

fix(core): retry a failed interactable save on the next requested save or `flush()`, and clear its error once any later snapshot saves it
