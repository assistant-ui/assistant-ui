---
"@assistant-ui/core": patch
---

refactor: share the interactable persistence scheduler between the tap client and the legacy surface.
a save that settles after its interactable unregistered no longer recreates the removed persistence-status entry.
