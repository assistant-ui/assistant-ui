---
"@assistant-ui/core": patch
---

feat(composer): expose `canSend` state and `isSendDisabled` adapter input

`ComposerState.canSend` (read-only) is now derivable via `useAuiState((s) => s.composer.canSend)` and `<AuiIf condition={(s) => s.composer.canSend}/>`. it reflects whether the composer is in a state where send is permitted; cross-thread gating (`isRunning`, `capabilities.queue`) continues to be layered on top by `useComposerSend`.

`ExternalStoreAdapter.isSendDisabled` is a new optional input alongside `isDisabled`. when `true`, the composer's input remains usable but `send()` becomes a no-op and `canSend` is `false`. use this to gate sending on external React state (e.g. while tool config is loading) without disabling the input itself.

`BaseComposerRuntimeCore.send()` now early-returns when `!canSend`, so the `Cmd/Ctrl+Shift+Enter` steer hotkey, form-`requestSubmit()`, and direct `aui.composer().send()` calls are all gated by the same flag.
