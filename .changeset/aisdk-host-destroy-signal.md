---
"@assistant-ui/store": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/core": patch
---

fix: stop in-flight AI SDK streams when their React host unmounts

Behavior change: unmounting a React-hosted client (`AuiProvider`, `useAui`, `useChatRuntime`) now cancels its in-flight runs, the same way `createAssistantClient().destroy()` does. Before, the request kept streaming after the tree was gone. Strict Mode replays, hidden `<Activity>` trees, and re-suspended boundaries are not unmounts and do not fire the signal. On the `useChatRuntime` path each thread owns its destroy signal, so a thread whose runtime is torn down cancels its run without waiting for the host: deleting it, detaching it, dropping it from a replaced thread list, or restarting its runtime.
