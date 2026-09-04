---
"@assistant-ui/core": patch
---

fix: preserve a manual thread rename that lands while automatic title generation is in flight. the rename is reasserted through the adapter once the generated run has persisted its own title, so the typed title survives on the server as well as in the list.
