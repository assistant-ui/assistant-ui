---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat(core): add `reload()` method on `ThreadListRuntime` and `aui.threads()` that re-invokes the remote adapter's `list()` and refreshes the thread list. Use this after asynchronous auth (e.g. OIDC, better-auth) completes to recover from an initial load that ran before the authenticated user was available. A generation counter ensures a mid-flight response from a superseded load cannot overwrite a newer reload's state.
