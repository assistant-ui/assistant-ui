---
"@assistant-ui/core": patch
---

fix(core): log a failed `ThreadRuntime.append` or `MessageRuntime.reload` with `console.error` instead of letting it surface as an unhandled rejection. Neither call returns its task, so the rejection never reached a caller; a host that sends these failures to an error tracker should catch them inside its own runtime callbacks.
