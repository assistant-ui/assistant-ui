# Agent-UI Full Implementation Plan

## Overview

Build out the complete agent-ui primitives library following the v0.4.0 proposal, using the **Hybrid approach**: keep the existing runtime/SDK layer from the MVP, rewrite primitives to match the spec, and add the 6 missing primitives.

**Target package:** `@assistant-ui/react-agent` (single package, following assistant-ui conventions)

## Current State Analysis

### What Exists (MVP)

**Runtime Layer** (keep with extensions):
- `WorkspaceRuntime` - task management
- `TaskRuntime` - state, streaming, event processing
- `AgentRuntime` - agent state container
- `ApprovalRuntime` - approve/deny actions

**SDK Layer** (keep as-is):
- `HttpAgentClient` - browser HTTP/SSE client
- `AnthropicAgentClient` + `TaskController` - server-side SDK wrapper
- `converters.ts` - SDK event → runtime state

**Hooks** (keep, extend):
- `useAgentWorkspace`, `useWorkspaceTasks`
- `useTask`, `useTaskState`
- `useAgent`, `useAgentState`
- `useApproval`, `useApprovalState`

**Primitives** (rewrite):
- `TaskPrimitive` - basic, missing actions
- `AgentPrimitive` - basic, missing actions
- `ApprovalPrimitive` - only has `.Approve`, `.Deny`

### What's Missing

**Primitives to add:**
1. `TaskTreePrimitive` - agent hierarchy visualization
2. `ToolExecutionPrimitive` - rich tool UI
3. `ApprovalQueuePrimitive` - workspace-level approval aggregation
4. `PermissionModePrimitive` - approval mode settings
5. `TaskLauncherPrimitive` - task creation form
6. `WorkspacePrimitive` - top-level container

**Infrastructure:**
- `createActionButton` factory
- `PermissionStore` for approval persistence
- Permission mode support (per-workspace + per-task)

## Desired End State

After implementation:

1. **9 primitives** fully implemented per v0.4.0 spec
2. **Flat action structure** matching assistant-ui conventions
3. **Multiple approval modes**: Once, Session, Always, Timed
4. **Permission modes**: AskAll, AutoReads, AutoAll, Custom
5. **Approval persistence**: Session (in-memory), Always (localStorage)
6. **Updated example dashboard** using new primitives

### Verification

```bash
# Build passes
pnpm --filter @assistant-ui/react-agent build

# Types check
pnpm --filter @assistant-ui/react-agent typecheck

# Lint passes
pnpm --filter @assistant-ui/react-agent lint

# Example runs
cd examples/agent-dashboard-mvp && pnpm dev
```

## What We're NOT Doing

- RemoteToolUI/iframe integration (PR #3015) - deferred
- Built-in tool widgets (Bash terminal, diff view) - deferred
- Server-side approval persistence - just localStorage
- Subtask decomposition UI - future enhancement
- Branching/checkpoints - future enhancement

---

## Phase 1: Runtime Extensions

### Overview
Extend runtime layer with permission mode support and approval persistence infrastructure.

### Changes Required:

#### 1. Permission Store Interface
**File**: `packages/react-agent/src/runtime/PermissionStore.ts` (new)

```typescript
export type PermissionMode = "ask-all" | "auto-reads" | "auto-all" | "custom";

export interface ToolPermission {
  toolName: string;
  mode: "allow" | "ask" | "deny";
  expiresAt?: number; // for timed approvals
}

export interface PermissionStoreInterface {
  getMode(): PermissionMode;
  setMode(mode: PermissionMode): void;

  getToolPermission(toolName: string): ToolPermission | undefined;
  setToolPermission(toolName: string, permission: ToolPermission): void;
  clearToolPermission(toolName: string): void;

  // For "ApproveAlways" - persisted
  getPersistedPermissions(): ToolPermission[];
  persistPermission(toolName: string): void;
  clearPersistedPermission(toolName: string): void;

  subscribe(callback: () => void): () => void;
}

export class LocalStoragePermissionStore implements PermissionStoreInterface {
  private mode: PermissionMode = "ask-all";
  private sessionPermissions: Map<string, ToolPermission> = new Map();
  private listeners: Set<() => void> = new Set();
  private storageKey = "agent-ui-permissions";

  // Implementation...
}
```

#### 2. Extend WorkspaceRuntime
**File**: `packages/react-agent/src/runtime/WorkspaceRuntime.ts`
**Changes**:
- Add `permissionStore: PermissionStoreInterface` property
- Add `getPermissionMode()` / `setPermissionMode()` methods
- Accept optional `permissionStore` in config

```typescript
export interface WorkspaceConfig {
  apiKey?: string;
  baseUrl?: string;
  client?: AgentClientInterface;
  permissionStore?: PermissionStoreInterface; // NEW
}

export class WorkspaceRuntime {
  private permissionStore: PermissionStoreInterface;

  constructor(config: WorkspaceConfig) {
    this.permissionStore = config.permissionStore ?? new LocalStoragePermissionStore();
    // ...existing code
  }

  getPermissionStore(): PermissionStoreInterface {
    return this.permissionStore;
  }
}
```

#### 3. Extend TaskRuntime
**File**: `packages/react-agent/src/runtime/TaskRuntime.ts`
**Changes**:
- Add optional `permissionModeOverride` property
- Add `getEffectivePermissionMode()` that checks task then workspace

```typescript
export class TaskRuntime {
  private permissionModeOverride?: PermissionMode;

  setPermissionMode(mode: PermissionMode | undefined): void {
    this.permissionModeOverride = mode;
    this.notify();
  }

  getPermissionMode(): PermissionMode | undefined {
    return this.permissionModeOverride;
  }
}
```

#### 4. Extend ApprovalRuntime
**File**: `packages/react-agent/src/runtime/ApprovalRuntime.ts`
**Changes**:
- Add approval mode parameter to `approve()`
- Integrate with PermissionStore

```typescript
export type ApprovalMode = "once" | "session" | "always" | "timed";

export class ApprovalRuntime {
  private permissionStore: PermissionStoreInterface;

  async approve(mode: ApprovalMode = "once", duration?: number): Promise<void> {
    if (this.state.status !== "pending") {
      throw new Error("Can only approve pending approvals");
    }

    // Record permission based on mode
    if (mode === "session") {
      this.permissionStore.setToolPermission(this.state.toolName, {
        toolName: this.state.toolName,
        mode: "allow",
      });
    } else if (mode === "always") {
      this.permissionStore.persistPermission(this.state.toolName);
    } else if (mode === "timed" && duration) {
      this.permissionStore.setToolPermission(this.state.toolName, {
        toolName: this.state.toolName,
        mode: "allow",
        expiresAt: Date.now() + duration,
      });
    }

    await this.client.approveToolUse(this.state.taskId, this.state.id, "allow");
    this.state = { ...this.state, status: "approved" };
    this.onResolve("approved");
    this.notify();
  }

  async deny(reason?: string): Promise<void> {
    // ...existing, optionally store reason
  }
}
```

#### 5. Export new types
**File**: `packages/react-agent/src/runtime/index.ts`
**Changes**: Export new types and PermissionStore

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `pnpm --filter @assistant-ui/react-agent build`
- [ ] Types check: `pnpm --filter @assistant-ui/react-agent typecheck`
- [ ] Existing tests still pass

#### Manual Verification:
- [ ] Permission mode can be set on workspace
- [ ] Permission mode can be overridden per-task
- [ ] "ApproveAlways" survives page refresh (localStorage)

---

## Phase 2: createActionButton Factory

### Overview
Create infrastructure for consistent action button patterns with null-return disabled convention.

### Changes Required:

#### 1. createActionButton Factory
**File**: `packages/react-agent/src/actions/createActionButton.tsx` (new)

```typescript
"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";

type ActionHook = () => (() => void) | null;

export function createActionButton(
  displayName: string,
  useAction: ActionHook,
) {
  const ActionButton = forwardRef<
    HTMLButtonElement,
    ComponentPropsWithoutRef<"button">
  >(({ children, disabled, onClick, ...props }, ref) => {
    const action = useAction();

    // null means action is not available
    if (action === null) {
      return null;
    }

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      action();
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  });

  ActionButton.displayName = displayName;
  return ActionButton;
}
```

#### 2. Action Hooks for TaskPrimitive
**File**: `packages/react-agent/src/primitives/task/useTaskActions.ts` (new)

```typescript
"use client";

import { useCallback } from "react";
import { useTask, useTaskState } from "../../hooks";

export function useTaskCancel() {
  const task = useTask();
  const status = useTaskState((s) => s.status);

  const canCancel = status === "running" || status === "queued";

  return canCancel
    ? useCallback(() => task.cancel(), [task])
    : null;
}

export function useTaskRetry() {
  const task = useTask();
  const status = useTaskState((s) => s.status);

  const canRetry = status === "failed" || status === "completed";

  return canRetry
    ? useCallback(() => task.retry(), [task])
    : null;
}
```

#### 3. Action Hooks for ApprovalPrimitive
**File**: `packages/react-agent/src/primitives/approval/useApprovalActions.ts` (new)

```typescript
"use client";

import { useCallback } from "react";
import { useApproval, useApprovalState } from "../../hooks";

export function useApprovalApprove() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  return status === "pending"
    ? useCallback(() => approval.approve("once"), [approval])
    : null;
}

export function useApprovalApproveSession() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  return status === "pending"
    ? useCallback(() => approval.approve("session"), [approval])
    : null;
}

export function useApprovalApproveAlways() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  return status === "pending"
    ? useCallback(() => approval.approve("always"), [approval])
    : null;
}

export function useApprovalDeny() {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  return status === "pending"
    ? useCallback(() => approval.deny(), [approval])
    : null;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes
- [ ] Types check

#### Manual Verification:
- [ ] Action buttons render only when action is available
- [ ] Clicking action button triggers the action

---

## Phase 3: Rewrite Core Primitives

### Overview
Rewrite TaskPrimitive, AgentPrimitive, ApprovalPrimitive to match v0.4.0 spec with flat actions.

### Changes Required:

#### 1. TaskPrimitive Rewrite
**File**: `packages/react-agent/src/primitives/task/TaskPrimitive.tsx`

Components:
- `.Root` - Provider with taskId
- `.Title` - Task title span
- `.Status` - Status with optional icon
- `.Cost` - Formatted cost
- `.CreatedAt` - Creation timestamp
- `.CompletedAt` - Completion timestamp (if completed)
- `.Agents` - Render prop for agent list
- `.Approvals` - Render prop for pending approvals
- `.If` - Conditional by status
- `.Cancel` - Cancel action (via createActionButton)
- `.Retry` - Retry action (via createActionButton)

```typescript
import { createActionButton } from "../../actions/createActionButton";
import { useTaskCancel, useTaskRetry } from "./useTaskActions";

// Properties (keep similar to MVP)
// ...

// Actions (new pattern)
const TaskCancel = createActionButton("TaskPrimitive.Cancel", useTaskCancel);
const TaskRetry = createActionButton("TaskPrimitive.Retry", useTaskRetry);

export const TaskPrimitive = {
  Root: TaskRoot,
  Title: TaskTitle,
  Status: TaskStatus,
  Cost: TaskCost,
  CreatedAt: TaskCreatedAt,
  CompletedAt: TaskCompletedAt,
  Agents: TaskAgents,
  Approvals: TaskApprovals,
  If: TaskIf,
  Cancel: TaskCancel,
  Retry: TaskRetry,
};
```

#### 2. AgentPrimitive Rewrite
**File**: `packages/react-agent/src/primitives/agent/AgentPrimitive.tsx`

Components:
- `.Root`, `.Name`, `.Status`, `.Cost` - keep
- `.Events` - render prop for events
- `.Children` - render prop for child agent IDs
- `.If` - conditional by status
- `.Pause`, `.Resume`, `.Cancel` - actions (if SDK supports)

#### 3. ApprovalPrimitive Rewrite
**File**: `packages/react-agent/src/primitives/approval/ApprovalPrimitive.tsx`

Components:
- `.Root`, `.ToolName`, `.ToolInput`, `.Reason`, `.Status`, `.If` - keep
- `.Approve` - approve once (default)
- `.ApproveSession` - approve for session
- `.ApproveAlways` - approve always (persisted)
- `.ApproveTimed` - approve for duration (takes `duration` prop)
- `.Deny` - deny
- `.DenyWithReason` - deny with reason (takes `reason` prop or renders input)

```typescript
const ApprovalApprove = createActionButton("ApprovalPrimitive.Approve", useApprovalApprove);
const ApprovalApproveSession = createActionButton("ApprovalPrimitive.ApproveSession", useApprovalApproveSession);
const ApprovalApproveAlways = createActionButton("ApprovalPrimitive.ApproveAlways", useApprovalApproveAlways);
const ApprovalDeny = createActionButton("ApprovalPrimitive.Deny", useApprovalDeny);

// ApproveTimed needs special handling for duration prop
function ApprovalApproveTimed({ duration = 300000, ...props }: { duration?: number } & ComponentPropsWithoutRef<"button">) {
  const approval = useApproval();
  const status = useApprovalState((s) => s.status);

  if (status !== "pending") return null;

  return (
    <button onClick={() => approval.approve("timed", duration)} {...props}>
      {props.children ?? `Allow for ${duration / 60000} min`}
    </button>
  );
}

export const ApprovalPrimitive = {
  Root: ApprovalRoot,
  ToolName: ApprovalToolName,
  ToolInput: ApprovalToolInput,
  Reason: ApprovalReason,
  Status: ApprovalStatus,
  If: ApprovalIf,
  Approve: ApprovalApprove,
  ApproveSession: ApprovalApproveSession,
  ApproveAlways: ApprovalApproveAlways,
  ApproveTimed: ApprovalApproveTimed,
  Deny: ApprovalDeny,
  DenyWithReason: ApprovalDenyWithReason,
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes
- [ ] Types check
- [ ] Lint passes

#### Manual Verification:
- [ ] TaskPrimitive renders correctly in example
- [ ] AgentPrimitive renders correctly
- [ ] All approval modes work (Once, Session, Always, Timed)
- [ ] ApproveAlways persists across refresh

---

## Phase 4: TaskTreePrimitive

### Overview
Hierarchical visualization of agent relationships within a task.

### Changes Required:

#### 1. TaskTree Context and Hooks
**File**: `packages/react-agent/src/primitives/task/useTaskTree.ts` (new)

```typescript
"use client";

import { createContext, useContext, useState, useMemo } from "react";
import { useTaskState } from "../../hooks";
import type { AgentState } from "../../runtime";

interface TaskTreeContextValue {
  expandedNodes: Set<string>;
  selectedAgentId: string | null;
  toggleNode: (agentId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  selectAgent: (agentId: string | null) => void;
}

export const TaskTreeContext = createContext<TaskTreeContextValue | null>(null);

export function useTaskTree() {
  const ctx = useContext(TaskTreeContext);
  if (!ctx) throw new Error("useTaskTree must be used within TaskTreePrimitive.Root");
  return ctx;
}

export interface AgentTreeNode {
  agent: AgentState;
  children: AgentTreeNode[];
}

export function useAgentTree(): AgentTreeNode[] {
  const agents = useTaskState((s) => s.agents);

  return useMemo(() => {
    const roots = agents.filter((a) => !a.parentAgentId);

    const buildNode = (agent: AgentState): AgentTreeNode => ({
      agent,
      children: agents
        .filter((a) => a.parentAgentId === agent.id)
        .map(buildNode),
    });

    return roots.map(buildNode);
  }, [agents]);
}
```

#### 2. TaskTreePrimitive
**File**: `packages/react-agent/src/primitives/task/TaskTreePrimitive.tsx` (new)

```typescript
"use client";

import { useState, useMemo, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { TaskProvider, useTaskState } from "../../hooks";
import { TaskTreeContext, useTaskTree, useAgentTree, type AgentTreeNode } from "./useTaskTree";
import { createActionButton } from "../../actions/createActionButton";

interface TaskTreeRootProps {
  taskId: string;
  onSelectAgent?: (agentId: string | null) => void;
  children: ReactNode;
}

function TaskTreeRoot({ taskId, onSelectAgent, children }: TaskTreeRootProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const contextValue = useMemo(() => ({
    expandedNodes,
    selectedAgentId,
    toggleNode: (agentId: string) => {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(agentId)) next.delete(agentId);
        else next.add(agentId);
        return next;
      });
    },
    expandAll: () => {
      // Get all agent IDs and expand
    },
    collapseAll: () => setExpandedNodes(new Set()),
    selectAgent: (agentId: string | null) => {
      setSelectedAgentId(agentId);
      onSelectAgent?.(agentId);
    },
  }), [expandedNodes, selectedAgentId, onSelectAgent]);

  return (
    <TaskProvider taskId={taskId}>
      <TaskTreeContext.Provider value={contextValue}>
        {children}
      </TaskTreeContext.Provider>
    </TaskProvider>
  );
}

// Render prop for the tree structure
interface TaskTreeTreeProps {
  children: (nodes: AgentTreeNode[]) => ReactNode;
}

function TaskTreeTree({ children }: TaskTreeTreeProps) {
  const tree = useAgentTree();
  return <>{children(tree)}</>;
}

// Selected agent ID display
function TaskTreeSelectedAgent(props: ComponentPropsWithoutRef<"span">) {
  const { selectedAgentId } = useTaskTree();
  return <span {...props}>{selectedAgentId}</span>;
}

// Actions
function useExpandAll() {
  const { expandAll } = useTaskTree();
  return () => expandAll();
}

function useCollapseAll() {
  const { collapseAll } = useTaskTree();
  return () => collapseAll();
}

const TaskTreeExpandAll = createActionButton("TaskTreePrimitive.ExpandAll", useExpandAll);
const TaskTreeCollapseAll = createActionButton("TaskTreePrimitive.CollapseAll", useCollapseAll);

export const TaskTreePrimitive = {
  Root: TaskTreeRoot,
  Tree: TaskTreeTree,
  SelectedAgent: TaskTreeSelectedAgent,
  ExpandAll: TaskTreeExpandAll,
  CollapseAll: TaskTreeCollapseAll,
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes
- [ ] Types check

#### Manual Verification:
- [ ] Tree renders agent hierarchy correctly
- [ ] Parent-child relationships visible
- [ ] Expand/collapse works
- [ ] Agent selection works

---

## Phase 5: ToolExecutionPrimitive

### Overview
Rich tool UI rendering for tool_call events.

### Changes Required:

#### 1. ToolExecution Types
**File**: `packages/react-agent/src/primitives/tools/types.ts` (new)

```typescript
import type { AgentEvent, ToolCallEvent, ToolResultEvent } from "../../runtime";

export interface ToolExecution {
  id: string;
  toolName: string;
  toolInput: unknown;
  toolCallId: string;
  status: "pending" | "running" | "completed" | "error";
  result?: unknown;
  isError?: boolean;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  agentId: string;
}

export function eventsToToolExecutions(events: AgentEvent[]): ToolExecution[] {
  const executions = new Map<string, ToolExecution>();

  for (const event of events) {
    if (event.type === "tool_call") {
      const content = event.content as ToolCallEvent["content"];
      executions.set(content.toolCallId, {
        id: event.id,
        toolName: content.toolName,
        toolInput: content.toolInput,
        toolCallId: content.toolCallId,
        status: "running",
        startTime: new Date(event.timestamp),
        agentId: event.agentId,
      });
    } else if (event.type === "tool_result") {
      const content = event.content as ToolResultEvent["content"];
      const execution = executions.get(content.toolCallId);
      if (execution) {
        execution.status = content.isError ? "error" : "completed";
        execution.result = content.result;
        execution.isError = content.isError;
        execution.endTime = new Date(event.timestamp);
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      }
    }
  }

  return Array.from(executions.values());
}
```

#### 2. ToolExecutionPrimitive
**File**: `packages/react-agent/src/primitives/tools/ToolExecutionPrimitive.tsx` (new)

```typescript
"use client";

import { createContext, useContext, useState, type ReactNode, type ComponentPropsWithoutRef } from "react";
import type { ToolExecution } from "./types";

const ToolExecutionContext = createContext<ToolExecution | null>(null);

function useToolExecution() {
  const ctx = useContext(ToolExecutionContext);
  if (!ctx) throw new Error("Must be used within ToolExecutionPrimitive.Root");
  return ctx;
}

interface ToolExecutionRootProps {
  execution: ToolExecution;
  children: ReactNode;
}

function ToolExecutionRoot({ execution, children }: ToolExecutionRootProps) {
  return (
    <ToolExecutionContext.Provider value={execution}>
      {children}
    </ToolExecutionContext.Provider>
  );
}

function ToolExecutionName(props: ComponentPropsWithoutRef<"span">) {
  const { toolName } = useToolExecution();
  return <span {...props}>{toolName}</span>;
}

interface ToolExecutionInputProps extends ComponentPropsWithoutRef<"pre"> {
  format?: "json" | "raw";
}

function ToolExecutionInput({ format = "json", ...props }: ToolExecutionInputProps) {
  const { toolInput } = useToolExecution();
  const formatted = format === "json"
    ? JSON.stringify(toolInput, null, 2)
    : String(toolInput);
  return <pre {...props}>{formatted}</pre>;
}

function ToolExecutionOutput({ format = "json", ...props }: ToolExecutionInputProps) {
  const { result } = useToolExecution();
  if (result === undefined) return null;
  const formatted = format === "json"
    ? JSON.stringify(result, null, 2)
    : String(result);
  return <pre {...props}>{formatted}</pre>;
}

function ToolExecutionStatus(props: ComponentPropsWithoutRef<"span">) {
  const { status } = useToolExecution();
  return <span {...props}>{status}</span>;
}

function ToolExecutionDuration(props: ComponentPropsWithoutRef<"span">) {
  const { duration } = useToolExecution();
  if (!duration) return null;
  const seconds = (duration / 1000).toFixed(2);
  return <span {...props}>{seconds}s</span>;
}

// Expand/Collapse with local state
function ToolExecutionExpandable({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  // Render collapsed/expanded view
}

// Copy actions
function useCopyInput() {
  const { toolInput } = useToolExecution();
  return () => navigator.clipboard.writeText(JSON.stringify(toolInput, null, 2));
}

function useCopyOutput() {
  const { result } = useToolExecution();
  if (result === undefined) return null;
  return () => navigator.clipboard.writeText(JSON.stringify(result, null, 2));
}

export const ToolExecutionPrimitive = {
  Root: ToolExecutionRoot,
  Name: ToolExecutionName,
  Input: ToolExecutionInput,
  Output: ToolExecutionOutput,
  Status: ToolExecutionStatus,
  Duration: ToolExecutionDuration,
  CopyInput: createActionButton("ToolExecutionPrimitive.CopyInput", useCopyInput),
  CopyOutput: createActionButton("ToolExecutionPrimitive.CopyOutput", useCopyOutput),
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes
- [ ] Types check

#### Manual Verification:
- [ ] Tool executions display correctly
- [ ] Input/output formatting works
- [ ] Copy buttons work
- [ ] Duration shows correctly

---

## Phase 6: ApprovalQueuePrimitive

### Overview
Workspace-level approval aggregation across all tasks.

### Changes Required:

#### 1. ApprovalQueue Hooks
**File**: `packages/react-agent/src/primitives/approval/useApprovalQueue.ts` (new)

```typescript
"use client";

import { useMemo } from "react";
import { useWorkspaceTasks } from "../../hooks";
import type { ApprovalState } from "../../runtime";

export interface ApprovalQueueFilter {
  taskId?: string;
  agentId?: string;
  toolName?: string;
  status?: "pending" | "approved" | "denied";
}

export function useApprovalQueue(filter?: ApprovalQueueFilter): ApprovalState[] {
  const tasks = useWorkspaceTasks();

  return useMemo(() => {
    let approvals: ApprovalState[] = [];

    for (const task of tasks) {
      const taskState = task.getState();
      approvals.push(...taskState.pendingApprovals);
    }

    // Apply filters
    if (filter?.taskId) {
      approvals = approvals.filter((a) => a.taskId === filter.taskId);
    }
    if (filter?.agentId) {
      approvals = approvals.filter((a) => a.agentId === filter.agentId);
    }
    if (filter?.toolName) {
      approvals = approvals.filter((a) => a.toolName === filter.toolName);
    }
    if (filter?.status) {
      approvals = approvals.filter((a) => a.status === filter.status);
    }

    return approvals;
  }, [tasks, filter]);
}
```

#### 2. ApprovalQueuePrimitive
**File**: `packages/react-agent/src/primitives/approval/ApprovalQueuePrimitive.tsx` (new)

```typescript
"use client";

import { createContext, useContext, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { useApprovalQueue, type ApprovalQueueFilter } from "./useApprovalQueue";
import { useAgentWorkspace } from "../../hooks";
import type { ApprovalState } from "../../runtime";

interface ApprovalQueueContextValue {
  approvals: ApprovalState[];
  filter?: ApprovalQueueFilter;
}

const ApprovalQueueContext = createContext<ApprovalQueueContextValue | null>(null);

function useApprovalQueueContext() {
  const ctx = useContext(ApprovalQueueContext);
  if (!ctx) throw new Error("Must be used within ApprovalQueuePrimitive.Root");
  return ctx;
}

interface ApprovalQueueRootProps {
  filter?: ApprovalQueueFilter;
  children: ReactNode;
}

function ApprovalQueueRoot({ filter, children }: ApprovalQueueRootProps) {
  const approvals = useApprovalQueue(filter);

  return (
    <ApprovalQueueContext.Provider value={{ approvals, filter }}>
      {children}
    </ApprovalQueueContext.Provider>
  );
}

function ApprovalQueueCount(props: ComponentPropsWithoutRef<"span">) {
  const { approvals } = useApprovalQueueContext();
  const pending = approvals.filter((a) => a.status === "pending").length;
  return <span {...props}>{pending}</span>;
}

interface ApprovalQueueItemsProps {
  children: (approvals: ApprovalState[]) => ReactNode;
}

function ApprovalQueueItems({ children }: ApprovalQueueItemsProps) {
  const { approvals } = useApprovalQueueContext();
  return <>{children(approvals)}</>;
}

// Bulk actions
function useApproveAll() {
  const workspace = useAgentWorkspace();
  const { approvals } = useApprovalQueueContext();
  const pending = approvals.filter((a) => a.status === "pending");

  if (pending.length === 0) return null;

  return async () => {
    for (const approval of pending) {
      const task = workspace.getTask(approval.taskId);
      const approvalRuntime = task?.getApproval(approval.id);
      await approvalRuntime?.approve("once");
    }
  };
}

function useDenyAll() {
  const workspace = useAgentWorkspace();
  const { approvals } = useApprovalQueueContext();
  const pending = approvals.filter((a) => a.status === "pending");

  if (pending.length === 0) return null;

  return async () => {
    for (const approval of pending) {
      const task = workspace.getTask(approval.taskId);
      const approvalRuntime = task?.getApproval(approval.id);
      await approvalRuntime?.deny();
    }
  };
}

export const ApprovalQueuePrimitive = {
  Root: ApprovalQueueRoot,
  Count: ApprovalQueueCount,
  Items: ApprovalQueueItems,
  ApproveAll: createActionButton("ApprovalQueuePrimitive.ApproveAll", useApproveAll),
  DenyAll: createActionButton("ApprovalQueuePrimitive.DenyAll", useDenyAll),
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes
- [ ] Types check

#### Manual Verification:
- [ ] Count shows pending approvals
- [ ] Items render prop works
- [ ] Filtering by task/agent works
- [ ] ApproveAll/DenyAll work

---

## Phase 7: PermissionModePrimitive

### Overview
UI for configuring approval granularity.

### Changes Required:

#### 1. PermissionMode Hook
**File**: `packages/react-agent/src/hooks/usePermissionMode.tsx` (new)

```typescript
"use client";

import { useSyncExternalStore } from "react";
import { useAgentWorkspace } from "./useAgentWorkspace";
import type { PermissionMode } from "../runtime";

export function usePermissionMode(): PermissionMode {
  const workspace = useAgentWorkspace();
  const store = workspace.getPermissionStore();

  return useSyncExternalStore(
    (callback) => store.subscribe(callback),
    () => store.getMode(),
    () => "ask-all",
  );
}

export function useSetPermissionMode() {
  const workspace = useAgentWorkspace();
  const store = workspace.getPermissionStore();

  return (mode: PermissionMode) => store.setMode(mode);
}
```

#### 2. PermissionModePrimitive
**File**: `packages/react-agent/src/primitives/approval/PermissionModePrimitive.tsx` (new)

```typescript
"use client";

import type { ReactNode, ComponentPropsWithoutRef } from "react";
import { usePermissionMode, useSetPermissionMode } from "../../hooks/usePermissionMode";
import { createActionButton } from "../../actions/createActionButton";

function PermissionModeRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function PermissionModeCurrentMode(props: ComponentPropsWithoutRef<"span">) {
  const mode = usePermissionMode();
  const labels: Record<string, string> = {
    "ask-all": "Ask for all tools",
    "auto-reads": "Auto-approve read-only",
    "auto-all": "Auto-approve all",
    "custom": "Custom per-tool",
  };
  return <span {...props}>{labels[mode] ?? mode}</span>;
}

// Set mode actions
function useSetAskAll() {
  const setMode = useSetPermissionMode();
  return () => setMode("ask-all");
}

function useSetAutoReads() {
  const setMode = useSetPermissionMode();
  return () => setMode("auto-reads");
}

function useSetAutoAll() {
  const setMode = useSetPermissionMode();
  return () => setMode("auto-all");
}

export const PermissionModePrimitive = {
  Root: PermissionModeRoot,
  CurrentMode: PermissionModeCurrentMode,
  SetAskAll: createActionButton("PermissionModePrimitive.SetAskAll", useSetAskAll),
  SetAutoReads: createActionButton("PermissionModePrimitive.SetAutoReads", useSetAutoReads),
  SetAutoAll: createActionButton("PermissionModePrimitive.SetAutoAll", useSetAutoAll),
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes
- [ ] Types check

#### Manual Verification:
- [ ] Current mode displays
- [ ] SetAskAll/SetAutoReads/SetAutoAll work
- [ ] Mode persists in workspace

---

## Phase 8: TaskLauncherPrimitive

### Overview
Task creation form primitive.

### Changes Required:

#### 1. TaskLauncherPrimitive
**File**: `packages/react-agent/src/primitives/task/TaskLauncherPrimitive.tsx` (new)

```typescript
"use client";

import { createContext, useContext, useState, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { useAgentWorkspace } from "../../hooks";

interface TaskLauncherContextValue {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isSubmitting: boolean;
  submit: () => Promise<void>;
}

const TaskLauncherContext = createContext<TaskLauncherContextValue | null>(null);

function useTaskLauncher() {
  const ctx = useContext(TaskLauncherContext);
  if (!ctx) throw new Error("Must be used within TaskLauncherPrimitive.Root");
  return ctx;
}

interface TaskLauncherRootProps {
  onSubmit?: (taskId: string) => void;
  children: ReactNode;
}

function TaskLauncherRoot({ onSubmit, children }: TaskLauncherRootProps) {
  const workspace = useAgentWorkspace();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const task = await workspace.createTask(prompt);
      setPrompt("");
      onSubmit?.(task.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TaskLauncherContext.Provider value={{ prompt, setPrompt, isSubmitting, submit }}>
      {children}
    </TaskLauncherContext.Provider>
  );
}

function TaskLauncherInput(props: Omit<ComponentPropsWithoutRef<"textarea">, "value" | "onChange">) {
  const { prompt, setPrompt, isSubmitting } = useTaskLauncher();

  return (
    <textarea
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      disabled={isSubmitting}
      {...props}
    />
  );
}

function TaskLauncherSubmit(props: ComponentPropsWithoutRef<"button">) {
  const { prompt, isSubmitting, submit } = useTaskLauncher();

  return (
    <button
      type="button"
      onClick={submit}
      disabled={!prompt.trim() || isSubmitting}
      {...props}
    >
      {props.children ?? (isSubmitting ? "Launching..." : "Launch")}
    </button>
  );
}

export const TaskLauncherPrimitive = {
  Root: TaskLauncherRoot,
  Input: TaskLauncherInput,
  Submit: TaskLauncherSubmit,
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes
- [ ] Types check

#### Manual Verification:
- [ ] Input accepts text
- [ ] Submit creates task
- [ ] Loading state works
- [ ] onSubmit callback fires

---

## Phase 9: WorkspacePrimitive

### Overview
Top-level workspace container primitive.

### Changes Required:

#### 1. WorkspacePrimitive
**File**: `packages/react-agent/src/primitives/workspace/WorkspacePrimitive.tsx` (new)

```typescript
"use client";

import { createContext, useContext, useState, useMemo, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { useWorkspaceTasks, useAgentWorkspace } from "../../hooks";
import type { TaskRuntime } from "../../runtime";

type ViewMode = "table" | "split" | "detail";

interface WorkspaceContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedTaskId: string | null;
  selectTask: (taskId: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("Must be used within WorkspacePrimitive.Root");
  return ctx;
}

interface WorkspaceRootProps {
  defaultViewMode?: ViewMode;
  onSelectTask?: (taskId: string | null) => void;
  children: ReactNode;
}

function WorkspaceRoot({ defaultViewMode = "split", onSelectTask, children }: WorkspaceRootProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectTask = (taskId: string | null) => {
    setSelectedTaskId(taskId);
    onSelectTask?.(taskId);
  };

  const value = useMemo(() => ({
    viewMode,
    setViewMode,
    selectedTaskId,
    selectTask,
  }), [viewMode, selectedTaskId]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

interface WorkspaceTasksProps {
  children: (tasks: TaskRuntime[]) => ReactNode;
}

function WorkspaceTasks({ children }: WorkspaceTasksProps) {
  const tasks = useWorkspaceTasks();
  return <>{children(tasks)}</>;
}

function WorkspaceTotalCost(props: ComponentPropsWithoutRef<"span">) {
  const tasks = useWorkspaceTasks();
  const total = tasks.reduce((sum, t) => sum + t.getState().cost, 0);
  return <span {...props}>${total.toFixed(4)}</span>;
}

function WorkspaceSelectedTask(props: ComponentPropsWithoutRef<"span">) {
  const { selectedTaskId } = useWorkspaceContext();
  return <span {...props}>{selectedTaskId}</span>;
}

// View mode actions
function useTableView() {
  const { setViewMode, viewMode } = useWorkspaceContext();
  if (viewMode === "table") return null;
  return () => setViewMode("table");
}

function useSplitView() {
  const { setViewMode, viewMode } = useWorkspaceContext();
  if (viewMode === "split") return null;
  return () => setViewMode("split");
}

function useDetailView() {
  const { setViewMode, viewMode } = useWorkspaceContext();
  if (viewMode === "detail") return null;
  return () => setViewMode("detail");
}

export const WorkspacePrimitive = {
  Root: WorkspaceRoot,
  Tasks: WorkspaceTasks,
  TotalCost: WorkspaceTotalCost,
  SelectedTask: WorkspaceSelectedTask,
  TableView: createActionButton("WorkspacePrimitive.TableView", useTableView),
  SplitView: createActionButton("WorkspacePrimitive.SplitView", useSplitView),
  DetailView: createActionButton("WorkspacePrimitive.DetailView", useDetailView),
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes
- [ ] Types check

#### Manual Verification:
- [ ] Tasks render prop works
- [ ] Total cost aggregates correctly
- [ ] View mode switching works
- [ ] Task selection works

---

## Phase 10: Update Example Dashboard

### Overview
Migrate agent-dashboard-mvp to use new primitives.

### Changes Required:

#### 1. Update imports
Replace custom components with primitives where applicable.

#### 2. Use TaskLauncherPrimitive
Replace manual form with:
```tsx
<TaskLauncherPrimitive.Root onSubmit={setSelectedTaskId}>
  <TaskLauncherPrimitive.Input placeholder="Describe your task..." />
  <TaskLauncherPrimitive.Submit>Launch</TaskLauncherPrimitive.Submit>
</TaskLauncherPrimitive.Root>
```

#### 3. Use WorkspacePrimitive
Wrap dashboard in:
```tsx
<WorkspacePrimitive.Root>
  <WorkspacePrimitive.Tasks>
    {(tasks) => /* render task list */}
  </WorkspacePrimitive.Tasks>
</WorkspacePrimitive.Root>
```

#### 4. Use ApprovalQueuePrimitive
Replace manual approval aggregation:
```tsx
<ApprovalQueuePrimitive.Root>
  <ApprovalQueuePrimitive.Count /> pending
  <ApprovalQueuePrimitive.Items>
    {(approvals) => approvals.map(a => (
      <ApprovalPrimitive.Root key={a.id} approvalId={a.id}>
        <ApprovalPrimitive.ToolName />
        <ApprovalPrimitive.Approve>Allow</ApprovalPrimitive.Approve>
        <ApprovalPrimitive.ApproveSession>Allow for session</ApprovalPrimitive.ApproveSession>
        <ApprovalPrimitive.Deny>Deny</ApprovalPrimitive.Deny>
      </ApprovalPrimitive.Root>
    ))}
  </ApprovalQueuePrimitive.Items>
</ApprovalQueuePrimitive.Root>
```

#### 5. Use TaskTreePrimitive
Replace AgentHierarchyView:
```tsx
<TaskTreePrimitive.Root taskId={taskId} onSelectAgent={setSelectedAgentId}>
  <TaskTreePrimitive.Tree>
    {(nodes) => <TreeRenderer nodes={nodes} />}
  </TaskTreePrimitive.Tree>
</TaskTreePrimitive.Root>
```

#### 6. Use ToolExecutionPrimitive
Replace ToolExecutionCard:
```tsx
{toolExecutions.map(exec => (
  <ToolExecutionPrimitive.Root key={exec.id} execution={exec}>
    <ToolExecutionPrimitive.Name />
    <ToolExecutionPrimitive.Input format="json" />
    <ToolExecutionPrimitive.Output format="json" />
    <ToolExecutionPrimitive.Duration />
  </ToolExecutionPrimitive.Root>
))}
```

### Success Criteria:

#### Automated Verification:
- [ ] Example builds: `cd examples/agent-dashboard-mvp && pnpm build`
- [ ] No TypeScript errors
- [ ] Lint passes

#### Manual Verification:
- [ ] Dashboard renders correctly
- [ ] Task creation works
- [ ] Event streaming works
- [ ] All approval modes work
- [ ] Agent hierarchy displays
- [ ] Tool executions display
- [ ] ApproveSession persists for session
- [ ] ApproveAlways persists across refresh

---

## Testing Strategy

### Unit Tests

Add tests for:
- `PermissionStore` - mode persistence, tool permissions
- `processSDKEvent` - event conversion (already has basic coverage)
- `eventsToToolExecutions` - event aggregation
- Action hooks - return null when disabled

### Integration Tests

- Task lifecycle: create → run → complete
- Approval flow: request → approve → continue
- Multi-agent hierarchy tracking
- Permission mode changes

### Manual Testing Steps

1. Launch a task, verify events stream
2. Test each approval mode (Once, Session, Always, Timed)
3. Refresh page, verify ApproveAlways persists
4. Test with multi-agent prompts (spawn subagents)
5. Verify agent hierarchy renders correctly
6. Test cancel task mid-execution
7. Test permission mode switching

---

## References

- Proposal: `notes/proposals/agent-ui-proposal.md` (v0.4.0)
- MVP: `packages/react-agent/` and `examples/agent-dashboard-mvp/`
- assistant-ui patterns: `packages/react/src/primitives/`
