---
"@assistant-ui/react-ink": patch
---

fix(react-ink): guard `Pressable`'s `onPress` against the `disabled` prop independently of `isFocused`, so `disabled` reliably blocks key presses even when focus state and the prop disagree.
