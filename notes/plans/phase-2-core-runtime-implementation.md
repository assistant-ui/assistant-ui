# Phase 2: Core Runtime Implementation Plan

## Overview

**Date**: January 2026
**Status**: Detailed Implementation Plan
**Parent Document**: `/notes/proposals/agent-ui-implementation-plan.md` (Phase 2 section)
**Phase**: 2 of 5

This plan details the implementation of the runtime classes that provide state and actions to agent-ui primitives. Phase 1 created the interface definitions; Phase 2 implements the working runtime hierarchy.

## Current State Analysis

### Phase 1 Deliverables (Completed)

From analysis of the codebase, Phase 1 has delivered:

**Runtime Core Interfaces** (defined, compiled to `dist/runtime-cores/`):
- `WorkspaceRuntimeCore` - Manages tasks, approvals, notifications
- `TaskRuntimeCore` - Manages execution, progress, agents
- `AgentRuntimeCore` - Manages agent state, parent/child relationships
- `AgentEventRuntimeCore` - Manages activity events
- `ApprovalRuntimeCore` - Manages approval requests

**Binding Types** (defined, compiled to `dist/runtime/bindings.d.ts`):
- `WorkspaceRuntimeCoreBinding` / `WorkspaceRuntimeBinding`
- `TaskRuntimeCoreBinding` / `TaskRuntimeBinding`
- `AgentRuntimeCoreBinding` / `AgentRuntimeBinding`
- `AgentEventRuntimeCoreBinding` / `AgentEventRuntimeBinding`
- `ApprovalRuntimeCoreBinding` / `ApprovalRuntimeBinding`

**Path Types** (defined, compiled to `dist/runtime/pathTypes.d.ts`):
- `WorkspaceRuntimePath` (string)
- `TaskRuntimePath` ({ workspaceId, taskId })
- `AgentRuntimePath` ({ workspaceId, taskId, agentId })
- `AgentEventRuntimePath` ({ workspaceId, taskId, agentId, eventId })
- `ApprovalRuntimePath` ({ workspaceId, approvalId })

**State Types** (stub definitions in `dist/runtime/bindings.d.ts`):
- `WorkspaceState` - id, tasks[], approvals[], notifications[]
- `TaskState` - id, title, status (stub)
- `AgentState` - id, name, status (stub)
- `AgentEventState` - id, timestamp, type (stub)
- `ApprovalState` - id, request, toolName, status (stub)

**Missing Implementations**:
- Runtime implementation classes don't exist (src/ directories are empty)
- State getter functions don't exist
- State objects are stubs and need full definitions
- Stream processor skeleton doesn't exist

### Existing Patterns (from `packages/react/src/legacy-runtime/runtime/`)

**ThreadRuntimeImpl Pattern** (ThreadRuntime.ts:295-534):
```typescript
export class ThreadRuntimeImpl implements ThreadRuntime {
  private readonly _threadBinding: ThreadRuntimeCoreBinding & {
    getStateState(): ThreadState;
  };

  constructor(
    threadBinding: ThreadRuntimeCoreBinding,
    threadListItemBinding: ThreadListItemRuntimeBinding,
  ) {
    // Create memoized state binding from cores
    const stateBinding = new ShallowMemoizeSubject({
      path: threadBinding.path,
      getState: () => getThreadState(
        threadBinding.getState(),
        threadListItemBinding.getState(),
      ),
      subscribe: (callback) => {
        const sub1 = threadBinding.subscribe(callback);
        const sub2 = threadListItemBinding.subscribe(callback);
        return () => {
          sub1();
          sub2();
        };
      },
    });

    // Store extended binding with getStateState()
    this._threadBinding = {
      path: threadBinding.path,
      getState: () => threadBinding.getState(),
      getStateState: () => stateBinding.getState(),
      outerSubscribe: (callback) => threadBinding.outerSubscribe(callback),
      subscribe: (callback) => threadBinding.subscribe(callback),
    };
  }

  getState(): ThreadState {
    return this._threadBinding.getStateState();
  }

  createMessage(message: CreateMessage): void {
    this._threadBinding.getState().createMessage(message);
  }

  subscribe(callback: () => void): Unsubscribe {
    return this._threadBinding.subscribe(callback);
  }
}
```

**Navigation Pattern** (MessageRuntime creation from ThreadRuntime):
```typescript
public getMessageById(messageId: string) {
  return new MessageRuntimeImpl(
    new ShallowMemoizeSubject({
      path: { ...this.path, messageId },
      getState: () => {
        const { message, parentId, index } =
          this._threadBinding.getState().getMessageById(messageId);

        if (!message || parentId === undefined || index === undefined)
          return SKIP_UPDATE;

        return { ...message, index, parentId, ... };
      },
      subscribe: (callback) => this._threadBinding.subscribe(callback),
    }),
    this._threadBinding,
  );
}
```

**Key Pattern Observations**:
1. RuntimeImpl wraps RuntimeCore with binding
2. ShallowMemoizeSubject creates derived state with memoization
3. Navigation methods create new runtime instances on-demand
4. Subscribe methods aggregate multiple subscriptions
5. SKIP_UPDATE signals that value isn't available yet

## Desired End State

After Phase 2 completion:

1. **Runtime Implementation Classes** exist and follow ThreadRuntime pattern:
   - `WorkspaceRuntimeImpl` - Wraps WorkspaceRuntimeCore, returns WorkspaceState
   - `TaskRuntimeImpl` - Wraps TaskRuntimeCore, returns TaskState
   - `AgentRuntimeImpl` - Wraps AgentRuntimeCore, returns AgentState
   - `AgentEventRuntimeImpl` - Wraps AgentEventRuntimeCore, returns AgentEventState

2. **State Objects** fully defined with all properties:
   - `WorkspaceState` - Complete state derived from core
   - `TaskState` - Includes strategy, progress, artifacts, dependencies
   - `AgentState` - Includes model, context usage, cost, duration
   - `AgentEventState` - Includes tool execution, reasoning, collapsed state
   - `ApprovalState` - Includes context, agent, task references

3. **State Getter Functions** exist to convert cores to states:
   - `getWorkspaceState(core: WorkspaceRuntimeCore): WorkspaceState`
   - `getTaskState(core: TaskRuntimeCore): TaskState`
   - `getAgentState(core: AgentRuntimeCore): AgentState`
   - `getAgentEventState(core: AgentEventRuntimeCore): AgentEventState`
   - `getApprovalState(core: ApprovalRuntimeCore): ApprovalState`

4. **Stream Processor Skeleton** exists with placeholder methods:
   - `AgentStreamProcessor.processStream()` - Stub
   - `AgentStreamProcessor.convertSDKMessageToState()` - Stub
   - `AgentStreamProcessor.handlePermissionHook()` - Stub

5. **Verification**: Can create a WorkspaceRuntimeImpl with mock cores and:
   - Get state objects with correct properties
   - Navigate workspace → task → agent → event hierarchy
   - Subscriptions trigger on state changes
   - Navigation methods return proper runtime instances
   - No compilation or type errors

## What We're NOT Doing in Phase 2

- No primitives (Phase 3)
- No Claude Agent SDK integration (Phase 5)
- No real stream processing (Phase 5)
- No message conversion logic (Phase 5)
- No tool execution handling (Phase 5)
- Runtime classes will use mock data in tests, not real SDK

## Implementation Approach

Follow the existing ThreadRuntime/MessageRuntime pattern from `packages/react/src/legacy-runtime/runtime/`:

1. **Create state interfaces** matching properties from Phase 1 core interfaces
2. **Create state getter functions** to convert cores to states
3. **Create runtime implementation classes** that:
   - Take CoreBinding in constructor
   - Create ShallowMemoizeSubject for derived state
   - Implement getState() returning state object
   - Implement subscribe() returning Unsubscribe
   - Implement action methods delegating to core
   - Implement navigation methods returning new runtime instances
4. **Create stream processor skeleton** with placeholder method implementations
5. **Create factory functions** for runtime creation (createTaskRuntime, etc.)

## File Organization

```
packages/react-agent-sdk/src/
├── runtime/
│   ├── bindings.ts              # Binding type definitions (from Phase 1)
│   ├── pathTypes.ts             # Path type definitions (from Phase 1)
│   ├── index.ts                 # Public Runtime exports
│   ├── WorkspaceRuntime.ts      # WorkspaceRuntimeImpl
│   ├── TaskRuntime.ts           # TaskRuntimeImpl
│   ├── AgentRuntime.ts          # AgentRuntimeImpl
│   ├── AgentEventRuntime.ts     # AgentEventRuntimeImpl
│   └── factories.ts             # createTaskRuntime, createAgentRuntime, etc.
├── runtime/core/                # NEW - State interfaces and getters
│   ├── index.ts
│   ├── WorkspaceState.ts        # WorkspaceState interface
│   ├── TaskState.ts             # TaskState interface
│   ├── AgentState.ts            # AgentState interface
│   ├── AgentEventState.ts       # AgentEventState interface
│   ├── ApprovalState.ts         # ApprovalState interface (stub)
│   ├── getWorkspaceState.ts     # State getter function
│   ├── getTaskState.ts          # State getter function
│   ├── getAgentState.ts         # State getter function
│   ├── getAgentEventState.ts    # State getter function
│   └── getApprovalState.ts      # State getter function
├── streaming/
│   ├── AgentStreamProcessor.ts  # Stream processor skeleton
│   ├── converters.ts            # Message conversion interfaces (stub)
│   └── index.ts
└── types/
    ├── index.ts                 # Unified type exports
    └── ...existing stub types...
```

## Phase 2.1: Runtime State Objects and Getters

### Overview

Define complete state interfaces matching the properties from runtime core interfaces. Create getter functions to convert cores to these states.

### Changes Required

#### 1. Create runtime/core/ directory structure

**File**: Runtime state files

Create following files in `packages/react-agent-sdk/src/runtime/core/`:
- `WorkspaceState.ts`, `TaskState.ts`, `AgentState.ts`
- `AgentEventState.ts`, `ApprovalState.ts`
- `getWorkspaceState.ts`, `getTaskState.ts`, `getAgentState.ts`
- `getAgentEventState.ts`, `getApprovalState.ts`
- `index.ts` for exports

#### 2. Define WorkspaceState

**File**: `packages/react-agent-sdk/src/runtime/core/WorkspaceState.ts`

```typescript
/**
 * Derived state for workspace runtime.
 *
 * Computed from WorkspaceRuntimeCore by aggregating task states,
 * approval states, and notifications.
 */
export interface WorkspaceState {
  readonly id: string;
  readonly tasks: TaskState[];
  readonly approvals: ApprovalState[];
  readonly notifications: Notification[];
}
```

#### 3. Define TaskState

**File**: `packages/react-agent-sdk/src/runtime/core/TaskState.ts`

```typescript
/**
 * Derived state for task runtime.
 *
 * Computed from TaskRuntimeCore including progress calculations,
 * artifact tracking, and agent hierarchy.
 */
export interface TaskState {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly strategy: string | null;
  readonly progress: { completed: number; total: number };
  readonly cost: number;
  readonly duration: number;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
  readonly leadAgent: AgentState;
  readonly workerAgents: AgentState[];
  readonly subtasks: TaskState[];
  readonly dependencies: TaskDependency[];
  readonly artifacts: Artifact[];

  // Helper properties for UI
  readonly progressPercentage: number; // computed: (completed/total) * 100
  readonly isActive: boolean;          // computed: status in planning/executing/synthesizing
  readonly isComplete: boolean;        // computed: status === completed
}
```

#### 4. Define AgentState

**File**: `packages/react-agent-sdk/src/runtime/core/AgentState.ts`

```typescript
/**
 * Derived state for agent runtime.
 *
 * Computed from AgentRuntimeCore including parent/child hierarchy,
 * cost tracking, and context usage calculation.
 */
export interface AgentState {
  readonly id: string;
  readonly name: string;
  readonly role: AgentRole;
  readonly objective: string;
  readonly boundaries: string | null;
  readonly status: AgentStatus;
  readonly model: string;
  readonly cost: number;
  readonly duration: number;
  readonly createdAt: Date;
  readonly lastActivityAt: Date;
  readonly error: string | null;
  readonly task: TaskState;
  readonly parentAgent: AgentState | null;
  readonly childAgents: AgentState[];
  readonly contextUsage: { used: number; limit: number };
  readonly outputFormat: string | null;

  // Helper properties for UI
  readonly contextUsagePercentage: number; // computed: (used/limit) * 100
  readonly isOrchestrator: boolean;         // computed: role === 'orchestrator'
  readonly hasParent: boolean;             // computed: parentAgent !== null
}
```

#### 5. Define AgentEventState

**File**: `packages/react-agent-sdk/src/runtime/core/AgentEventState.ts`

```typescript
/**
 * Derived state for agent event runtime.
 *
 * Computed from AgentEventRuntimeCore including tool execution state,
 * reasoning blocks, and collapsed state management.
 */
export interface AgentEventState {
  readonly id: string;
  readonly timestamp: Date;
  readonly type: AgentEventType;
  readonly status: AgentEventStatus;
  readonly toolExecution: ToolExecutionState | null;
  readonly reasoning: string | null;
  readonly spawnedAgent: AgentState | null;
  readonly collapsed: boolean;
  readonly agent: AgentState;
}

/**
 * State for tool execution within an event.
 */
export interface ToolExecutionState {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly output: string | null;
  readonly status: ToolExecutionStatus;
  readonly duration: number;
  readonly error: string | null;

  // Helper properties for UI
  readonly isRunning: boolean;   // computed: status === 'running'
  readonly isComplete: boolean;  // computed: status === 'completed'
  readonly isError: boolean;     // computed: status === 'error'
}
```

#### 6. Define ApprovalState

**File**: `packages/react-agent-sdk/src/runtime/core/ApprovalState.ts`

```typescript
/**
 * Derived state for approval runtime.
 *
 * Computed from ApprovalRuntimeCore including agent/task references
 * and status management.
 */
export interface ApprovalState {
  readonly id: string;
  readonly request: string;
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly context: string;
  readonly status: ApprovalStatus;
  readonly agent: AgentState;
  readonly task: TaskState;
  readonly decision: ApprovalDecision | null;

  // Helper properties for UI
  readonly isPending: boolean;   // computed: status === 'pending'
  readonly isApproved: boolean;  // computed: status === 'approved'
  readonly isDenied: boolean;    // computed: status === 'denied'
}
```

#### 7. Implement getWorkspaceState

**File**: `packages/react-agent-sdk/src/runtime/core/getWorkspaceState.ts`

```typescript
import type { WorkspaceRuntimeCore } from "../../runtime-cores/index.js";
import type { WorkspaceState } from "./WorkspaceState.js";
import { getTaskState } from "./getTaskState.js";
import { getApprovalState } from "./getApprovalState.js";

/**
 * Converts WorkspaceRuntimeCore to WorkspaceState.
 *
 * Aggregates states from tasks, approvals, and notifications.
 */
export function getWorkspaceState(core: WorkspaceRuntimeCore): WorkspaceState {
  return {
    id: core.id,
    tasks: core.tasks.map(taskCore => getTaskState(taskCore)),
    approvals: core.approvals.map(approvalCore => getApprovalState(approvalCore)),
    notifications: core.notifications,
  };
}
```

#### 8. Implement getTaskState

**File**: `packages/react-agent-sdk/src/runtime/core/getTaskState.ts`

```typescript
import type { TaskRuntimeCore } from "../../runtime-cores/index.js";
import type { TaskState } from "./TaskState.js";
import { getAgentState } from "./getAgentState.js";

/**
 * Converts TaskRuntimeCore to TaskState.
 *
 * Includes computed properties for UI helpers like progress percentage.
 */
export function getTaskState(core: TaskRuntimeCore): TaskState {
  const progressPercentage = core.progress.total > 0
    ? (core.progress.completed / core.progress.total) * 100
    : 0;

  const isActive = ['planning', 'executing', 'synthesizing'].includes(core.status);

  return {
    id: core.id,
    title: core.title,
    description: core.description,
    status: core.status,
    strategy: core.strategy,
    progress: core.progress,
    cost: core.cost,
    duration: core.duration,
    createdAt: core.createdAt,
    completedAt: core.completedAt,
    leadAgent: getAgentState(core.leadAgent),
    workerAgents: core.workerAgents.map(agentCores => getAgentState(agentCores)),
    subtasks: core.subtasks.map(subtaskCore => getTaskState(subtaskCore)),
    dependencies: core.dependencies,
    artifacts: core.artifacts,

    // Computed helpers
    progressPercentage,
    isActive,
    isComplete: core.status === 'completed',
  };
}
```

#### 9. Implement getAgentState

**File**: `packages/react-agent-sdk/src/runtime/core/getAgentState.ts`

```typescript
import type { AgentRuntimeCore, TaskRuntimeCore } from "../../runtime-cores/index.js";
import type { AgentState } from "./AgentState.js";
import type { TaskState } from "./TaskState.js";
import { getTaskState } from "./getTaskState.js";

/**
 * Converts AgentRuntimeCore to AgentState.
 *
 * Includes computed properties for UI helpers like context usage percentage.
 */
export function getAgentState(core: AgentRuntimeCore): AgentState {
  const contextUsagePercentage = core.contextUsage.limit > 0
    ? (core.contextUsage.used / core.contextUsage.limit) * 100
    : 0;

  const taskState = getTaskState(core.task);
  const parentAgentState = core.parentAgent
    ? getAgentState(core.parentAgent)
    : null;

  return {
    id: core.id,
    name: core.name,
    role: core.role,
    objective: core.objective,
    boundaries: core.boundaries,
    status: core.status,
    model: core.model,
    cost: core.cost,
    duration: core.duration,
    createdAt: core.createdAt,
    lastActivityAt: core.lastActivityAt,
    error: core.error,
    task: taskState,
    parentAgent: parentAgentState,
    childAgents: core.childAgents.map(childCore => getAgentState(childCore)),
    contextUsage: core.contextUsage,
    outputFormat: core.outputFormat,

    // Computed helpers
    contextUsagePercentage,
    isOrchestrator: core.role === 'orchestrator',
    hasParent: core.parentAgent !== null,
  };
}
```

#### 10. Implement getAgentEventState and getApprovalState

Similar patterns for remaining states.

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-sdk` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-sdk/tsconfig.json` passes
- [ ] Unit tests for state getters pass: `pnpm test packages/react-agent-sdk`
- [ ] State interfaces match core interface properties

#### Manual Verification:
- [ ] Can call getTaskState with mock core and get complete state object
- [ ] Computed properties (progressPercentage, contextUsagePercentage) calculate correctly
- [ ] Circular references handled correctly (agent ↔ task ↔ agent)

---

## Phase 2.2: Runtime Implementation Classes

### Overview

Create runtime implementation classes following the ThreadRuntime pattern. Each class wraps a RuntimeCore with binding and provides state, actions, and navigation.

### Changes Required

#### 1. Create WorkspaceRuntimeImpl

**File**: `packages/react-agent-sdk/src/runtime/WorkspaceRuntime.ts`

```typescript
import type {
  WorkspaceRuntimeCore,
  TaskRuntimeCore,
  Notification,
} from "../runtime-cores/index.js";
import type {
  WorkspaceRuntimeCoreBinding,
  WorkspaceRuntimeBinding,
} from "./bindings.js";
import type { WorkspaceState } from "./core/WorkspaceState.js";
import { ShallowMemoizeSubject } from "@assistant-ui/react/legacy-runtime/runtime/subscribable/ShallowMemoizeSubject.js";
import { getWorkspaceState } from "./core/getWorkspaceState.js";
import { createTaskRuntime } from "./factories.js";
import type { TaskRuntime } from "./TaskRuntime.js";

export interface WorkspaceRuntime extends Subscribable {
  getState(): WorkspaceState;
  createTask(config: CreateTaskConfig): Promise<TaskRuntime>;
  cancelTask(taskId: string): void;
  subscribe(callback: () => void): () => void;

  // Navigation
  getTaskByIndex(idx: number): TaskRuntime | undefined;
  getTaskById(taskId: string): TaskRuntime | undefined;
}

export class WorkspaceRuntimeImpl implements WorkspaceRuntime {
  public get path() {
    return this._workspaceBinding.path;
  }

  private readonly _workspaceBinding: WorkspaceRuntimeBinding;
  private readonly _runtimeCache = new Map<string, TaskRuntime>();

  constructor(workspaceBinding: WorkspaceRuntimeCoreBinding) {
    // Create memoized state binding
    const stateBinding = new ShallowMemoizeSubject({
      path: workspaceBinding.path,
      getState: () => getWorkspaceState(workspaceBinding.getState()),
      subscribe: (callback) => workspaceBinding.subscribe(callback),
    });

    this._workspaceBinding = {
      path: workspaceBinding.path,
      getState: () => workspaceBinding.getState(),
      getStateState: () => stateBinding.getState(),
      outerSubscribe: (callback) => workspaceBinding.outerSubscribe(callback),
      subscribe: (callback) => workspaceBinding.subscribe(callback),
    };
  }

  getState(): WorkspaceState {
    return this._workspaceBinding.getStateState();
  }

  async createTask(config: CreateTaskConfig): Promise<TaskRuntime> {
    const core = await this._workspaceBinding.getState().createTask(config);
    // Clear cache since tasks have changed
    this._runtimeCache.clear();
    return createTaskRuntime(core, this._workspaceBinding);
  }

  cancelTask(taskId: string): void {
    this._workspaceBinding.getState().cancelTask(taskId);
  }

  subscribe(callback: () => void): () => void {
    return this._workspaceBinding.subscribe(callback);
  }

  getTaskByIndex(idx: number): TaskRuntime | undefined {
    const taskCore = this._workspaceBinding.getState().getTaskByIndex(idx);
    if (!taskCore) return undefined;
    return this._getOrCreateRuntime(taskCore);
  }

  getTaskById(taskId: string): TaskRuntime | undefined {
    const taskCore = this._workspaceBinding.getState().getTaskById(taskId);
    if (!taskCore) return undefined;
    return this._getOrCreateRuntime(taskCore);
  }

  private _getOrCreateRuntime(taskCore: TaskRuntimeCore): TaskRuntime {
    const cached = this._runtimeCache.get(taskCore.id);
    if (cached) return cached;

    const runtime = createTaskRuntime(taskCore, this._workspaceBinding);
    this._runtimeCache.set(taskCore.id, runtime);
    return runtime;
  }
}
```

#### 2. Create TaskRuntimeImpl

**File**: `packages/react-agent-sdk/src/runtime/TaskRuntime.ts`

```typescript
import type { TaskRuntimeCore, SpawnWorkerOptions } from "../runtime-cores/index.js";
import type {
  TaskRuntimeCoreBinding,
  WorkspaceRuntimeBinding,
} from "./bindings.js";
import type { TaskState } from "./core/TaskState.js";
import { ShallowMemoizeSubject } from "@assistant-ui/react/legacy-runtime/runtime/subscribable/ShallowMemoizeSubject.js";
import { getTaskState } from "./core/getTaskState.js";
import { createAgentRuntime } from "./factories.js";
import type { AgentRuntime } from "./AgentRuntime.js";

export interface TaskRuntime extends Subscribable {
  getState(): TaskState;
  cancel(): void;
  retry(): void;
  retrySubtask(subtaskId: string): Promise<void>;
  spawnWorker(options: SpawnWorkerOptions): Promise<AgentRuntime>;
  reassignSubtask(subtaskId: string, agentId: string): Promise<void>;
  cancelAgent(agentId: string): Promise<void>;
  subscribe(callback: () => void): () => void;

  // Navigation
  getSubtaskByIndex(idx: number): TaskRuntime | undefined;
  getSubtaskById(taskId: string): TaskRuntime | undefined;
  getLeadAgent(): AgentRuntime;
  getWorkerAgent(agentId: string): AgentRuntime | undefined;
}

export class TaskRuntimeImpl implements TaskRuntime {
  public get path() {
    return this._taskBinding.path;
  }

  private readonly _taskBinding: TaskRuntimeBinding;
  private readonly _workspaceBinding: WorkspaceRuntimeBinding;
  private readonly _runtimeCache = new Map<string, AgentRuntime>();

  constructor(
    taskBinding: TaskRuntimeCoreBinding,
    workspaceBinding: WorkspaceRuntimeBinding,
  ) {
    // Create memoized state binding
    const stateBinding = new ShallowMemoizeSubject({
      path: taskBinding.path,
      getState: () => getTaskState(taskBinding.getState()),
      subscribe: (callback) => taskBinding.subscribe(callback),
    });

    this._taskBinding = {
      path: taskBinding.path,
      getState: () => taskBinding.getState(),
      getStateState: () => stateBinding.getState(),
      outerSubscribe: (callback) => taskBinding.outerSubscribe(callback),
      subscribe: (callback) => taskBinding.subscribe(callback),
    };

    this._workspaceBinding = workspaceBinding;
  }

  getState(): TaskState {
    return this._taskBinding.getStateState();
  }

  cancel(): void {
    this._taskBinding.getState().cancel();
  }

  retry(): void {
    this._taskBinding.getState().retry();
  }

  async retrySubtask(subtaskId: string): Promise<void> {
    await this._taskBinding.getState().retrySubtask(subtaskId);
  }

  async spawnWorker(options: SpawnWorkerOptions): Promise<AgentRuntime> {
    const agentCore = await this._taskBinding.getState().spawnWorker(options);
    return createAgentRuntime(agentCore, this._taskBinding);
  }

  async reassignSubtask(subtaskId: string, agentId: string): Promise<void> {
    await this._taskBinding.getState().reassignSubtask(subtaskId, agentId);
  }

  async cancelAgent(agentId: string): Promise<void> {
    await this._taskBinding.getState().cancelAgent(agentId);
  }

  subscribe(callback: () => void): () => void {
    return this._taskBinding.subscribe(callback);
  }

  getSubtaskByIndex(idx: number): TaskRuntime | undefined {
    const subtaskCore = this._taskBinding.getState().getSubtaskByIndex(idx);
    if (!subtaskCore) return undefined;
    return createTaskRuntime(subtaskCore, this._workspaceBinding);
  }

  getSubtaskById(taskId: string): TaskRuntime | undefined {
    const subtaskCore = this._taskBinding.getState().getSubtaskById(taskId);
    if (!subtaskCore) return undefined;
    return createTaskRuntime(subtaskCore, this._workspaceBinding);
  }

  getLeadAgent(): AgentRuntime {
    const leadAgentCore = this._taskBinding.getState().leadAgent;
    return this._getOrCreateAgentRuntime(leadAgentCore);
  }

  getWorkerAgent(agentId: string): AgentRuntime | undefined {
    const agentCore = this._taskBinding.getState()
      .workerAgents.find(a => a.id === agentId);
    if (!agentCore) return undefined;
    return this._getOrCreateAgentRuntime(agentCore);
  }

  private _getOrCreateAgentRuntime(agentCore: AgentRuntimeCore): AgentRuntime {
    const cached = this._runtimeCache.get(agentCore.id);
    if (cached) return cached;

    const runtime = createAgentRuntime(agentCore, this._taskBinding);
    this._runtimeCache.set(agentCore.id, runtime);
    return runtime;
  }
}
```

#### 3. Create AgentRuntimeImpl

**File**: `packages/react-agent-sdk/src/runtime/AgentRuntime.ts`

```typescript
import type { AgentRuntimeCore } from "../runtime-cores/index.js";
import type {
  AgentRuntimeCoreBinding,
  TaskRuntimeBinding,
} from "./bindings.js";
import type { AgentState } from "./core/AgentState.js";
import { ShallowMemoizeSubject } from "@assistant-ui/react/legacy-runtime/runtime/subscribable/ShallowMemoizeSubject.js";
import { getAgentState } from "./core/getAgentState.js";
import { createAgentEventRuntime } from "./factories.js";
import type { AgentEventRuntime } from "./AgentEventRuntime.js";
import type { TaskRuntime } from "./TaskRuntime.js";

export interface AgentRuntime extends Subscribable {
  getState(): AgentState;
  pause(): void;
  resume(): void;
  interrupt(): void;
  cancel(): void;
  retry(): void;
  subscribe(callback: () => void): () => void;

  // Navigation
  getTask(): TaskRuntime;
  getParentAgent(): AgentRuntime | null;
  getChildAgents(): AgentRuntime[];
  getEventByIndex(idx: number): AgentEventRuntime | undefined;
  getEventById(eventId: string): AgentEventRuntime | undefined;
}

export class AgentRuntimeImpl implements AgentRuntime {
  public get path() {
    return this._agentBinding.path;
  }

  private readonly _agentBinding: AgentRuntimeBinding;
  private readonly _taskBinding: TaskRuntimeBinding;
  private readonly _runtimeCache = new Map<string, AgentEventRuntime>();

  constructor(
    agentBinding: AgentRuntimeCoreBinding,
    taskBinding: TaskRuntimeBinding,
  ) {
    // Create memoized state binding
    const stateBinding = new ShallowMemoizeSubject({
      path: agentBinding.path,
      getState: () => getAgentState(agentBinding.getState()),
      subscribe: (callback) => agentBinding.subscribe(callback),
    });

    this._agentBinding = {
      path: agentBinding.path,
      getState: () => agentBinding.getState(),
      getStateState: () => stateBinding.getState(),
      outerSubscribe: (callback) => agentBinding.outerSubscribe(callback),
      subscribe: (callback) => agentBinding.subscribe(callback),
    };

    this._taskBinding = taskBinding;
  }

  getState(): AgentState {
    return this._agentBinding.getStateState();
  }

  pause(): void {
    this._agentBinding.getState().pause();
  }

  resume(): void {
    this._agentBinding.getState().resume();
  }

  interrupt(): void {
    this._agentBinding.getState().interrupt();
  }

  cancel(): void {
    this._agentBinding.getState().cancel();
  }

  retry(): void {
    this._agentBinding.getState().retry();
  }

  subscribe(callback: () => void): () => void {
    return this._agentBinding.subscribe(callback);
  }

  getTask(): TaskRuntime {
    // This would need factory to create TaskRuntime from TaskRuntimeCore
    throw new Error("Not implemented yet - needs TaskRuntime factory");
  }

  getParentAgent(): AgentRuntime | null {
    const parentCore = this._agentBinding.getState().parentAgent;
    if (!parentCore) return null;
    // This would need factory
    throw new Error("Not implemented yet");
  }

  getChildAgents(): AgentRuntime[] {
    const childCores = this._agentBinding.getState().childAgents;
    // This would need factory
    return [];
  }

  getEventByIndex(idx: number): AgentEventRuntime | undefined {
    const eventCore = this._agentBinding.getState().getEventByIndex(idx);
    if (!eventCore) return undefined;
    return this._getOrCreateEventRuntime(eventCore);
  }

  getEventById(eventId: string): AgentEventRuntime | undefined {
    const eventCore = this._agentBinding.getState().getEventById(eventId);
    if (!eventCore) return undefined;
    return this._getOrCreateEventRuntime(eventCore);
  }

  private _getOrCreateEventRuntime(eventCore: AgentEventRuntimeCore): AgentEventRuntime {
    const cached = this._runtimeCache.get(eventCore.id);
    if (cached) return cached;

    const runtime = createAgentEventRuntime(eventCore, this._agentBinding);
    this._runtimeCache.set(eventCore.id, runtime);
    return runtime;
  }
}
```

#### 4. Create AgentEventRuntimeImpl

**File**: `packages/react-agent-sdk/src/runtime/AgentEventRuntime.ts`

```typescript
import type { AgentEventRuntimeCore } from "../runtime-cores/index.js";
import type { AgentEventRuntimeCoreBinding } from "./bindings.js";
import type { AgentEventState } from "./core/AgentEventState.js";
import { ShallowMemoizeSubject } from "@assistant-ui/react/legacy-runtime/runtime/subscribable/ShallowMemoizeSubject.js";
import { getAgentEventState } from "./core/getAgentEventState.js";

export interface AgentEventRuntime extends Subscribable {
  getState(): AgentEventState;
  expand(): void;
  collapse(): void;
  subscribe(callback: () => void): () => void;
}

export class AgentEventRuntimeImpl implements AgentEventRuntime {
  public get path() {
    return this._eventBinding.path;
  }

  private readonly _eventBinding: AgentEventRuntimeBinding;

  constructor(eventBinding: AgentEventRuntimeCoreBinding) {
    // Create memoized state binding
    const stateBinding = new ShallowMemoizeSubject({
      path: eventBinding.path,
      getState: () => getAgentEventState(eventBinding.getState()),
      subscribe: (callback) => eventBinding.subscribe(callback),
    });

    this._eventBinding = {
      path: eventBinding.path,
      getState: () => eventBinding.getState(),
      getStateState: () => stateBinding.getState(),
      subscribe: (callback) => eventBinding.subscribe(callback),
    };
  }

  getState(): AgentEventState {
    return this._eventBinding.getStateState();
  }

  expand(): void {
    this._eventBinding.getState().expand();
  }

  collapse(): void {
    this._eventBinding.getState().collapse();
  }

  subscribe(callback: () => void): () => void {
    return this._eventBinding.subscribe(callback);
  }
}
```

#### 5. Create Factory Functions

**File**: `packages/react-agent-sdk/src/runtime/factories.ts`

```typescript
import type {
  TaskRuntimeCore,
  AgentRuntimeCore,
  AgentEventRuntimeCore,
} from "../runtime-cores/index.js";
import type {
  TaskRuntimeCoreBinding,
  WorkspaceRuntimeBinding,
  AgentRuntimeCoreBinding,
  TaskRuntimeBinding,
  AgentEventRuntimeCoreBinding,
} from "./bindings.js";
import { TaskRuntimeImpl } from "./TaskRuntime.js";
import { AgentRuntimeImpl } from "./AgentRuntime.js";
import { AgentEventRuntimeImpl } from "./AgentEventRuntime.js";

/**
 * Creates a TaskRuntime from TaskRuntimeCore.
 */
export function createTaskRuntime(
  core: TaskRuntimeCore,
  workspaceBinding: WorkspaceRuntimeBinding,
): TaskRuntime {
  const binding: TaskRuntimeCoreBinding = {
    path: { workspaceId: workspaceBinding.path, taskId: core.id },
    getState: () => core,
    outerSubscribe: () => () => {},
    subscribe: () => () => {},
  };

  return new TaskRuntimeImpl(binding, workspaceBinding);
}

/**
 * Creates an AgentRuntime from AgentRuntimeCore.
 */
export function createAgentRuntime(
  core: AgentRuntimeCore,
  taskBinding: TaskRuntimeBinding,
): AgentRuntime {
  const binding: AgentRuntimeCoreBinding = {
    path: {
      workspaceId: taskBinding.path.workspaceId,
      taskId: taskBinding.path.taskId,
      agentId: core.id,
    },
    getState: () => core,
    outerSubscribe: () => () => {},
    subscribe: () => () => {},
  };

  return new AgentRuntimeImpl(binding, taskBinding);
}

/**
 * Creates an AgentEventRuntime from AgentEventRuntimeCore.
 */
export function createAgentEventRuntime(
  core: AgentEventRuntimeCore,
  agentBinding: AgentRuntimeCoreBinding,
): AgentEventRuntime {
  const binding: AgentEventRuntimeCoreBinding = {
    path: {
      workspaceId: agentBinding.path.workspaceId,
      taskId: agentBinding.path.taskId,
      agentId: agentBinding.path.agentId,
      eventId: core.id,
    },
    getState: () => core,
    subscribe: () => () => {},
  };

  return new AgentEventRuntimeImpl(binding);
}
```

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-sdk` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-sdk/tsconfig.json` passes
- [ ] Unit tests for runtime classes pass: `pnpm test packages/react-agent-sdk`
- [ ] Cache invalidation tests pass (runtime instances recreate correctly)

#### Manual Verification:
- [ ] Can create WorkspaceRuntimeImpl with mock cores
- [ ] Can navigate workspace → task → agent → event chain
- [ ] getState() returns complete state objects
- [ ] subscribe/callback triggers on state changes
- [ ] Navigation methods cache instances correctly
- [ ] Action methods delegate to core correctly

---

## Phase 2.3: Stream Processor Skeleton

### Overview

Create stream processor class with placeholder method implementations. Full implementation comes in Phase 5.

### Changes Required

#### 1. Create Stream Processor Skeleton

**File**: `packages/react-agent-sdk/src/streaming/AgentStreamProcessor.ts`

```typescript
import type { WorkspaceRuntime } from "../runtime/index.js";
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKPartialAssistantMessage,
  SDKResultMessage,
} from "./types.js";

/**
 * Processes streaming messages from Claude Agent SDK.
 *
 * This skeleton will be fully implemented in Phase 5 with real message conversion
 * and state update logic.
 */
export class AgentStreamProcessor {
  constructor(private workspaceRuntime: WorkspaceRuntime) {}

  /**
   * Process a stream of SDK messages and update runtime state.
   *
   * TODO: Phase 5 - Implement full message processing logic:
   * - Parse message types (assistant, partial_assistant, result, error)
   * - Update agent event feeds
   * - Handle tool execution streaming
   * - Track subagent spawns
   * @param stream AsyncGenerator of SDK messages
   */
  async processStream(
    taskId: string,
    stream: AsyncGenerator<SDKMessage>,
  ): Promise<void> {
    const taskRuntime = this.workspaceRuntime.getTaskById(taskId);
    if (!taskRuntime) throw new Error(`Task ${taskId} not found`);

    // TODO: Phase 5 - Process messages
    for await (const message of stream) {
      // Placeholder: will implement in Phase 5
      console.debug('Received SDK message:', message);
    }
  }

  /**
   * Convert SDK assistant message to AgentEventState (partial update).
   *
   * TODO: Phase 5 - Convert message format to runtime state.
   * @param message SDK assistant message
   * @returns Partial agent event state
   */
  convertSDKMessageToState(
    message: SDKAssistantMessage,
  ): Partial<import("../runtime/core/AgentEventState.js").AgentEventState> {
    // TODO: Phase 5 - Implement conversion logic
    return {};
  }

  /**
   * Convert partial SDK message for streaming updates.
   *
   * TODO: Phase 5 - Handle streaming updates (e.g., tool output).
   * @param message Partial SDK message
   * @param existing Existing state to update
   * @returns Partial state update
   */
  convertPartialMessage(
    message: SDKPartialAssistantMessage,
    existing: import("../runtime/core/AgentEventState.js").AgentEventState,
  ): Partial<import("../runtime/core/AgentEventState.js").AgentEventState> {
    // TODO: Phase 5 - Implement streaming update logic
    return {};
  }

  /**
   * Handle permission hook from SDK.
   *
   * TODO: Phase 5 - Integrate with approval system.
   * @param request Permission request from SDK
   * @returns Permission decision (wait for user approval)
   */
  async handlePermissionHook(
    request: PermissionRequest,
  ): Promise<PermissionDecision> {
    // TODO: Phase 5 - Create approval and wait for decision
    return { permissionDecision: 'allow' };
  }
}

// Placeholder types - will be defined in Phase 5
export interface PermissionRequest {
  toolName: string;
  toolInput: Record<string, unknown>;
}

export interface PermissionDecision {
  permissionDecision: 'allow' | 'deny' | 'skip';
}
```

#### 2. Create Message Conversion Interfaces (Stub)

**File**: `packages/react-agent-sdk/src/streaming/converters.ts`

```typescript
/**
 * Interfaces for SDK message conversion.
 *
 * These interfaces will be used in Phase 5 to convert Claude Agent SDK
 * messages to runtime state formats.
 *
 * TODO: Phase 5 - Define actual SDK message types and implement converters.
 */

/**
 * SDK message types (placeholder).
 */
export interface SDKMessage {
  id: string;
  type: 'assistant' | 'partial_assistant' | 'result' | 'error';
}

/**
 * SDK assistant message (placeholder).
 */
export interface SDKAssistantMessage extends SDKMessage {
  type: 'assistant';
  content: unknown;
}

/**
 * SDK partial message for streaming (placeholder).
 */
export interface SDKPartialAssistantMessage extends SDKMessage {
  type: 'partial_assistant';
  content: unknown;
}

/**
 * SDK result message (placeholder).
 */
export interface SDKResultMessage extends SDKMessage {
  type: 'result';
  content: unknown;
}

/**
 * Message converter interface (placeholder).
 */
export interface SDKMessageConverter {
  toAgentEventState(
    message: SDKAssistantMessage,
  ): import("../runtime/core/AgentEventState.js").AgentEventState;

  toPartialAgentEventState(
    message: SDKPartialAssistantMessage,
    existing: import("../runtime/core/AgentEventState.js").AgentEventState,
  ): Partial<import("../runtime/core/AgentEventState.js").AgentEventState>;

  toAgentStateFromResult(
    message: SDKResultMessage,
  ): Partial<import("../runtime/core/AgentState.js").AgentState>;
}
```

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-sdk` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-sdk/tsconfig.json` passes
- [ ] Stream processor class instantiates without errors

#### Manual Verification:
- [ ] Can create AgentStreamProcessor with WorkspaceRuntime
- [ ] Placeholder methods compile and type-check
- [ ] TODO comments clearly mark Phase 5 work

---

## Testing Strategy

### Unit Tests

#### 1. State Getter Tests

**File**: `packages/react-agent-sdk/src/runtime/core/__tests__/getTaskState.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getTaskState } from '../getTaskState.js';
import type { TaskRuntimeCore } from '../../runtime-cores/index.js';

describe('getTaskState', () => {
  it('should convert core to state correctly', () => {
    const mockCore: TaskRuntimeCore = {
      id: 'task-1',
      title: 'Create feature',
      description: 'Implement new feature',
      status: 'executing',
      strategy: null,
      progress: { completed: 5, total: 10 },
      cost: 0.50,
      duration: 300,
      createdAt: new Date('2026-01-01'),
      completedAt: null,
      leadAgent: mockAgentCore('agent-1', 'Orchestrator'),
      workerAgents: [mockAgentCore('agent-2', 'Worker')],
      subtasks: [],
      dependencies: [],
      artifacts: [],
      // ... action methods stubbed
      cancel: () => {},
      retry: () => {},
      // ... other methods
    };

    const state = getTaskState(mockCore);

    expect(state.id).toBe('task-1');
    expect(state.title).toBe('Create feature');
    expect(state.status).toBe('executing');
    expect(state.progress.completed).toBe(5);
    expect(state.progressPercentage).toBe(50);
    expect(state.isActive).toBe(true);
    expect(state.isComplete).toBe(false);
  });

  it('should handle completed tasks', () => {
    const mockCore: TaskRuntimeCore = {
      // ... same as above but status = ' completed'
      status: 'completed',
      progress: { completed: 10, total: 10 },
      // ...
    };

    const state = getTaskState(mockCore);

    expect(state.isComplete).toBe(true);
    expect(state.isActive).toBe(false);
    expect(state.progressPercentage).toBe(100);
  });
});

function mockAgentCore(id: string, name: string): AgentRuntimeCore {
  return {
    id,
    name,
    // ... stubbed properties
  } as any;
}
```

#### 2. Runtime Class Tests

**File**: `packages/react-agent-sdk/src/runtime/__tests__/WorkspaceRuntime.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceRuntimeImpl } from '../WorkspaceRuntime.js';
import type { WorkspaceRuntimeCoreBinding } from '../bindings.js';

describe('WorkspaceRuntimeImpl', () => {
  it('should create runtime from binding', () => {
    const mockBinding: WorkspaceRuntimeCoreBinding = {
      path: 'workspace-1',
      getState: () => mockCore,
      outerSubscribe: vi.fn(),
      subscribe: vi.fn(),
    };

    const runtime = new WorkspaceRuntimeImpl(mockBinding);

    const state = runtime.getState();
    expect(state.id).toBe('workspace-1');
    expect(state.tasks).toHaveLength(2);
  });

  it('should navigate to task by index', () => {
    const mockBinding = createMockBinding();
    const runtime = new WorkspaceRuntimeImpl(mockBinding);

    const task = runtime.getTaskByIndex(0);

    expect(task).toBeDefined();
    expect(task?.getState().id).toBe('task-1');
  });

  it('should cache runtime instances', () => {
    const mockBinding = createMockBinding();
    const runtime = new WorkspaceRuntimeImpl(mockBinding);

    const task1 = runtime.getTaskById('task-1');
    const task2 = runtime.getTaskById('task-1');

    expect(task1).toBe(task2); // Same instance
  });
});

function createMockBinding(): WorkspaceRuntimeCoreBinding {
  return {
    path: 'workspace-1',
    getState: () => mockCore,
    outerSubscribe: vi.fn(),
    subscribe: vi.fn(),
  };
}

const mockCore: WorkspaceRuntimeCore = {
  id: 'workspace-1',
  tasks: [mockTaskCore('task-1'), mockTaskCore('task-2')],
  approvals: [],
  notifications: [],
  // ... stubbed methods
};
```

### Integration Tests

**File**: `packages/react-agent-sdk/src/__tests__/runtime-hierarchy.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { WorkspaceRuntimeImpl } from '../runtime/WorkspaceRuntime.js';
import { TaskRuntimeImpl } from '../runtime/TaskRuntime.js';
// ... other imports

describe('Runtime Hierarchy', () => {
  it('should navigate workspace → task → agent → event', () => {
    const workspace = createMockWorkspaceRuntime();
    const task = workspace.getTaskById('task-1')!;
    const agent = task.getLeadAgent();
    const event = agent.getEventByIndex(0);

    expect(task).toBeDefined();
    expect(agent).toBeDefined();
    expect(event).toBeDefined();
    expect(event.getState().type).toBe('tool-call');
  });

  it('should handle circular dependencies (agent ↔ task)', () => {
    const workspace = createMockWorkspaceRuntime();
    const task = workspace.getTaskById('task-1')!;
    const agent = task.getLeadAgent();

    // Agent.state.task should return same task
    const agentsTask = agent.getState().task;
    expect(agentsTask.id).toBe(task.getId());
  });
});
```

### Manual Testing Steps

1. **Create mock workspace runtime**:
   ```bash
   cd packages/react-agent-sdk
   pnpm test -- --run src/__tests__/runtime-hierarchy.test.ts
   ```

2. **Test state calculations**:
   - Verify progressPercentage calculates correctly
   - Verify contextUsagePercentage calculates correctly
   - Verify computed properties match expectations

3. **Test navigation**:
   - Navigate workspace → task → agent → event chain
   - Verify cache returns same instance for same ID
   - Verify path types are correctly set

4. **Test subscriptions**:
   - Subscribe to runtime changes
   - Verify subscriber callbacks fire on state updates
   - Verify getState returns updated values

---

## Performance Considerations

1. **Memoization**: ShallowMemoizeSubject prevents unnecessary re-renders
2. **Caching**: Runtime instances are cached by ID to avoid recreating
3. **Lazy Evaluation**: State objects computed on getState() call
4. **Shallow Equality**: State comparisons use shallowEqual for performance

Phase 2 focus is correctness; optimization can be addressed if testing shows issues.

---

## Migration Notes

No migration needed - this is new code for a new package.

Phase 2 builds on Phase 1 interfaces and provides implementation for Phase 3 primitives.

---

## References

- Parent implementation plan: `/notes/proposals/agent-ui-implementation-plan.md` (Phase 2 section)
- Phase 1 interfaces: `packages/react-agent-sdk/dist/runtime-cores/*.d.ts`
- Existing patterns: `packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts:295-534`
- Codebase analysis: `/notes/research/agent-ui-proposal-codebase-implementationanalysis.md`

---

## Summary

Phase 2 creates the working runtime hierarchy:

1. **Runtime state objects** (WorkspaceState, TaskState, AgentState, AgentEventState)
2. **State getter functions** to convert cores to states
3. **Runtime implementation classes** following ThreadRuntime pattern
4. **Factory functions** for creating runtime instances
5. **Stream processor skeleton** (full implementation in Phase 5)

All code follows existing patterns from `packages/react/src/legacy-runtime/runtime/`, uses SubscribableWithState bindings, ShallowMemoizeSubject for memoization, and provides path-based navigation.

Phase 2 is foundational for Phase 3 primitives, which will consume these runtimes to render agent UI components.