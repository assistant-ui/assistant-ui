---
"@assistant-ui/react-native": patch
---

fix: announce actionable react-native primitives as buttons

React Native's `Pressable` assigns no accessibility role, so every actionable primitive was announced by VoiceOver and TalkBack as a generic element rather than a button, where the web primitives render a real `<button>`. Each Pressable primitive now defaults `accessibilityRole="button"` ahead of the caller's prop spread, so callers can still override it.
