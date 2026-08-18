---
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

fix: let Pressable wrapper primitives accept the platform render-function children

The wrapper prop types intersected the underlying `PressableProps["children"]` with `ReactNode`, which made the render-function branch unassignable. Ink consumers can now read `isFocused` and React Native consumers can now read `pressed` from function children, which the underlying `Pressable` already supported at runtime.
