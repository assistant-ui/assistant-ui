---
"@assistant-ui/react-artifact-runtime": patch
---

fix: recover the host origin from `location.ancestorOrigins` and a host handshake so the React
artifact runtime can post `aui:artifact:status` when served from a `blob:` document (the shim's
`?origin=` query string is otherwise lost). Fixes the never-resolving artifact status.
