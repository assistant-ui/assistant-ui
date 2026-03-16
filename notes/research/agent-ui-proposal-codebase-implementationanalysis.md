---
date: 2026-01-21T00:00:00-08:00
researcher: Sisyphus
git_commit: cfefbf032
branch: main
repository: assistant-ui/assistant-ui
topic: "How would agent-ui proposal features look in the codebase?"
tags: [research, codebase, agent-ui, architecture, primitives, runtime]
status: complete
last_updated: 2026-01-21
last_updated_by: Sisyphus
---

# Research: How Agent-UI Proposal Features Would Look in the Codebase

**Date**: 2026-01-21 12:00:47 AM -08:00
**Researcher**: Sisyphus
**Git Commit**: cfefbf032
**Branch**: main
**Repository**: assistant-ui/assistant-ui

## Research Question

How would the features outlined in `/notes/proposals/agent-ui-proposal.md` look if implemented in the current codebase?

## Summary

The agent-ui proposal outlines a comprehensive set of primitives for building agent orchestration interfaces, representing a shift from conversation-based UX (chat) to work supervision UX. Based on analysis of the existing codebase architecture, the agent-ui features would:

1. **Mirror existing structural patterns**: Follow the same Radix-style primitive organization, runtime hierarchy, and binding/subscribable patterns as the chat UI
2. **Introduce new runtime hierarchy**: `WorkspaceRuntime` → `TaskRuntime` → `AgentRuntime` → `AgentEventRuntime`
3. **Create a separate primitives package**: `packages/react-agent-primitives/` with task, agent, approval, and tool-related components
4. **Build a new integration**: `packages/react-agent-sdk/` to integrate Claude Agent SDK
5. **Extend iframe infrastructure**: Leverage existing AssistantFrame patterns for tool UIs but add streaming support
6. **Follow established patterns**: Use RuntimeCore wrappers, SubscribableWithState bindings, path-based navigation, and context hook utilities

The proposal aligns well with the existing codebase architecture, suggesting a cohesive extension rather than a parallel system.

## Detailed Findings

### 1. Current Primitives Architecture

**File Locations**:
- `packages/react/src/primitives/` - Main primitives directory organization
  - `message/` - MessageRoot, MessageParts, MessageIf, MessageError, MessageAttachments
  - `thread/` - ThreadRoot, ThreadViewport, etc.
  - `composer/` - ComposerRoot, etc.
  - `actionBar/` - ActionBarCopy, ActionBarEdit, etc.
  - `branchPicker/`, `attachment/`, `threadList/`, etc.

**Key Patterns** (observed from `/packages/react/src/primitives/thread/ThreadRoot.tsx`, `/packages/react/src/primitives/message/MessageRoot.tsx`):

```typescript
// 1. Namespace-based exports for type safety
export namespace ThreadPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

// 2. Radix-style primitive composition
export const ThreadPrimitiveRoot = forwardRef<...>((props, ref) => {
  return <Primitive.div {...props} ref={ref} />;
});

// 3. Integration with context/hooks for state and behavior
const useIsHoveringRef = () => {
  const api = useAssistantApi();
  const message = useAssistantState(() => api.message());

  const callbackRef = useCallback((el: HTMLElement) => {
    // ... custom behavior
  }, [message]);

  return useManagedRef(callbackRef);
};
```

**Observations**:
- Primitives are organized by domain (message, thread, composer, etc.)
- Each primitive type gets a subdirectory with Root component and subcomponents
- Root components are thin wrappers around Radix's `Primitive.div`
- Behavior comes from hooks that access `useAssistantApi()` and `useAssistantState()`
- No strict Properties vs Actions separation currently exists

### 2. Current Runtime Architecture

**File Locations**:
- `packages/react/src/legacy-runtime/runtime/AssistantRuntime.ts` - Top-level runtime
- `packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts` - Thread runtime implementation
- `packages/react/src/legacy-runtime/runtime/MessageRuntime.ts` - Message runtime implementation

**Hierarchy** (from analysis of runtime files):
```
AssistantRuntime
├── ThreadListRuntime (renamed from threadList)
└── ThreadRuntime (main thread)
    ├── ComposerRuntime
    └── MessageRuntime (accessed via getMessageByIndex/getMessageById)
        ├── MessagePartRuntime
        └── AttachmentRuntime
```

**Runtime Pattern** (from `ThreadRuntime.ts:295-534`):
```typescript
export class ThreadRuntimeImpl implements ThreadRuntime {
  private readonly _threadBinding: ThreadRuntimeCoreBinding & {
    getStateState(): ThreadState;
  };

  constructor(
    threadBinding: ThreadRuntimeCoreBinding,
    threadListItemBinding: ThreadListItemRuntimeBinding,
  ) {
    const stateBinding = new ShallowMemoizeSubject({
      path: threadBinding.path,
      getState: () => getThreadState(...),
      subscribe: (callback) => threadBinding.subscribe(callback),
    });
    this._threadBinding = { /* binding configuration */ };
  }

  getState() { return this._threadBinding.getStateState(); }
  append(message: CreateAppendMessage) {
    this._threadBinding.getState().append(...);
  }
  subscribe(callback: () => void): Unsubscribe { /* ... */ }
}
```

**Key Patterns**:
- Runtime classes implement interface types (e.g., `ThreadRuntime`)
- Runtimes wrap RuntimeCore bindings that contain core logic
- `ShallowMemoizeSubject` and `NestedSubscriptionSubject` create derivations
- State accessed via `getState()` method
- Updates subscribed via `subscribe(callback)` returning `Unsubscribe`
- Path-based navigation: `ThreadRuntimePath`, `MessageRuntimePath`, etc.
- Versioning for React reactivity through binding updates

### 3. Context and Hook Pattern

**File Locations**:
- `packages/react/src/context/index.ts` - Exports providers, stores, and react utilities
- `packages/react/src/context/react/hooks/useAssistantState.tsx` - State subscription hook
- `packages/react/src/context/providers/` - Various context providers

**Pattern** (from `useAssistantState.tsx`):
```typescript
export const useAssistantState = <T,>(
  selector: (state: AssistantState) => T,
): T => {
  const api = useAssistantApi();
  const proxiedState = useMemo(() => new ProxiedAssistantState(api), [api]);
  const slice = useSyncExternalStore(
    api.subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );
  useDebugValue(slice);
  return slice;
};
```

**State Proxy** (from `useAssistantState.tsx:8-45`):
```typescript
class ProxiedAssistantState implements AssistantState {
  #api: AssistantApi;
  constructor(api: AssistantApi) {
    this.#api = api;
  }

  get threads() { return this.#api.threads().getState(); }
  get thread() { return this.#api.thread().getState(); }
  get message() { return this.#api.message().getState(); }
  get part() { return this.#api.part().getState(); }
  get attachment() { return this.#api.attachment().getState(); }
}
```

**Key Patterns**:
- `AssistantApiContext` provides a single API object
- `useAssistantApi()` gets the API
- `useAssistantState(selector)` subscribes to state slices
- Proxied state provides getter-based access to runtime states
- `useSyncExternalStore` handles reactivity
- Multiple nested providers (MessageProvider, ThreadViewportProvider, etc.)
- Utility functions for creating context hooks in `context/react/utils/`

### 4. Existing Integration Packages

**File Locations**:
- `packages/react-ai-sdk/src/runtime/` - AI SDK runtime implementation
- `packages/react-ai-sdk/src/index.ts` - Exposes `useAIChatRuntime` hook
- `packages/react-ag-ui/src/` - AG-UI protocol integration
- `packages/react-ag-ui/src/useAgUiRuntime.ts` - AG-UI runtime hook

**Integration Pattern** (typical structure):
```typescript
// Each integration creates a custom RuntimeCore class
class AISDKThreadRuntimeCore implements ThreadRuntimeCore {
  // Implements core interface using AI SDK's useChat hook
}

// Exposes a hook that creates the full runtime stack
export const useAIChatRuntime = (config) => {
  const core = new AISDKThreadRuntimeCore(config);
  // Create binding, runtime, set up subscriptions
  return {
    AssistantRuntime,
    ...otherExports
  };
};
```

**Key Patterns**:
- Each integration implements `ThreadRuntimeCore` interface
- Integrations convert protocol messages to assistant-ui formats
- Main export is a hook that creates the runtime stack
- Stream processing handled in integration-specific ways
- Runtime cores can be custom classes for protocol-specific needs

### 5. Iframe and Tool UI Infrastructure

**File Locations**:
- `packages/react/src/model-context/frame/AssistantFrameHost.ts` - Parent↔iframe host
- `packages/react/src/model-context/frame/AssistantFrameProvider.ts` - Iframe-side provider
- `packages/react/src/model-context/frame/useAssistantFrameHost.ts` - React hook wrapper
- `packages/react/src/model-context/frame/AssistantFrameTypes.ts` - Protocol types
- `packages/chatgpt-app-studio/src/` - OpenAI Apps SDK shim (`window.openai`)

**Current State**:
- `@assistant-ui/tool-ui-server` package does NOT exist yet (referenced in proposal)
- AssistantFrame infrastructure exists for parent↔iframe communication
- OpenAI Apps SDK protocol exists via `chatgpt-app-studio` shim
- RemoteToolUI component does NOT exist (mentioned in proposal but not implemented)

**Patterns** (from frame infrastructure):
- Structured message passing between parent and iframe
- Protocol types for message format
- Host-side (application) and guest-side (iframe) separation
- Event-based communication for state updates

## Agent-UI Implementation Analysis

### How TaskPrimitive Would Look

Based on existing patterns (ThreadPrimitive, MessagePrimitive):

**File Location**: `packages/react-agent-primitives/src/task/TaskPrimitive.tsx`

**Implementation Pattern**:
```typescript
// Root component - thin Radix wrapper
export namespace TaskPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const TaskPrimitiveRoot = forwardRef<
  TaskPrimitiveRoot.Element,
  TaskPrimitiveRoot.Props
>((props, ref) => {
  const api = useTaskApi();
  const task = useTaskState((state) => state);

  return <Primitive.div {...props} ref={ref} />;
});

// Properties components (existing pattern would extend)
export const TaskPrimitiveTitle = forwardRef<...>(...);
export const TaskPrimitiveStatus = forwardRef<...>(...);
export const TaskPrimitiveStrategy = forwardRef<...>(...);

// Actions namespace (NEW pattern from proposal)
export namespace TaskPrimitiveActions {
  // Full nesting for clarity
  export class Lifecycle {
    static Cancel = TaskPrimitiveActionsLifecycleCancel;
    static Retry = TaskPrimitiveActionsLifecycleRetry;
  }
  export const Lifecycle = new Lifecycle();
}

// Action button components
export const TaskPrimitiveActionsLifecycleCancel = forwardRef<...>(() => {
  const callback = useTaskCancel(); // Returns callback or null if disabled
  return callback ? <Button onClick={callback}>Cancel</Button> : null;
});

// Hook for action validation
const useTaskCancel = () => {
  const api = useTaskApi();
  const disabled = useTaskState(({ task }) => task.status === 'completed');

  const callback = useCallback(() => {
    api.task().cancel();
  }, [api]);

  if (disabled) return null;
  return callback;
};
```

**Differences from Current Codebase**:
- **Properties vs Actions separation**: This is NEW for the proposal
- Current chat primitives don't separate properties and actions
- Actions are typically scattered or embedded in subcomponents
- Proposal enforces: "All actions, regardless of how 'primary' they are, live in `.Actions`"

### How AgentPrimitive Would Look

**File Location**: `packages/react-agent-primitives/src/agent/AgentPrimitive.tsx`

**Implementation Pattern**:
```typescript
// Root
export const AgentPrimitiveRoot = forwardRef<...>((props, ref) => {
  const api = useAgentApi();
  return <Primitive.div {...props} ref={ref} />;
});

// Properties
export const AgentPrimitiveStatus = forwardRef<...>(...);
export const AgentPrimitiveCost = forwardRef<...>(...);
export const AgentPrimitiveContextUsage = forwardRef<...>(...);

// Actions (new pattern)
export const AgentPrimitiveActionsLifecyclePause = forwardRef<...>();
export const AgentPrimitiveActionsBranchingFork = forwardRef<...>();
export const AgentPrimitiveActionsDebugViewRaw = forwardRef<...>();
```

**Context Integration**:
```typescript
// New context provider in packages/react-agent-sdk/src/context/
export const TaskProvider = ({ runtime, children }) => {
  return (
    <TaskRuntimeContext.Provider value={runtime}>
      {children}
    </TaskRuntimeContext.Provider>
  );
};
```

### How Runtime Architecture Would Extend

**Proposed Hierarchy**:
```
WorkspaceRuntime (NEW)
├── TaskRuntime[] (NEW, primary unit)
│   ├── TaskStateRuntime (status, progress, strategy)
│   ├── LeadAgentRuntime
│   ├── WorkerAgentRuntime[]
│   ├── SubtaskRuntime[] (recursive)
│   └── ArtifactRuntime[]
├── AgentRuntime[] (NEW, belong to tasks)
│   ├── AgentFeedRuntime
│   │   └── AgentEventRuntime[]
│   │       └── ToolExecutionRuntime
│   ├── AgentStateRuntime
│   └── ParentAgentRef
├── ApprovalQueueRuntime (NEW)
└── PermissionModeRuntime (NEW)
```

**Implementation Pattern** (following existing ThreadRuntime pattern):

File: `packages/react-agent-sdk/src/runtime/TaskRuntime.ts`
```typescript
export type TaskRuntimeCoreBinding = SubscribableWithState<
  TaskRuntimeCore,
  TaskRuntimePath
> & {
  outerSubscribe(callback: () => void): Unsubscribe;
};

export class TaskRuntimeImpl implements TaskRuntime {
  private readonly _taskBinding: TaskRuntimeCoreBinding & {
    getStateState(): TaskState;
  };

  constructor(
    taskBinding: TaskRuntimeCoreBinding,
    workspaceBinding: WorkspaceRuntimeBinding,
  ) {
    const stateBinding = new ShallowMemoizeSubject({
      path: taskBinding.path,
      getState: () => {
        return getTaskState(taskBinding.getState());
      },
      subscribe: (callback) => taskBinding.subscribe(callback),
    });

    this._taskBinding = {
      path: taskBinding.path,
      getState: () => taskBinding.getState(),
      getStateState: () => stateBinding.getState(),
      outerSubscribe: (callback) => taskBinding.outerSubscribe(callback),
      subscribe: (callback) => taskBinding.subscribe(callback),
    };
  }

  getState(): TaskState {
    return this._taskBinding.getStateState();
  }

  // Actions
  cancel(): void {
    this._taskBinding.getState().cancel();
  }

  retry(): void {
    this._taskBinding.getState().retry();
  }

  spawnWorker(options: SpawnWorkerOptions): Promise<AgentRuntime> {
    return this._taskBinding.getState().spawnWorker(options);
  }

  subscribe(callback: () => void): Unsubscribe {
    return this._taskBinding.subscribe(callback);
  }
}
```

**File Location**: `packages/react-agent-sdk/src/runtime-cores/TaskRuntimeCore.ts`
```typescript
export interface TaskRuntimeCore {
  // State
  readonly id: string;
  readonly title: string;
  readonly status: 'queued' | 'planning' | 'executing' | 'completed' | 'failed';
  readonly progress: { completed: number; total: number };
  readonly cost: number;
  readonly leadAgent: AgentRuntimeCore;
  readonly workerAgents: readonly AgentRuntimeCore[];
  readonly subtasks: readonly TaskRuntimeCore[];
  readonly artifacts: readonly Artifact[];

  // Actions
  cancel(): void;
  retry(): void;
  spawnWorker(options: SpawnWorkerOptions): Promise<AgentRuntimeCore>;

  // Navigation
  getSubtaskByIndex(idx: number): TaskRuntimeCore | undefined;
  getSubtaskById(taskId: string): TaskRuntimeCore | undefined;
}
```

### How Client API would Work

**Existing Pattern** (ThreadRuntime):
```typescript
// Runtime class itself is the client API
const threadRuntime: ThreadRuntime = {
  getState(): ThreadState { /* ... */ },
  append(message): void { /* ... */ },
  subscribe(callback): Unsubscribe { /* ... */ },
  startRun(config): void { /* ... */ },
};
```

**Proposal Pattern** (TaskClientApi):
```typescript
// Would follow same pattern - runtime class IS the client API
export class TaskRuntimeImpl implements TaskRuntime {
  getState(): TaskState { /* ... */ }

  // Actions go directly on runtime
  cancel(): void { /* ... */ }
  retry(): void { /* ... */ }
  spawnWorker(options): Promise<AgentRuntime> { /* ... */ }

  subscribe(callback): Unsubscribe { /* ... */ }
}

// Accessed via hooks
const taskApi = useTaskApi();
taskApi.task().spawnWorker({ objective: "Write tests" });
```

### How react-agent-sdk Integration Would Work

**File Location**: `packages/react-agent-sdk/src/useAgentRuntime.ts`

**Pattern** (following react-ai-sdk):
```typescript
export interface AgentRuntimeConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  workspaceId?: string;
}

export const useAgentRuntime = (config: AgentRuntimeConfig) => {
  const core = useMemo(() => {
    // Create Claude Agent SDK client
    const agentClient = new AnthropicAgentClient(config);

    // Create runtime core implementations
    const workspaceCore = new WorkspaceRuntimeCore(agentClient);

    return workspaceCore;
  }, [config]);

  // Create bindings (SubscribableWithState wrappers)
  const bindings = createBindings(core);

  // Create runtime hierarchy
  const runtime = new WorkspaceRuntimeImpl(bindings);

  return runtime;
};

// Stream processor (following AI SDK stream patterns)
class AgentStreamProcessor {
  processStream(stream: AsyncGenerator<SDKMessage>) {
    // Convert Claude SDK messages to assistant-ui formats
    // Handle streaming updates to AgentEventPrimitive
    // Manage tool execution streaming for ToolExecutionPrimitive
  }
}
```

### How Tool UI Infrastructure Would Extend

**Existing Infrastructure** (AssistantFrame):
- File: `packages/react/src/model-context/frame/AssistantFrameHost.ts`
- Pattern: Parent↔iframe communication via structured messages
- Current: Static rendering, no streaming support

**Proposal Extension**:
- Extend AssistantFrame protocol to support streaming updates
- Add streaming support for long-running tools (Bash output, Edit diff)
- Create built-in widgets for Claude Agent SDK tools (Bash, Edit, Read, etc.)

**File Location**: `packages/react-agent-primitives/src/tools/built-in/` (new)
- `BashToolUI.tsx` - Terminal widget with streaming support
- `EditToolUI.tsx` - Diff view widget
- `ReadToolUI.tsx` - Syntax-highlighted code widget
- `GrepToolUI.tsx` - Search results widget

**Pattern**:
```typescript
// ToolExecutionPrimitive would render RemoteUI slot
export const ToolExecutionPrimitiveRoot = forwardRef<...>(() => {
  const { name, input, output, status, remoteUI } = useToolExecution();

  return (
    <div className="tool-execution">
      <ToolExecutionPrimitiveName>{name}</ToolExecutionPrimitiveName>
      <ToolExecutionPrimitiveInput>{input}</ToolExecutionPrimitiveInput>

      {/* RenderRemoteUI - extends AssistantFrame pattern */}
      {remoteUI && (
        <ToolExecutionPrimitiveRemoteUI>
          <iframe src={remoteUI.src} />
        </ToolExecutionPrimitiveRemoteUI>
      )}

      {/* Fallback formatted output for basic tools */}
      <ToolExecutionPrimitiveOutput className={outputClassName(status)}>
        {output}
      </ToolExecutionPrimitiveOutput>
    </div>
  );
});
```

### New Patterns in Agent-UI Proposal

**1. Explicit Properties vs Actions Separation**
- Current codebase: Properties and actions often mixed
- Proposal: All actions in `.Actions` sub-namespace
- Example:
  ```typescript
  // Current style (typical)
  <MessagePrimitiveRoot>
    <MessagePrimitiveContent /> {/* property */}
    <ActionBarPrimitiveReload /> {/* action, but not labeled */}
  </MessagePrimitiveRoot>

  // Proposed style
  <TaskPrimitiveRoot>
    <TaskPrimitiveTitle /> {/* property */}
    <TaskPrimitiveActions.Lifecycle.Retry /> {/* action in .Actions */}
  </TaskPrimitiveRoot>
  ```

**2. Full Action Nesting for Clarity**
- Proposal suggests full nesting during development
- Example: `<AgentPrimitive.Actions.Lifecycle.Pause />`
- Could add convenience aliases later if needed

**3. Strict Action Button Pattern**
- Hook returns callback OR null (null = disabled)
- Factory creates the button primitive
- Clear separation between validation and UI

## Package Structure Alignment

**Proposal Package Structure**:
```
packages/
├── react/                      # Existing - chat primitives
├── tool-ui-server/             # PLANNED - not yet implemented
├── react-agent-sdk/            # NEW - Agent SDK integration
│   ├── useAgentRuntime.ts
│   ├── useTaskRuntime.ts
│   ├── AgentMessageConverter.ts
│   ├── AgentStreamProcessor.ts
│   └── runtime/
├── react-agent-primitives/     # NEW - Agent UI primitives
│   ├── task/
│   │   ├── TaskPrimitive.tsx
│   │   ├── TaskTreePrimitive.tsx
│   │   └── TaskLauncherPrimitive.tsx
│   ├── agent/
│   │   ├── AgentPrimitive.tsx
│   │   ├── AgentFeedPrimitive.tsx
│   │   └── AgentEventPrimitive.tsx
│   ├── tools/
│   │   ├── ToolExecutionPrimitive.tsx
│   │   └── built-in/
│   ├── approval/
│   │   ├── ApprovalPrimitive.tsx
│   │   ├── ApprovalQueuePrimitive.tsx
│   │   └── PermissionModePrimitive.tsx
│   └── workspace/
│       └── WorkspacePrimitive.tsx
└── styles-agent/               # NEW - Default agent UI styles
```

**Alignment with Existing Structure**:
- `react-agent-sdk` mirrors `react-ai-sdk`, `react-langgraph`, `react-ag-ui`
- `react-agent-primitives` could be part of `packages/react/` or separate
- Separate primitives package aligns with the proposal's clear separation
- All use established patterns (RuntimeCore, SubscribableWithState, context hooks)

## Architecture Documentation

### Design Principles - Alignment with Codebase

**Current Codebase Principles**:
1. Radix-style primitives (thin wrappers around Radix Primitives)
2. Runtime pattern with core + binding + implementation
3. SubscribableWithState for state derivation
4. Path-based navigation through hierarchy
5. Context hooks for React integration
6. Integration packages convert protocol formats

**Proposal Principles Alignment**:

| Proposal Principle | Codebase Alignment | Notes |
|-------------------|-------------------|-------|
| Task vs Agent distinction | Runtime hierarchy similarity | Thread/Message/Composer pattern extends naturally |
| Properties vs Actions separation | NEW, not in codebase | Major new pattern introduced |
| Full nesting for Actions | Component nesting exists | But .Actions namespace is NEW |
| Implementation pattern (createActionButton) | Similar pattern exists | Hook + pattern for buttons is common |

**Key Difference**:
- The Properties vs Actions separation is the biggest architectural departure
- Current primitives mix properties and actions without clear separation
- Proposal enforces this separation in a way that doesn't exist today

### Runtime Architecture - Alignment

**Current Hierarchy**:
```
AssistantRuntime → ThreadRuntime → MessageRuntime → MessagePartRuntime
```

**Proposed Hierarchy**:
```
WorkspaceRuntime → TaskRuntime → AgentRuntime → AgentEventRuntime
```

**Alignment Points**:
1. Same layered architecture pattern
2. RuntimeCore interfaces defined separately
3. RuntimeImpl classes wrap bindings
4. SubscribableWithState for state derivation
5. Path-based navigation through hierarchy
6. Subscribe/unsubscribe pattern for reactivity
7. State accessed via getState()

**New Concepts**:
1. WorkspaceRuntime - top-level aggregation layer
2. AgentRuntime hierarchy with parent/child relationships
3. AgentEventRuntime for activity streams
4. Approval management across agents
5. Cost and context usage tracking

### Context/Hook Pattern - Alignment

**Expected Usage** for agent-ui:
```typescript
// Main runtime hook (following useAIChatRuntime pattern)
const runtime = useAgentRuntime(config);

// State hooks (following useAssistantState pattern)
const task = useTaskState((state) => state);
const agent = useAgentState((state) => state);
const approval = useApprovalState((state) => state);

// API hooks (following useAssistantApi pattern)
const taskApi = useTaskApi();
const agentApi = useAgentApi();
```

**Context Providers** (expected):
- `WorkspaceProvider` - Top-level provider
- `TaskProvider` - Task-scoped provider
- `AgentProvider` - Agent-scoped provider
- `ApprovalProvider` - Approval-scoped provider

## Code References

### Core Architecture

- `/packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts:295-534` - ThreadRuntimeImpl pattern showing binding/subscribable usage
- `/packages/react/src/legacy-runtime/runtime/MessageRuntime.ts:139-335` - MessageRuntimeImpl showing composer integration
- `/packages/react/src/legacy-runtime/runtime/AssistantRuntime.ts:57-111` - Top-level runtime pattern

### Primitives Pattern

- `/packages/react/src/primitives/thread/ThreadRoot.tsx:1-38` - Radix-style primitive root component
- `/packages/react/src/primitives/message/MessageRoot.tsx:78-127` - Complex root with hook integration
- `/packages/react/src/primitives/message/index.ts:1-13` - Namespace-based exports pattern

### Context and Hooks

- `/packages/react/src/context/react/hooks/useAssistantState.tsx:47-65` - State subscription hook pattern
- `/packages/react/src/context/react/hooks/useAssistantState.tsx:8-45` - Proxied state pattern for getter-based access
- `/packages/react/src/context/index.ts:1-4` - Context exports structure

### Integration Packages

- `/packages/react-ai-sdk/` - AI SDK integration structure (useAIChatRuntime)
- `/packages/react-ag-ui/src/` - AG-UI integration structure
- `/packages/react-ag-ui/src/useAgUiRuntime.ts` - Example of runtime hook pattern

### Iframe/Tool UI Infrastructure

- `/packages/react/src/model-context/frame/AssistantFrameHost.ts` - Parent↔iframe communication
- `/packages/react/src/model-context/frame/AssistantFrameTypes.ts` - Protocol types
- `/packages/chatgpt-app-studio/src/` - OpenAI Apps SDK shim (window.openai pattern)

## Historical Context

### Relevant Notes/Documents

From the proposal file (`/notes/proposals/agent-ui-proposal.md`):

1. **PR #3015 Reference**: Line 15, 497-531 - Mentions `@assistant-ui/tool-ui-server` and `RemoteToolUI` as shared infrastructure. Investigation shows this does NOT yet exist in the codebase - it's planned infrastructure.

2. **react-ag-ui Integration**: Line 999-1028 - Discusses why NOT to extend `@assistant-ui/react-ag-ui` for agent-ui. Analysis shows react-ag-ui exists but targets AG-UI protocol (CopilotKit) while agent-ui targets Claude Agent SDK.

3. **CodeLayer Validation**: Lines 661-692 - Shows how CodeLayer features map to proposed primitives. This validates the design but is external to the codebase.

4. **Existing Patterns Reuse**: Lines 10010-10121 - Lists patterns to reuse (RunAggregator approach, custom RuntimeCore, notifyUpdate pattern) vs protocol-specific code.

## Related Research

No related research documents found in the codebase.

## Open Questions

Based on analysis:

1. **Properties vs Actions Separation**: Should this pattern be applied retroactively to existing chat primitives? The proposal introduces this separation clearly, but it doesn't exist in the current codebase.

2. **Primitives Package Structure**: Should agent primitives live in `packages/react-agent-primitives/` (as proposed) or be integrated into `packages/react/src/primitives/` alongside chat primitives? Separate package aligns with proposal but adds package overhead.

3. **Action Nesting Depth**: The proposal suggests "full nesting" (e.g., `AgentPrimitive.Actions.Lifecycle.Pause`) for clarity. Should the codebase enforce this strictly, or allow convenience aliases for common actions?

4. **Streaming Granularity**: The proposal asks about "per-character" vs "per-line" streaming for tool output. This implementation detail will affect ToolExecutionPrimitive design significantly.

5. **Tool-UI-Server Package**: According to investigation, this package does NOT exist yet (only in planning docs). Should it be built as a prerequisite to agent-ui, or can agent-ui proceed without it and use existing AssistantFrame infrastructure?

6. **Integration with Existing Chat Primitives**: Apps may want both chat and agent primitives. Are there shared components that should be extracted to a common package?

## Implementation Recommendations

Based on analysis of the codebase and the proposal:

### 1. Follow Established Patterns

The agent-ui features would fit naturally into the codebase by following these existing patterns:

- **Runtime Structure**: Implement `WorkspaceRuntime`, `TaskRuntime`, `AgentRuntime` following `ThreadRuntime` pattern
- **Primitives**: Create primitives like `TaskPrimitive`, `AgentPrimitive` following `ThreadPrimitive`/`MessagePrimitive` Radix style
- **Integration**: Build `@assistant-ui/react-agent-sdk` following `@assistant-ui/react-ai-sdk` pattern
- **Context**: Create context providers and hooks using existing utilities in `context/react/utils/`
- **Bindings**: Use `SubscribableWithState`, `ShallowMemoizeSubject`, `NestedSubscriptionSubject` for state derivation

### 2. New Patterns to Implement

The proposal introduces patterns that don't currently exist:

- **Explicit Properties vs Actions separation**: Enforce that all actions live in `.Actions` namespace
- **Full action nesting**: Use `AgentPrimitive.Actions.Lifecycle.Pause` pattern during development
- **Strict action button pattern**: Hook returns callback or null

### 3. Package Structure Recommendation

Based on existing integration packages (`react-ai-sdk`, `react-langgraph`, `react-ag-ui`):

```
packages/
├── react/                    # Keep existing chat primitives here
├── react-agent-sdk/          # NEW - Claude Agent SDK integration
│   ├── src/
│   │   ├── runtime-cores/    # TaskRuntimeCore, AgentRuntimeCore, etc.
│   │   ├── runtime/          # TaskRuntime, AgentRuntime implementations
│   │   ├── context/          # Context providers
│   │   ├── hooks/            # useAgentRuntime, useTaskRuntime, etc.
│   │   ├── converters/       # Claude SDK message converters
│   │   └── index.ts          # Main exports
│   └── package.json
│
├── react-agent-primitives/   # NEW - Agent UI primitives
│   ├── src/
│   │   ├── task/             # TaskPrimitive, TaskTreePrimitive, etc.
│   │   ├── agent/            # AgentPrimitive, AgentFeedPrimitive, etc.
│   │   ├── approval/         # ApprovalPrimitive, ApprovalQueuePrimitive, etc.
│   │   ├── tools/            # ToolExecutionPrimitive and built-in widgets
│   │   └── index.ts          # Namespace exports
│   └── package.json
│
└── tool-ui-server/           # NEW - Shared tool UI infrastructure
    ├── src/
    │   ├── RemoteToolUI.tsx  # Main component
    │   ├── streaming.ts      # Streaming support utilities
    │   ├── protocol.ts       # Message bridge protocol
    │   └── index.ts
    └── package.json
```

### 4. Implementation Sequence

Based on analysis and proposal's "Next Steps":

1. **Extend iframe infrastructure** - Add streaming support to AssistantFrame
2. **Prototype TaskTreePrimitive** - Visualize task/agent hierarchy (lowest risk)
3. **Prototype AgentFeedPrimitive** - Core activity feed visualization
4. **Build @assistant-ui/react-agent-sdk** - Runtime integration with Claude SDK
5. **Build full primitives** - Implement TaskPrimitive, AgentPrimitive, ApprovalPrimitive
6. **Create example app** - "Agent dashboard" demonstrating full capabilities

### 5. Critical Considerations

**Coexistence with Chat Primitives**:
- Apps like CodeLayer likely want BOTH chat and agent primitives
- Consider shared components or utilities
- Avoid duplication in core runtime abstractions

**Migration Path**:
- New Properties vs Actions pattern could be applied to chat primitives in future
- Consider staged migration if aligning all primitives

**Streaming Support**:
- Critical for tool UI (Bash, long-running operations)
- Must extend existing AssistantFrame infrastructure
- Consider impact on performance and iframe sandboxing

**State Management Scope**:
- Agent sessions can be long-running (hours, days)
- How to handle state persistence, reconnection?
- How does this differ from chat thread persistence?

## Summary

The agent-ui proposal's features would integrate well with the existing codebase architecture. The key alignments are:

1. **Runtime Pattern**: The proposed `WorkspaceRuntime → TaskRuntime → AgentRuntime` hierarchy mirrors the existing `AssistantRuntime → ThreadRuntime → MessageRuntime` pattern
2. **Primitive Style**: Radix-style primitive organization would extend naturally
3. **Integration Approach**: `@assistant-ui/react-agent-sdk` would follow `@assistant-ui/react-ai-sdk` pattern
4. **State Management**: SubscribableWithState, context hooks would be the same
5. **Path Navigation**: Runtime paths and binding patterns would extend

The key architectural departure is the **explicit Properties vs Actions separation**, which is a new pattern not found in the current codebase. This represents a shift in how primitives are organized and used.

Overall, the agent-ui proposal represents a coherent extension of the existing architecture, introducing new concepts (tasks, agents, approvals) while following established patterns for runtime, primitives, and integration.