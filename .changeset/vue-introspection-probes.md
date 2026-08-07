---
"@assistant-ui/store": patch
---

fix: answer Vue reactivity introspection probes (`__v_raw`, `__v_isRef`, `__v_isReactive`, `__v_isReadonly`, `__v_isShallow`, `__v_skip`) on client proxies with undefined instead of an error accessor, so Vue's toRaw/isRef checks and its dev warning formatter no longer throw when a client crosses a Vue boundary
