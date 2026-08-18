---
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

fix: expose the active state of ThreadListNew on react-native and react-ink

The web primitive marks itself with `data-active` and `aria-current` while the new thread is the current one, but the native and terminal versions only wired the action, so neither could announce nor style the current control. Both now read the same state and pass `{ isActive }` to render children. React Native additionally sets `accessibilityState.selected`, the closest native equivalent to `aria-current`, which callers can still override.
