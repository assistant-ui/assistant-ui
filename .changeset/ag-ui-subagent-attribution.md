---
"@assistant-ui/react-ag-ui": patch
---

feat: model the AG-UI subagent protocol. `SUBAGENT_STARTED` / `SUBAGENT_FINISHED` / `SUBAGENT_ERROR` are parsed instead of falling through to `RAW` and being dropped, `subagentRunId` is read off the events that carry it, and each subagent run is grouped into one nested assistant message attached to its spawning tool call as `ToolCallMessagePart.messages`. a subagent with no reachable spawning call renders in the parent thread rather than being dropped.

behavior change: a subagent's frontend-executed tool call is no longer reachable by `getPendingToolCalls()`, so it does not execute. previously these calls landed in the parent thread and ran, because subagent attribution did not exist. the run now reports `incomplete` / `tool-calls` instead of claiming it finished. see the subagents section of the react-ag-ui README and #6612.
