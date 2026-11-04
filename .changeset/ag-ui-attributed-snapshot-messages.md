---
"@assistant-ui/react-ag-ui": patch
---

Render subagent messages that a `MESSAGES_SNAPSHOT` tags with `subagentRunId` once, nested under the tool call that `SUBAGENT_STARTED` announced for the run in the same session, instead of a second time in the parent thread.
