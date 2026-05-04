---
"@assistant-ui/react": patch
---

fix(core): restore adapter context flow through RemoteThreadListAdapter.unstable_Provider

PR #3891 hoisted the runtime binder out of `RemoteThreadListAdapter.unstable_Provider` so that user-supplied loading / Suspense wrappers no longer strand the runtime binding. as a side effect, any `RuntimeAdapterProvider` mounted inside `unstable_Provider` (history, attachments — what `useCloudThreadListAdapter` and `LocalStorageThreadListAdapter` both do) ended up below the binder in the render tree. `useRuntimeAdapters()` reads context from above, so the runtime hook saw `null` and `useExternalHistory` early-returned.

for `useChatRuntime({ cloud })` setups this silently disabled message persistence (`POST /v1/threads/:id/messages`), thread history loading, run telemetry (`POST /v1/runs`), and forced cloud attachments to fall back to `vercelAttachmentAdapter`'s base64 inlining. the same regression hits `useA2ARuntime`, `useAgUiRuntime`, and `useLocalRuntime` whenever they are wrapped by `useRemoteThreadListRuntime` with a similar adapter.

restore the pre-#3891 layering: the binder once again renders inside `unstable_Provider`, so the runtime hook reads any context the Provider injects. the `ProviderRenderDetector` warning introduced by #3891 is kept and now fires whenever Provider gates `children` behind suspense, loading state, or `useEffect` (the original #3678 case), pointing the user at the synchronous-children rule. no API surface changes; first-party adapters keep working unchanged.
