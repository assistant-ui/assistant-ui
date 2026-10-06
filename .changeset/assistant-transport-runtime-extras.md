---
"@assistant-ui/core": patch
---

assistant transport hooks used outside `useAssistantTransportRuntime` now throw the shared wrong-runtime error ("The current thread is not backed by the useAssistantTransportRuntime runtime.") instead of their own message, as the adapter runtimes do
