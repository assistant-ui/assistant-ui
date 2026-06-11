---
"@assistant-ui/tap": patch
---

fix: match React semantics: support render-phase updates (setState during render re-renders before committing, capped at 25 passes, instead of throwing; discarded render attempts drop their render-phase dispatches like React; updating a resource other than the one currently rendering throws), apply dispatches exactly once across React-discarded and replayed renders of tap sub-roots, run all effect cleanups before any setups within a commit, and compare only the common prefix of deps arrays that change length (with a dev warning)
