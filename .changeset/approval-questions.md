---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/ai-sdk": patch
---

a tool approval can ask several questions at once, or let one question take several answers: `display: "questions"` with `approval.questions`, answered through `respondToApproval({ answers })` keyed by question id, validated before it reaches `onRespondToToolApproval` and recorded on `approval.answers`; the AI SDK converter reads `questions` and `answers` from the approval descriptor when a response handler is set, and the cloud format keeps them
