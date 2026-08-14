---
"@assistant-ui/store": patch
---

feat: hoist the shared binding utilities to the client entry. createClientFacade (stable client facade over a source) and createLastValidCache/createStaleReporter (by-index shrink guard with an injectable expiry scheduler) were duplicated per framework bridge; they now live on @assistant-ui/store/client so bridges cannot drift.
