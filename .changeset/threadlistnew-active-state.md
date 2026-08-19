---
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

fix: expose the active state of ThreadListNew on react-native and react-ink

The web primitive marks itself with `data-active` and `aria-current` while the new thread is the current one, but the native and terminal versions only wired the action. Both now read the same state. React Native sets `accessibilityState.selected`, the closest native equivalent to `aria-current`, which callers can still override. Function children receive `isActive` alongside the platform Pressable state (`pressed` on React Native, `isFocused` and `disabled` on ink).
