---
"@assistant-ui/core": patch
---

fix: keep a cloud aui/v0 thread loadable when one stored row is malformed. an unreadable part, attachment or nested tool call message is dropped on its own, a row that does not hold a message at all is dropped together with the thread below it, and nesting is bounded so a deeply nested row cannot overflow the stack
