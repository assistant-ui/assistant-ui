---
"@assistant-ui/core": patch
---

fix(core): spoken user turns no longer carry a `status`, which only assistant messages accept, so a host that stores a voice transcript and converts it back through `convertMessage` no longer throws
