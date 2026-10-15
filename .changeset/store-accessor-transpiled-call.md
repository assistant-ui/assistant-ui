---
"@assistant-ui/store": patch
---

fix: a client accessor called through `call`, `apply` or `bind` resolves its client like a direct call, so an optional call such as `clientRef.current?.threads?.()` no longer throws `_b.call is not a function` once a bundler lowers optional chaining (Vite 6's default build target does).
