---
"@assistant-ui/generative-ui": patch
---

fix(generative-ui): allow numeric text props in generative UI and convert them to text in Slack and Teams output. A numeric 0 now renders in Alert, Card, and Select text, native Checkbox and Switch labels are announced, and the Teams converter now ignores built-in property names such as `constructor` in `Text.size` and `Alert.tone`.
