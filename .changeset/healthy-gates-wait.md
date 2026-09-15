---
"@assistant-ui/react-google-adk": patch
---

fix: keep unanswered long-running tool calls in `useAdkLongRunningToolIds` across sends, so answering one gate no longer lets the next text message auto-cancel the others. `AdkEventAccumulator` takes the pending ids to seed as an optional second constructor argument.
