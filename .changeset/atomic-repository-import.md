---
"@assistant-ui/core": patch
---

`MessageRepository.import` now leaves the repository unchanged when it throws, for example when a message's parent or the head is missing. Thread `import` and `reset`, and loading history in the local runtime, check the data before clearing the current messages, so a history that cannot be placed no longer empties the thread.
