---
"@assistant-ui/core": patch
---

fix: seed the tracked error-message ids from the message repository, so a core created over a repository a previous core synthesized an error into evicts that error once the host stops sending it, instead of leaving it behind as a sibling branch
