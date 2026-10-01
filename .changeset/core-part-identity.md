---
"@assistant-ui/core": patch
---

preserve message part state by host-supplied identity across renderers and store lookups, and carry part identity through cloud persistence; a part whose type changes at the same position now mounts fresh state.
