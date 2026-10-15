---
"generative-frame": patch
---

fix: `useSpecStream`'s `reset` now restarts a followed `source` from the current `initial` in React and Vue, so a `render_spec` call whose title completes after its patches renders them onto the earlier spec with that title at once.
