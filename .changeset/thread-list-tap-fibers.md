---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
---

feat: host remote thread runtimeHooks as keyed tap resources on the list hook. `useRemoteThreadListRuntime` mounts one `useResources` host after each thread's `unstable_Provider`, so the first `runtimeHook` call already sees Provider adapters. AdapterSink only publishes those adapters. `@assistant-ui/store/client` exports `useConfiguredAui` and `useAssistantContextProvider` so that host can extend and provide a client the same way `AuiProvider` does in React.
