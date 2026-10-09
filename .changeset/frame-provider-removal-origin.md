---
"@assistant-ui/core": patch
---

fix: send the update that withdraws a frame's last cross-origin provider to the parent's origin, so the parent drops its tools instead of waiting out the 30 s call timeout
