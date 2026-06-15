---
"@assistant-ui/react": patch
---

feat: add `unstable_useLiveCompletionAdapter` for async trigger completions

bridges an async completion source (a server search, a gateway RPC) into the synchronous `Unstable_TriggerAdapter`. `search` returns cached items synchronously and schedules a debounced fetch with stale-request cancellation; when results land the adapter re-creates so the popover re-renders. also adds an `isLoading` prop on `ComposerPrimitive.Unstable_TriggerPopover` (surfaced on the popover scope) so async sources can render a loading state.
