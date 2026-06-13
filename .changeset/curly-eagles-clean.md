---
"@assistant-ui/core": patch
---

fix: keep interactable instance ids reserved for update tool targeting

A top-level `id` field in an interactable `stateSchema` no longer overrides the update tool's instance `id` parameter.
