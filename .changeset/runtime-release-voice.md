---
"@assistant-ui/core": patch
---

fix: a voice session ends and a pending attachment send is abandoned when the component calling a `useExternalStoreRuntime` that no thread list hosts unmounts, or when a remounted `AssistantRuntimeProvider` replaces a thread list's runtime
