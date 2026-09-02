---
"@assistant-ui/store": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/core": patch
---

fix: stop in-flight AI SDK streams when their React host unmounts

Behavior change: unmounting a React-hosted client (`AuiProvider`, `useAui`, `useChatRuntime`) now cancels its in-flight runs, the same way `createAssistantClient().destroy()` does. Before, the request kept streaming after the tree was gone. Strict Mode replays, hidden `<Activity>` trees, and re-suspended boundaries are not unmounts and do not fire the signal. On the `useChatRuntime` path each thread owns its destroy signal, so deleting a thread cancels its run without waiting for the host.
