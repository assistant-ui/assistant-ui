---
"@assistant-ui/store": patch
---

fix: report proxy properties as configurable so `Object.keys`, spread, and `Object.getOwnPropertyDescriptor` on clients and the proxied assistant state no longer throw the proxy invariant TypeError
