# Agent-UI Implementation Plan

**Date**: January 2026
**Status**: Master Planning Document
**Related**:
  - `/notes/proposals/agent-ui-proposal.md` - Full agent-ui feature specification
  - `/notes/research/agent-ui-proposal-codebase-implementationanalysis.md` - Codebase architecture analysis

---

## How to Use This Document

This document contains **5 implementation phases**. To create a detailed implementation plan for a specific phase:

```
/create_plan notes/proposals/agent-ui-implementation-plan.md for phase 1
```

Replace `1` with the desired phase number (1-5). The `/create_plan` command will:
- Focus on the specified phase's scope
- Create a detailed, actionable plan
- Save to `notes/plans/[phase-name]-implementation.md`

---

## Overview

The agent-ui proposal outlines 11 primitives for building agent orchestration interfaces (supervision UX vs chat UX). This work is split into **5 sequential phases**, each building on the previous:

| Phase | Name | What It Builds |
|-------|------|----------------|
| 1 | Infrastructure Foundation | Runtime interfaces, binding patterns, streaming support |
| 2 | Core Runtime Implementation | Runtime classes, state objects, navigation |
| 3 | Core Primitives | Task, Agent, Approval primitives (3 primitives) |
| 4 | Supporting Primitives | Remaining 8 primitives + tool widgets |
| 5 | Integration & Examples | SDK integration, example app, docs |

### Why 5 Phases?

1. **Incremental delivery** - Each phase produces working, testable code
2. **Clear dependencies** - Later phases depend on earlier phases completing
3. **Manageable scope** - Each plan is focused and actionable
4. **Validation points** - Can test and iterate after each phase
5. **Risk mitigation** - Issues caught early in smaller phases

### Testing Strategy (Per Phase)

| Phase | Testing Approach | API Key Usage |
|-------|-----------------|---------------|
| 1 | Unit tests only | No (mock data) |
| 2 | Unit tests only | No (mock data) |
| 3 | Integration tests with mock runtimes | No (simulated data) |
| 4 | Integration tests with mock SDK | No (simulated streams) |
| 5 | Full integration tests | ✅ Yes (real SDK) |

---

## PHASE 1: Infrastructure Foundation

### Goal
Create the runtime architecture and tool UI infrastructure that all other phases depend on.

### Scope

#### 1. Extend AssistantFrame for streaming support
**Location**: `packages/react/src/model-context/frame/`

Changes required:
- Add streaming protocol messages for parent ↔ iframe communication
- Implement rate-limited updates (max 30fps for UI performance)
- Create streaming utilities for tool output buffering
- Extend AssistantFrameTypes.ts with streaming message types

#### 2. Create base runtime interfaces and cores
**Location**: `packages/react-agent-sdk/src/runtime-cores/` (new directory)

Create interfaces:
```typescript
// WorkspaceRuntimeCore.ts
export interface WorkspaceRuntimeCore {
  // State (read-only)
  readonly id: string;
  readonly tasks: readonly TaskRuntimeCore[];
  readonly approvalQueue: readonly ApprovalRuntimeCore[];
  readonly resourceMonitor: ResourceMonitorRuntimeCore;

  // Actions
  createTask(config: CreateTaskConfig): Promise<TaskRuntimeCore>;
  cancelTask(taskId: string): void;

  // Navigation
  getTaskByIndex(idx: number): TaskRuntimeCore | undefined;
  getTaskById(taskId: string): TaskRuntimeCore | undefined;
}

// TaskRuntimeCore.ts
export interface TaskRuntimeCore {
  readonly id: string;
  readonly title: string;
  readonly status: 'queued' | 'planning' | 'executing' | 'synthesizing' | 'completed' | 'failed';
  readonly strategy: string | null;
  readonly progress: { completed: number; total: number };
  readonly cost: number;
  readonly leadAgent: AgentRuntimeCore;
  readonly workerAgents: readonly AgentRuntimeCore[];
  readonly subtasks: readonly TaskRuntimeCore[];
  readonly artifacts: readonly Artifact[];
  readonly dependencies: readonly TaskDependency[];
  readonly duration: number;
  readonly createdAt: Date;
  readonly completedAt: Date | null;

  // Actions
  cancel(): void;
  retry(): void;
  retrySubtask(subtaskId: string): Promise<void>;
  spawnWorker(options: SpawnWorkerOptions): Promise<AgentRuntimeCore>;
  reassignSubtask(subtaskId: string, agentId: string): Promise<void>;
  cancelAgent(agentId: string): Promise<void>;

  // Navigation
  getSubtaskByIndex(idx: number): TaskRuntimeCore | undefined;
  getSubtaskById(taskId: string): TaskRuntimeCore | undefined;
}

// Similar for AgentRuntimeCore and AgentEventRuntimeCore
```

#### 3. Implement type-safe binding patterns
**Location**: `packages/react-agent-sdk/src/runtime/` (new directory)

Following existing patterns from `packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts:295-534`:

Create bindings:
```typescript
// SubscribableWithState wrappers
export type WorkspaceRuntimeCoreBinding = SubscribableWithState<
  WorkspaceRuntimeCore,
  WorkspaceRuntimePath
> & {
  outerSubscribe(callback: () => void): Unsubscribe;
};

// Path types for navigation
export type WorkspaceRuntimePath = string;
export type TaskRuntimePath = { workspaceId: string; taskId: string };
export type AgentRuntimePath = { workspaceId: string; taskId: string; agentId: string };
export type AgentEventRuntimePath = { workspaceId: string; taskId: string; agentId: string; eventId: string };

// State derivation utilities
export type WorkspaceRuntimeBinding = WorkspaceRuntimeCoreBinding & {
  getStateState(): WorkspaceState;
};
```

Create derivation helpers (similar to ShallowMemoizeSubject):
- `createMemoizedBinding()` for computed state (e.g., task progress calculations)
- `createNestedBinding()` for nested state hierarchies

#### 4. Create context providers and hooks utilities
**Location**: `packages/react-agent-sdk/src/context/` (new directory)

Create context providers:
```typescript
// WorkspaceProvider.tsx
export const WorkspaceProvider = ({ runtime, children }: WorkspaceProviderProps) => {
  return (
    <WorkspaceRuntimeContext.Provider value={runtime}>
      {children}
    </WorkspaceRuntimeContext.Provider>
  );
};

// TaskProvider.tsx
// AgentProvider.tsx
// ApprovalProvider.tsx
```

Create hook utilities (helper functions for creating context hooks):
- `createContextHook()` - Generic utility for creating type-safe hooks from context
- `createStateHook()` - Helper for creating useXState() hooks
- `createApiHook()` - Helper for creating useXApi() hooks

### Dependencies
- None (groundwork phase)

### Deliverables
- [ ] Streaming-enabled AssistantFrame infrastructure (messages, rate limiting, utilities)
- [ ] All core runtime interfaces defined (Workspace, Task, Agent, AgentEvent)
- [ ] Binding helper utilities (SubscribableWithState wrappers, path types)
- [ ] Context provider scaffold (WorkspaceProvider and hooks utilities)

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-sdk` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-sdk/tsconfig.json` passes
- [ ] Unit tests for binding utilities pass: `pnpm test packages/react-agent-sdk`
- [ ] Type checking for all interfaces complete

#### Manual Verification:
- [ ] Can create a WorkspaceRuntimeCore stub that compiles without errors
- [ ] Can use SubscribableWithState to wrap a simple state object and subscribe to changes
- [ ] AssistantFrame types support streaming message definitions
- [ ] Context providers render without children errors

### What We're NOT Doing
- No runtime implementations (that's Phase 2)
- No primitives (that's Phase 3)
- No Claude Agent SDK integration (that's Phase 5)
- No real SDK connection (tests use mocks)

### Key Implementation Notes
- Follow existing patterns in `packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts:295-534`
- Use `package.json` structure from `packages/react-ai-sdk/` as reference
- All files should export both Core interfaces (for implementations) and types (for public API)
- Path types should support efficient lookups (consider using string concatenation for paths)

---

## PHASE 2: Core Runtime Implementation

### Goal
Implement the working runtime hierarchy that provides state and actions to primitives.

### Scope

#### 1. Implement runtime classes
**Location**: `packages/react-agent-sdk/src/runtime/`

Create implementation classes:

```typescript
// WorkspaceRuntimeImpl.ts
export class WorkspaceRuntimeImpl implements WorkspaceRuntime {
  private readonly _workspaceBinding: WorkspaceRuntimeBinding;

  constructor(workspaceBinding: WorkspaceRuntimeCoreBinding) {
    // Create state binding with memoized derivations
    const stateBinding = new ShallowMemoizeSubject({
      path: workspaceBinding.path,
      getState: () => getWorkspaceState(workspaceBinding.getState()),
      subscribe: (callback) => workspaceBinding.subscribe(callback),
    });

    this._workspaceBinding = {
      ...workspaceBinding,
      getStateState: () => stateBinding.getState(),
    };
  }

  getState(): WorkspaceState {
    return this._workspaceBinding.getStateState();
  }

  createTask(config: CreateTaskConfig): Promise<TaskRuntime> {
    const core = this._workspaceBinding.getState().createTask(config);
    return createTaskRuntime(core, this);
  }

  // ... other methods
}

// Similar for TaskRuntimeImpl, AgentRuntimeImpl, AgentEventRuntimeImpl
```

Each RuntimeImpl:
- Wraps a RuntimeCore with SubscribableWithState binding
- Implements getState() returning current state object
- Implements subscribe(callback) returning Unsubscribe function
- Provides navigation methods that return other Runtime instances
- Action methods delegate to core and trigger updates

#### 2. Implement path-based navigation
**Location**: In `*.RuntimeImpl.ts` files

Navigation methods:
```typescript
// TaskRuntimeImpl
getSubtaskByIndex(idx: number): TaskRuntime | undefined {
  const subtaskCore = this._taskBinding.getState().getSubtaskByIndex(idx);
  if (!subtaskCore) return undefined;
  return createTaskRuntime(subtaskCore, this._workspace);
}

getSubtaskById(taskId: string): TaskRuntime | undefined {
  const subtaskCore = this._taskBinding.getState().getSubtaskById(taskId);
  if (!subtaskCore) return undefined;
  return createTaskRuntime(subtaskCore, this._workspace);
}

// AgentRuntimeImpl
getTask(): TaskRuntime {
  return this._task;
}

getParentAgent(): AgentRuntime | null {
  const parentCore = this._agentBinding.getState().getParentAgent();
  if (!parentCore) return null;
  return createAgentRuntime(parentCore, this._task);
}

getChildAgents(): AgentRuntime[] {
  return this._agentBinding.getState().getChildAgents().map(core =>
    createAgentRuntime(core, this._task)
  );
}
```

#### 3. Create runtime state objects
**Location**: `packages/react-agent-sdk/src/runtime/core/` (new directory)

Define state interfaces matching primitive properties:

```typescript
// WorkspaceState.ts
export interface WorkspaceState {
  readonly id: string;
  readonly tasks: TaskState[];
  readonly agents: AgentState[];
  readonly approvals: ApprovalState[];
  readonly notifications: Notification[];
  readonly resources: ResourceState;
}

// TaskState.ts
export interface TaskState {
  readonly id: string;
  readonly title: string;
  readonly status: 'queued' | 'planning' | 'executing' | 'synthesizing' | 'completed' | 'failed';
  readonly strategy: string | null;
  readonly progress: { completed: number; total: number };
  readonly leadAgent: AgentState;
  readonly workerAgents: AgentState[];
  readonly agentTree: AgentTreeNode;
  readonly subtasks: TaskState[];
  readonly dependencies: TaskDependency[];
  readonly artifacts: Artifact[];
  readonly cost: number;
  readonly duration: number;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
}

// AgentState.ts, AgentEventState.ts
```

Create state getter functions:
```typescript
// getWorkspaceState.ts
export function getWorkspaceState(core: WorkspaceRuntimeCore): WorkspaceState {
  return {
    id: core.id,
    tasks: core.tasks.map(taskCore => getTaskState(taskCore)),
    agents: gatherAllAgents(core.tasks),
    approvals: collectApprovals(core.tasks),
    // ... other properties
  };
}
```

#### 4. Build stream processor skeleton
**Location**: `packages/react-agent-sdk/src/streaming/AgentStreamProcessor.ts` (new directory)

Create class structure:
```typescript
export class AgentStreamProcessor {
  constructor(
    private workspaceRuntime: WorkspaceRuntime,
  ) {}

  // These will be implemented in Phase 5 with real SDK
  processStream(stream: AsyncGenerator<SDKMessage>): void {
    // Placeholder: will parse SDK messages and update runtime state
  }

  convertSDKMessageToState(message: SDKMessage): Partial<AgentEventState> {
    // Placeholder: will convert SDK formats to runtime state
    return {};
  }

  handlePermissionHook(request: PermissionRequest): Promise<PermissionDecision> {
    // Placeholder: will integrate with approval system
    return Promise.resolve({ permissionDecision: 'allow' });
  }
}
```

Create message conversion interfaces:
```typescript
// converters.ts
export interface SDKMessageConverter {
  toAgentEventState(message: SDKAssistantMessage): AgentEventState;
  toPartialAgentEventState(message: SDKPartialAssistantMessage): Partial<AgentEventState>;
  toAgentStateFromResult(message: SDKResultMessage): Partial<AgentState>;
  extractParentAgentInfo(message: SDKAssistantMessage): ParentAgentInfo | null;
  detectSubagentSpawn(message: SDKAssistantMessage): SpawnedAgentInfo | null;
}
```

### Dependencies
- Phase 1 complete (runtime interfaces, binding utilities)

### Deliverables
- [ ] WorkspaceRuntimeImpl class with state and navigation
- [ ] TaskRuntimeImpl class with state and navigation
- [ ] AgentRuntimeImpl class with state and navigation
- [ ] AgentEventRuntimeImpl class with state
- [ ] State objects (WorkspaceState, TaskState, AgentState, AgentEventState)
- [ ] State getter functions
- [ ] Stream processor skeleton (partial implementation)

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-sdk` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-sdk/tsconfig.json` passes
- [ ] Unit tests for runtime classes pass: `pnpm test packages/react-agent-sdk`
- [ ] State derivation tests pass (calculated fields like progress, cost)

#### Manual Verification:
- [ ] Can create a WorkspaceRuntimeImpl tracking multiple TaskRuntimeImpl instances
- [ ] TaskRuntimeImpl tracks agent hierarchy (parent/child relationships)
- [ ] Can navigate workspace → task → agent → event chain
- [ ] State updates trigger subscriber callbacks correctly
- [ ] Path-based navigation returns correct runtime instances
- [ ] Stream processor compiles with placeholder methods

### What We're NOT Doing
- No primitives (that's Phase 3)
- No Claude Agent SDK connection (that's Phase 5)
- Stream processor is scaffold only (full implementation in Phase 5)
- No real message conversion logic (that's Phase 5)

### Key Implementation Notes
- Look at `packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts` for binding patterns
- Use `ShallowMemoizeSubject` for state derivations (cost, progress calculations)
- Ensure navigation methods memoize runtime instances to avoid creating duplicates
- Path types should enable efficient tree traversal

---

## PHASE 3: Core Primitives

### Goal
The 3 essential primitives for basic supervision UX.

### Scope

#### 1. TaskPrimitive
**Location**: `packages/react-agent-primitives/src/task/` (new directory/package)

**Properties** (14):
- `.Root` - Container component
- `.Title` - Display task title
- `.Status` - Display status with icon/indicator
- `.Strategy` - Display decomposition plan from lead agent
- `.Progress` - Display subtask completion progress
- `.LeadAgent` - Component for lead agent display
- `.WorkerAgents` - List of worker agent components
- `.AgentTree` - Hierarchical view of agent relationships
- `.Subtasks` - List of child TaskPrimitive components
- `.Dependencies` - Display blocking subtasks
- `.Artifacts` - List of created/modified files
- `.Cost` - Display aggregate cost
- `.Duration` - Display total time
- `.CreatedAt`, `.CompletedAt` - Timestamps

**Actions** (4):
- `.Actions.Lifecycle.Cancel` - Cancel task and all agents
- `.Actions.Lifecycle.Retry` - Restart with new agents
- `.Actions.Lifecycle.RetrySubtask` - Retry specific failed subtask
- `.Actions.Lifecycle.Prioritize` - Move up in queue

Implementation pattern:
```typescript
// TaskPrimitive.tsx

// Root component
export namespace TaskPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const TaskPrimitiveRoot = forwardRef<TaskPrimitiveRoot.Element, TaskPrimitiveRoot.Props>(
  (props, ref) => {
    const api = useTaskApi();
    useTaskState((state) => {
      // Trigger re-renders on state changes
    });

    return <Primitive.div {...props} ref={ref} />;
  }
);

// Title property
export const TaskPrimitiveTitle = forwardRef<...>((props, ref) => {
  const title = useTaskState((state) => state.title);
  return <Primitive.h2 {...props} ref={ref}>{title}</Primitive.h2>;
});

// Lifecycle action - Cancel
export const TaskPrimitiveActionsLifecycleCancel = forwardRef<...>((props, ref) => {
  const callback = useTaskCancel(); // Hook returns callback or null
  if (!callback) return null;

  return (
    <button onClick={callback} ref={ref} {...props}>
      Cancel Task
    </button>
  );
});

// Action validation hook
const useTaskCancel = () => {
  const api = useTaskApi();
  const disabled = useTaskState((state) => state.status === 'completed' || state.status === 'failed');

  const callback = useCallback(() => {
    api.task().cancel();
  }, [api]);

  if (disabled) return null;
  return callback;
};
```

Actions namespace export:
```typescript
export namespace TaskPrimitiveActions {
  export class Lifecycle {
    static Cancel = TaskPrimitiveActionsLifecycleCancel;
    static Retry = TaskPrimitiveActionsLifecycleRetry;
    static RetrySubtask = TaskPrimitiveActionsLifecycleRetrySubtask;
    static Prioritize = TaskPrimitiveActionsLifecyclePrioritize;
  }
  export const Lifecycle = new Lifecycle();

  // Other action groups will be added in Phase 4
}
```

#### 2. AgentPrimitive
**Location**: `packages/react-agent-primitives/src/agent/` (new directory/package)

**Properties** (15):
- `.Root` - Container component
- `.Status` - Display status with icon/indicator
- `.Role` - Display role (orchestrator | worker | specialist)
- `.Name` - Display agent name/title
- `.Objective` - Display what agent is trying to do
- `.Boundaries` - Display scope limits
- `.OutputFormat` - Display expected output format
- `.Task` - Reference to parent task
- `.ParentAgent` - Display parent agent reference
- `.ChildAgents` - List of child agent components
- `.Model` - Display model name
- `.Cost` - Display agent cost
- `.Duration` - Display agent duration
- `.ContextUsage` - Display tokens/context limit ratio
- `.CreatedAt`, `.LastActivityAt` - Timestamps
- `.Error` - Display error message if failed

**Actions** (5):
- `.Actions.Lifecycle.Pause` - Pause execution (can resume)
- `.Actions.Lifecycle.Resume` - Resume paused agent
- `.Actions.Lifecycle.Interrupt` - Stop and wait for input
- `.Actions.Lifecycle.Cancel` - Abandon entirely
- `.Actions.Lifecycle.Retry` - Restart from beginning

#### 3. ApprovalPrimitive
**Location**: `packages/react-agent-primitives/src/approval/` (new directory/package)

**Properties** (9):
- `.Root` - Container component
- `.Request` - Display what agent wants to do
- `.ToolName` - Display tool name (Bash, Edit, etc.)
- `.ToolInput` - Display tool arguments
- `.Context` - Display why it needs this
- `.Status` - Display pending | approved | denied | skipped
- `.Agent` - Display which agent is requesting
- `.Task` - Display which task this belongs to
- `.Details` - Expandable full info

**Actions** (7):
- `.Actions.Approve.Once` - Allow this one
- `.Actions.Approve.Session` - Allow for this session
- `.Actions.Approve.Always` - Always allow this tool
- `.Actions.Approve.Timed` - Allow for N minutes
- `.Actions.Reject.Once` - Deny this one
- `.Actions.Reject.WithReason` - Deny with feedback text
- `.Actions.Defer.Skip` - Decide later

#### 4. Implement Properties vs Actions pattern
**Location**: Across all primitive files

Pattern implementation:
```typescript
// Generic action button factory
function createActionButton<T extends TaskBase>(
  displayName: string,
  useAction: () => (() => void) | null,
) {
  const Component = forwardRef<HTMLButtonElement, { children?: ReactNode }>((props, ref) => {
    const callback = useAction();
    if (!callback) return null;

    return (
      <button onClick={callback} ref={ref} {...props}>
        {props.children || displayName}
      </button>
    );
  });

  Component.displayName = displayName;
  return Component;
}

// Usage
export const TaskPrimitiveActionsLifecycleCancel = createActionButton(
  'TaskPrimitive.Actions.Lifecycle.Cancel',
  useTaskCancel,
);
```

#### 5. Create context hooks
**Location**: `packages/react-agent-primitives/src/hooks/` (new directory)

```typescript
// useTaskState.ts
export function useTaskState<T>(selector: (state: TaskState) => T): T {
  const taskRuntime = useTaskRuntime();
  return useSyncExternalStore(
    (callback) => taskRuntime.subscribe(callback),
    () => selector(taskRuntime.getState()),
    () => selector(taskRuntime.getState()),
  );
}

// useAgentState.ts
// useApprovalState.ts

// useTaskApi.ts
export function useTaskApi(): TaskApi {
  return { task: useTaskRuntime() };
}

// useAgentApi.ts
// useApprovalApi.ts
```

### Dependencies
- Phase 2 complete (runtime classes providing state)
- All navigation methods functional

### Deliverables
- [ ] TaskPrimitive with all 14 properties + 4 lifecycle actions
- [ ] AgentPrimitive with all 15 properties + 5 lifecycle actions
- [ ] ApprovalPrimitive with all 9 properties + 7 actions
- [ ] Context hooks: useTaskState(), useAgentState(), useApprovalState()
- [ ] API hooks: useTaskApi(), useAgentApi(), useApprovalApi()
- [ ] Action validation hooks for all implemented actions

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-primitives` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- [ ] Component tests pass: `pnpm test packages/react-agent-primitives`
- [ ] Hook tests for state subscriptions pass
- [ ] Action button tests (disabled states, callback firing) pass

#### Manual Verification:
- [ ] Render TaskPrimitive showing title, status, progress
- [ ] Render AgentPrimitive showing status, cost, context usage
- [ ] Render ApprovalPrimitive with approve/reject/deny buttons
- [ ] Actions disabled when appropriate (e.g., can't cancel completed task)
- [ ] Properties update in real-time as runtime state changes
- [ ] Clicking action buttons calls runtime methods correctly

### What We're NOT Doing
- No supporting primitives (that's Phase 4)
- No tool UI widgets (that's Phase 4)
- No remaining action groups (that's Phase 4):
  - TaskPrimitive: Agents, Organization, Export action groups
  - AgentPrimitive: Branching, Organization, Export, Debug, Config action groups

### Key Implementation Notes
- Follow Radix style from `packages/react/src/primitives/` (forwardRef, namespace exports)
- Properties in `packages/react-agent-primitives/src/task/`, `src/agent/`, `src/approval/`
- Each primitive directory contains: index.ts (exports), components/, hooks/
- Actions namespace uses class pattern for full nesting with static properties
- Test primitive rendering with mock runtime states (no real SDK needed)

---

## PHASE 4: Supporting Primitives

### Goal
The remaining 8 primitives for complete UX.

### Scope

#### 1. Visualization Primitives

**TaskTreePrimitive** (4 properties + navigation actions)
**Location**: `packages/react-agent-primitives/src/task/`

Properties:
- `.Root` - Container component
- `.Tree` - The full hierarchy (tasks + agents)
- `.ExpandedNodes` - Which nodes are expanded (managed state)
- `.FocusedNode` - Currently selected task/agent (managed state)
- `.ViewMode` - tree | timeline | graph enum

Actions:
- `.Actions.View.ExpandAll` - Expand all nodes
- `.Actions.View.CollapseAll` - Collapse all nodes
- `.Actions.View.FocusOnAgent` - Focus on specific agent
- `.Actions.View.FocusOnSubtask` - Focus on specific subtask
- `.Actions.Navigation.ZoomToSubtask` - Drill into subtask
- `.Actions.Navigation.ZoomOut` - Go up one level
- `.Actions.Navigation.ZoomToRoot` - Go to top level

**AgentFeedPrimitive** (3 properties, no actions)
**Location**: `packages/react-agent-primitives/src/agent/`

Properties:
- `.Root` - Container component
- `.Events` - List of past AgentEventPrimitive components
- `.CurrentActivity` - What's happening now (singleton component)
- `.Viewport` - Auto-scrolling container

**AgentEventPrimitive** (7 properties + replay actions)
**Location**: `packages/react-agent-primitives/src/agent/`

Properties:
- `.Root` - Container component
- `.Timestamp` - When this event occurred
- `.Type` - tool-call | reasoning | error | message | spawn-agent enum
- `.Status` - pending | running | completed | failed
- `.ToolExecution` - Slot for ToolExecutionPrimitive
- `.Reasoning` - Thinking/planning text
- `.SpawnedAgent` - Reference to child agent (if Type is spawn-agent)
- `.Collapsed` - Whether event is collapsed (managed state)

Actions:
- `.Actions.View.Expand` - Expand collapsed event
- `.Actions.View.Collapse` - Collapse event
- `.Actions.View.ViewRaw` - View raw JSON
- `.Actions.Copy.CopyOutput` - Copy tool output
- `.Actions.Copy.CopyInput` - Copy tool input
- `.Actions.Replay.ReExecute` - Re-run this specific event

#### 2. Tool UI Primitives

**ToolExecutionPrimitive** (6 properties + execution actions)
**Location**: `packages/react-agent-primitives/src/tools/` (new directory)

Properties:
- `.Root` - Container component
- `.Name` - "Bash", "Edit", "Read"
- `.Input` - Arguments passed to tool
- `.Output` - Result (supports streaming)
- `.Status` - pending | running | completed | error
- `.Duration` - How long the tool ran
- `.RemoteUI` - Rich iframe widget (from Phase 1)

Actions:
- `.Actions.View.Expand` - Expand output
- `.Actions.View.Collapse` - Collapse output
- `.Actions.View.ViewRaw` - View raw input/output
- `.Actions.View.ViewFormatted` - View formatted output
- `.Actions.Copy.CopyInput` - Copy tool arguments
- `.Actions.Copy.CopyOutput` - Copy tool result
- `.Actions.Copy.CopyAll` - Copy both
- `.Actions.Execution.Retry` - Re-run this tool
- `.Actions.Execution.Cancel` - Cancel running tool

**Built-in Tool Widgets**:
**Location**: `packages/react-agent-primitives/src/tools/built-in/` (new directory)

```bash
# Component files
BashToolUI.tsx          # Terminal with ANSI colors, streaming output
EditToolUI.tsx          # Diff view, Monaco editor integration
ReadToolUI.tsx          # Syntax-highlighted code, line numbers
GrepToolUI.tsx          # Search results with context, clickable paths
```

Each widget:
- Accepts tool input/output as props
- Uses AssistantFrame remote UI from Phase 1
- Supports streaming output updates
- Has collapsible/expandable state

#### 3. Approval Management Primitives

**ApprovalQueuePrimitive** (3 properties + bulk/filter actions)
**Location**: `packages/react-agent-primitives/src/approval/`

Properties:
- `.Root` - Container component
- `.Count` - Badge count
- `.Items` - List of ApprovalPrimitive components
- `.Viewport` - Scrollable container

Actions:
- `.Actions.Bulk.ApproveAll` - Approve all pending
- `.Actions.Bulk.DenyAll` - Deny all pending
- `.Actions.Bulk.ClearResolved` - Remove resolved items
- `.Actions.Filter.ByTool` - Filter by tool type
- `.Actions.Filter.ByAgent` - Filter by agent
- `.Actions.Filter.ByTask` - Filter by task
- `.Actions.Filter.ByStatus` - Filter by status

**PermissionModePrimitive** (2 properties + mode actions)
**Location**: `packages/react-agent-primitives/src/approval/`

Properties:
- `.Root` - Container component
- `.Current` - Current mode display
- `.PerToolConfig` - Per-tool settings display

Actions:
- `.Actions.SetMode.AskAll` - Ask for everything
- `.Actions.SetMode.AutoReads` - Auto-approve read-only
- `.Actions.SetMode.AutoAll` - Auto-approve everything
- `.Actions.SetMode.Custom` - Custom per-tool config
- `.Actions.TimedBypass.Enable` - Start timed bypass
- `.Actions.TimedBypass.Disable` - End timed bypass
- `.Actions.TimedBypass.Extend` - Add more time
- `.Actions.PerTool.SetAllow` - Always allow specific tool
- `.Actions.PerTool.SetAsk` - Always ask for specific tool
- `.Actions.PerTool.SetDeny` - Always deny specific tool

#### 4. Task Management Primitives

**TaskLauncherPrimitive** (7 properties + launch/draft actions)
**Location**: `packages/react-agent-primitives/src/task/`

Properties:
- `.Root` - Container component
- `.Input` - Task description textarea
- `.AgentSelector` - Which agent type for lead
- `.ModelSelector` - Which model
- `.DirectorySelector` - Working directory
- `.Attachments` - Context files
- `.PermissionConfig` - Initial permission settings
- `.BudgetConfig` - Cost/time limits

Actions:
- `.Actions.Launch.Submit` - Launch immediately
- `.Actions.Launch.Queue` - Add to queue
- `.Actions.Draft.Save` - Save as draft
- `.Actions.Draft.Discard` - Delete draft
- `.Actions.Draft.LoadTemplate` - Load from template

**WorkspacePrimitive** (4 properties + search/selection/bulk actions)
**Location**: `packages/react-agent-primitives/src/workspace/` (new directory)

Properties:
- `.Root` - Container component
- `.Tasks` - Task list/board (primary view)
- `.Agents` - All active agents across tasks
- `.Notifications` - Alerts (approvals, errors, completions)
- `.Resources` - Aggregate costs, rate limits

Sub-properties (Search):
- `.Search.Input` - Search box
- `.Search.Results` - Filtered results
- `.Search.Filters` - Filter chips/toggles

Sub-properties (Selection):
- `.Selection.Selected` - Currently selected items
- `.Selection.Count` - Selection count
- `.Selection.Checkbox` - Individual item checkbox

Actions:
- `.Actions.View.TableView` - List/table layout
- `.Actions.View.DetailView` - Single task detail
- `.Actions.View.SplitView` - List + detail
- `.Actions.View.BoardView` - Kanban-style board
- `.Actions.View.TreeView` - Hierarchical task/agent view
- `.Actions.Bulk.Archive` - Archive selected
- `.Actions.Bulk.Delete` - Delete selected
- `.Actions.Bulk.SetPermissions` - Set permissions for selected
- `.Actions.Bulk.SetModel` - Set model for selected
- `.Actions.Bulk.Export` - Export selected
- `.Actions.Sort.ByDate` - Sort by date
- `.Actions.Sort.ByCost` - Sort by cost
- `.Actions.Sort.ByStatus` - Sort by status
- `.Actions.Sort.ByName` - Sort by name
- `.Actions.Filter.ByStatus` - Filter by status
- `.Actions.Filter.ByAgent` - Filter by agent type
- `.Actions.Filter.ByDateRange` - Filter by date range
- `.Actions.Filter.ShowArchived` - Toggle archived visibility

#### 5. Complete Remaining Action Groups

**TaskPrimitive** - Add remaining action groups:
```typescript
export namespace TaskPrimitiveActions {
  // Lifecycle already exists from Phase 3

  // NEW: Agents action group
  export class Agents {
    static SpawnWorker = TaskPrimitiveActionsAgentsSpawnWorker;
    static ReassignSubtask = TaskPrimitiveActionsAgentsReassignSubtask;
    static CancelAgent = TaskPrimitiveActionsAgentsCancelAgent;
  }
  export const Agents = new Agents();

  // NEW: Organization action group
  export class Organization {
    static Archive = TaskPrimitiveActionsOrganizationArchive;
    static Delete = TaskPrimitiveActionsOrganizationDelete;
    static Rename = TaskPrimitiveActionsOrganizationRename;
    static Tag = TaskPrimitiveActionsOrganizationTag;
  }
  export const Organization = new Organization();

  // NEW: Export action group
  export class Export {
    static CopyId = TaskPrimitiveActionsExportCopyId;
    static ExportJson = TaskPrimitiveActionsExportJson;
    static Share = TaskPrimitiveActionsExportShare;
  }
  export const Export = new Export();
}
```

**AgentPrimitive** - Add remaining action groups:
```typescript
export namespace AgentPrimitiveActions {
  // Lifecycle already exists from Phase 3

  // NEW: Branching action group
  export class Branching {
    static Fork = AgentPrimitiveActionsBranchingFork;
    static Checkpoint = AgentPrimitiveActionsBranchingCheckpoint;
    static Rollback = AgentPrimitiveActionsBranchingRollback;
  }
  export const Branching = new Branching();

  // NEW: Organization action group
  export class Organization {
    static Rename = AgentPrimitiveActionsOrganizationRename;
    static Pin = AgentPrimitiveActionsOrganizationPin;
    static Tag = AgentPrimitiveActionsOrganizationTag;
  }
  export const Organization = new Organization();

  // NEW: Export action group
  export class Export {
    static CopyId = AgentPrimitiveActionsExportCopyId;
    static CopyTranscript = AgentPrimitiveActionsExportCopyTranscript;
    static ExportJson = AgentPrimitiveActionsExportExportJson;
    static Share = AgentPrimitiveActionsExportShare;
  }
  export const Export = new Export();

  // NEW: Debug action group
  export class Debug {
    static ViewRaw = AgentPrimitiveActionsDebugViewRaw;
    static ViewState = AgentPrimitiveActionsDebugViewState;
    static ViewLogs = AgentPrimitiveActionsDebugViewLogs;
    static ViewCost = AgentPrimitiveActionsDebugViewCost;
    static InspectContext = AgentPrimitiveActionsDebugInspectContext;
  }
  export const Debug = new Debug();

  // NEW: Config action group
  export class Config {
    static ChangeModel = AgentPrimitiveActionsConfigChangeModel;
    static AdjustPermissions = AgentPrimitiveActionsConfigAdjustPermissions;
    static SetBudget = AgentPrimitiveActionsConfigSetBudget;
    static SetTimeout = AgentPrimitiveActionsConfigSetTimeout;
  }
  export const Config = new Config();
}
```

### Dependencies
- Phase 3 complete (core primitives establishing pattern)
- Task, Agent, Approval states fully functional
- AssistantFrame streaming support from Phase 1

### Deliverables
- [ ] TaskTreePrimitive with all 4 properties + 11 actions
- [ ] AgentFeedPrimitive with 3 properties + 5 actions
- [ ] AgentEventPrimitive with 7 properties + 7 actions
- [ ] ToolExecutionPrimitive with 6 properties + 10 actions
- [ ] Built-in tool widgets (Bash, Edit, Read, Grep)
- [ ] ApprovalQueuePrimitive with 3 properties + 7 actions
- [ ] PermissionModePrimitive with 2 properties + 10 actions
- [ ] TaskLauncherPrimitive with 7 properties + 5 actions
- [ ] WorkspacePrimitive with 4 properties + 12 actions
- [ ] Remaining action groups for TaskPrimitive (Agents, Organization, Export)
- [ ] Remaining action groups for AgentPrimitive (Branching, Organization, Export, Debug, Config)
- [ ] Context hooks for all new primitives
- [ ] API hooks for all new primitives

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-primitives` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- [ ] All component tests pass: `pnpm test packages/react-agent-primitives`
- [ ] Tool widget tests with simulated streaming data pass
- [ ] Bulk action tests (approve all, delete all) pass

#### Manual Verification:
- [ ] Render hierarchical task/agent tree view with expand/collapse
- [ ] Render agent activity feed with events
- [ ] Render bash tool output with streaming (simulated)
- [ ] Render approval queue with bulk actions (approve/deny all)
- [ ] Render workspace overview with search/filter
- [ ] Render task launcher form with all inputs
- [ ] All actions have proper disabled states
- [ ] Full Properties vs Actions pattern consistently applied
- [ ] Tool widgets support streaming updates
- [ ] Bulk actions operate on selected items correctly

### What We're NOT Doing
- No Claude Agent SDK integration (that's Phase 5)
- No example application (that's Phase 5)
- Real streaming data only available in Phase 5

### Key Implementation Notes
- Tool widgets in `packages/react-agent-primitives/src/tools/built-in/`
- Each widget should support streaming output from Phase 1 infrastructure
- Test tool widgets with simulated streaming data before Phase 5
- WorkspacePrimitive is top-level container, may need routing integration
- Bulk operations should work with selection state management

---

## PHASE 5: Integration & Examples

### Goal
End-to-end working system with Claude Agent SDK integration and example application.

### Scope

#### 1. Complete @assistant-ui/react-agent-sdk

**Claude Agent SDK Integration**
**Location**: `packages/react-agent-sdk/src/sdk/` (new directory)

```typescript
// ClaudeAgentClient.ts
export class ClaudeAgentClient {
  constructor(config: AgentRuntimeConfig) {
    // Instantiate AnthropicAgentSDK client
    this.sdkClient = new AnthropicAgentClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
    });
  }

  async createWorkspace(workspaceId?: string): Promise<WorkspaceCore> {
    // Create SDK workspace core
    return await this.sdkClient.createWorkspace({ id: workspaceId });
  }

  async createTask(workspaceId: string, config: CreateTaskConfig): Promise<TaskCore> {
    // Create SDK task
    return await this.sdkClient.createTask(workspaceId, config);
  }

  subscribeToTaskEvents(taskId: string): AsyncGenerator<SDKMessage> {
    // Return async generator of messages from SDK
    return this.sdkClient.subscribeToEvents(taskId);
  }

  // Permission hooks
  setPermissionHook(hook: PermissionHook): void {
    this.sdkClient.registerHook('PreToolUse', hook);
  }
}
```

**Integration with Permission Hooks → Approval System**:
```typescript
// permissionHooks.ts
export function createPermissionHook(approvalRuntime: ApprovalRuntime): PermissionHook {
  return {
    matcher: '*',
    hooks: [async (input: ToolUseInput) => {
      // Create pending approval
      const approval = approvalRuntime.createApproval({
        toolName: input.name,
        toolInput: input.input,
        request: input.description,
      });

      // Wait for human decision
      const decision = await approval.waitForDecision();

      return { permissionDecision: decision };
    }]
  };
}
```

**useAgentRuntime() Hook**
**Location**: `packages/react-agent-sdk/src/hooks/useAgentRuntime.ts`

```typescript
export interface AgentRuntimeConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  workspaceId?: string;
}

export function useAgentRuntime(config: AgentRuntimeConfig): WorkspaceRuntime {
  const client = useMemo(() => {
    return new ClaudeAgentClient(config);
  }, [config]);

  const workspace = useMemo(() => {
    // Create WorkspaceRuntimeCore from SDK client
    const workspaceCore = new WorkspaceRuntimeCoreFromSDK(client);
    const binding = createWorkspaceBinding(workspaceCore);
    return new WorkspaceRuntimeImpl(binding);
  }, [client]);

  return workspace;
}
```

**WorkspaceRuntimeCoreFromSDK Implementation**:
```typescript
export class WorkspaceRuntimeCoreFromSDK implements WorkspaceRuntimeCore {
  constructor(private sdkClient: ClaudeAgentClient) {}

  readonly id: string;
  readonly tasks: readonly TaskRuntimeCore[];

  async createTask(config: CreateTaskConfig): Promise<TaskRuntimeCore> {
    const sdkTask = await this.sdkClient.createTask(config);
    const taskCore = new TaskRuntimeCoreFromSDK(sdkTask, this.sdkClient);
    // Add to internal tasks array
    return taskCore;
  }

  cancelTask(taskId: string): void {
    this.sdkClient.cancelTask(taskId);
  }

  getTaskByIndex(idx: number): TaskRuntimeCore | undefined {
    return this.tasks[idx];
  }

  getTaskById(taskId: string): TaskRuntimeCore | undefined {
    return this.tasks.find(t => t.id === taskId);
  }
}
```

**Message Converters**
**Location**: `packages/react-agent-sdk/src/converters/` (new directory)

```typescript
// SDKAssistantMessage → AgentEventState
export function convertSDKMessageToAgentEventState(
  message: SDKAssistantMessage,
  context: ConversionContext,
): AgentEventState {
  return {
    id: message.id,
    timestamp: new Date(message.timestamp),
    type: message.type === 'tool_use' ? 'tool-call' : 'reasoning',
    status: 'completed',
    toolExecution: message.type === 'tool_use'
      ? convertToolUseToToolExecutionState(message, context)
      : undefined,
    reasoning: message.type === 'reasoning' ? message.content : undefined,
    collapsed: false,
  };
}

// SDKPartialAssistantMessage → AgentEventState partial (streaming)
export function convertSDKPartialMessageToAgentEventState(
  message: SDKPartialAssistantMessage,
  existing: AgentEventState,
): Partial<AgentEventState> {
  if (message.type === 'content_block_delta' && message.delta.type === 'text_delta') {
    // Append to tool output
    return {
      toolExecution: {
        ...existing.toolExecution,
        output: existing.toolExecution.output + message.delta.text,
      },
    };
  }
  return {};
}

// SDKResultMessage → AgentState partial
export function convertSDKResultToAgentState(
  message: SDKResultMessage,
): Partial<AgentState> {
  return {
    status: 'completed',
    cost: message.content.usage.total_cost,
    contextUsage: {
      used: message.content.usage.input_tokens + message.content.usage.output_tokens,
      limit: 200000, // Would come from config
    },
  };
}

// parent_tool_use_id → AgentPrimitive.ParentAgent hierarchy
export function extractParentAgentInfo(
  message: SDKToolUseMessage,
  context: ConversionContext,
): ParentAgentInfo | null {
  if (!message.parent_tool_use_id) return null;

  return {
    agentId: context.agentIdByToolUse.get(message.parent_tool_use_id),
    toolUseId: message.parent_tool_use_id,
  };
}

// Task tool invocation → AgentEventPrimitive with .SpawnedAgent
export function detectSubagentSpawn(
  message: SDKAssistantMessage,
): SpawnedAgentInfo | null {
  if (message.type === 'tool_use' && message.name === 'Task') {
    return {
      taskId: extractTaskIdFromToolInput(message.input),
      agentId: extractAgentIdFromToolInput(message.input),
    };
  }
  return null;
}
```

**Stream Processor (Full Implementation)**
**Location**: `packages/react-agent-sdk/src/streaming/AgentStreamProcessor.ts`

```typescript
export class AgentStreamProcessor {
  constructor(
    private workspaceRuntime: WorkspaceRuntime,
    private converters: MessageConverters,
  ) {}

  async processStream(taskId: string): Promise<void> {
    const taskRuntime = this.workspaceRuntime.getTaskById(taskId);
    if (!taskRuntime) throw new Error(`Task ${taskId} not found`);

    const stream = this.client.subscribeToTaskEvents(taskId);

    for await (const message of stream) {
      this.processMessage(message, taskRuntime);
    }
  }

  private processMessage(message: SDKMessage, taskRuntime: TaskRuntime): void {
    // Handle different message types
    switch (message.type) {
      case 'assistant':
        this.handleAssistantMessage(message, taskRuntime);
        break;
      case 'partial_assistant':
        this.handlePartialMessage(message, taskRuntime);
        break;
      case 'result':
        this.handleResultMessage(message, taskRuntime);
        break;
      case 'error':
        this.handleErrorMessage(message, taskRuntime);
        break;
    }
  }

  private async handleAssistantMessage(
    message: SDKAssistantMessage,
    taskRuntime: TaskRuntime,
  ): Promise<void> {
    // Get or create agent
    const agentRuntime = this.getOrCreateAgent(message, taskRuntime);

    // Convert to event state
    const eventState = this.converters.toAgentEventState(message, this.getContext());

    // Add event to agent's feed
    agentRuntime.addEvent(eventState);

    // Handle special cases
    const parentAgentInfo = this.converters.extractParentAgentInfo(message);
    if (parentAgentInfo) {
      agentRuntime.setParentAgent(parentAgentInfo);
    }

    const spawnInfo = this.converters.detectSubagentSpawn(message);
    if (spawnInfo) {
      await this.handleSubagentSpawn(spawnInfo, taskRuntime);
    }
  }

  private handlePartialMessage(
    message: SDKPartialAssistantMessage,
    taskRuntime: TaskRuntime,
  ): void {
    // Get latest event for streaming updates
    const latestEvent = taskRuntime.getLatestEvent();
    if (!latestEvent) return;

    // Apply partial update (e.g., streaming tool output)
    const partialState = this.converters.toPartialAgentEventState(message, latestEvent.getState());
    latestEvent.updateState(partialState);

    // Rate-limited UI updates (max 30fps from Phase 1)
    this.throttledUpdate();
  }

  private handleResultMessage(
    message: SDKResultMessage,
    taskRuntime: TaskRuntime,
  ): void {
    // Update agent result
    const agentRuntime = taskRuntime.getLeadAgent();
    const partialState = this.converters.toAgentStateFromResult(message);
    agentRuntime.updateState(partialState);
  }

  private throttledUpdate(): void {
    // Debounce UI updates to avoid overwhelming React
    // (Using rate limiter from Phase 1)
    this.rateLimiter.schedule(() => {
      // Trigger React re-render through update notification
      this.workspaceRuntime.notifyUpdate();
    }, 33); // 30fps = ~33ms
  }
}
```

#### 2. Create Example Application: "Agent Dashboard"

**Location**: `examples/agent-dashboard/` (new example directory)

**Features**:
- Workspace overview showing all tasks
- Task detail view with agent tree and activity feeds
- Real-time approval queue with approve/deny buttons
- Cost tracking across tasks and agents
- Task launcher form to create new tasks

**File Structure**:
```
examples/agent-dashboard/
├── app/
│   ├── layout.tsx           # Main layout with WorkspaceProvider
│   ├── page.tsx             # Workspace overview list
│   ├── task/
│   │   ├── [taskId]/
│   │   │   └── page.tsx     # Task detail view
│   │   └── new/
│   │       └── page.tsx     # Task launcher form
│   └── api/
│       └── agents/
│           └── route.ts     # API route for real-time updates (optional)
├── components/
│   ├── TaskCard.tsx         # Uses TaskPrimitive.Root, Title, Status, etc.
│   ├── AgentCard.tsx        # Uses AgentPrimitive.Root, Status, Cost, etc.
│   ├── TaskDetail.tsx       # Uses TaskTree, AgentFeed, etc.
│   ├── ApprovalQueue.tsx    # Uses ApprovalQueuePrimitive
│   ├── TaskLauncher.tsx     # Uses TaskLauncherPrimitive
│   └── ToolWidget.tsx       # Renders ToolExecutionPrimitive for tools
├── lib/
│   └── runtime.ts           # useAgentRuntime setup with real API key
├── .env.local               # ANTHROPIC_API_KEY
└── package.json
```

**Example Component Usage**:
```typescript
// app/page.tsx - Workspace overview
'use client';

import { useAgentRuntime } from '@assistant-ui/react-agent-sdk';
import {
  WorkspacePrimitive,
  WorkspacePrimitiveRoot,
  WorkspacePrimitiveTasks,
  WorkspacePrimitiveActionsViewTableView,
} from '@assistant-ui/react-agent-primitives';

export default function HomePage() {
  const runtime = useAgentRuntime({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  return (
    <WorkspacePrimitive.RuntimeProvider value={runtime}>
      <WorkspacePrimitiveRoot>
        <h1>Agent Workspace</h1>

        <div className="flex gap-4">
          <WorkspacePrimitiveActionsViewTableView />

          <button onClick={() => window.location.href = '/task/new'}>
            New Task
          </button>
        </div>

        <WorkspacePrimitiveTasks>
          {(tasks) => tasks.map(task => (
            <TaskCard key={task.id} taskId={task.id} />
          ))}
        </WorkspacePrimitiveTasks>

        <ApprovalQueue />
      </WorkspacePrimitiveRoot>
    </WorkspacePrimitive.RuntimeProvider>
  );
}
```

```typescript
// components/TaskCard.tsx
'use client';

import {
  TaskPrimitive,
  TaskPrimitiveRoot,
  TaskPrimitiveTitle,
  TaskPrimitiveStatus,
  TaskPrimitiveCost,
  TaskPrimitiveProgress,
  TaskPrimitiveActionsLifecycleCancel,
  TaskPrimitiveActionsLifecycleRetry,
} from '@assistant-ui/react-agent-primitives';

interface TaskCardProps {
  taskId: string;
}

export function TaskCard({ taskId }: TaskCardProps) {
  return (
    <TaskPrimitive.Root taskId={taskId}>
      <TaskPrimitiveRoot>
        <div className="border p-4 rounded">
          <TaskPrimitiveTitle />
          <div className="flex justify-between">
            <TaskPrimitiveStatus />
            <TaskPrimitiveCost />
          </div>
          <TaskPrimitiveProgress />

          <div className="flex gap-2 mt-2">
            <TaskPrimitiveActionsLifecycleCancel />
            <TaskPrimitiveActionsLifecycleRetry />
          </div>
        </div>
      </TaskPrimitiveRoot>
    </TaskPrimitive.Root>
  );
}
```

```typescript
// components/ApprovalQueue.tsx
'use client';

import {
  ApprovalQueuePrimitive,
  ApprovalQueuePrimitiveRoot,
  ApprovalQueuePrimitiveItems,
} from '@assistant-ui/react-agent-primitives';

export function ApprovalQueue() {
  return (
    <div className="border-t mt-4 pt-4">
      <h2>Approvals</h2>

      <ApprovalQueuePrimitiveRoot>
        <ApprovalQueuePrimitiveItems>
          {(approvals) => (
            <>
              {approvals.map(approval => (
                <ApprovalCard key={approval.id} approvalId={approval.id} />
              ))}

              {approvals.length === 0 && <p>No pending approvals</p>}
            </>
          )}
        </ApprovalQueuePrimitiveItems>
      </ApprovalQueuePrimitiveRoot>
    </div>
  );
}
```

#### 3. Documentation
**Location**: `apps/docs/content/docs/agent-ui/` (new directory)

Create documentation files:
```
apps/docs/content/docs/agent-ui/
├── overview.mdx                    # Agent UI overview and mental model
├── getting-started.mdx              # Setup and first agent task
├── primitives/
│   ├── task.mdx                    # TaskPrimitive docs
│   ├── agent.mdx                   # AgentPrimitive docs
│   ├── approval.mdx                # ApprovalPrimitive docs
│   ├── task-tree.mdx               # TaskTreePrimitive docs
│   ├── agent-feed.mdx              # AgentFeedPrimitive docs
│   ├── agent-event.mdx             # AgentEventPrimitive docs
│   ├── tool-execution.mdx          # ToolExecutionPrimitive docs
│   ├── approval-queue.mdx          # ApprovalQueuePrimitive docs
│   ├── permission-mode.mdx         # PermissionModePrimitive docs
│   ├── task-launcher.mdx           # TaskLauncherPrimitive docs
│   └── workspace.mdx               # WorkspacePrimitive docs
└── hooks/
    ├── useAgentRuntime.mdx         # Hook reference
    ├── useTaskRuntime.mdx
    ├── useAgentRuntime.mdx
    └── useApprovalRuntime.mdx
```

Each doc file includes:
- Overview and mental model
- API reference (properties, actions)
- Usage examples with code
- Common patterns
- Integration notes

**Example: primitives/task.mdx**
```markdown
# TaskPrimitive

## Overview

TaskPrimitive represents a user goal — the "what" in the orchestration model. Tasks persist across retries, spawn agents, track progress, and aggregate costs.

## Example Usage

```tsx
import { TaskPrimitive } from '@assistant-ui/react-agent-primitives';

function TaskCard() {
  return (
    <TaskPrimitive.Root taskId="task-123">
      <TaskPrimitiveRoot>
        <TaskPrimitive.Title />
        <TaskPrimitive.Status />
        <TaskPrimitive.Progress />
        <TaskPrimitiveCost />

        <TaskPrimitiveActions.Lifecycle.Cancel />
        <TaskPrimitiveActions.Lifecycle.Retry />
      </TaskPrimitiveRoot>
    </TaskPrimitive.Root>
  );
}
```

## Properties

...

## Actions

...
```

#### 4. Testing
**Location**: Tests in `packages/react-agent-sdk/__tests__/` and `examples/agent-dashboard/__tests__/`

**Unit Tests** (already complete from Phases 1-4):
[✓] Runtime classes
[✓] State derivations
[✓] Component rendering
[✓] Action validation

**Integration Tests**:
```typescript
// __tests__/integration/stream-processor.test.ts
describe('AgentStreamProcessor', () => {
  it('should process SDK message stream correctly', async () => {
    const mockClient = new MockClaudeAgentClient();
    const processor = new AgentStreamProcessor(workspaceRuntime, converters);

    const mockStream = mockClient.createMockStream([
      mockAssistantMessage({ type: 'tool_use' }),
      mockPartialMessage({ type: 'content_block_delta' }),
      mockResultMessage({}),
    ]);

    await processor.processStream('task-123');

    expect(taskRuntime.getLeadAgent().getEvents()).toHaveLength(1);
    expect(latestEvent.getResult()).toEqual(expectedResult);
  });
});
```

**E2E Tests** (with real API key):
```typescript
// __tests__/e2e/approval-flow.test.ts
describe('Approval Flow', () => {
  it('should allow human-in-the-loop tool approval', async () => {
    // Create real task
    const runtime = useAgentRuntime({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const task = await runtime.createTask({
      title: 'Bash command that needs approval',
      permissionConfig: { mode: 'ask_all' },
    });

    // Wait for pending approval
    const approval = await waitForPendingApproval(task.getLeadAgent());

    // Approve the tool execution
    approval.approve('once');

    // Verify task completes
    await waitFor(() => task.getState().status === 'completed');
    expect(task.getState().artifacts).toContain('output.txt');
  }, 30000); // 30s timeout for real API calls
});
```

### Dependencies
- Phase 4 complete (all primitives implemented)
- AssistantFrame streaming support from Phase 1
- Claude Agent SDK API key available

### Deliverables
- [ ] ClaudeAgentClient integrating with real Anthropic Agent SDK
- [ ] useAgentRuntime() hook that returns fully configured WorkspaceRuntime
- [ ] WorkspaceRuntimeCoreFromSDK implementation
- [ ] All message converters (SDK → runtime state formats)
- [ ] AgentStreamProcessor fully implemented
- [ ] Permission hook integration with approval system
- [ ] "Agent Dashboard" example app in examples/agent-dashboard/
- [ ] Documentation for all 11 primitives
- [ ] Documentation for useAgentRuntime() hook
- [ ] Integration tests for stream processing
- [ ] E2E tests with real API key
- [ ] Changeset created: `pnpm changeset`

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-sdk` compiles
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-primitives` compiles
- [ ] `pnpm turbo build --filter=agent-dashboard` example builds
- [ ] `pnpm tsc --noEmit --project packages/react-agent-sdk/tsconfig.json` passes
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- [ ] All unit tests pass: `pnpm test packages/react-agent-sdk`
- [ ] All integration tests pass: `pnpm test packages/react-agent-sdk`
- [ ] E2E tests with real API key pass: `pnpm test examples/agent-dashboard`
- [ ] Linting passes: `pnpm lint`
- [ ] Formatting passes: `pnpm prettier`
- [ ] Changeset available: `pnpm changeset status`

#### Manual Verification:
- [ ] Run example app: `cd examples/agent-dashboard && pnpm dev`
- [ ] Create a task using TaskLauncher
- [ ] Watch agents spawn and work in real-time
- [ ] See tool executions with streaming output (Bash, Edit, Read)
- [ ] Approve/deny tool executions through ApprovalQueue
- [ ] View agent activity feeds with events
- [ ] See cost tracking updates in real-time
- [ ] Cancel pause agents during execution
- [ ] Navigate task/agent hierarchy in TaskTree
- [ ] All primitives render correctly with real data

### What We're NOT Doing
- No external provider support beyond Claude Agent SDK (that could be added later)
- No production deployment configuration (example app is demo only)

### Key Implementation Notes
- Use real API key from ANTHROPIC_API_KEY environment variable
- Example app should work out-of-box with valid API key
- Message converters must handle all SDK message types
- Stream processor must handle rate limiting to avoid UI stutter
- Permission hooks should integrate seamlessly with approval system
- Documentation should include both reference and examples

---

# Open Questions to Resolve Before Starting

1. **Claude Agent SDK Availability**: Is the Claude Agent SDK publicly available? If not, we may need to mock it or use a different backend initially.

2. **Streaming Granularity**: Per-character vs per-line streaming for tool output? This affects AssistantFrame extension design in Phase 1.

3. **Tool-UI-Server Package**: Should we build `@assistant-ui/tool-ui-server` first (as PR #3015 implies), or can we proceed with extending AssistantFrame directly?

4. **Package Structure**: Should agent primitives be in `packages/react-agent-primitives/` or integrated into `packages/react/src/primitives/`? The codebase analysis suggests a separate package is reasonable.

5. **Test Approach**: We're using mock SDK in phases 1-4 and real SDK in Phase 5. Should we add integration tests with mock SDK in Phase 4 to catch issues early?

---

*This is the master planning document. Use `/create_plan notes/proposals/agent-ui-implementation-plan.md for phase N` to create detailed implementation plans for each phase.*