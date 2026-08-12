---
"@assistant-ui/store": patch
---

fix: scoped event listeners under a derived-only provider filter against the child's own bindings instead of the parent's, in both directions and through scope-less intermediate hosts
