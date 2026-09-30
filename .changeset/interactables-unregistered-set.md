---
"@assistant-ui/core": patch
---

fix(core): ignore an interactable setState for an id that is not registered, so a later load still restores its stored value
