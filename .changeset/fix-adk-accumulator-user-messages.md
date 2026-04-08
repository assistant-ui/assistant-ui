---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): render user-authored events as human messages

`AdkEventAccumulator.processEvent` previously routed `author: "user"` events through `getOrCreateAiMessage`, producing `type: "ai"` messages that `convertAdkMessage` mapped to `role: "assistant"` — so user text rendered as assistant bubbles. With Workflow agents this caused full multi-turn conversations to merge into a single assistant block. User events now create `type: "human"` messages, preserving text, inline images, and file references.
