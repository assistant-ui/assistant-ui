---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/core": patch
"@assistant-ui/store": patch
---

fix(store): cancel in-flight work when the React host that owns it unmounts

a React-hosted client now carries a permanent teardown signal, so unmounting an `AuiProvider`, a `useAui(config)` host, or a `useRemoteThreadListRuntime` host cancels the requests it owned instead of leaving them streaming into a deleted tree. a hidden `<Activity>`, a Strict Mode replay, and a re-suspended boundary are soft and keep streaming.
