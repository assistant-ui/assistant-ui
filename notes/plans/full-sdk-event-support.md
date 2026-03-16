# Full SDK Event Support Implementation Plan

## Overview

Add full `AgentEvent` support for all SDK event types in the react-agent package. Currently, several SDK events only update state without creating visible events in the event stream. This plan adds proper event creation for all SDK event types to provide full Anthropic Agents SDK support.

## Current State Analysis

**Events that currently create `AgentEvent`:**
- `task_failed` → `error`
- `agent_failed` → `error`
- `tool_use_requested` → `tool_call` + creates approval
- `tool_result` → `tool_result`
- `reasoning` → `reasoning`
- `message` → `message`
- `message_delta` → `message`
- `tool_use` → `tool_call`

**Events that only update state (no `AgentEvent` created):**
- `task_started` - updates `TaskState.status`
- `task_completed` - updates `TaskState.status`, `cost`, `completedAt`
- `agent_spawned` - creates new `AgentState`
- `agent_completed` - updates `AgentState.status`, `cost`
- `tool_use_approved` - resolves approval
- `tool_use_denied` - resolves approval
- `tool_progress` - explicitly skipped
- `cost_update` - updates cost fields
- `system_init` - not handled

### Key Discoveries:
- `converters.ts:30-45` - task_started/completed only set taskUpdate
- `converters.ts:65-93` - agent_spawned/completed only set agentUpdate/newAgent
- `converters.ts:150-160` - tool_use_approved/denied only set resolvedApprovalId
- `converters.ts:250-253` - tool_progress explicitly skipped with comment
- `converters.ts:256-271` - cost_update only sets agentUpdate/taskUpdate
- `types.ts:42-47` - AgentEventType only has 5 types: tool_call, tool_result, reasoning, message, error

## Desired End State

All SDK events create corresponding `AgentEvent` objects that appear in the agent's event stream. The `AgentEventType` enum will expand from 5 types to 14 types, matching SDK event semantics.

### Verification:
- All 14 event types defined in `AgentEventType`
- `processSDKEvent()` creates `newEvent` for all SDK event types
- `EventStream` component can render all event types
- Unit tests verify event creation for each type

## What We're NOT Doing

- UI polish or event filtering/collapsing (per user request)
- Changes to TaskController event emission (server-side is complete)
- Changes to SSE streaming infrastructure
- Performance optimizations for high-frequency events

## Implementation Approach

1. Extend `AgentEventType` with all SDK event types
2. Add corresponding event interfaces
3. Update `processSDKEvent()` to create events for all types
4. Update `EventStream` component to display all types

---

## Phase 1: Extend Type Definitions

### Overview
Add new event types and interfaces to `types.ts` to support all SDK events.

### Changes Required:

#### 1. Update AgentEventType
**File**: `packages/react-agent/src/runtime/types.ts`
**Changes**: Extend the union type from 5 to 14 types

```typescript
export type AgentEventType =
  // Existing types
  | "tool_call"
  | "tool_result"
  | "reasoning"
  | "message"
  | "error"
  // New types
  | "task_started"
  | "task_completed"
  | "agent_spawned"
  | "agent_completed"
  | "tool_approved"
  | "tool_denied"
  | "tool_progress"
  | "cost_update"
  | "system_init";
```

#### 2. Add Event Interfaces
**File**: `packages/react-agent/src/runtime/types.ts`
**Changes**: Add interfaces for each new event type after existing interfaces (after line 95)

```typescript
export interface TaskStartedEvent extends AgentEvent {
  type: "task_started";
  content: {
    prompt: string;
  };
}

export interface TaskCompletedEvent extends AgentEvent {
  type: "task_completed";
  content: {
    totalCost?: number;
  };
}

export interface AgentSpawnedEvent extends AgentEvent {
  type: "agent_spawned";
  content: {
    name: string;
    parentAgentId: string | null;
  };
}

export interface AgentCompletedEvent extends AgentEvent {
  type: "agent_completed";
  content: {
    finalCost?: number;
    status?: string;
    summary?: string;
  };
}

export interface ToolApprovedEvent extends AgentEvent {
  type: "tool_approved";
  content: {
    approvalId: string;
    toolCallId?: string;
  };
}

export interface ToolDeniedEvent extends AgentEvent {
  type: "tool_denied";
  content: {
    approvalId: string;
    toolCallId?: string;
  };
}

export interface ToolProgressEvent extends AgentEvent {
  type: "tool_progress";
  content: {
    toolUseId: string;
    toolName: string;
    elapsedSeconds: number;
  };
}

export interface CostUpdateEvent extends AgentEvent {
  type: "cost_update";
  content: {
    cost?: number;
    totalCost?: number;
  };
}

export interface SystemInitEvent extends AgentEvent {
  type: "system_init";
  content: {
    sessionId?: string;
    tools?: string[];
  };
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `pnpm turbo build --filter=@assistant-ui/react-agent`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] New types are exported and accessible to consumers

---

## Phase 2: Update Converter to Create Events

### Overview
Modify `processSDKEvent()` to create `AgentEvent` objects for all SDK event types.

### Changes Required:

#### 1. Update task_started case
**File**: `packages/react-agent/src/sdk/converters.ts`
**Lines**: 30-35

```typescript
case "task_started": {
  const data = event.data as { prompt?: string };
  result.taskUpdate = {
    status: "running",
  };
  // Add event creation
  if (event.agentId) {
    result.newEvent = {
      id: `evt_${nanoid()}`,
      type: "task_started",
      timestamp: event.timestamp,
      content: { prompt: data.prompt ?? "" },
      agentId: event.agentId,
    };
  }
  break;
}
```

#### 2. Update task_completed case
**File**: `packages/react-agent/src/sdk/converters.ts`
**Lines**: 37-45

```typescript
case "task_completed": {
  const data = event.data as { totalCost?: number };
  result.taskUpdate = {
    status: "completed",
    cost: data.totalCost ?? currentState.cost,
    completedAt: new Date(),
  };
  // Add event creation
  if (event.agentId) {
    result.newEvent = {
      id: `evt_${nanoid()}`,
      type: "task_completed",
      timestamp: event.timestamp,
      content: { totalCost: data.totalCost },
      agentId: event.agentId,
    };
  }
  break;
}
```

#### 3. Update agent_spawned case
**File**: `packages/react-agent/src/sdk/converters.ts`
**Lines**: 65-80

```typescript
case "agent_spawned": {
  const data = event.data as { name: string; parentAgentId: string | null };
  if (event.agentId) {
    result.newAgent = {
      id: event.agentId,
      name: data.name,
      status: "running",
      cost: 0,
      events: [],
      parentAgentId: data.parentAgentId,
      childAgentIds: [],
      taskId: event.taskId,
    };
    // Add event creation
    result.newEvent = {
      id: `evt_${nanoid()}`,
      type: "agent_spawned",
      timestamp: event.timestamp,
      content: { name: data.name, parentAgentId: data.parentAgentId },
      agentId: event.agentId,
    };
  }
  break;
}
```

#### 4. Update agent_completed case
**File**: `packages/react-agent/src/sdk/converters.ts`
**Lines**: 82-94

```typescript
case "agent_completed": {
  const data = event.data as { finalCost?: number; status?: string; summary?: string };
  if (event.agentId) {
    result.agentUpdate = {
      id: event.agentId,
      update: {
        status: "completed",
        cost: data.finalCost ?? 0,
      },
    };
    // Add event creation
    result.newEvent = {
      id: `evt_${nanoid()}`,
      type: "agent_completed",
      timestamp: event.timestamp,
      content: { finalCost: data.finalCost, status: data.status, summary: data.summary },
      agentId: event.agentId,
    };
  }
  break;
}
```

#### 5. Update tool_use_approved case
**File**: `packages/react-agent/src/sdk/converters.ts`
**Lines**: 150-154

```typescript
case "tool_use_approved": {
  const data = event.data as { approvalId: string; toolCallId?: string };
  result.resolvedApprovalId = data.approvalId;
  // Add event creation
  if (event.agentId) {
    result.newEvent = {
      id: `evt_${nanoid()}`,
      type: "tool_approved",
      timestamp: event.timestamp,
      content: { approvalId: data.approvalId, toolCallId: data.toolCallId },
      agentId: event.agentId,
    };
  }
  break;
}
```

#### 6. Update tool_use_denied case
**File**: `packages/react-agent/src/sdk/converters.ts`
**Lines**: 156-160

```typescript
case "tool_use_denied": {
  const data = event.data as { approvalId: string; toolCallId?: string };
  result.resolvedApprovalId = data.approvalId;
  // Add event creation
  if (event.agentId) {
    result.newEvent = {
      id: `evt_${nanoid()}`,
      type: "tool_denied",
      timestamp: event.timestamp,
      content: { approvalId: data.approvalId, toolCallId: data.toolCallId },
      agentId: event.agentId,
    };
  }
  break;
}
```

#### 7. Update tool_progress case
**File**: `packages/react-agent/src/sdk/converters.ts`
**Lines**: 250-254

```typescript
case "tool_progress": {
  const data = event.data as { toolUseId: string; toolName: string; elapsedSeconds: number };
  // Create event for tool progress
  if (event.agentId) {
    result.newEvent = {
      id: `evt_${nanoid()}`,
      type: "tool_progress",
      timestamp: event.timestamp,
      content: {
        toolUseId: data.toolUseId,
        toolName: data.toolName,
        elapsedSeconds: data.elapsedSeconds,
      },
      agentId: event.agentId,
    };
  }
  break;
}
```

#### 8. Update cost_update case
**File**: `packages/react-agent/src/sdk/converters.ts`
**Lines**: 256-272

```typescript
case "cost_update": {
  const data = event.data as { cost?: number; totalCost?: number };
  if (event.agentId && data.cost !== undefined) {
    result.agentUpdate = {
      id: event.agentId,
      update: {
        cost: data.cost,
      },
    };
  }
  if (data.totalCost !== undefined) {
    result.taskUpdate = {
      cost: data.totalCost,
    };
  }
  // Add event creation
  if (event.agentId) {
    result.newEvent = {
      id: `evt_${nanoid()}`,
      type: "cost_update",
      timestamp: event.timestamp,
      content: { cost: data.cost, totalCost: data.totalCost },
      agentId: event.agentId,
    };
  }
  break;
}
```

#### 9. Add system_init case
**File**: `packages/react-agent/src/sdk/converters.ts`
**Changes**: Add new case before the closing of switch statement

```typescript
case "system_init": {
  const data = event.data as { sessionId?: string; tools?: string[] };
  if (event.agentId) {
    result.newEvent = {
      id: `evt_${nanoid()}`,
      type: "system_init",
      timestamp: event.timestamp,
      content: { sessionId: data.sessionId, tools: data.tools },
      agentId: event.agentId,
    };
  }
  break;
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `pnpm turbo build --filter=@assistant-ui/react-agent`
- [x] Linting passes: `pnpm lint`
- [x] Existing tests pass: `pnpm --filter @assistant-ui/react-agent test`

#### Manual Verification:
- [x] Each SDK event type creates a corresponding AgentEvent

---

## Phase 3: Update EventStream Component

### Overview
Add display configuration for all new event types in the EventStream component.

### Changes Required:

#### 1. Add imports for new icons
**File**: `examples/agent-dashboard-mvp/components/EventStream.tsx`
**Lines**: 3-13

Add any needed icons (existing ones should cover most cases):
```typescript
import {
  Terminal,
  MessageSquare,
  Lightbulb,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Play,          // task_started
  Square,        // task_completed
  Users,         // agent_spawned
  UserCheck,     // agent_completed
  ThumbsUp,      // tool_approved
  ThumbsDown,    // tool_denied
  Clock,         // tool_progress
  DollarSign,    // cost_update
  Settings,      // system_init
} from "lucide-react";
```

#### 2. Extend eventConfig
**File**: `examples/agent-dashboard-mvp/components/EventStream.tsx`
**Lines**: 22-51

```typescript
const eventConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  // Existing
  tool_call: {
    icon: <Terminal className="h-3.5 w-3.5" />,
    label: "Tool Call",
    color: "text-blue-500",
  },
  tool_result: {
    icon: <Check className="h-3.5 w-3.5" />,
    label: "Tool Result",
    color: "text-green-500",
  },
  reasoning: {
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    label: "Thinking",
    color: "text-purple-500",
  },
  message: {
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    label: "Message",
    color: "text-foreground",
  },
  error: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    label: "Error",
    color: "text-destructive",
  },
  // New
  task_started: {
    icon: <Play className="h-3.5 w-3.5" />,
    label: "Task Started",
    color: "text-green-500",
  },
  task_completed: {
    icon: <Square className="h-3.5 w-3.5" />,
    label: "Task Completed",
    color: "text-green-600",
  },
  agent_spawned: {
    icon: <Users className="h-3.5 w-3.5" />,
    label: "Agent Spawned",
    color: "text-blue-500",
  },
  agent_completed: {
    icon: <UserCheck className="h-3.5 w-3.5" />,
    label: "Agent Completed",
    color: "text-blue-600",
  },
  tool_approved: {
    icon: <ThumbsUp className="h-3.5 w-3.5" />,
    label: "Tool Approved",
    color: "text-green-500",
  },
  tool_denied: {
    icon: <ThumbsDown className="h-3.5 w-3.5" />,
    label: "Tool Denied",
    color: "text-red-500",
  },
  tool_progress: {
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Tool Progress",
    color: "text-yellow-500",
  },
  cost_update: {
    icon: <DollarSign className="h-3.5 w-3.5" />,
    label: "Cost Update",
    color: "text-emerald-500",
  },
  system_init: {
    icon: <Settings className="h-3.5 w-3.5" />,
    label: "System Init",
    color: "text-gray-500",
  },
};
```

#### 3. Extend getEventContent function
**File**: `examples/agent-dashboard-mvp/components/EventStream.tsx`
**Lines**: 88-125

```typescript
const getEventContent = (event: AgentEvent) => {
  const content = event.content as Record<string, unknown>;
  switch (event.type) {
    case "tool_call":
      return {
        summary: `${content["toolName"]}()`,
        detail: JSON.stringify(content["toolInput"], null, 2),
      };
    case "tool_result":
      const result = String(content["result"] || "");
      return {
        summary: result.slice(0, 80) + (result.length > 80 ? "..." : ""),
        detail: result,
      };
    case "reasoning":
      const text = String(content["text"] || "");
      return {
        summary: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
        detail: text,
      };
    case "message":
      const msg = String(content["text"] || "");
      return {
        summary: msg.slice(0, 100) + (msg.length > 100 ? "..." : ""),
        detail: msg,
      };
    case "error":
      return {
        summary: String(content["message"]),
        detail: JSON.stringify(content, null, 2),
      };
    // New event types
    case "task_started":
      const prompt = String(content["prompt"] || "");
      return {
        summary: prompt.slice(0, 80) + (prompt.length > 80 ? "..." : ""),
        detail: prompt,
      };
    case "task_completed":
      return {
        summary: content["totalCost"] ? `Total cost: $${content["totalCost"]}` : "Completed",
        detail: JSON.stringify(content, null, 2),
      };
    case "agent_spawned":
      return {
        summary: `${content["name"]}${content["parentAgentId"] ? " (sub-agent)" : ""}`,
        detail: JSON.stringify(content, null, 2),
      };
    case "agent_completed":
      return {
        summary: content["summary"] ? String(content["summary"]).slice(0, 80) : "Completed",
        detail: JSON.stringify(content, null, 2),
      };
    case "tool_approved":
      return {
        summary: `Approval ${content["approvalId"]}`,
        detail: JSON.stringify(content, null, 2),
      };
    case "tool_denied":
      return {
        summary: `Denied ${content["approvalId"]}`,
        detail: JSON.stringify(content, null, 2),
      };
    case "tool_progress":
      return {
        summary: `${content["toolName"]} - ${content["elapsedSeconds"]}s`,
        detail: JSON.stringify(content, null, 2),
      };
    case "cost_update":
      return {
        summary: content["totalCost"] ? `Total: $${content["totalCost"]}` : `$${content["cost"]}`,
        detail: JSON.stringify(content, null, 2),
      };
    case "system_init":
      const tools = content["tools"] as string[] | undefined;
      return {
        summary: tools ? `${tools.length} tools available` : "Initialized",
        detail: JSON.stringify(content, null, 2),
      };
    default:
      return {
        summary: JSON.stringify(content).slice(0, 80),
        detail: JSON.stringify(content, null, 2),
      };
  }
};
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles without errors: `pnpm turbo build --filter=agent-dashboard-mvp`
- [x] Linting passes: `pnpm lint`

#### Manual Verification:
- [x] All new event types render correctly in the EventStream
- [x] Icons and colors display as expected
- [x] Event content summaries and details are readable

---

## Testing Strategy

### Unit Tests:
- Add tests in `packages/react-agent/src/sdk/converters.test.ts` for each new event type
- Verify `processSDKEvent()` returns correct `newEvent` for each SDK event type

### Integration Tests:
- Verify full event flow from SDK event to rendered UI component

### Manual Testing Steps:
1. Start the agent-dashboard-mvp example
2. Create a task that triggers various event types
3. Verify all event types appear in the EventStream
4. Expand events to verify detail content is correct

## Performance Considerations

- `tool_progress` and `cost_update` events may fire frequently
- Current implementation creates individual events for each - acceptable for MVP
- Future enhancement could batch/throttle these if needed

## References

- Research document: `notes/research/sub-agent-event-handling.md`
- Current types: `packages/react-agent/src/runtime/types.ts`
- Current converter: `packages/react-agent/src/sdk/converters.ts`
- EventStream component: `examples/agent-dashboard-mvp/components/EventStream.tsx`
- SDK types: `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.2.19_zod@4.3.5/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`
