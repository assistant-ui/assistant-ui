---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): send messages, tool answers and HITL replies made in the same tick in one request instead of letting the later send abort the earlier one before its request leaves
