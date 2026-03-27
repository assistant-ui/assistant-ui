---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: add useToolArgsStatus hook for per-prop streaming status

Add a convenience hook that derives per-property streaming completion status from tool call args using structural partial JSON analysis.
