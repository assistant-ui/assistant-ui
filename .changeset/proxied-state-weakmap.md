---
"@assistant-ui/store": patch
---

useAuiState: derive the assistant state proxy from the client via a WeakMap so hand-built clients no longer yield an undefined selector argument
