---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

a long thread can be virtualized per part instead of per message: `createThreadRowsSelector` flattens the thread for `useAuiState` into stable rows (a user message, each top-level part group of an assistant message, a turn end) that keep their identity while tokens stream, and `ThreadPrimitive.Row` renders one row with only the scopes it needs; a turn-end row carries the turn's start time and, once the turn completes, the latest end its messages record, so a turn footer can show how long the agent worked
