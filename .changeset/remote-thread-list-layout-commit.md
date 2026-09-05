---
"@assistant-ui/store": patch
---

fix: commit hosted tap resources before descendant layout effects

AuiProvider mounts the tap host's commit in the layout phase instead of the passive phase, so a descendant layout effect that calls a client action runs against the render it was mounted with. Previously a `RemoteThreadList` consumer reloading from a layout effect reached the previously committed adapter. The commit now runs before paint; direct `useTapHost` consumers that do not mount `effects` themselves keep the passive fallback.
