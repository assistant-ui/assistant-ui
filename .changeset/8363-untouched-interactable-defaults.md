---
"@assistant-ui/core": patch
---

fix(core): leave an interactable that is still on its `initialState` out of persistence saves and `exportState()`, so a changed `initialState` reaches users who never edited it
