---
date: 2026-01-27T12:00:00-08:00
researcher: Claude
git_commit: db4578be969e67728a9f9313469c91846e082873
branch: agent-ui-mvp
repository: agent-ui-simple
topic: "Sub-agent event handling in agent-dashboard-mvp"
tags: [research, codebase, sub-agents, claude-agent-sdk, task-controller, event-stream]
status: complete
last_updated: 2026-01-27
last_updated_by: Claude
---

# Research: Sub-Agent Event Handling in agent-dashboard-mvp

**Date**: 2026-01-27T12:00:00-08:00
**Researcher**: Claude
**Git Commit**: db4578be969e67728a9f9313469c91846e082873
**Branch**: agent-ui-mvp
**Repository**: agent-ui-simple

## Research Question

Verify this observation: "The task has been running for 1m 20s with 4 agents showing. The worker agents show 0 events which suggests the SDK may be processing sub-agents internally but we're not receiving their individual event streams. This could be a limitation in how the TaskController processes sub-agent events."

## Summary

The observation is **partially correct**. Sub-agent events ARE included in the main SDK stream via `parent_tool_use_id`, and the TaskController does track and route them. However, there is a **critical limitation**: the `canUseTool` callback only fires for the main agent's tool calls, not for sub-agent tool calls. This means:

1. Sub-agent text/reasoning events flow through correctly
2. Sub-agent `tool_use` blocks are detected and attributed properly
3. But sub-agent **tool approval requests** are NOT surfaced - the SDK handles sub-agent tool execution internally

This explains why "worker agents show 0 events" - if the UI is primarily showing approval-related events, sub-agents won't have any because their tool calls bypass the approval mechanism.

## Detailed Findings

### SDK Event Architecture

The Claude Agent SDK (`@anthropic-ai/claude-agent-sdk` v0.2.19) uses a unified event stream with hierarchy indicated by `parent_tool_use_id`:

**Key message types with hierarchy support:**
- `SDKAssistantMessage` - `parent_tool_use_id: string | null`
- `SDKPartialAssistantMessage` (streaming) - `parent_tool_use_id: string | null`
- `SDKToolProgressMessage` - `parent_tool_use_id: string | null`
- `SDKUserMessage` (tool results) - `parent_tool_use_id: string | null`

**Sub-agent specific events:**
- `SDKTaskNotificationMessage` (type: 'system', subtype: 'task_notification') - for background task completion
- Hook events: `SubagentStart`, `SubagentStop` - lifecycle notifications

### TaskController Implementation

**What works correctly:**

1. **Sub-agent detection** (`TaskController.ts:274-293`):
```typescript
if (block.name === "Task") {
  const childAgentId = `agent_${nanoid()}`;
  this.toolUseToAgent.set(block.id, childAgentId);
  this.pushEvent({
    type: "agent_spawned",
    agentId: childAgentId,
    data: { name: input.description, parentAgentId: agentId },
  });
}
```

2. **Message routing** (`TaskController.ts:214-218`):
```typescript
const parentToolUseId = message.parent_tool_use_id;
const agentId = parentToolUseId
  ? this.toolUseToAgent.get(parentToolUseId) || this.mainAgentId
  : this.mainAgentId;
```

3. **Sub-agent completion** (`TaskController.ts:233-246`):
```typescript
if (message.subtype === "task_notification") {
  this.pushEvent({
    type: "agent_completed",
    agentId: message.task_id || agentId,
    data: { status: message.status, summary: message.summary },
  });
}
```

**The limitation - canUseTool only fires for main agent:**

```typescript
// TaskController.ts:125-171
const agentId = `agent_${nanoid()}`; // Main agent ID captured here

// ... later in query() options:
canUseTool: async (toolName, input) => {
  this.pushEvent({
    type: "tool_use_requested",
    agentId,  // <-- ALWAYS the main agent's ID, never a sub-agent
    // ...
  });
}
```

The `canUseTool` callback is set at the top-level `query()` call. The SDK invokes it only for the root agent's tool calls, not for sub-agent tool calls.

### Event Flow

```
[Claude Agent SDK]
       ↓
[TaskController.processSDKMessage()] -- converts raw SDK → SDKEvent
       ↓                               -- routes by parent_tool_use_id
[TaskController.eventQueue] -- all events queued
       ↓
[SSE stream/route.ts] -- no filtering, forwards all
       ↓
[HttpAgentClient.streamEvents()] -- parses SSE
       ↓
[processSDKEvent()] -- converts SDKEvent → AgentEvent
       ↓              -- some event types filtered out
[TaskState.agents[].events] -- stored per-agent
       ↓
[EventStream component] -- displays tool_call, tool_result, reasoning, message, error
```

### Events That Are Filtered/Not Displayed

The converter (`converters.ts`) doesn't create `AgentEvent` for:
- `task_started`, `task_completed` - only update task status
- `agent_spawned`, `agent_completed` - only update agent state
- `tool_use_approved`, `tool_use_denied` - only resolve approval
- `tool_progress` - explicitly skipped
- `cost_update` - only updates cost fields
- `system_init` - not handled

### Why Sub-Agents Appear to Have 0 Events

1. **Streaming text events** (`message_delta`) from sub-agents are processed but may not display prominently
2. **Tool calls** from sub-agents ARE detected via `tool_use` blocks, but...
3. **Tool approval requests** (`tool_use_requested`) are NEVER emitted for sub-agents
4. If the UI emphasizes approval workflow, sub-agents will show 0 events

## Code References

- `examples/agent-dashboard-mvp/app/api/agent/TaskController.ts:22-25` - Sub-agent tracking maps
- `examples/agent-dashboard-mvp/app/api/agent/TaskController.ts:125-171` - canUseTool callback (main agent only)
- `examples/agent-dashboard-mvp/app/api/agent/TaskController.ts:213-218` - Message routing by parent_tool_use_id
- `examples/agent-dashboard-mvp/app/api/agent/TaskController.ts:274-293` - Sub-agent spawning detection
- `packages/react-agent/src/sdk/converters.ts:65-79` - agent_spawned processing
- `examples/agent-dashboard-mvp/components/AgentHierarchyView.tsx` - Hierarchy visualization

## Architecture Insights

1. **Single stream, multiple agents**: The SDK design uses one async generator for all events, with `parent_tool_use_id` for hierarchy
2. **Approval is root-only**: The `canUseTool` API is designed for the top-level agent, not nested agents
3. **Sub-agents inherit permissions**: Once a task is approved, sub-agents execute with those permissions

## Open Questions

1. **Is there an SDK option for nested tool approval?** Could the SDK be configured to surface sub-agent tool calls to `canUseTool`?
2. **Should sub-agent tool calls be auto-approved?** Current behavior implies yes, but should the UI reflect this?
3. **How to display sub-agent activity?** Consider showing `message_delta` or `tool_use` events rather than just approval events

## Recommendations

1. **For accurate event display**: Ensure the EventStream shows `tool_use` events (which sub-agents DO emit) not just `tool_use_requested` (which they don't)

2. **For UI clarity**: Add visual indicator that sub-agents run with inherited permissions, so "0 events" doesn't appear as a bug

3. **For future enhancement**: Investigate if SDK hooks (`SubagentStart`, `SubagentStop`) could be used to emit custom events for sub-agent lifecycle visibility
