# Phase 3: Core Primitives Implementation Plan

**Date**: January 2026
**Status**: Detailed Implementation Plan
**Related**:
  - `/notes/proposals/agent-ui-implementation-plan.md` - Master plan (Phase 3 section)
  - `/notes/proposals/agent-ui-proposal.md` - Full specification
  - `/notes/research/agent-ui-proposal-codebase-implementationanalysis.md` - Codebase analysis

---

## Overview

Phase 3 implements the 3 essential primitives for basic supervision UX (TaskPrimitive, AgentPrimitive, ApprovalPrimitive) that form the foundation of the agent-ui system. These primitives build on Phase 2's runtime implementation to provide React components for visualizing and interacting with tasks, agents, and permissions.

**Goal**: Implement TaskPrimitive, AgentPrimitive, and ApprovalPrimitive with their core Properties vs Actions pattern.

**Scope**: 3 primitives, 38 properties total, 16 actions total

**Prerequisites**: Phase 2 (Core Runtime Implementation) must be complete.

---

## Current State Analysis

### What Exists (Phase 2 Deliverables)

Based on the master plan, Phase 2 provides:

1. **Runtime Classes** (`packages/react-agent-sdk/src/runtime/`):
   - `WorkspaceRuntimeImpl`, `TaskRuntimeImpl`
   - `AgentRuntimeImpl`, `AgentEventRuntimeImpl`

2. **State Objects** (`packages/react-agent-sdk/src/runtime/core/`):
   - `WorkspaceState`, `TaskState`, `AgentState`, `AgentEventState`
   - `ApprovalState`

3. **State Getter Functions**:
   - `getWorkspaceState()`, `getTaskState()`, `getAgentState()`

4. **Context Providers** (`packages/react-agent-sdk/src/context/`):
   - `WorkspaceProvider` scaffold
   - Utility functions: `createContextHook()`, `createStateHook()`, `createApiHook()`

5. **Stream Processor Skeleton** (`packages/react-agent-sdk/src/streaming/AgentStreamProcessor.ts`):
   - Class structure with placeholder methods

### What We're Building

**New Package**: `packages/react-agent-primitives/` (created in this phase)

The primitives follow the **Radix-style** pattern from `packages/react/src/primitives/`:

```typescript
// Root component - thin wrapper
export namespace TaskPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}
export const TaskPrimitiveRoot = forwardRef<...>((props, ref) => { ... });

// Properties - display state data
export const TaskPrimitiveTitle = forwardRef<...>(...);
export const TaskPrimitiveStatus = forwardRef<...>(...);

// Actions namespace (NEW pattern)
export namespace TaskPrimitiveActions {
  export class Lifecycle {
    static Cancel = TaskPrimitiveActionsLifecycleCancel;
    static Retry = TaskPrimitiveActionsLifecycleRetry;
  }
  export const Lifecycle = new Lifecycle();
}

// Action button components
export const TaskPrimitiveActionsLifecycleCancel = createActionButton(
  "TaskPrimitive.Actions.Lifecycle.Cancel",
  useTaskCancel,
);
```

### Key Pattern Discoveries

From codebase analysis (`/notes/research/agent-ui-proposal-codebase-implementationanalysis.md`):

1. **createActionButton** pattern: Hook returns `callback | null`, factory creates button
2. **Proxied State Pattern**: `ProxiedState` class with getters (see `useAssistantState.tsx:8-45`)
3. **SubscribableWithState**: Runtime bindings with `getState()` and `subscribe()`
4. **Namespace Exports**: All primitives use namespace exports (`export namespace`)

### Dependencies

- Phase 2 complete (runtime classes with state and navigation)
- `packages/react-agent-sdk` provides context providers and utilities
- `@radix-ui/react-primitive` for primitive components
- `packages/react/src/utils/createActionButton.tsx` for action button factory

---

## Package Structure

```
packages/react-agent-primitives/
├── package.json                   # NEW - package configuration
├── tsconfig.json                  # NEW - TypeScript config
├── src/
│   ├── index.ts                   # Main exports
│   │
│   ├── task/                      # Task primitive components
│   │   ├── index.ts              # Namespace exports
│   │   ├── TaskPrimitive.tsx    # Root + properties + lifecycle actions
│   │   ├── components/          # Individual property components (optional)
│   │   └── hooks/                # Task-specific hooks (optional)
│   │
│   ├── agent/                     # Agent primitive components
│   │   ├── index.ts
│   │   ├── AgentPrimitive.tsx   # Root + properties + lifecycle actions
│   │   ├── components/
│   │   └── hooks/
│   │
│   ├── approval/                  # Approval primitive components
│   │   ├── index.ts
│   │   ├── ApprovalPrimitive.tsx # Root + properties + actions
│   │   ├── components/
│   │   └── hooks/
│   │
│   └── hooks/                     # Shared primitive hooks
│       ├── useTaskState.ts      # State subscription hook
│       ├── useAgentState.ts
│       ├── useApprovalState.ts
│       ├── useTaskApi.ts        # API access hook
│       ├── useAgentApi.ts
│       └── useApprovalApi.ts
│
└── __tests__/                     # Tests
    ├── TaskPrimitive.test.tsx
    ├── AgentPrimitive.test.tsx
    └── ApprovalPrimitive.test.tsx
```

---

## Implementation Approach

### 1. Package Setup

Create the new package and configure it to follow existing patterns.

### 2. Core Hook Utilities

Create the foundational hooks that primitives will use:
- `useTaskState()`, `useAgentState()`, `useApprovalState()` - state subscription
- `useTaskApi()`, `useAgentApi()`, `useApprovalApi()` - runtime access

Follow existing pattern from `useAssistantState.tsx`:
```typescript
class ProxiedTaskState implements TaskState {
  #api: TaskRuntime;
  constructor(api: TaskRuntime) { this.#api = api; }
  get title() { return this.#api.getState().title; }
  get status() { return this.#api.getState().status; }
  // ... other getters
}

export const useTaskState = <T,>(selector: (state: TaskState) => T): T => {
  const api = useTaskApi();
  const proxiedState = useMemo(() => new ProxiedTaskState(api), [api]);
  return useSyncExternalStore(
    api.subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );
};
```

### 3. TaskPrimitive Implementation

Implement 14 properties + 4 lifecycle actions following the Properties vs Actions pattern.

### 4. AgentPrimitive Implementation

Implement 15 properties + 5 lifecycle actions following the pattern.

### 5. ApprovalPrimitive Implementation

Implement 9 properties + 7 actions following the pattern.

### 6. Testing

Component tests for all primitives using Vitest.

---

## Phase 3.1: Package Setup

### Task: Create `packages/react-agent-primitives/` package structure

#### File: `packages/react-agent-primitives/package.json`

```json
{
  "name": "@assistant-ui/react-agent-primitives",
  "version": "0.0.1",
  "description": "Agent UI primitives for agent orchestration interfaces",
  "type": "module",
  "exports": {
    ".": {
      "aui-source": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "src", "README.md"],
  "sideEffects": false,
  "scripts": {
    "build": "aui-build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@assistant-ui/react-agent-sdk": "workspace:^",
    "@assistant-ui/tap": "^0.3.5",
    "@radix-ui/primitive": "^1.1.3",
    "@radix-ui/react-primitive": "^2.1.4",
    "react": "^18 || ^19"
  },
  "devDependencies": {
    "@assistant-ui/x-buildutils": "workspace:*",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "vitest": "^4.0.16"
  },
  "peerDependencies": {
    "@types/react": "*",
    "@types/react-dom": "*",
    "react": "^18 || ^19",
    "react-dom": "^18 || ^19"
  }
}
```

**Changes**:
- Create new package file with npm configuration
- Ensure workspace dependency on `@assistant-ui/react-agent-sdk`

#### File: `packages/react-agent-primitives/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

#### File: `packages/react-agent-primitives/README.md`

```markdown
# @assistant-ui/react-agent-primitives

Agent UI primitives for building agent orchestration interfaces.

## Primitives

- **TaskPrimitive** - Display and interact with tasks
- **AgentPrimitive** - Display and interact with agents
- **ApprovalPrimitive** - Display and manage permission requests

## Installation

```bash
pnpm install @assistant-ui/react-agent-primitives
```

## Usage

```tsx
import {
  TaskPrimitive,
  AgentPrimitive,
  ApprovalPrimitive,
} from '@assistant-ui/react-agent-primitives';
```

### TaskPrimitive

```tsx
<TaskPrimitive.Root taskId="task-123">
  <TaskPrimitive.Title />
  <TaskPrimitive.Status />
  <TaskPrimitive.Progress />
  <TaskPrimitive.Actions.Lifecycle.Cancel />
</TaskPrimitive.Root>
```

### AgentPrimitive

```tsx
<AgentPrimitive.Root agentId="agent-456">
  <AgentPrimitive.Status />
  <AgentPrimitive.Cost />
  <AgentPrimitive.Actions.Lifecycle.Pause />
</AgentPrimitive.Root>
```

### ApprovalPrimitive

```tsx
<ApprovalPrimitive.Root approvalId="approval-789">
  <ApprovalPrimitive.Request />
  <ApprovalPrimitive.ToolName />
  <ApprovalPrimitive.Actions.Approve.Once />
  <ApprovalPrimitive.Actions.Reject.Once />
</ApprovalPrimitive.Root>
```
```

**Changes**:
- Create README with basic usage examples

#### File: `packages/react-agent-primitives/src/index.ts`

```typescript
// Task Primitive
export {
  TaskPrimitiveRoot as Root,
  TaskPrimitiveTitle as Title,
  TaskPrimitiveStatus as Status,
  TaskPrimitiveStrategy as Strategy,
  TaskPrimitiveProgress as Progress,
  TaskPrimitiveLeadAgent as LeadAgent,
  TaskPrimitiveWorkerAgents as WorkerAgents,
  TaskPrimitiveAgentTree as AgentTree,
  TaskPrimitiveSubtasks as Subtasks,
  TaskPrimitiveDependencies as Dependencies,
  TaskPrimitiveArtifacts as Artifacts,
  TaskPrimitiveCost as Cost,
  TaskPrimitiveDuration as Duration,
  TaskPrimitiveCreatedAt as CreatedAt,
  TaskPrimitiveCompletedAt as CompletedAt,
  TaskPrimitiveActions as Actions,
} from './task';

// Agent Primitive
export {
  AgentPrimitiveRoot as Root,
  AgentPrimitiveStatus as Status,
  AgentPrimitiveRole as Role,
  AgentPrimitiveName as Name,
  AgentPrimitiveObjective as Objective,
  AgentPrimitiveBoundaries as Boundaries,
  AgentPrimitiveOutputFormat as OutputFormat,
  AgentPrimitiveTask as Task,
  AgentPrimitiveParentAgent as ParentAgent,
  AgentPrimitiveChildAgents as ChildAgents,
  AgentPrimitiveModel as Model,
  AgentPrimitiveCost as Cost,
  AgentPrimitiveDuration as Duration,
  AgentPrimitiveContextUsage as ContextUsage,
  AgentPrimitiveCreatedAt as CreatedAt,
  AgentPrimitiveLastActivityAt as LastActivityAt,
  AgentPrimitiveError as Error,
  AgentPrimitiveActions as Actions,
} from './agent';

// Approval Primitive
export {
  ApprovalPrimitiveRoot as Root,
  ApprovalPrimitiveRequest as Request,
  ApprovalPrimitiveToolName as ToolName,
  ApprovalPrimitiveToolInput as ToolInput,
  ApprovalPrimitiveContext as Context,
  ApprovalPrimitiveStatus as Status,
  ApprovalPrimitiveAgent as Agent,
  ApprovalPrimitiveTask as Task,
  ApprovalPrimitiveDetails as Details,
  ApprovalPrimitiveActions as Actions,
} from './approval';

// Re-export as namespaces for clarity
export { TaskPrimitive } from './task';
export { AgentPrimitive } from './agent';
export { ApprovalPrimitive } from './approval';
```

**Changes**:
- Create main index file with all exports
- Use both direct exports and namespace exports

---

## Phase 3.2: Core Hook Utilities

### Task: Create state and API hooks for primitives

#### File: `packages/react-agent-primitives/src/hooks/useTaskState.ts`

```typescript
"use client";

import { useMemo, useSyncExternalStore, useDebugValue } from "react";
import { TaskState, useTaskApi } from "@assistant-ui/react-agent-sdk";

class ProxiedTaskState implements TaskState {
  #api: ReturnType<typeof useTaskApi>;
  constructor(api: ReturnType<typeof useTaskApi>) {
    this.#api = api;
  }

  get id() { return this.#api.getState().id; }
  get title() { return this.#api.getState().title; }
  get status() { return this.#api.getState().status; }
  get strategy() { return this.#api.getState().strategy; }
  get progress() { return this.#api.getState().progress; }
  get leadAgent() { return this.#api.getState().leadAgent; }
  get workerAgents() { return this.#api.getState().workerAgents; }
  get agentTree() { return this.#api.getState().agentTree; }
  get subtasks() { return this.#api.getState().subtasks; }
  get dependencies() { return this.#api.getState().dependencies; }
  get artifacts() { return this.#api.getState().artifacts; }
  get cost() { return this.#api.getState().cost; }
  get duration() { return this.#api.getState().duration; }
  get createdAt() { return this.#api.getState().createdAt; }
  get completedAt() { return this.#api.getState().completedAt; }
}

/**
 * Hook to subscribe to task state.
 *
 * @param selector Function to select a slice of task state
 * @returns Selected state
 *
 * @example
 * ```tsx
 * const title = useTaskState((state) => state.title);
 * const isCompleted = useTaskState((state) => state.status === 'completed');
 * const { cost, duration } = useTaskState((state) => ({ cost: state.cost, duration: state.duration }));
 * ```
 */
export const useTaskState = <T,>(
  selector: (state: TaskState) => T,
): T => {
  const api = useTaskApi();
  const proxiedState = useMemo(() => new ProxiedTaskState(api), [api]);
  const slice = useSyncExternalStore(
    api.subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );
  useDebugValue(slice);

  if (slice instanceof ProxiedTaskState)
    throw new Error(
      "You tried to return the entire TaskState. This is not supported due to technical limitations.",
    );

  return slice;
};
```

#### File: `packages/react-agent-primitives/src/hooks/useAgentState.ts`

```typescript
"use client";

import { useMemo, useSyncExternalStore, useDebugValue } from "react";
import { AgentState, useAgentApi } from "@assistant-ui/react-agent-sdk";

class ProxiedAgentState implements AgentState {
  #api: ReturnType<typeof useAgentApi>;
  constructor(api: ReturnType<typeof useAgentApi>) {
    this.#api = api;
  }

  get id() { return this.#api.getState().id; }
  get status() { return this.#api.getState().status; }
  get role() { return this.#api.getState().role; }
  get name() { return this.#api.getState().name; }
  get objective() { return this.#api.getState().objective; }
  get boundaries() { return this.#api.getState().boundaries; }
  get outputFormat() { return this.#api.getState().outputFormat; }
  get task() { return this.#api.getState().task; }
  get parentAgent() { return this.#api.getState().parentAgent; }
  get childAgents() { return this.#api.getState().childAgents; }
  get model() { return this.#api.getState().model; }
  get cost() { return this.#api.getState().cost; }
  get duration() { return this.#api.getState().duration; }
  get contextUsage() { return this.#api.getState().contextUsage; }
  get createdAt() { return this.#api.getState().createdAt; }
  get lastActivityAt() { return this.#api.getState().lastActivityAt; }
  get error() { return this.#api.getState().error; }
}

/**
 * Hook to subscribe to agent state.
 *
 * @param selector Function to select a slice of agent state
 * @returns Selected state
 *
 * @example
 * ```tsx
 * const status = useAgentState((state) => state.status);
 * const cost = useAgentState((state) => state.cost);
 * ```
 */
export const useAgentState = <T,>(
  selector: (state: AgentState) => T,
): T => {
  const api = useAgentApi();
  const proxiedState = useMemo(() => new ProxiedAgentState(api), [api]);
  const slice = useSyncExternalStore(
    api.subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );
  useDebugValue(slice);

  if (slice instanceof ProxiedAgentState)
    throw new Error(
      "You tried to return the entire AgentState. This is not supported due to technical limitations.",
    );

  return slice;
};
```

#### File: `packages/react-agent-primitives/src/hooks/useApprovalState.ts`

```typescript
"use client";

import { useMemo, useSyncExternalStore, useDebugValue } from "react";
import { ApprovalState, useApprovalApi } from "@assistant-ui/react-agent-sdk";

class ProxiedApprovalState implements ApprovalState {
  #api: ReturnType<typeof useApprovalApi>;
  constructor(api: ReturnType<typeof useApprovalApi>) {
    this.#api = api;
  }

  get id() { return this.#api.getState().id; }
  get request() { return this.#api.getState().request; }
  get toolName() { return this.#api.getState().toolName; }
  get toolInput() { return this.#api.getState().toolInput; }
  get context() { return this.#api.getState().context; }
  get status() { return this.#api.getState().status; }
  get agent() { return this.#api.getState().agent; }
  get task() { return this.#api.getState().task; }
  get details() { return this.#api.getState().details; }
}

/**
 * Hook to subscribe to approval state.
 *
 * @param selector Function to select a slice of approval state
 * @returns Selected state
 *
 * @example
 * ```tsx
 * const status = useApprovalState((state) => state.status);
 * const toolName = useApprovalState((state) => state.toolName);
 * ```
 */
export const useApprovalState = <T,>(
  selector: (state: ApprovalState) => T,
): T => {
  const api = useApprovalApi();
  const proxiedState = useMemo(() => new ProxiedApprovalState(api), [api]);
  const slice = useSyncExternalStore(
    api.subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );
  useDebugValue(slice);

  if (slice instanceof ProxiedApprovalState)
    throw new Error(
      "You tried to return the entire ApprovalState. This is not supported due to technical limitations.",
    );

  return slice;
};
```

#### File: `packages/react-agent-primitives/src/hooks/useTaskApi.ts`

```typescript
"use client";

import { useTaskRuntime } from "@assistant-ui/react-agent-sdk";
import type { TaskRuntime } from "@assistant-ui/react-agent-sdk";

/**
 * Hook to access the task runtime API.
 *
 * @returns TaskRuntime instance
 *
 * @example
 * ```tsx
 * const api = useTaskApi();
 * api.task().cancel();
 * ```
 */
export const useTaskApi = (): TaskRuntime => {
  return useTaskRuntime();
};
```

#### File: `packages/react-agent-primitives/src/hooks/useAgentApi.ts`

```typescript
"use client";

import { useAgentRuntime } from "@assistant-ui/react-agent-sdk";
import type { AgentRuntime } from "@assistant-ui/react-agent-sdk";

/**
 * Hook to access the agent runtime API.
 *
 * @returns AgentRuntime instance
 *
 * @example
 * ```tsx
 * const api = useAgentApi();
 * api.agent().pause();
 * ```
 */
export const useAgentApi = (): AgentRuntime => {
  return useAgentRuntime();
};
```

#### File: `packages/react-agent-primitives/src/hooks/useApprovalApi.ts`

```typescript
"use client";

import { useApprovalRuntime } from "@assistant-ui/react-agent-sdk";
import type { ApprovalRuntime } from "@assistant-ui/react-agent-sdk";

/**
 * Hook to access the approval runtime API.
 *
 * @returns ApprovalRuntime instance
 *
 * @example
 * ```tsx
 * const api = useApprovalApi();
 * api.approval().approve();
 * ```
 */
export const useApprovalApi = (): ApprovalRuntime => {
  return useApprovalRuntime();
};
```

#### File: `packages/react-agent-primitives/src/hooks/index.ts`

```typescript
export { useTaskState } from './useTaskState';
export { useAgentState } from './useAgentState';
export { useApprovalState } from './useApprovalState';
export { useTaskApi } from './useTaskApi';
export { useAgentApi } from './useAgentApi';
export { useApprovalApi } from './useApprovalApi';
```

**Changes**:
- Create 6 hook files following the proxied state pattern
- Export from hooks index file

**Success Criteria**:
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- [ ] All hooks compile without errors
- [ ] Proxied state classes properly mimic TaskState/AgentState/ApprovalState interfaces

---

## Phase 3.3: TaskPrimitive Implementation

### Task: Implement TaskPrimitive with 14 properties + 4 lifecycle actions

#### File: `packages/react-agent-primitives/src/task/TaskPrimitive.tsx`

```typescript
"use client";

import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { ActionButtonProps, ActionButtonElement } from "@assistant-ui/react/src/utils/createActionButton";
import { useTaskState, useTaskApi } from "../hooks";

// =============================================================================
// ROOT COMPONENT
// =============================================================================

export namespace TaskPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  /**
   * Props for the TaskPrimitive.Root component.
   * Accepts all standard div element props.
   */
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * The root container component for a task.
 *
 * This component wraps all task-related content and provides the foundational
 * container for task properties and actions.
 *
 * @example
 * ```tsx
 * <TaskPrimitive.Root>
 *   <TaskPrimitive.Title />
 *   <TaskPrimitive.Status />
 *   <TaskPrimitive.Actions.Lifecycle.Cancel />
 * </TaskPrimitive.Root>
 * ```
 */
export const TaskPrimitiveRoot = forwardRef<
  TaskPrimitiveRoot.Element,
  TaskPrimitiveRoot.Props
>((props, ref) => {
  const api = useTaskApi();
  const task = useTaskState((state) => state);

  // Trigger re-renders on state changes
  useTaskState(() => {
    // Empty selector ensures we subscribe to all state changes
  });

  return <Primitive.div {...props} ref={ref} />;
});

TaskPrimitiveRoot.displayName = "TaskPrimitive.Root";

// =============================================================================
// PROPERTIES - Display Components
// =============================================================================

/**
 * Displays the task title.
 */
export const TaskPrimitiveTitle = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithoutRef<typeof Primitive.h2>
>((props, ref) => {
  const title = useTaskState((state) => state.title);
  return <Primitive.h2 {...props} ref={ref}>{title}</Primitive.h2>;
});

TaskPrimitiveTitle.displayName = "TaskPrimitive.Title";

/**
 * Displays the task status (queued | planning | executing | synthesizing | completed | failed).
 */
export const TaskPrimitiveStatus = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const status = useTaskState((state) => state.status);
  return <Primitive.span {...props} ref={ref}>{status}</Primitive.span>;
});

TaskPrimitiveStatus.displayName = "TaskPrimitive.Status";

/**
 * Displays the decomposition plan/strategy from the lead agent.
 */
export const TaskPrimitiveStrategy = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof Primitive.p>
>((props, ref) => {
  const strategy = useTaskState((state) => state.strategy);
  if (!strategy) return null;
  return <Primitive.p {...props} ref={ref}>{strategy}</Primitive.p>;
});

TaskPrimitiveStrategy.displayName = "TaskPrimitive.Strategy";

/**
 * Displays task progress (subtasks completed / total).
 */
export const TaskPrimitiveProgress = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div>
>((props, ref) => {
  const progress = useTaskState((state) => state.progress);
  return (
    <Primitive.div {...props} ref={ref}>
      {progress.completed} / {progress.total}
    </Primitive.div>
  );
});

TaskPrimitiveProgress.displayName = "TaskPrimitive.Progress";

/**
 * Displays the lead agent component.
 *
 * This is a placeholder that should be rendered as AgentPrimitive in practice.
 */
export const TaskPrimitiveLeadAgent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.div {...rest} ref={ref}>{children}</Primitive.div>;
});

TaskPrimitiveLeadAgent.displayName = "TaskPrimitive.LeadAgent";

/**
 * Displays a list of worker agent components.
 */
export const TaskPrimitiveWorkerAgents = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.div {...rest} ref={ref}>{children}</Primitive.div>;
});

TaskPrimitiveWorkerAgents.displayName = "TaskPrimitive.WorkerAgents";

/**
 * Displays hierarchical view of agent relationships.
 */
export const TaskPrimitiveAgentTree = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.div {...rest} ref={ref}>{children}</Primitive.div>;
});

TaskPrimitiveAgentTree.displayName = "TaskPrimitive.AgentTree";

/**
 * Displays list of child TaskPrimitive components.
 */
export const TaskPrimitiveSubtasks = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.div {...rest} ref={ref}>{children}</Primitive.div>;
});

TaskPrimitiveSubtasks.displayName = "TaskPrimitive.Subtasks";

/**
 * Displays blocking subtasks.
 */
export const TaskPrimitiveDependencies = forwardRef<
  HTMLUListElement,
  ComponentPropsWithoutRef<typeof Primitive.ul> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.ul {...rest} ref={ref}>{children}</Primitive.ul>;
});

TaskPrimitiveDependencies.displayName = "TaskPrimitive.Dependencies";

/**
 * Displays list of created/modified files/artifacts.
 */
export const TaskPrimitiveArtifacts = forwardRef<
  HTMLUListElement,
  ComponentPropsWithoutRef<typeof Primitive.ul> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.ul {...rest} ref={ref}>{children}</Primitive.ul>;
});

TaskPrimitiveArtifacts.displayName = "TaskPrimitive.Artifacts";

/**
 * Displays aggregate cost.
 */
export const TaskPrimitiveCost = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const cost = useTaskState((state) => state.cost);
  return <Primitive.span {...props} ref={ref}>${cost.toFixed(4)}</Primitive.span>;
});

TaskPrimitiveCost.displayName = "TaskPrimitive.Cost";

/**
 * Displays total duration.
 */
export const TaskPrimitiveDuration = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const duration = useTaskState((state) => state.duration);
  return <Primitive.span {...props} ref={ref}>{duration}s</Primitive.span>;
});

TaskPrimitiveDuration.displayName = "TaskPrimitive.Duration";

/**
 * Displays when task was created.
 */
export const TaskPrimitiveCreatedAt = forwardRef<
  HTMLTimeElement,
  ComponentPropsWithoutRef<typeof Primitive.time>
>((props, ref) => {
  const createdAt = useTaskState((state) => state.createdAt);
  return <Primitive.time {...props} ref={ref}>{createdAt.toISOString()}</Primitive.time>;
});

TaskPrimitiveCreatedAt.displayName = "TaskPrimitive.CreatedAt";

/**
 * Displays when task finished (null if not completed).
 */
export const TaskPrimitiveCompletedAt = forwardRef<
  HTMLTimeElement,
  ComponentPropsWithoutRef<typeof Primitive.time>
>((props, ref) => {
  const completedAt = useTaskState((state) => state.completedAt);
  if (!completedAt) return null;
  return <Primitive.time {...props} ref={ref}>{completedAt.toISOString()}</Primitive.time>;
});

TaskPrimitiveCompletedAt.displayName = "TaskPrimitive.CompletedAt";

// =============================================================================
// ACTIONS LIFECYCLE HOOKS
// =============================================================================

/**
 * Hook that provides cancel functionality for task lifecycle.
 *
 * This hook returns a callback function that cancels the task and all its agents,
 * or null if canceling is not available.
 *
 * @returns A cancel callback function, or null if canceling is disabled
 *
 * @example
 * ```tsx
 * function CustomCancelButton() {
 *   const cancel = useTaskCancel();
 *
 *   return (
 *     <button onClick={cancel} disabled={!cancel}>
 *       {cancel ? "Cancel Task" : "Cannot Cancel"}
 *     </button>
 *   );
 * }
 * ```
 */
const useTaskCancel = () => {
  const api = useTaskApi();
  const disabled = useTaskState(({ status }) =>
    status === 'completed' || status === 'failed'
  );

  const callback = useCallback(() => {
    api.cancel();
  }, [api]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides retry functionality for task lifecycle.
 *
 * @returns A retry callback function, or null if retrying is disabled
 */
const useTaskRetry = () => {
  const api = useTaskApi();
  const disabled = useTaskState(({ status }) =>
    status === 'queued' || status === 'planning' || status === 'executing'
  );

  const callback = useCallback(() => {
    api.retry();
  }, [api]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides subtask retry functionality for task lifecycle.
 *
 * @returns A retry subtask callback function, or null if disabled
 */
const useTaskRetrySubtask = (subtaskId: string) => {
  const api = useTaskApi();
  const disabled = useTaskState(({ status }) =>
    status !== 'failed'
  );

  const callback = useCallback(() => {
    api.retrySubtask(subtaskId);
  },[api, subtaskId]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides prioritize functionality for task lifecycle.
 *
 * @returns A prioritize callback function, or null if disabled
 */
const useTaskPrioritize = () => {
  const api = useTaskApi();
  const disabled = useTaskState(({ status }) =>
    status === 'completed' || status === 'executing'
  );

  const callback = useCallback(() => {
    api.prioritize();
  }, [api]);

  if (disabled) return null;
  return callback;
};

// =============================================================================
// ACTIONS LIFECYCLE COMPONENTS
// =============================================================================

/**
 * Type definition for action button callback.
 */
type ActionButtonCallback<TProps> = (
  props: TProps,
) => React.MouseEventHandler<HTMLButtonElement> | null;

type CreateActionButton = <TProps>(
  displayName: string,
  useActionButton: ActionButtonCallback<TProps>,
  forwardProps?: (keyof NonNullable<TProps>)[],
) => React.ForwardRefExoticComponent<
  ComponentPropsWithoutRef<typeof Primitive.button> & TProps
>;

// Import createActionButton from @assistant-ui/react
const createActionButton: CreateActionButton = require('@assistant-ui/react/src/utils/createActionButton').createActionButton;

export namespace TaskPrimitiveActionsLifecycleCancel {
  export type Element = HTMLButtonElement;
  /**
   * Props for the TaskPrimitive.Actions.Lifecycle.Cancel component.
   * Inherits all button element props.
   */
  export type Props = ActionButtonProps<typeof useTaskCancel>;
}

/**
 * A button component that cancels the current task.
 *
 * This component automatically handles the cancel functionality and is disabled
 * when canceling is not available (e.g., when the task is already completed or failed).
 *
 * @example
 * ```tsx
 * <TaskPrimitive.Actions.Lifecycle.Cancel>
 *   Cancel Task
 * </TaskPrimitive.Actions.Lifecycle.Cancel>
 * ```
 */
export const TaskPrimitiveActionsLifecycleCancel = createActionButton(
  "TaskPrimitive.Actions.Lifecycle.Cancel",
  useTaskCancel,
);

TaskPrimitiveActionsLifecycleCancel.displayName = "TaskPrimitive.Actions.Lifecycle.Cancel";

export namespace TaskPrimitiveActionsLifecycleRetry {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useTaskRetry>;
}

/**
 * A button component that retries a failed task.
 *
 * @example
 * ```tsx
 * <TaskPrimitive.Actions.Lifecycle.Retry>
 *   Retry Task
 * </TaskPrimitive.Actions.Lifecycle.Retry>
 * ```
 */
export const TaskPrimitiveActionsLifecycleRetry = createActionButton(
  "TaskPrimitive.Actions.Lifecycle.Retry",
  useTaskRetry,
);

TaskPrimitiveActionsLifecycleRetry.displayName = "TaskPrimitive.Actions.Lifecycle.Retry";

export namespace TaskPrimitiveActionsLifecycleRetrySubtask {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useTaskRetrySubtask> & {
    subtaskId: string;
  };
}

/**
 * A button component that retries a specific failed subtask.
 *
 * @param subtaskId The ID of the subtask to retry
 *
 * @example
 * ```tsx
 * <TaskPrimitive.Actions.Lifecycle.RetrySubtask subtaskId="subtask-123">
 *   Retry Subtask
 * </TaskPrimitive.Actions.Lifecycle.RetrySubtask>
 * ```
 */
export const TaskPrimitiveActionsLifecycleRetrySubtask = createActionButton(
  "TaskPrimitive.Actions.Lifecycle.RetrySubtask",
  // Extract subtaskId from props and pass to hook
  (props: { subtaskId: string }) => {
    const { subtaskId } = props;
    return useTaskRetrySubtask(subtaskId);
  },
  ['subtaskId'],
);

TaskPrimitiveActionsLifecycleRetrySubtask.displayName = "TaskPrimitive.Actions.Lifecycle.RetrySubtask";

export namespace TaskPrimitiveActionsLifecyclePrioritize {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useTaskPrioritize>;
}

/**
 * A button component that moves the task up in the queue.
 *
 * @example
 * ```tsx
 * <TaskPrimitive.Actions.Lifecycle.Prioritize>
 *   Prioritize Task
 * </TaskPrimitive.Actions.Lifecycle.Prioritize>
 * ```
 */
export const TaskPrimitiveActionsLifecyclePrioritize = createActionButton(
  "TaskPrimitive.Actions.Lifecycle.Prioritize",
  useTaskPrioritize,
);

TaskPrimitiveActionsLifecyclePrioritize.displayName = "TaskPrimitive.Actions.Lifecycle.Prioritize";

// =============================================================================
// ACTIONS NAMESPACE
// =============================================================================

/**
 * Actions namespace for TaskPrimitive.
 *
 * Actions are organized into groups. In Phase 3, only the Lifecycle group is implemented.
 * Additional groups (Agents, Organization, Export) will be added in Phase 4.
 */
export namespace TaskPrimitiveActions {
  /**
   * Lifecycle actions - manage task lifecycle (cancel, retry, prioritize).
   */
  export class Lifecycle {
    static Cancel = TaskPrimitiveActionsLifecycleCancel;
    static Retry = TaskPrimitiveActionsLifecycleRetry;
    static RetrySubtask = TaskPrimitiveActionsLifecycleRetrySubtask;
    static Prioritize = TaskPrimitiveActionsLifecyclePrioritize;
  }
  export const Lifecycle = new Lifecycle();
}

// =============================================================================
// TASK NAMESPACE EXPORT
// =============================================================================

/**
 * TaskPrimitive namespace containing all components and actions.
 *
 * @example
 * ```tsx
 * <TaskPrimitive.Root>
 *   <TaskPrimitive.Title />
 *   <TaskPrimitive.Actions.Lifecycle.Cancel />
 * </TaskPrimitive.Root>
 * ```
 */
export namespace TaskPrimitive {
  export const Root = TaskPrimitiveRoot;
  export const Title = TaskPrimitiveTitle;
  export const Status = TaskPrimitiveStatus;
  export const Strategy = TaskPrimitiveStrategy;
  export const Progress = TaskPrimitiveProgress;
  export const LeadAgent = TaskPrimitiveLeadAgent;
  export const WorkerAgents = TaskPrimitiveWorkerAgents;
  export const AgentTree = TaskPrimitiveAgentTree;
  export const Subtasks = TaskPrimitiveSubtasks;
  export const Dependencies = TaskPrimitiveDependencies;
  export const Artifacts = TaskPrimitiveArtifacts;
  export const Cost = TaskPrimitiveCost;
  export const Duration = TaskPrimitiveDuration;
  export const CreatedAt = TaskPrimitiveCreatedAt;
  export const CompletedAt = TaskPrimitiveCompletedAt;
  export const Actions = TaskPrimitiveActions;
}
```

#### File: `packages/react-agent-primitives/src/task/index.ts`

```typescript
export {
  TaskPrimitive,
  TaskPrimitiveRoot,
  TaskPrimitiveTitle,
  TaskPrimitiveStatus,
  TaskPrimitiveStrategy,
  TaskPrimitiveProgress,
  TaskPrimitiveLeadAgent,
  TaskPrimitiveWorkerAgents,
  TaskPrimitiveAgentTree,
  TaskPrimitiveSubtasks,
  TaskPrimitiveDependencies,
  TaskPrimitiveArtifacts,
  TaskPrimitiveCost,
  TaskPrimitiveDuration,
  TaskPrimitiveCreatedAt,
  TaskPrimitiveCompletedAt,
  TaskPrimitiveActions,
  TaskPrimitiveActionsLifecycleCancel,
  TaskPrimitiveActionsLifecycleRetry,
  TaskPrimitiveActionsLifecycleRetrySubtask,
  TaskPrimitiveActionsLifecyclePrioritize,
} from './TaskPrimitive';
```

**Changes**:
- Create TaskPrimitive.tsx with all 14 properties and 4 lifecycle actions
- Use createActionButton pattern
- Implement Properties vs Actions separation
- Use full nesting for Actions namespace

**Success Criteria**:
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- All properties render correct data from state
- All lifecycle actions enable/disable correctly based on state
- Action buttons call runtime methods

---

## Phase 3.4: AgentPrimitive Implementation

### Task: Implement AgentPrimitive with 15 properties + 5 lifecycle actions

#### File: `packages/react-agent-primitives/src/agent/AgentPrimitive.tsx`

```typescript
"use client";

import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { ActionButtonProps, ActionButtonElement } from "@assistant-ui/react/src/utils/createActionButton";
import { useAgentState, useAgentApi } from "../hooks";

// =============================================================================
// ROOT COMPONENT
// =============================================================================

export namespace AgentPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * The root container component for an agent.
 *
 * This component wraps all agent-related content and provides the foundational
 * container for agent properties and actions.
 *
 * @example
 * ```tsx
 * <AgentPrimitive.Root>
 *   <AgentPrimitive.Status />
 *   <AgentPrimitive.Cost />
 *   <AgentPrimitive.Actions.Lifecycle.Pause />
 * </AgentPrimitive.Root>
 * ```
 */
export const AgentPrimitiveRoot = forwardRef<
  AgentPrimitiveRoot.Element,
  AgentPrimitiveRoot.Props
>((props, ref) => {
  const api = useAgentApi();
  const agent = useAgentState((state) => state);

  // Trigger re-renders on state changes
  useAgentState(() => {
    // Empty selector ensures we subscribe to all state changes
  });

  return <Primitive.div {...props} ref={ref} />;
});

AgentPrimitiveRoot.displayName = "AgentPrimitive.Root";

// =============================================================================
// PROPERTIES - Display Components
// =============================================================================

/**
 * Displays the agent status (running | paused | completed | failed | waiting).
 */
export const AgentPrimitiveStatus = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const status = useAgentState((state) => state.status);
  return <Primitive.span {...props} ref={ref}>{status}</Primitive.span>;
});

AgentPrimitiveStatus.displayName = "AgentPrimitive.Status";

/**
 * Displays the agent role (orchestrator | worker | specialist).
 */
export const AgentPrimitiveRole = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const role = useAgentState((state) => state.role);
  return <Primitive.span {...props} ref={ref}>{role}</Primitive.span>;
});

AgentPrimitiveRole.displayName = "AgentPrimitive.Role";

/**
 * Displays the agent name/title.
 */
export const AgentPrimitiveName = forwardRef<
  HTMLHeadingElement,
  ComponentPropsWithoutRef<typeof Primitive.h3>
>((props, ref) => {
  const name = useAgentState((state) => state.name);
  return <Primitive.h3 {...props} ref={ref}>{name}</Primitive.h3>;
});

AgentPrimitiveName.displayName = "AgentPrimitive.Name";

/**
 * Displays what this agent is trying to achieve.
 */
export const AgentPrimitiveObjective = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof Primitive.p>
>((props, ref) => {
  const objective = useAgentState((state) => state.objective);
  return <Primitive.p {...props} ref={ref}>{objective}</Primitive.p>;
});

AgentPrimitiveObjective.displayName = "AgentPrimitive.Objective";

/**
 * Displays scope limits/boundaries of the agent.
 */
export const AgentPrimitiveBoundaries = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof Primitive.p>
>((props, ref) => {
  const boundaries = useAgentState((state) => state.boundaries);
  if (!boundaries) return null;
  return <Primitive.p {...props} ref={ref}>{boundaries}</Primitive.p>;
});

AgentPrimitiveBoundaries.displayName = "AgentPrimitive.Boundaries";

/**
 * Displays expected output format.
 */
export const AgentPrimitiveOutputFormat = forwardRef<
  HTMLCodeElement,
  ComponentPropsWithoutRef<typeof Primitive.code>
>((props, ref) => {
  const outputFormat = useAgentState((state) => state.outputFormat);
  if (!outputFormat) return null;
  return <Primitive.code {...props} ref={ref}>{outputFormat}</Primitive.code>;
});

AgentPrimitiveOutputFormat.displayName = "AgentPrimitive.OutputFormat";

/**
 * Reference/task display for parent task.
 */
export const AgentPrimitiveTask = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.div {...rest} ref={ref}>{children}</Primitive.div>;
});

AgentPrimitiveTask.displayName = "AgentPrimitive.Task";

/**
 * Reference to parent agent.
 */
export const AgentPrimitiveParentAgent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const parentAgent = useAgentState((state) => state.parentAgent);
  if (!parentAgent) return null;
  const { children, ...rest } = props;
  return <Primitive.div {...rest} ref={ref}>{children}</Primitive.div>;
});

AgentPrimitiveParentAgent.displayName = "AgentPrimitive.ParentAgent";

/**
 * List of child agent components.
 */
export const AgentPrimitiveChildAgents = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.div {...rest} ref={ref}>{children}</Primitive.div>;
});

AgentPrimitiveChildAgents.displayName = "AgentPrimitive.ChildAgents";

/**
 * Displays the model name (e.g., claude-sonnet-4).
 */
export const AgentPrimitiveModel = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const model = useAgentState((state) => state.model);
  return <Primitive.span {...props} ref={ref}>{model}</Primitive.span>;
});

AgentPrimitiveModel.displayName = "AgentPrimitive.Model";

/**
 * Displays the agent cost.
 */
export const AgentPrimitiveCost = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const cost = useAgentState((state) => state.cost);
  return <Primitive.span {...props} ref={ref}>${cost.toFixed(4)}</Primitive.span>;
});

AgentPrimitiveCost.displayName = "AgentPrimitive.Cost";

/**
 * Displays the agent duration in seconds.
 */
export const AgentPrimitiveDuration = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const duration = useAgentState((state) => state.duration);
  return <Primitive.span {...props} ref={ref}>{duration}s</Primitive.span>;
});

AgentPrimitiveDuration.displayName = "AgentPrimitive.Duration";

/**
 * Displays token context usage (used / limit).
 */
export const AgentPrimitiveContextUsage = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const contextUsage = useAgentState((state) => state.contextUsage);
  return (
    <Primitive.span {...props} ref={ref}>
      {contextUsage.used.toLocaleString()} / {contextUsage.limit.toLocaleString()}
    </Primitive.span>
  );
});

AgentPrimitiveContextUsage.displayName = "AgentPrimitive.ContextUsage";

/**
 * Displays when the agent started.
 */
export const AgentPrimitiveCreatedAt = forwardRef<
  HTMLTimeElement,
  ComponentPropsWithoutRef<typeof Primitive.time>
>((props, ref) => {
  const createdAt = useAgentState((state) => state.createdAt);
  return <Primitive.time {...props} ref={ref}>{createdAt.toISOString()}</Primitive.time>;
});

AgentPrimitiveCreatedAt.displayName = "AgentPrimitive.CreatedAt";

/**
 * Displays most recent activity timestamp.
 */
export const AgentPrimitiveLastActivityAt = forwardRef<
  HTMLTimeElement,
  ComponentPropsWithoutRef<typeof Primitive.time>
>((props, ref) => {
  const lastActivityAt = useAgentState((state) => state.lastActivityAt);
  return <Primitive.time {...props} ref={ref}>{lastActivityAt.toISOString()}</Primitive.time>;
});

AgentPrimitiveLastActivityAt.displayName = "AgentPrimitive.LastActivityAt";

/**
 * Displays error message if agent failed (null otherwise).
 */
export const AgentPrimitiveError = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div>
>((props, ref) => {
  const error = useAgentState((state) => state.error);
  if (!error) return null;
  return <Primitive.div {...props} ref={ref}>{error}</Primitive.div>;
});

AgentPrimitiveError.displayName = "AgentPrimitive.Error";

// =============================================================================
// ACTIONS LIFECYCLE HOOKS
// =============================================================================

/**
 * Hook that provides pause functionality for agent lifecycle.
 *
 * @returns A pause callback function, or null if pausing is disabled
 */
const useAgentPause = () => {
  const api = useAgentApi();
  const disabled = useAgentState(({ status }) =>
    status !== 'running'
  );

  const callback = useCallback(() => {
    api.pause();
  }, [api]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides resume functionality for agent lifecycle.
 *
 * @returns A resume callback function, or null if resuming is disabled
 */
const useAgentResume = () => {
  const api = useAgentApi();
  const disabled = useAgentState(({ status }) =>
    status !== 'paused'
  );

  const callback = useCallback(() => {
    api.resume();
  }, [api]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides interrupt functionality for agent lifecycle.
 *
 * @returns An interrupt callback function, or null if interrupting is disabled
 */
const useAgentInterrupt = () => {
  const api = useAgentApi();
  const disabled = useAgentState(({ status }) =>
    status !== 'running'
  );

  const callback = useCallback(() => {
    api.interrupt();
  }, [api]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides cancel functionality for agent lifecycle.
 *
 * @returns A cancel callback function, or null if canceling is disabled
 */
const useAgentCancel = () => {
  const api = useAgentApi();
  const disabled = useAgentState(({ status }) =>
    status === 'completed' || status === 'failed'
  );

  const callback = useCallback(() => {
    api.cancel();
  }, [api]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides retry functionality for agent lifecycle.
 *
 * @returns A retry callback function, or null if retrying is disabled
 */
const useAgentRetry = () => {
  const api = useAgentApi();
  const disabled = useAgentState(({ status }) =>
    status === 'queued' || status === 'planning' || status === 'executing'
  );

  const callback = useCallback(() => {
    api.retry();
  }, [api]);

  if (disabled) return null;
  return callback;
};

// =============================================================================
// ACTIONS LIFECYCLE COMPONENTS
// =============================================================================

type CreateActionButton = <TProps>(
  displayName: string,
  useActionButton: (props: TProps) => React.MouseEventHandler<HTMLButtonElement> | null,
  forwardProps?: (keyof NonNullable<TProps>)[],
) => React.ForwardRefExoticComponent<
  ComponentPropsWithoutRef<typeof Primitive.button> & TProps
>;

const createActionButton: CreateActionButton = require('@assistant-ui/react/src/utils/createActionButton').createActionButton;

export namespace AgentPrimitiveActionsLifecyclePause {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useAgentPause>;
}

/**
 * A button component that pauses a running agent.
 *
 * @example
 * ```tsx
 * <AgentPrimitive.Actions.Lifecycle.Pause>
 *   Pause Agent
 * </AgentPrimitive.Actions.Lifecycle.Pause>
 * ```
 */
export const AgentPrimitiveActionsLifecyclePause = createActionButton(
  "AgentPrimitive.Actions.Lifecycle.Pause",
  useAgentPause,
);

AgentPrimitiveActionsLifecyclePause.displayName = "AgentPrimitive.Actions.Lifecycle.Pause";

export namespace AgentPrimitiveActionsLifecycleResume {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useAgentResume>;
}

/**
 * A button component that resumes a paused agent.
 *
 * @example
 * ```tsx
 * <AgentPrimitive.Actions.Lifecycle.Resume>
 *   Resume Agent
 * </AgentPrimitive.Actions.Lifecycle.Resume>
 * ```
 */
export const AgentPrimitiveActionsLifecycleResume = createActionButton(
  "AgentPrimitive.Actions.Lifecycle.Resume",
  useAgentResume,
);

AgentPrimitiveActionsLifecycleResume.displayName = "AgentPrimitive.Actions.Lifecycle.Resume";

export namespace AgentPrimitiveActionsLifecycleInterrupt {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useAgentInterrupt>;
}

/**
 * A button component that interrupts a running agent.
 *
 * @example
 * ```tsx
 * <AgentPrimitive.Actions.Lifecycle.Interrupt>
 *   Interrupt Agent
 * </AgentPrimitive.Actions.Lifecycle.Interrupt>
 * ```
 */
export const AgentPrimitiveActionsLifecycleInterrupt = createActionButton(
  "AgentPrimitive.Actions.Lifecycle.Interrupt",
  useAgentInterrupt,
);

AgentPrimitiveActionsLifecycleInterrupt.displayName = "AgentPrimitive.Actions.Lifecycle.Interrupt";

export namespace AgentPrimitiveActionsLifecycleCancel {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useAgentCancel>;
}

/**
 * A button component that cancels an agent.
 *
 * @example
 * ```tsx
 * <AgentPrimitive.Actions.Lifecycle.Cancel>
 *   Cancel Agent
 * </AgentPrimitive.Actions.Lifecycle.Cancel>
 * ```
 */
export const AgentPrimitiveActionsLifecycleCancel = createActionButton(
  "AgentPrimitive.Actions.Lifecycle.Cancel",
  useAgentCancel,
);

AgentPrimitiveActionsLifecycleCancel.displayName = "AgentPrimitive.Actions.Lifecycle.Cancel";

export namespace AgentPrimitiveActionsLifecycleRetry {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useAgentRetry>;
}

/**
 * A button component that retries a failed agent.
 *
 * @example
 * ```tsx
 * <AgentPrimitive.Actions.Lifecycle.Retry>
 *   Retry Agent
 * </AgentPrimitive.Actions.Lifecycle.Retry>
 * ```
 */
export const AgentPrimitiveActionsLifecycleRetry = createActionButton(
  "AgentPrimitive.Actions.Lifecycle.Retry",
  useAgentRetry,
);

AgentPrimitiveActionsLifecycleRetry.displayName = "AgentPrimitive.Actions.Lifecycle.Retry";

// =============================================================================
// ACTIONS NAMESPACE
// =============================================================================

/**
 * Actions namespace for AgentPrimitive.
 *
 * Actions are organized into groups. In Phase 3, only the Lifecycle group is implemented.
 * Additional groups (Branching, Organization, Export, Debug, Config) will be added in Phase 4.
 */
export namespace AgentPrimitiveActions {
  /**
   * Lifecycle actions - manage agent lifecycle (pause, resume, interrupt, cancel, retry).
   */
  export class Lifecycle {
    static Pause = AgentPrimitiveActionsLifecyclePause;
    static Resume = AgentPrimitiveActionsLifecycleResume;
    static Interrupt = AgentPrimitiveActionsLifecycleInterrupt;
    static Cancel = AgentPrimitiveActionsLifecycleCancel;
    static Retry = AgentPrimitiveActionsLifecycleRetry;
  }
  export const Lifecycle = new Lifecycle();
}

// =============================================================================
// AGENT NAMESPACE EXPORT
// =============================================================================

/**
 * AgentPrimitive namespace containing all components and actions.
 *
 * @example
 * ```tsx
 * <AgentPrimitive.Root>
 *   <AgentPrimitive.Status />
 *   <AgentPrimitive.Cost />
 *   <AgentPrimitive.Actions.Lifecycle.Pause />
 * </AgentPrimitive.Root>
 * ```
 */
export namespace AgentPrimitive {
  export const Root = AgentPrimitiveRoot;
  export const Status = AgentPrimitiveStatus;
  export const Role = AgentPrimitiveRole;
  export const Name = AgentPrimitiveName;
  export const Objective = AgentPrimitiveObjective;
  export const Boundaries = AgentPrimitiveBoundaries;
  export const OutputFormat = AgentPrimitiveOutputFormat;
  export const Task = AgentPrimitiveTask;
  export const ParentAgent = AgentPrimitiveParentAgent;
  export const ChildAgents = AgentPrimitiveChildAgents;
  export const Model = AgentPrimitiveModel;
  export const Cost = AgentPrimitiveCost;
  export const Duration = AgentPrimitiveDuration;
  export const ContextUsage = AgentPrimitiveContextUsage;
  export const CreatedAt = AgentPrimitiveCreatedAt;
  export const LastActivityAt = AgentPrimitiveLastActivityAt;
  export const Error = AgentPrimitiveError;
  export const Actions = AgentPrimitiveActions;
}
```

#### File: `packages/react-agent-primitives/src/agent/index.ts`

```typescript
export {
  AgentPrimitive,
  AgentPrimitiveRoot,
  AgentPrimitiveStatus,
  AgentPrimitiveRole,
  AgentPrimitiveName,
  AgentPrimitiveObjective,
  AgentPrimitiveBoundaries,
  AgentPrimitiveOutputFormat,
  AgentPrimitiveTask,
  AgentPrimitiveParentAgent,
  AgentPrimitiveChildAgents,
  AgentPrimitiveModel,
  AgentPrimitiveCost,
  AgentPrimitiveDuration,
  AgentPrimitiveContextUsage,
  AgentPrimitiveCreatedAt,
  AgentPrimitiveLastActivityAt,
  AgentPrimitiveError,
  AgentPrimitiveActions,
  AgentPrimitiveActionsLifecyclePause,
  AgentPrimitiveActionsLifecycleResume,
  AgentPrimitiveActionsLifecycleInterrupt,
  AgentPrimitiveActionsLifecycleCancel,
  AgentPrimitiveActionsLifecycleRetry,
} from './AgentPrimitive';
```

**Changes**:
- Create AgentPrimitive.tsx with all 15 properties and 5 lifecycle actions
- Use createActionButton pattern
- Implement Properties vs Actions separation
- Use full nesting for Actions namespace

**Success Criteria**:
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- All properties render correct data from state
- All lifecycle actions enable/disable correctly based on state
- Action buttons call runtime methods

---

## Phase 3.5: ApprovalPrimitive Implementation

### Task: Implement ApprovalPrimitive with 9 properties + 7 actions

#### File: `packages/react-agent-primitives/src/approval/ApprovalPrimitive.tsx`

```typescript
"use client";

import {
  type ComponentRef,
  forwardRef,
  ComponentPropsWithoutRef,
  useCallback,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { ActionButtonProps, ActionButtonElement } from "@assistant-ui/react/src/utils/createActionButton";
import { useApprovalState, useApprovalApi } from "../hooks";

// =============================================================================
// ROOT COMPONENT
// =============================================================================

export namespace ApprovalPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * The root container component for an approval request.
 *
 * This component wraps all approval-related content and provides the foundational
 * container for approval properties and actions.
 *
 * @example
 * ```tsx
 * <ApprovalPrimitive.Root>
 *   <ApprovalPrimitive.Request />
 *   <ApprovalPrimitive.Actions.Approve.Once />
 *   <ApprovalPrimitive.Actions.Reject.Once />
 * </ApprovalPrimitive.Root>
 * ```
 */
export const ApprovalPrimitiveRoot = forwardRef<
  ApprovalPrimitiveRoot.Element,
  ApprovalPrimitiveRoot.Props
>((props, ref) => {
  const api = useApprovalApi();
  const approval = useApprovalState((state) => state);

  // Trigger re-renders on state changes
  useApprovalState(() => {
    // Empty selector ensures we subscribe to all state changes
  });

  return <Primitive.div {...props} ref={ref} />;
});

ApprovalPrimitiveRoot.displayName = "ApprovalPrimitive.Root";

// =============================================================================
// PROPERTIES - Display Components
// =============================================================================

/**
 * Displays what the agent wants to do.
 */
export const ApprovalPrimitiveRequest = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof Primitive.p>
>((props, ref) => {
  const request = useApprovalState((state) => state.request);
  return <Primitive.p {...props} ref={ref}>{request}</Primitive.p>;
});

ApprovalPrimitiveRequest.displayName = "ApprovalPrimitive.Request";

/**
 * Displays the tool name (e.g., Bash, Edit).
 */
export const ApprovalPrimitiveToolName = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const toolName = useApprovalState((state) => state.toolName);
  return <Primitive.span {...props} ref={ref}>{toolName}</Primitive.span>;
});

ApprovalPrimitiveToolName.displayName = "ApprovalPrimitive.ToolName";

/**
 * Displays the tool arguments.
 */
export const ApprovalPrimitiveToolInput = forwardRef<
  HTMLPreElement,
  ComponentPropsWithoutRef<typeof Primitive.pre>
>((props, ref) => {
  const toolInput = useApprovalState((state) => state.toolInput);
  return <Primitive.pre {...props} ref={ref}>{JSON.stringify(toolInput, null, 2)}</Primitive.pre>;
});

ApprovalPrimitiveToolInput.displayName = "ApprovalPrimitive.ToolInput";

/**
 * Displays why the agent needs this permission.
 */
export const ApprovalPrimitiveContext = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof Primitive.p>
>((props, ref) => {
  const context = useApprovalState((state) => state.context);
  if (!context) return null;
  return <Primitive.p {...props} ref={ref}>{context}</Primitive.p>;
});

ApprovalPrimitiveContext.displayName = "ApprovalPrimitive.Context";

/**
 * Displays the approval status (pending | approved | denied | skipped).
 */
export const ApprovalPrimitiveStatus = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof Primitive.span>
>((props, ref) => {
  const status = useApprovalState((state) => state.status);
  return <Primitive.span {...props} ref={ref}>{status}</Primitive.span>;
});

ApprovalPrimitiveStatus.displayName = "ApprovalPrimitive.Status";

/**
 * Displays which agent is requesting this permission.
 */
export const ApprovalPrimitiveAgent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.div {...rest} ref={ref}>{children}</Primitive.div>;
});

ApprovalPrimitiveAgent.displayName = "ApprovalPrimitive.Agent";

/**
 * Displays which task this approval belongs to.
 */
export const ApprovalPrimitiveTask = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Primitive.div> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.div {...rest} ref={ref}>{children}</Primitive.div>;
});

ApprovalPrimitiveTask.displayName = "ApprovalPrimitive.Task";

/**
 * Displays expandable full info/details.
 */
export const ApprovalPrimitiveDetails = forwardRef<
  HTMLDetailsElement,
  ComponentPropsWithoutRef<typeof Primitive.details> & {
    children?: React.ReactNode;
  }
>((props, ref) => {
  const { children, ...rest } = props;
  return <Primitive.details {...rest} ref={ref}>{children}</Primitive.details>;
});

ApprovalPrimitiveDetails.displayName = "ApprovalPrimitive.Details";

// =============================================================================
// ACTIONS APPROVE HOOKS
// =============================================================================

/**
 * Hook that provides approve once functionality.
 *
 * @returns An approve once callback function, or null if disabled
 */
const useApprovalApproveOnce = () => {
  const api = useApprovalApi();
  const disabled = useApprovalState(({ status }) =>
    status !== 'pending'
  );

  const callback = useCallback(() => {
    api.approve({ decision: 'once' });
  }, [api]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides approve for session functionality.
 *
 * @returns An approve session callback function, or null if disabled
 */
const useApprovalApproveSession = () => {
  const api = useApprovalApi();
  const disabled = useApprovalState(({ status }) =>
    status !== 'pending'
  );

  const callback = useCallback(() => {
    api.approve({ decision: 'session' });
  }, [api]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides approve always functionality.
 *
 * @returns An approve always callback function, or null if disabled
 */
const useApprovalApproveAlways = () => {
  const api = useApprovalApi();
  const disabled = useApprovalState(({ status }) =>
    status !== 'pending'
  );

  const callback = useCallback(() => {
    api.approve({ decision: 'always' });
  }, [api]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides approve timed functionality.
 *
 * @param minutes Number of minutes to allow this tool
 * @returns An approve timed callback function, or null if disabled
 */
const useApprovalApproveTimed = (minutes: number) => {
  const api = useApprovalApi();
  const disabled = useApprovalState(({ status }) =>
    status !== 'pending'
  );

  const callback = useCallback(() => {
    api.approve({ decision: 'timed', minutes });
  }, [api, minutes]);

  if (disabled) return null;
  return callback;
};

// =============================================================================
// ACTIONS REJECT HOOKS
// =============================================================================

/**
 * Hook that provides reject once functionality.
 *
 * @returns A reject once callback function, or null if disabled
 */
const useApprovalRejectOnce = () => {
  const api = useApprovalApi();
  const disabled = useApprovalState(({ status }) =>
    status !== 'pending'
  );

  const callback = useCallback(() => {
    api.reject({ decision: 'once' });
  }, [api]);

  if (disabled) return null;
  return callback;
};

/**
 * Hook that provides reject with reason functionality.
 *
 * @param reason Reason for rejection (user input)
 * @returns A reject with reason callback function, or null if disabled
 */
const useApprovalRejectWithReason = (reason: string) => {
  const api = useApprovalApi();
  const disabled = useApprovalState(({ status }) =>
    status !== 'pending'
  );

  const callback = useCallback(() => {
    api.reject({ decision: 'withReason', reason });
  }, [api, reason]);

  if (disabled) return null;
  return callback;
};

// =============================================================================
// ACTIONS DEFER HOOKS
// =============================================================================

/**
 * Hook that provides defer functionality.
 *
 * @returns A defer callback function, or null if disabled
 */
const useApprovalDeferSkip = () => {
  const api = useApprovalApi();
  const disabled = useApprovalState(({ status }) =>
    status !== 'pending'
  );

  const callback = useCallback(() => {
    api.defer();
  }, [api]);

  if (disabled) return null;
  return callback;
};

// =============================================================================
// ACTIONS COMPONENTS
// =============================================================================

type CreateActionButton = <TProps>(
  displayName: string,
  useActionButton: (props: TProps) => React.MouseEventHandler<HTMLButtonElement> | null,
  forwardProps?: (keyof NonNullable<TProps>)[],
) => React.ForwardRefExoticComponent<
  ComponentPropsWithoutRef<typeof Primitive.button> & TProps
>;

const createActionButton: CreateActionButton = require('@assistant-ui/react/src/utils/createActionButton').createActionButton;

// Approve Actions
export namespace ApprovalPrimitiveActionsApproveOnce {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useApprovalApproveOnce>;
}

/**
 * A button component that approves this one tool call.
 *
 * @example
 * ```tsx
 * <ApprovalPrimitive.Actions.Approve.Once>
 *   Allow Once
 * </ApprovalPrimitive.Actions.Approve.Once>
 * ```
 */
export const ApprovalPrimitiveActionsApproveOnce = createActionButton(
  "ApprovalPrimitive.Actions.Approve.Once",
  useApprovalApproveOnce,
);

ApprovalPrimitiveActionsApproveOnce.displayName = "ApprovalPrimitive.Actions.Approve.Once";

export namespace ApprovalPrimitiveActionsApproveSession {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useApprovalApproveSession>;
}

/**
 * A button component that approves this tool for the current session.
 *
 * @example
 * ```tsx
 * <ApprovalPrimitive.Actions.Approve.Session>
 *   Allow for Session
 * </ApprovalPrimitive.Actions.Approve.Session>
 * ```
 */
export const ApprovalPrimitiveActionsApproveSession = createActionButton(
  "ApprovalPrimitive.Actions.Approve.Session",
  useApprovalApproveSession,
);

ApprovalPrimitiveActionsApproveSession.displayName = "ApprovalPrimitive.Actions.Approve.Session";

export namespace ApprovalPrimitiveActionsApproveAlways {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useApprovalApproveAlways>;
}

/**
 * A button component that always allows this tool.
 *
 * @example
 * ```tsx
 * <ApprovalPrimitive.Actions.Approve.Always>
 *   Always Allow
 * </ApprovalPrimitive.Actions.Approve.Always>
 * ```
 */
export const ApprovalPrimitiveActionsApproveAlways = createActionButton(
  "ApprovalPrimitive.Actions.Approve.Always",
  useApprovalApproveAlways,
);

ApprovalPrimitiveActionsApproveAlways.displayName = "ApprovalPrimitive.Actions.Approve.Always";

export namespace ApprovalPrimitiveActionsApproveTimed {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useApprovalApproveTimed> & {
    minutes: number;
  };
}

/**
 * A button component that allows this tool for a specified time.
 *
 * @param minutes Number of minutes to allow this tool
 *
 * @example
 * ```tsx
 * <ApprovalPrimitive.Actions.Approve.Timed minutes={5}>
 *   Allow for 5 Minutes
 * </ApprovalPrimitive.Actions.Approve.Timed>
 * ```
 */
export const ApprovalPrimitiveActionsApproveTimed = createActionButton(
  "ApprovalPrimitive.Actions.Approve.Timed",
  (props: { minutes: number }) => {
    const { minutes } = props;
    return useApprovalApproveTimed(minutes);
  },
  ['minutes'],
);

ApprovalPrimitiveActionsApproveTimed.displayName = "ApprovalPrimitive.Actions.Approve.Timed";

// Reject Actions
export namespace ApprovalPrimitiveActionsRejectOnce {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useApprovalRejectOnce>;
}

/**
 * A button component that denies this one tool call.
 *
 * @example
 * ```tsx
 * <ApprovalPrimitive.Actions.Reject.Once>
 *   Deny
 * </ApprovalPrimitive.Actions.Reject.Once>
 * ```
 */
export const ApprovalPrimitiveActionsRejectOnce = createActionButton(
  "ApprovalPrimitive.Actions.Reject.Once",
  useApprovalRejectOnce,
);

ApprovalPrimitiveActionsRejectOnce.displayName = "ApprovalPrimitive.Actions.Reject.Once";

export namespace ApprovalPrimitiveActionsRejectWithReason {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useApprovalRejectWithReason> & {
    reason: string;
  };
}

/**
 * A button component that denies this tool call with reason.
 *
 * @param reason Reason for the denial
 *
 * @example
 * ```tsx
 * <ApprovalPrimitive.Actions.Reject.WithReason reason="Unsafe operation">
 *   Deny with Reason
 * </ApprovalPrimitive.Actions.Reject.WithReason>
 * ```
 */
export const ApprovalPrimitiveActionsRejectWithReason = createActionButton(
  "ApprovalPrimitive.Actions.Reject.WithReason",
  (props: { reason: string }) => {
    const { reason } = props;
    return useApprovalRejectWithReason(reason);
  },
  ['reason'],
);

ApprovalPrimitiveActionsRejectWithReason.displayName = "ApprovalPrimitive.Actions.Reject.WithReason";

// Defer Actions
export namespace ApprovalPrimitiveActionsDeferSkip {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useApprovalDeferSkip>;
}

/**
 * A button component that defers this approval decision.
 *
 * @example
 * ```tsx
 * <ApprovalPrimitive.Actions.Defer.Skip>
 *   Decide Later
 * </ApprovalPrimitive.Actions.Defer.Skip>
 * ```
 */
export const ApprovalPrimitiveActionsDeferSkip = createActionButton(
  "ApprovalPrimitive.Actions.Defer.Skip",
  useApprovalDeferSkip,
);

ApprovalPrimitiveActionsDeferSkip.displayName = "ApprovalPrimitive.Actions.Defer.Skip";

// =============================================================================
// ACTIONS NAMESPACE
// =============================================================================

/**
 * Actions namespace for ApprovalPrimitive.
 *
 * Actions are organized into groups. All groups (Approve, Reject, Defer) are implemented in Phase 3.
 */
export namespace ApprovalPrimitiveActions {
  /**
   * Approve actions - allow the tool execution.
   */
  export class Approve {
    static Once = ApprovalPrimitiveActionsApproveOnce;
    static Session = ApprovalPrimitiveActionsApproveSession;
    static Always = ApprovalPrimitiveActionsApproveAlways;
    static Timed = ApprovalPrimitiveActionsApproveTimed;
  }
  export const Approve = new Approve();

  /**
   * Reject actions - deny the tool execution.
   */
  export class Reject {
    static Once = ApprovalPrimitiveActionsRejectOnce;
    static WithReason = ApprovalPrimitiveActionsRejectWithReason;
  }
  export const Reject = new Reject();

  /**
   * Defer actions - postpone the decision.
   */
  export class Defer {
    static Skip = ApprovalPrimitiveActionsDeferSkip;
  }
  export const Defer = new Defer();
}

// =============================================================================
// APPROVAL NAMESPACE EXPORT
// =============================================================================

/**
 * ApprovalPrimitive namespace containing all components and actions.
 *
 * @example
 * ```tsx
 * <ApprovalPrimitive.Root>
 *   <ApprovalPrimitive.Request />
 *   <ApprovalPrimitive.Actions.Approve.Once />
 *   <ApprovalPrimitive.Actions.Reject.Once />
 * </ApprovalPrimitive.Root>
 * ```
 */
export namespace ApprovalPrimitive {
  export const Root = ApprovalPrimitiveRoot;
  export const Request = ApprovalPrimitiveRequest;
  export const ToolName = ApprovalPrimitiveToolName;
  export const ToolInput = ApprovalPrimitiveToolInput;
  export const Context = ApprovalPrimitiveContext;
  export const Status = ApprovalPrimitiveStatus;
  export const Agent = ApprovalPrimitiveAgent;
  export const Task = ApprovalPrimitiveTask;
  export const Details = ApprovalPrimitiveDetails;
  export const Actions = ApprovalPrimitiveActions;
}
```

#### File: `packages/react-agent-primitives/src/approval/index.ts`

```typescript
export {
  ApprovalPrimitive,
  ApprovalPrimitiveRoot,
  ApprovalPrimitiveRequest,
  ApprovalPrimitiveToolName,
  ApprovalPrimitiveToolInput,
  ApprovalPrimitiveContext,
  ApprovalPrimitiveStatus,
  ApprovalPrimitiveAgent,
  ApprovalPrimitiveTask,
  ApprovalPrimitiveDetails,
  ApprovalPrimitiveActions,
  ApprovalPrimitiveActionsApproveOnce,
  ApprovalPrimitiveActionsApproveSession,
  ApprovalPrimitiveActionsApproveAlways,
  ApprovalPrimitiveActionsApproveTimed,
  ApprovalPrimitiveActionsRejectOnce,
  ApprovalPrimitiveActionsRejectWithReason,
  ApprovalPrimitiveActionsDeferSkip,
} from './ApprovalPrimitive';
```

**Changes**:
- Create ApprovalPrimitive.tsx with all 9 properties and 7 actions
- Use createActionButton pattern with params (minutes, reason)
- Implement Properties vs Actions separation
- Use full nesting for Actions namespace

**Success Criteria**:
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- All properties render correct data from state
- All approval actions enable/disable correctly based on status
- Action buttons call runtime methods with proper parameters

---

## Phase 3.6: Testing

### Task: Create component tests for primitives

#### File: `packages/react-agent-primitives/__tests__/TaskPrimitive.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as TaskPrimitive from '../src/task';

// Mock the runtime and context
vi.mock('@assistant-ui/react-agent-sdk', () => ({
  useTaskRuntime: () => ({
    getState: () => ({
      id: 'task-123',
      title: 'Fix authentication bug',
      status: 'executing',
      strategy: 'Analyze code, fix issue, add tests',
      progress: { completed: 2, total: 4 },
      leadAgent: { id: 'agent-1', name: 'Lead' },
      workerAgents: [],
      agentTree: null,
      subtasks: [],
      dependencies: [],
      artifacts: [],
      cost: 0.04,
      duration: 120,
      createdAt: new Date('2026-01-21T00:00:00Z'),
      completedAt: null,
    }),
    subscribe: vi.fn(() => vi.fn()),
    cancel: vi.fn(),
    retry: vi.fn(),
    retrySubtask: vi.fn(),
    prioritize: vi.fn(),
  }),
}));

describe('TaskPrimitive', () => {
  describe('Properties', () => {
    it('should render Root component', () => {
      render(<TaskPrimitive.Root data-testid="task-root" />);
      expect(screen.getByTestId('task-root')).toBeInTheDocument();
    });

    it('should render Title with task title', () => {
      render(<TaskPrimitive.Title />);
      expect(screen.getByText('Fix authentication bug')).toBeInTheDocument();
    });

    it('should render Status', () => {
      render(<TaskPrimitive.Status />);
      expect(screen.getByText('executing')).toBeInTheDocument();
    });

    it('should render Strategy', () => {
      render(<TaskPrimitive.Strategy />);
      expect(screen.getByText('Analyze code, fix issue, add tests')).toBeInTheDocument();
    });

    it('should render Progress', () => {
      render(<TaskPrimitive.Progress />);
      expect(screen.getByText('2 / 4')).toBeInTheDocument();
    });

    it('should render Cost', () => {
      render(<TaskPrimitive.Cost />);
      expect(screen.getByText('$0.0400')).toBeInTheDocument();
    });

    it('should render Duration', () => {
      render(<TaskPrimitive.Duration />);
      expect(screen.getByText('120s')).toBeInTheDocument();
    });

    it('should render CreatedAt', () => {
      render(<TaskPrimitive.CreatedAt />);
      expect(screen.getByText('2026-01-21T00:00:00.000Z')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render Cancel button when enabled', () => {
      render(<TaskPrimitive.Actions.Lifecycle.Cancel>Cancel</TaskPrimitive.Actions.Lifecycle.Cancel>);
      const button = screen.getByRole('button', { name: 'Cancel' });
      expect(button).not.toBeDisabled();
    });

    it('should disable Cancel button when completed', () => {
      // Update mock to return completed status
      render(<TaskPrimitive.Actions.Lifecycle.Cancel>Cancel</TaskPrimitive.Actions.Lifecycle.Cancel>);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    it('should render Retry button when enabled', () => {
      render(<TaskPrimitive.Actions.Lifecycle.Retry>Retry</TaskPrimitive.Actions.Lifecycle.Retry>);
      const button = screen.getByRole('button', { name: 'Retry' });
      expect(button).not.toBeDisabled();
    });

    it('should call runtime cancel on Cancel button click', () => {
      const { useTaskRuntime } = require('@assistant-ui/react-agent-sdk');
      const mockCancel = vi.fn();
      useTaskRuntime.mockReturnValue({
        getState: () => ({ status: 'executing' }),
        subscribe: vi.fn(() => vi.fn()),
        cancel: mockCancel,
      });

      render(<TaskPrimitive.Actions.Lifecycle.Cancel>Cancel</TaskPrimitive.Actions.Lifecycle.Cancel>);
      screen.getByRole('button', { name: 'Cancel' }).click();
      expect(mockCancel).toHaveBeenCalled();
    });
  });
});
```

#### File: `packages/react-agent-primitives/__tests__/AgentPrimitive.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as AgentPrimitive from '../src/agent';

vi.mock('@assistant-ui/react-agent-sdk', () => ({
  useAgentRuntime: () => ({
    getState: () => ({
      id: 'agent-456',
      status: 'running',
      role: 'orchestrator',
      name: 'Code Reviewer',
      objective: 'Review and fix auth bug',
      boundaries: 'Do not modify production database',
      outputFormat: 'markdown',
      task: { id: 'task-123', title: 'Fix auth bug' },
      parentAgent: null,
      childAgents: [],
      model: 'claude-sonnet-4',
      cost: 0.0234,
      duration: 45,
      contextUsage: { used: 45000, limit: 200000 },
      createdAt: new Date('2026-01-21T00:00:00Z'),
      lastActivityAt: new Date('2026-01-21T00:00:45Z'),
      error: null,
    }),
    subscribe: vi.fn(() => vi.fn()),
    pause: vi.fn(),
    resume: vi.fn(),
    interrupt: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
  }),
}));

describe('AgentPrimitive', () => {
  describe('Properties', () => {
    it('should render Root component', () => {
      render(<AgentPrimitive.Root data-testid="agent-root" />);
      expect(screen.getByTestId('agent-root')).toBeInTheDocument();
    });

    it('should render Status', () => {
      render(<AgentPrimitive.Status />);
      expect(screen.getByText('running')).toBeInTheDocument();
    });

    it('should render Role', () => {
      render(<AgentPrimitive.Role />);
      expect(screen.getByText('orchestrator')).toBeInTheDocument();
    });

    it('should render Name', () => {
      render(<AgentPrimitive.Name />);
      expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
    });

    it('should render Objective', () => {
      render(<AgentPrimitive.Objective />);
      expect(screen.getByText('Review and fix auth bug')).toBeInTheDocument();
    });

    it('should render Boundaries', () => {
      render(<AgentPrimitive.Boundaries />);
      expect(screen.getByText('Do not modify production database')).toBeInTheDocument();
    });

    it('should render Model', () => {
      render(<AgentPrimitive.Model />);
      expect(screen.getByText('claude-sonnet-4')).toBeInTheDocument();
    });

    it('should render Cost', () => {
      render(<AgentPrimitive.Cost />);
      expect(screen.getByText('$0.0234')).toBeInTheDocument();
    });

    it('should render ContextUsage', () => {
      render(<AgentPrimitive.ContextUsage />);
      expect(screen.getByText('45,000 / 200,000')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render Pause button when running', () => {
      render(<AgentPrimitive.Actions.Lifecycle.Pause>Pause</AgentPrimitive.Actions.Lifecycle.Pause>);
      expect(screen.getByRole('button', { name: 'Pause' })).not.toBeDisabled();
    });

    it('should disable Pause button when not running', () => {
      render(<AgentPrimitive.Actions.Lifecycle.Pause>Pause</AgentPrimitive.Actions.Lifecycle.Pause>);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
    });

    it('should call runtime pause on Pause button click', () => {
      const { useAgentRuntime } = require('@assistant-ui/react-agent-sdk');
      const mockPause = vi.fn();
      useAgentRuntime.mockReturnValue({
        getState: () => ({ status: 'running' }),
        subscribe: vi.fn(() => vi.fn()),
        pause: mockPause,
      });

      render(<AgentPrimitive.Actions.Lifecycle.Pause>Pause</AgentPrimitive.Actions.Lifecycle.Pause>);
      screen.getByRole('button', { name: 'Pause' }).click();
      expect(mockPause).toHaveBeenCalled();
    });
  });
});
```

#### File: `packages/react-agent-primitives/__tests__/ApprovalPrimitive.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as ApprovalPrimitive from '../src/approval';

vi.mock('@assistant-ui/react-agent-sdk', () => ({
  useApprovalRuntime: () => ({
    getState: () => ({
      id: 'approval-789',
      request: 'Run npm install to install dependencies',
      toolName: 'Bash',
      toolInput: { command: 'npm install' },
      context: 'Need to install missing dependencies',      status: 'pending',
      agent: { id: 'agent-456', name: 'Code Reviewer' },
      task: { id: 'task-123', title: 'Fix auth bug' },
      details: null,
    }),
    subscribe: vi.fn(() => vi.fn()),
    approve: vi.fn(),
    reject: vi.fn(),
    defer: vi.fn(),
  }),
}));

describe('ApprovalPrimitive', () => {
  describe('Properties', () => {
    it('should render Root component', () => {
      render(<ApprovalPrimitive.Root data-testid="approval-root" />);
      expect(screen.getByTestId('approval-root')).toBeInTheDocument();
    });

    it('should render Request', () => {
      render(<ApprovalPrimitive.Request />);
      expect(screen.getByText('Run npm install to install dependencies')).toBeInTheDocument();
    });

    it('should render ToolName', () => {
      render(<ApprovalPrimitive.ToolName />);
      expect(screen.getByText('Bash')).toBeInTheDocument();
    });

    it('should render ToolInput as JSON', () => {
      render(<ApprovalPrimitive.ToolInput />);
      expect(screen.getByText('{"command":"npm install"}')).toBeInTheDocument();
    });

    it('should render Context', () => {
      render(<ApprovalPrimitive.Context />);
      expect(screen.getByText('Need to install missing dependencies')).toBeInTheDocument();
    });

    it('should render Status', () => {
      render(<ApprovalPrimitive.Status />);
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render Approve.Once button when pending', () => {
      render(<ApprovalPrimitive.Actions.Approve.Once>Allow Once</ApprovalPrimitive.Actions.Approve.Once>);
      expect(screen.getByRole('button', { name: 'Allow Once' })).not.toBeDisabled();
    });

    it('should disable Approve and Reject buttons when not pending', () => {
      render(<ApprovalPrimitive.Actions.Approve.Once>Allow</ApprovalPrimitive.Actions.Approve.Once>);
      render(<ApprovalPrimitive.Actions.Reject.Once>Deny</ApprovalPrimitive.Actions.Reject.Once>);
      expect(screen.getByRole('button', { name: 'Allow' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Deny' })).toBeDisabled();
    });

    it('should render Approve.Timed with minutes prop', () => {
      render(<ApprovalPrimitive.Actions.Approve.Timed minutes={5}>Allow 5 min</ApprovalPrimitive.Actions.Approve.Timed>);
      expect(screen.getByRole('button', { name: 'Allow 5 min' })).not.toBeDisabled();
    });

    it('should call runtime approve on Approve.Once button click', () => {
      const { useApprovalRuntime } = require('@assistant-ui/react-agent-sdk');
      const mockApprove = vi.fn();
      useApprovalRuntime.mockReturnValue({
        getState: () => ({ status: 'pending' }),
        subscribe: vi.fn(() => vi.fn()),
        approve: mockApprove,
      });

      render(<ApprovalPrimitive.Actions.Approve.Once>Allow</ApprovalPrimitive.Actions.Approve.Once>);
      screen.getByRole('button', { name: 'Allow' }).click();
      expect(mockApprove).toHaveBeenCalledWith({ decision: 'once' });
    });

    it('should call runtime reject on Reject.Once button click', () => {
      const { useApprovalRuntime } = require('@assistant-ui/react-agent-sdk');
      const mockReject = vi.fn();
      useApprovalRuntime.mockReturnValue({
        getState: () => ({ status: 'pending' }),
        subscribe: vi.fn(() => vi.fn()),
        reject: mockReject,
      });

      render(<ApprovalPrimitive.Actions.Reject.Once>Deny</ApprovalPrimitive.Actions.Reject.Once>);
      screen.getByRole('button', { name: 'Deny' }).click();
      expect(mockReject).toHaveBeenCalledWith({ decision: 'once' });
    });

    it('should call runtime approve with minutes on Approve.Timed click', () => {
      const { useApprovalRuntime } = require('@assistant-ui/react-agent-sdk');
      const mockApprove = vi.fn();
      useApprovalRuntime.mockReturnValue({
        getState: () => ({ status: 'pending' }),
        subscribe: vi.fn(() => vi.fn()),
        approve: mockApprove,
      });

      render(<ApprovalPrimitive.Actions.Approve.Timed minutes={10}>Allow 10 min</ApprovalPrimitive.Actions.Approve.Timed>);
      screen.getByRole('button', { name: 'Allow 10 min' }).click();
      expect(mockApprove).toHaveBeenCalledWith({ decision: 'timed', minutes: 10 });
    });
  });
});
```

**Changes**:
- Create test files for all three primitives
- Test properties rendering with correct state data
- Test actions enabling/disabling based on state
- Test action callbacks calling runtime methods
- Mock runtime context for testing

**Success Criteria**:
- [ ] All tests pass: `pnpm test packages/react-agent-primitives`
- [ ] Test coverage > 80% for all primitives
- [ ] All property components tested
- All action components tested

---

## Success Criteria

### Automated Verification:
- [ ] Package builds successfully: `pnpm turbo build --filter=@assistant-ui/react-agent-primitives`
- [ ] Type checking passes: `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json`
- [ ] Unit tests pass: `pnpm test packages/react-agent-primitives`
- [ ] Linting passes: `pnpm lint`
- [ ] Format check passes: `pnpm prettier` (if configured)

### Manual Verification:
- [ ] Render TaskPrimitive showing title, status, progress, cost, duration
- [ ] Render AgentPrimitive showing status, cost, context usage, role
- [ ] Render ApprovalPrimitive with approve/reject/deny buttons
- [ ] Actions disable when appropriate (e.g., can't cancel completed task)
- [ ] Properties update in real-time as mock runtime state changes
- [ ] Clicking action buttons calls simulated runtime methods correctly
- [ ] Namespace exports work: `import { TaskPrimitive } from '@assistant-ui/react-agent-primitives'`
- [ ] Component displayName properties set correctly for debugging

---

## What We're NOT Doing

Remaining actions for TaskPrimitive and AgentPrimitive (Phase 4):
- TaskPrimitive: Agents, Organization, Export action groups
- AgentPrimitive: Branching, Organization, Export, Debug, Config action groups

Supporting primitives (Phase 4):
- TaskTreePrimitive, AgentFeedPrimitive, AgentEventPrimitive
- ToolExecutionPrimitive and built-in tool widgets
- ApprovalQueuePrimitive, PermissionModePrimitive
- TaskLauncherPrimitive, WorkspacePrimitive

Real SDK integration:
- No Claude Agent SDK connection (mock runtimes only)
- No real-time streaming
- Real SDK integration happens in Phase 5

---

## Key Implementation Notes

### Follow Existing Patterns

Follow patterns from `packages/react/src/primitives/`:
- Use `forwardRef` for all components
- Use namespace exports with `.Element` and `.Props` types
- Root components are thin wrappers around Radix `Primitive.div`
- Properties display state data, Actions perform operations
- Use `createActionButton` factory for action buttons

### Properties vs Actions Pattern

**CRITICAL N NEW PATTERN**: All actions live in `.Actions` namespace:
- Properties (display): `<TaskPrimitive.Title />`, `<AgentPrimitive.Status />`
- Actions (operations): `<TaskPrimitive.Actions.Lifecycle.Cancel />`, `<AgentPrimitive.Actions.Lifecycle.Pause />`

This is different from existing chat primitives and is a **NEW architectural pattern** for agent-ui.

### Full Nesting for Actions

Use complete nesting paths for clarity:
- `TaskPrimitive.Actions.Lifecycle.Cancel`
- `AgentPrimitive.Actions.Lifecycle.Pause`
- `ApprovalPrimitive.Actions.Approve.Once`

Do NOT create convenience aliases in this phase (can be added later).

### createActionButton Pattern

All action buttons follow this pattern:
```typescript
// 1. Hook returns callback OR null (null = disabled)
const useAction = () => {
  const api = useXApi();
  const disabled = useXState(({ status }) => status === 'completed');

  const callback = useCallback(() => {
    api.action();
  }, [api]);

  if (disabled) return null;
  return callback;
};

// 2. Factory creates button primitive
const ActionButton = createActionButton(
  "Primitive.Actions.ActionName",
  useAction,
  ['props-to-forward'], // Optional: props to forward to hook
);
```

### Runtime Integration

Primitives depend on Phase 2 runtimes:
- `useTaskRuntime()` → `TaskRuntime`
- `useAgentRuntime()` → `AgentRuntime`
- `useApprovalRuntime()` → `ApprovalRuntime`

Ensure these hooks are properly exported from `@assistant-ui/react-agent-sdk`.

### Test with Mock Runtimes

Vitest tests should use mocked runtimes with sample state:
- Mock `@assistant-ui/react-agent-sdk` context functions
- Provide realistic state objects
- Verify actions call runtime methods
- Verify enable/disable logic based on state

---

## Testing Strategy

### Unit Tests:

**TaskPrimitive**:
- All 14 property components render correctly
- Actions enable/disable based on status
- Cancel disabled when completed/failed
- Retry enabled when failed
- Prioritize enabled when queued/planning/executing
- Callbacks call runtime methods

**AgentPrimitive**:
- All 15 property components render correctly
- Actions enable/disable based on status
- Pause enabled when running
- Resume enabled when paused
- Interrupt enabled when running
- Cancel disabled when completed/failed
- Retry enabled when failed
- Callbacks call runtime methods

**ApprovalPrimitive**:
- All 9 property components render correctly
- Actions enable/disable based on pending status
- Approve actions call `api.approve({ decision: ... })`
- Reject actions call `api.reject({ decision: ... })`
- Defer actions call `api.defer()`
- ApproveTimed passes minutes parameter
- RejectWithReason passes reason parameter

### Manual Testing Steps:

1. **TaskPrimitive**:
   - Render with mock runtime showing "executing" status
   - Verify all properties display
   - Verify Cancel button enabled and clickable
   - Change status to "completed"
   - Verify Cancel button disabled
   - Click Cancel (when enabled) → verify runtime.cancel() called

2. **AgentPrimitive**:
   - Render with mock runtime showing "running" status
   - Verify all properties display
   - Verify Pause button enabled
   - Change status to "paused"
   - Verify Resume button enabled
   - Click Pause → verify runtime.pause() called

3. **ApprovalPrimitive**:
   - Render with mock runtime showing "pending" status
   - Verify all properties display
   - Verify Approve.Once and Reject.Once enabled
   - Change status to "approved"
   - Verify all buttons disabled
   - Click Approve.Once → verify runtime.approve({ decision: 'once' })

4. **Namespace Exports**:
   - Import: `import { TaskPrimitive, AgentPrimitive, ApprovalPrimitive } from '@assistant-ui/react-agent-primitives'`
   - Verify all components available via dot notation
   - Verify action namespaces work

---

## Package Dependencies

### Internal Dependencies:
- `@assistant-ui/react-agent-sdk:workspace:^` - Runtime and context providers
- `@assistant-ui/react` - `createActionButton` utility

### External Dependencies:
- `@radix-ui/react-primitive` - Radix primitives
- `@radix-ui/primitive` - Radix core
- `@assistant-ui/tap` - TAP store
- `react` >= 18 - React

### Peer Dependencies:
- `react` >= 18 | ^19
- `react-dom` >= 18 | ^19

---

## File Organization Summary

| File | Lines | Purpose |
|------|-------|---------|
| `package.json` | ~70 | Package configuration |
| `tsconfig.json` | ~20 | TypeScript configuration |
| `README.md` | ~80 | Usage documentation |
| `src/index.ts` | ~70 | Main exports |
| `src/hooks/*.ts` | ~400 | 6 hook files (~70 each) |
| `src/hooks/index.ts` | ~10 | Hooks exports |
| `src/task/TaskPrimitive.tsx` | ~450 | Task primitive + actions |
| `src/task/index.ts` | ~30 | Task exports |
| `src/agent/AgentPrimitive.tsx` | ~420 | Agent primitive + actions |
| `src/agent/index.ts` | ~30 | Agent exports |
| `src/approval/ApprovalPrimitive.tsx` | ~350 | Approval primitive + actions |
| `src/approval/index.ts` | ~30 | Approval exports |
| `__tests__/*.test.tsx` | ~300 | Component tests |
| **Total** | ~2,660 | **Estimated** |

---

## References

- Original proposal: `notes/proposals/agent-ui-proposal.md`
- Master implementation plan: `notes/proposals/agent-ui-implementation-plan.md` (Phase 3 section)
- Codebase analysis: `notes/research/agent-ui-proposal-codebase-implementationanalysis.md`
- Existing primitives: `packages/react/src/primitives/`
- createActionButton pattern: `packages/react/src/utils/createActionButton.tsx`
- State hook pattern: `packages/react/src/context/react/hooks/useAssistantState.tsx`
- Runtime pattern: `packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts:295-534`

---

## Next Steps (After Phase 3)

After completing Phase 3, proceed to Phase 4:
1. Implement remaining supporting primitives (8 primitives)
2. Complete remaining action groups for TaskPrimitive and AgentPrimitive
3. Implement built-in tool widgets (Bash, Edit, Read, Grep)
4. Add tests for all new primitives

Phase 5 will complete the system with Claude Agent SDK integration and example application.