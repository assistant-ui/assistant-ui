---
"@assistant-ui/store": patch
---

fix(store): suppress zombie-child throws in `useAuiState`

`useAuiState` now caches the last successful slice and returns it when a
selector throws after the initial render. This is the same pattern
react-redux uses for the zombie-child problem.

Fixes the recurring `tapClientLookup: Index N out of bounds (length: M)`
runtime error reported on thread switches and history reloads (e.g.
issues #3968, #3652). The throw originates in a stale message child
whose selector reads through the proxy into `tapClientLookup.get` after
the parent has already shrunk the indexed list, but before React has
unmounted the child. Returning the previously-observed slice keeps
reconciliation moving so the zombie unmounts cleanly.

The first selector call is never suppressed — real bugs surfaced on the
initial render still propagate.
