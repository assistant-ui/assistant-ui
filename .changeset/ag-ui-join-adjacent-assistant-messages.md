---
"@assistant-ui/react-ag-ui": patch
---

Add an opt-in `joinAdjacentAssistantMessages` option to `fromAgUiMessages` and `useAgUiRuntime`. It joins adjacent assistant records into one message, with a user message as the only turn boundary, for backends whose history gives each record of a turn an id of its own.
