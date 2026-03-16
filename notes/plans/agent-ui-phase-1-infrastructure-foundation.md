# Phase 1: Infrastructure Foundation - Implementation Plan

**Date**: January 2026
**Status**: Draft
**Related Documents**:
- Master plan: `@/notes/proposals/agent-ui-implementation-plan.md`
- Proposal: `@/notes/proposals/agent-ui-proposal.md`
- Codebase analysis: `@/notes/research/agent-ui-proposal-codebase-implementationanalysis.md`

---

## Overview

Phase 1 creates the foundational infrastructure that all subsequent phases depend on: streaming-capable frame communication, runtime core interfaces, type-safe binding patterns, and context utilities.

**Scope**: Build infrastructure, no runtime implementations or primitives yet.

---

## Current State Analysis

### What Exists (from PR #3015)

**`@assistant-ui/tool-ui-server` package** provides:
- `MessageBridge` class for parent↔iframe communication (`packages/tool-ui-server/src/remote/message-bridge.ts`)
- `RemoteToolUI` component for rendering tool UIs in iframes (`packages/tool-ui-server/src/remote/remote-tool-ui.tsx`)
- Protocol types in `types/protocol.ts`: `AUIGlobals`, `AUIAPI`, `ParentToIframeMessage`, `IframeToParentMessage`
- Bridge script (`runtime/bridge-script.ts`) that injects `window.aui` API into iframe

**Communication protocol**:
- `AUI_SET_GLOBALS` - Send globals from parent to iframe
- `AUI_METHOD_CALL` - Call parent method from iframe (with pending calls map)
- `AUI_METHOD_RESPONSE` - Response to method call
- Legacy: `"ready"`, `"action"`, `"addResult"`, `"resize"`, `"error"`

**Limitations**:
- ❌ No streaming support - only request/response
- ❌ No rate limiting or throttling
- ❌ Fixed 30s timeout on all method calls
- ❌ No backpressure handling
- ❌ Immediate broadcast of globals updates (no buffering)

### What's Missing

- Streaming protocol messages for incremental updates
- Rate limiter utility class (target: 30fps)
- Runtime core interfaces (Workspace, Task, Agent, AgentEvent)
- Binding utilities (SubscribableWithState wrappers, path types)
- Context provider scaffolding
- Hook creation utilities

---

## Desired End State

After Phase 1 completion:

1. **AssistantFrame supports streaming**:
   - New message types for streaming data chunks
   - Rate-limited updates (max 30fps) for UI performance
   - Tool output buffering utilities
   - Extended `FrameMessage` types

2. **Runtime core interfaces defined**:
   - `WorkspaceRuntimeCore`, `TaskRuntimeCore`, `AgentRuntimeCore`, `AgentEventRuntimeCore`
   - Complete type definitions with all properties, actions, and navigation methods
   - Located in `packages/react-agent-sdk/src/runtime-cores/`

3. **Binding utilities available**:
   - `SubscribableWithState` wrapper types with proper generics
   - Path types for navigation: `WorkspaceRuntimePath`, `TaskRuntimePath`, `AgentRuntimePath`, `AgentEventRuntimePath`
   - Helper functions: `createMemoizedBinding()`, `createNestedBinding()`
   - Located in `packages/react-agent-sdk/src/runtime/`

4. **Context utilities scaffolded**:
   - `WorkspaceProvider` component (minimal implementation)
   - Hook creation utilities: `createContextHook()`, `createStateHook()`, `createApiHook()`
   - Located in `packages/react-agent-sdk/src/context/`

5. **Package structure in place**:
   - `packages/react-agent-sdk/` configured and building
   - Proper exports and package.json dependencies
   - Ready for Phase 2 implementations

---

## Implementation Approach

### Design Decisions

1. **Streaming Infrastructure**:
   - New message types added to existing protocol (not parallel channel)
   - Generic rate limiter utility reusable for other purposes
   - Streaming updates use chunked messages with sequence numbers
   - Backpressure hints from iframe to parent optional for Phase 1

2. **Binding Pattern**:
   - Copy patterns from `ThreadRuntime` but make utilities generic
   - Use existing `SubscribableWithState` interface definition
   - Reuse `ShallowMemoizeSubject` and `NestedSubscriptionSubject` from chat UI

3. **Context Providers**:
   - Create minimal working providers now
   - Full runtime integration in Phase 2
   - Hook utilities generic and reusable

4. **Package Dependencies**:
   - `react-agent-sdk` depends on `@assistant-ui/tool-ui-server` for streaming
   - Depends on `@assistant-ui/react` for binding utilities import
   - No dependency on Claude Agent SDK yet

### Architecture Integration

**Streaming on top of tool-ui-server**:
```
Packages:
├── @assistant-ui/tool-ui-server  (existing - PR #3015)
│   ├── MessageBridge (parent↔iframe)
│   ├── Protocol types
│   └── RemoteToolUI component
│
└── @assistant-ui/react-agent-sdk (new - Phase 1)
    ├── streaming/              ← Extends tool-ui-server protocol
    │   ├── RateLimiter.ts
    │   ├── StreamingMessageBridge.ts (extends MessageBridge)
    │   └── types.ts (extends protocol types)
    │
    ├── runtime-cores/         ← Defines interfaces
    │   ├── WorkspaceRuntimeCore.ts
    │   ├── TaskRuntimeCore.ts
    │   ├── AgentRuntimeCore.ts
    │   └── AgentEventRuntimeCore.ts
    │
    ├── runtime/               ← Binding utilities
    │   ├── bindings.ts (types and helpers)
    │   └── paths.ts (path type definitions)
    │
    └── context/               ← Hook utilities
        ├── providers/
        │   └── WorkspaceProvider.tsx
        ├── hooks/
        │   ├── createContextHook.ts
        │   ├── createStateHook.ts
        │   └── createApiHook.ts
        └── index.ts
```

---

## Phase 1 Implementation

### Task 1: Extend AssistantFrame for Streaming Support

**Goal**: Enable rate-limited streaming data updates between parent and iframe.

**Files to Create**:

#### 1.1 Rate Limiter Utility
*File*: `packages/react-agent-sdk/src/streaming/RateLimiter.ts`

```typescript
/**
 * Rate limiter for controlling update frequency.
 * Used to prevent UI floods from high-frequency data streams.
 *
 * Target: 30fps (~33ms between updates) for smooth UI without overwhelming React.
 */
export class RateLimiter {
  private lastCallTime = 0;
  private pendingUpdate = false;
  private queue: (() => void)[] = [];

  constructor(private readonly minIntervalMs: number = 33) {} // 30fps = ~33ms

  /**
   * Schedule a callback to run. Returns true if run immediately,
   * false if queued for later execution.
   */
  schedule(callback: () => void): boolean {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall >= this.minIntervalMs) {
      // Rate limit OK - run immediately
      this.lastCallTime = now;
      this.pendingUpdate = false;
      callback();
      return true;
    }

    // Rate limited - queue callback
    if (!this.pendingUpdate) {
      this.queue.push(callback);
      this.pendingUpdate = true;

      // Schedule next update
      const delay = this.minIntervalMs - timeSinceLastCall;
      setTimeout(() => this.flush(), delay);
    } else {
      // Add to queue if pending
      this.queue.push(callback);
    }

    return false;
  }

  /**
   * Flush queued callbacks. Called internally when rate limit window expires.
   */
  private flush(): void {
    if (this.queue.length === 0) {
      this.pendingUpdate = false;
      return;
    }

    // Merge all pending callbacks into one
    const callbacks = [...this.queue];
    this.queue = [];

    // Execute merged operation
    const lastCallback = callbacks[callbacks.length - 1];
    lastCallback();

    this.lastCallTime = Date.now();
    this.pendingUpdate = false;
  }

  /**
   * Reset the rate limiter state.
   */
  reset(): void {
    this.lastCallTime = 0;
    this.pendingUpdate = false;
    this.queue = [];
  }
}
```

#### 1.2 Streaming Protocol Types
*File*: `packages/react-agent-sdk/src/streaming/types.ts`

```typescript
import type {
  ParentToIframeMessage,
  IframeToParentMessage,
} from "@assistant-ui/tool-ui-server";

/**
 * Streaming-specific message extending the base protocol.
 * Used for chunked data updates with rate limiting.
 */

// Parent → Iframe streaming messages
export interface StreamingUpdateMessage extends ParentToIframeMessage {
  // Keep base type, add streaming-specific field
  type: "AUI_STREAMING_UPDATE";
  streamId: string;
  chunkIndex: number;
  totalChunks: number;
  data: unknown;
}

// Iframe → Parent streaming messages
export interface StreamingChunkMessage extends IframeToParentMessage {
  type: "AUI_STREAMING_CHUNK";
  streamId: string;
  chunkIndex: number;
  totalChunks: number;
  data: unknown;
}

// Union type for streaming messages
export type StreamingMessage =
  | StreamingUpdateMessage
  | StreamingChunkMessage;

// Stream metadata
export interface StreamMetadata {
  streamId: string;
  totalChunks: number;
  estimatedSizeBytes: number;
  mimeType?: string;
}
```

#### 1.3 Streaming Message Bridge
*File*: `packages/react-agent-sdk/src/streaming/StreamingMessageBridge.ts`

```typescript
import { MessageBridge, type MessageBridgeHandlers } from "@assistant-ui/tool-ui-server";
import type {
  StreamingUpdateMessage,
  StreamingChunkMessage,
} from "./types";
import { RateLimiter } from "./RateLimiter";

/**
 * Extended MessageBridge with streaming support.
 *
 * Adds:
 * - Rate-limited streaming updates (30fps max)
 * - Chunked message transmission
 * - Stream management (buffering, assembly)
 */
export class StreamingMessageBridge extends MessageBridge {
  private activeStreams = new Map<string, {
    chunks: Map<number, unknown>;
    totalChunks: number;
  }>();
  private rateLimiter = new RateLimiter(33); // 30fps

  constructor(
    handlers: MessageBridgeHandlers,
    legacyHandlers?: {
      onReady?: (() => void) | undefined;
      onAction?: ((actionId: string, payload?: unknown) => void) | undefined;
      onAddResult?: ((result: unknown) => void) | undefined;
      onResize?: ((height: number) => void) | undefined;
      onError?: ((error: string) => void) | undefined;
      onStreamingData?: (streamId: string, chunkIndex: number, data: unknown) => void;
    }
  ) {
    super(handlers, legacyHandlers);
  }

  /**
   * Send streaming update with rate limiting.
   *
   * Data is split into chunks and sent at max 30fps to prevent UI flood.
   */
  sendStreamingUpdate(
    streamId: string,
    data: unknown,
    chunkSize: number = 1024 // 1KB chunks by default
  ): void {
    const chunks = this.chunkData(data, chunkSize);
    const totalChunks = chunks.length;

    // Send each chunk with rate limiting
    chunks.forEach((chunk, index) => {
      this.rateLimiter.schedule(() => {
        this.sendChunk(streamId, index, totalChunks, chunk);
      });
    });
  }

  /**
   * Send a single chunk.
   */
  private sendChunk(
    streamId: string,
    chunkIndex: number,
    totalChunks: number,
    data: unknown
  ): void {
    if (!this.iframe?.contentWindow) return;

    const message: StreamingUpdateMessage = {
      type: "AUI_STREAMING_UPDATE",
      streamId,
      chunkIndex,
      totalChunks,
      data,
    };

    this.iframe.contentWindow.postMessage(message, "*");
  }

  /**
   * Receive streaming chunk from iframe.
   * Override parent's handleMessage to process streaming messages.
   */
  protected handleMessage(event: MessageEvent): void {
    if (!this.iframe?.contentWindow) return;
    if (event.source !== this.iframe.contentWindow) return;

    const message = event.data;
    if (!message || typeof message !== "object" || !message.type) return;

    // Handle streaming messages
    if (message.type === "AUI_STREAMING_CHUNK") {
      this.processStreamingChunk(message as StreamingChunkMessage);
      return;
    }

    // Fall back to parent's handler
    super.handleMessage(event);
  }

  /**
   * Process incoming streaming chunk.
   * Buffers chunks and notifies when complete.
   */
  private processStreamingChunk(message: StreamingChunkMessage): void {
    const { streamId, chunkIndex, totalChunks, data } = message;

    // Get or create stream buffer
    let stream = this.activeStreams.get(streamId);
    if (!stream) {
      stream = {
        chunks: new Map(),
        totalChunks,
      };
      this.activeStreams.set(streamId, stream);
    }

    // Store chunk
    stream.chunks.set(chunkIndex, data);

    // Check if complete
    if (stream.chunks.size === totalChunks) {
      // Reassemble full data
      const assembledChunks = Array.from({ length: totalChunks }, (_, i) =>
        stream!.chunks.get(i)
      );
      this.activeStreams.delete(streamId);

      // Notify handler
      (this.legacyHandlers as any)?.onStreamingData?.(streamId, assembledChunks);
    }
  }

  /**
   * Split data into chunks.
   */
  private chunkData(data: unknown, chunkSize: number): unknown[] {
    if (typeof data === "string") {
      const chunks: string[] = [];
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }
      return chunks;
    }

    // For non-string data, return single chunk
    return [data];
  }

  /**
   * Clean up stream buffers.
   */
  dispose(): void {
    this.activeStreams.clear();
    this.rateLimiter.reset();
    super.detach();
  }
}
```

---

### Task 2: Create Runtime Core Interfaces

**Goal**: Define the core interfaces for Workspace, Task, Agent, and AgentEvent runtimes.

**Files to Create**:

#### 2.1 WorkspaceRuntimeCore Interface
*File*: `packages/react-agent-sdk/src/runtime-cores/WorkspaceRuntimeCore.ts`

```typescript
/**
 * Workspace Runtime Core Interface
 *
 * Top-level runtime representing the agent workspace.
 * Manages tasks, approvals, notifications, and resources.
 */

export interface WorkspaceRuntimeCore {
  // ========================================
  // State (read-only)
  // ========================================

  /** Unique workspace identifier */
  readonly id: string;

  /** All tasks in the workspace */
  readonly tasks: readonly TaskRuntimeCore[];

  /** All approvals across all tasks */
  readonly approvalQueue: readonly ApprovalRuntimeCore[];

  /** Resource monitoring (costs, rate limits, etc.) */
  readonly resourceMonitor: ResourceMonitorRuntimeCore;

  // ========================================
  // Actions
  // ========================================

  /**
   * Create a new task in the workspace.
   *
   * @param config - Task configuration
   * @returns Created task runtime core
   */
  createTask(config: CreateTaskConfig): Promise<TaskRuntimeCore>;

  /**
   * Cancel a task and all its agents.
   *
   * @param taskId - ID of task to cancel
   */
  cancelTask(taskId: string): void;

  // ========================================
  // Navigation
  // ========================================

  /**
   * Get task by index in tasks array.
   */
  getTaskByIndex(idx: number): TaskRuntimeCore | undefined;

  /**
   * Get task by ID.
   */
  getTaskById(taskId: string): TaskRuntimeCore | undefined;

  /**
   * Get approval by index.
   */
  getApprovalByIndex(idx: number): ApprovalRuntimeCore | undefined;

  /**
   * Get approval by ID.
   */
  getApprovalById(approvalId: string): ApprovalRuntimeCore | undefined;
}

// ========================================
// Related Types
// ========================================

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

export interface AgentRuntimeCore {
  readonly id: string;
  readonly status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'waiting';
  readonly role: 'orchestrator' | 'worker' | 'specialist';
  readonly name: string;
  readonly objective: string;
  readonly boundaries: string | null;
  readonly outputFormat: string | null;
  readonly model: string;
  readonly cost: number;
  readonly duration: number;
  readonly contextUsage: { used: number; limit: number };
  readonly createdAt: Date;
  readonly lastActivityAt: Date;
  readonly error: string | null;

  // Actions (Phase 2 implementation)
  pause(): void;
  resume(): void;
  interrupt(): void;
  cancel(): void;

  // Navigation
  getTask(): TaskRuntimeCore;
  getParentAgent(): AgentRuntimeCore | null;
  getChildAgents(): readonly AgentRuntimeCore[];
}

export interface AgentEventRuntimeCore {
  readonly id: string;
  readonly timestamp: Date;
  readonly type: 'tool-call' | 'reasoning' | 'error' | 'message' | 'spawn-agent';
  readonly status: 'pending' | 'running' | 'completed' | 'failed';
  readonly toolExecution: ToolExecutionRuntimeCore | null;
  readonly reasoning: string | null;
  readonly spawnedAgent: AgentRuntimeCore | null;
  readonly collapsed: boolean;
  readonly duration: number;
}

export interface ApprovalRuntimeCore {
  readonly id: string;
  readonly request: string;
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly context: string;
  readonly status: 'pending' | 'approved' | 'denied' | 'skipped';
  readonly agent: AgentRuntimeCore;
  readonly task: TaskRuntimeCore;
  readonly details: Record<string, unknown>;
  readonly createdAt: Date;
  readonly respondedAt: Date | null;

  // Actions
  approve(decision: 'once' | 'session' | 'always' | 'timed', minutes?: number): void;
  deny(reason?: string): void;
  skip(): void;
}

export interface ResourceMonitorRuntimeCore {
  readonly totalCost: number;
  readonly totalTokensUsed: number;
  readonly rateLimits: RateLimits;
  readonly sessionDuration: number;
}

export interface ToolExecutionRuntimeCore {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly output: string | null;
  readonly status: 'pending' | 'running' | 'completed' | 'error';
  readonly duration: number;
  readonly error: string | null;
}

export interface Artifact {
  id: string;
  name: string;
  type: 'file' | 'directory' | 'code' | 'documentation';
  path: string;
  createdAt: Date;
 ModifiedAt: Date;
}

export interface TaskDependency {
  taskId: string;
  blockingTaskId: string;
  type: 'hard' | 'soft';
}

export interface RateLimits {
  requestsPerMinute: number;
  tokensPerMinute: number;
  currentRequestsPerMinute: number;
  currentTokensPerMinute: number;
}

 export interface CreateTaskConfig {
  title: string;
  description?: string;
  agentId?: string;
  model?: string;
  permissions?: PermissionConfig;
  budget?: BudgetConfig;
}

export interface SpawnWorkerOptions {
  objective: string;
  roleName?: string;
  boundaries?: string;
}

export interface PermissionConfig {
  mode: 'ask-all' | 'auto-reads' | 'auto-all' | 'custom';
  perTool?: Record<string, 'allow' | 'ask' | 'deny'>;
}

export interface BudgetConfig {
  maxCost?: number;
  maxDuration?: number;
}
```

#### 2.2 Runtime Core Index
*File*: `packages/react-agent-sdk/src/runtime-cores/index.ts`

```typescript
export type {
  WorkspaceRuntimeCore,
  TaskRuntimeCore,
  AgentRuntimeCore,
  AgentEventRuntimeCore,
  ApprovalRuntimeCore,
  ResourceMonitorRuntimeCore,
  ToolExecutionRuntimeCore,
} from "./WorkspaceRuntimeCore";

export type {
  Artifact,
  TaskDependency,
  RateLimits,
  CreateTaskConfig,
  SpawnWorkerOptions,
  PermissionConfig,
  BudgetConfig,
} from "./WorkspaceRuntimeCore";
```

---

### Task 3: Implement Type-Safe Binding Patterns

**Goal**: Create binding utilities following ThreadRuntime patterns.

**Files to Create**:

#### 3.1 Binding Types
*File*: `packages/react-agent-sdk/src/runtime/bindings.ts`

```typescript
import type { Subscribable } from "@assistant-ui/react";

/**
 * Enhanced Subscribable with State - matches pattern from ThreadRuntime
 *
 * This is the core binding contract between runtime layers.
 */
export type SubscribableWithState<TState, TPath> = Subscribable & {
  path: TPath;
  getState: () => TState;
};

/**
 * Base subscribable interface (re-export for convenience)
 */
export type Subscribable = {
  subscribe: (callback: () => void) => Unsubscribe;
};

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

// ========================================
// Binding Types for Each Runtime Level
// ========================================

export type WorkspaceRuntimeCoreBinding = SubscribableWithState<
  WorkspaceRuntimeCore,
  WorkspaceRuntimePath
> & {
  outerSubscribe(callback: () => void): Unsubscribe;
};

export type TaskRuntimeCoreBinding = SubscribableWithState<
  TaskRuntimeCore,
  TaskRuntimePath
> & {
  outerSubscribe(callback: () => void): Unsubscribe;
};

export type AgentRuntimeCoreBinding = SubscribableWithState<
  AgentRuntimeCore,
  AgentRuntimePath
> & {
  outerSubscribe(callback: () => void): Unsubscribe;
};

export type AgentEventRuntimeCoreBinding = SubscribableWithState<
  AgentEventRuntimeCore,
  AgentEventRuntimePath
> & {
  outerSubscribe(callback: () => void): Unsubscribe;
};

// ========================================
// Enhanced Bindings with Derived State
// ========================================

export type WorkspaceRuntimeBinding = WorkspaceRuntimeCoreBinding & {
  getStateState(): WorkspaceState;
};

export type TaskRuntimeBinding = TaskRuntimeCoreBinding & {
  getStateState(): TaskState;
};

export type AgentRuntimeBinding = AgentRuntimeCoreBinding & {
  getStateState(): AgentState;
};

export type AgentEventRuntimeBinding = AgentEventRuntimeCoreBinding & {
  getStateState(): AgentEventState;
};

// ========================================
// Helper Functions to Create Bindings
// ========================================

/**
 * Create a memoized binding with derived state.
 *
 * Uses ShallowMemoizeSubject for efficient state derivation,
 * similar to how ThreadRuntime creates state bindings.
 *
 * @param coreBinding - Raw core binding
 * @param getStateFn - Function to derive state from core
 * @returns Binding with memoized state access
 */
export function createMemoizedBinding<TCore, TState, TPath>(
  coreBinding: SubscribableWithState<TCore, TPath>,
  getStateFn: (core: TCore) => TState
): SubscribableWithState<TState, TPath> &
  { getStateState: () => TState } {
  // Import dynamically to avoid circular dependency
  const { ShallowMemoizeSubject } = require("@assistant-ui/react");

  const stateSubject = new ShallowMemoizeSubject({
    path: coreBinding.path,
    getState: () => getStateFn(coreBinding.getState()),
    subscribe: (callback) => coreBinding.subscribe(callback),
  });

  return {
    path: coreBinding.path,
    getState: () => stateSubject.getState(),
    getStateState: () => stateSubject.getState(),
    subscribe: (callback) => stateSubject.subscribe(callback),
  } as any;
}

/**
 * Create a nested binding for child runtime.
 *
 * Used when navigating to child runtimes (e.g., task → agent).
 */
export function createNestedBinding<TParent, TChild, TPath>(
  parentBinding: SubscribableWithState<TParent, any>,
  getBindingFn: (parent: TParent) => SubscribableWithState<TChild, TPath> | null
): SubscribableWithState<TChild, TPath> | null {
  const childCoreBinding = getBindingFn(parentBinding.getState());
  if (!childCoreBinding) return null;

  return {
    ...childCoreBinding,
    subscribe: (callback) => {
      const sub1 = parentBinding.subscribe(callback);
      const sub2 = childCoreBinding.subscribe(callback);
      return () => {
        sub1();
        sub2();
      };
    },
  };
}
```

#### 3.2 Path Types
*File*: `packages/react-agent-sdk/src/runtime/paths.ts`

```typescript
/**
 * Path types for runtime navigation.
 *
 * Paths describe the hierarchical location of each runtime instance.
 * Used for efficient lookups and navigation through the runtime tree.
 */

// Workspace is top-level, so path is simple
export type WorkspaceRuntimePath = {
  readonly ref: string; // e.g., "workspace" or "workspace[id=xxx]"
  readonly workspaceSelector:
    | { readonly type: "main" }
    | { readonly type: "workspaceId"; readonly workspaceId: string };
};

// Task path extends workspace path
export type TaskRuntimePath = WorkspaceRuntimePath & {
  readonly taskSelector:
    | { readonly type: "index"; readonly index: number }
    | { readonly type: "taskId"; readonly taskId: string };
};

// Agent path extends task path
export type AgentRuntimePath = TaskRuntimePath & {
  readonly agentSelector:
    | { readonly type: "lead" }
    | { readonly type: "workerIndex"; readonly index: number }
    | { readonly type: "agentId"; readonly agentId: string };
};

// AgentEvent path extends agent path
export type AgentEventRuntimePath = AgentRuntimePath & {
  readonly eventSelector:
    | { readonly type: "index"; readonly index: number }
    | { readonly type: "eventId"; readonly eventId: string };
};

// ========================================
// Path Creation Helpers
// ========================================

/**
 * Create workspace path for main workspace
 */
export function createMainWorkspacePath(): WorkspaceRuntimePath {
  return {
    ref: "workspace",
    workspaceSelector: { type: "main" },
  };
}

/**
 * Create workspace path for specific workspace
 */
export function createWorkspaceIdPath(workspaceId: string): WorkspaceRuntimePath {
  return {
    ref: `workspace[id=${JSON.stringify(workspaceId)}]`,
    workspaceSelector: { type: "workspaceId", workspaceId },
  };
}

/**
 * Create task path by index
 */
export function createTaskIndexPath(
  workspacePath: WorkspaceRuntimePath,
  index: number
): TaskRuntimePath {
  return {
    ...workspacePath,
    ref: `${workspacePath.ref}.tasks[${index}]`,
    taskSelector: { type: "index", index },
  };
}

/**
 * Create task path by ID
 */
export function createTaskIdPath(
  workspacePath: WorkspaceRuntimePath,
  taskId: string
): TaskRuntimePath {
  return {
    ...workspacePath,
    ref: `${workspacePath.ref}.tasks[id=${JSON.stringify(taskId)}]`,
    taskSelector: { type: "taskId", taskId },
  };
}

/**
 * Create lead agent path
 */
export function createLeadAgentPath(taskPath: TaskRuntimePath): AgentRuntimePath {
  return {
    ...taskPath,
    ref: `${taskPath.ref}.leadAgent`,
    agentSelector: { type: "lead" },
  };
}

/**
 * Create worker agent path by index
 */
export function createWorkerAgentIndexPath(
  taskPath: TaskRuntimePath,
  index: number
): AgentRuntimePath {
  return {
    ...taskPath,
    ref: `${taskPath.ref}.workerAgents[${index}]`,
    agentSelector: { type: "workerIndex", index },
  };
}

/**
 * Create agent event path by index
 */
export function createAgentEventIndexPath(
  agentPath: AgentRuntimePath,
  index: number
): AgentEventRuntimePath {
  return {
    ...agentPath,
    ref: `${agentPath.ref}.events[${index}]`,
    eventSelector: { type: "index", index },
  };
}
```

---

### Task 4: Create Context Providers and Hooks Utilities

**Goal**: Scaffold context providers and hook creation utilities.

**Files to Create**:

#### 4.1 Context Types
*File*: `packages/react-agent-sdk/src/context/types.ts`

```typescript
import type { WorkspaceRuntime } from "../runtime"; // Will be defined in Phase 2

/**
 * Workspace Runtime Context Value
 *
 * ProvidesWorkspaceRuntime instance to the component tree.
 */
export interface WorkspaceRuntimeContextValue {
  runtime: WorkspaceRuntime | null;
}

/**
 * Task Runtime Context Value
 */
export interface TaskRuntimeContextValue {
  runtime: TaskRuntime | null;
}

/**
 * Agent Runtime Context Value
 */
export interface AgentRuntimeContextValue {
  runtime: AgentRuntime | null;
}

/**
 * Approval Runtime Context Value
 */
export interface ApprovalRuntimeContextValue {
  runtime: ApprovalRuntime | null;
}
```

#### 4.2 Hook Creation Utilities
*File*: `packages/react-agent-sdk/src/context/utils/hooks/createContextHook.ts`

```typescript
import { useContext } from "react";
import type { Context } from "react";

/**
 * Create a type-safe context hook.
 *
 * This utility provides consistent error messages and optional support
 * for context hooks across the agent-ui system.
 *
 * @example
 * ```ts
 * export const useWorkspace = createContextHook(
 *   WorkspaceRuntimeContext,
 *   "WorkspaceProvider"
 * );
 * ```
 */
export function createContextHook<T>(
  context: Context<T | null>,
  providerName: string
) {
  return function useOptionalContext(options?: { optional?: boolean }): T | null {
    const contextValue = useContext(context);

    if (options?.optional) {
      return contextValue;
    }

    if (contextValue === null) {
      throw new Error(
        `This component must be used within ${providerName}`
      );
    }

    return contextValue;
  };
}
```

#### 4.3 State Hook Utility
*File*: `packages/react-agent-sdk/src/context/utils/hooks/createStateHook.ts`

```typescript
import { useSyncExternalStore } from "react";
import type { Subscribable } from "@assistant-ui/react";

/**
 * Create a state hook for Subscribable runtimes.
 *
 * Provides selector support similar to useAssistantState.
 *
 * @param useRuntime - Hook to get runtime instance
 * @returns State subscription hook
 *
 * @example
 * ```ts
 * export const useWorkspaceState = createStateHook(useWorkspaceRuntime);
 *
 * // Usage:
 * const status = useWorkspaceState((state) => state.status);
 * const allState = useWorkspaceState();
 * ```
 */
export function createStateHook<TState>(
  useRuntime: () => Subscribable & { getState: () => TState }
) {
  return function useStateHook<T = TState>(
    selector?: (state: TState) => T
  ): T {
    const runtime = useRuntime();

    const state = useSyncExternalStore(
      (callback) => runtime.subscribe(callback),
      () => runtime.getState(),
      () => runtime.getState()
    );

    if (selector) {
      return selector(state);
    }

    return state as T;
  };
}
```

#### 4.4 API Hook Utility
*File*: `packages/react-agent-sdk/src/context/utils/hooks/createApiHook.ts`

```typescript
import { useMemo } from "react";

/**
 * Create an API hook that returns a stable API object.
 *
 * The API object wraps the runtime and provides convenience methods.
 * Uses useMemo for stability.
 *
 * @example
 * ```ts
 * export const useTaskApi = createApiHook(
 *   useTaskRuntime,
 *   (task) => ({ task })
 * );
 * ```
 */
export function createApiHook<TRuntime, TApi>(
  useRuntime: () => TRuntime | null,
  apiMapper: (runtime: TRuntime) => TApi
) {
  return function useApi(): TApi | null {
    const runtime = useRuntime();

    return useMemo(() => {
      if (!runtime) return null;
      return apiMapper(runtime);
    }, [runtime]);
  };
}
```

#### 4.5 Workspace Provider (Minimal)
*File*: `packages/react-agent-sdk/src/context/providers/WorkspaceProvider.tsx`

```typescript
"use client";

import * as React from "react";
import { WorkspaceRuntimeContext } from "../types";
import type { WorkspaceRuntimeContextValue } from "../types";

/**
 * Workspace Provider Component
 *
 * Context provider for workspace runtime.
 *
 * Minimal implementation in Phase 1 - will be fully implemented in Phase 2.
 *
 * @example
 * ```tsx
 * <WorkspaceProvider runtime={workspaceRuntime}>
 *   <App />
 * </WorkspaceProvider>
 * ```
 */
export const WorkspaceProvider: React.FC<
  React.PropsWithChildren<{
    runtime: WorkspaceRuntimeContextValue["runtime"];
  }>
> = ({ runtime, children }) => {
  const contextValue = React.useMemo<WorkspaceRuntimeContextValue>(
    () => ({
      runtime,
    }),
    [runtime]
  );

  return (
    <WorkspaceRuntimeContext.Provider value={contextValue}>
      {children}
    </WorkspaceRuntimeContext.Provider>
  );
};
```

#### 4.6 Context Export
*File*: `packages/react-agent-sdk/src/context/index.ts`

```typescript
// Types
export type {
  WorkspaceRuntimeContextValue,
  TaskRuntimeContextValue,
  AgentRuntimeContextValue,
  ApprovalRuntimeContextValue,
} from "./types";

// Providers
export { WorkspaceProvider } from "./providers/WorkspaceProvider";

// Contexts (will be defined in Phase 2, defined here for compilation)
export const WorkspaceRuntimeContext = React.createContext<any>(null);
export const TaskRuntimeContext = React.createContext<any>(null);
export const AgentRuntimeContext = React.createContext<any>(null);
export const ApprovalRuntimeContext = React.createContext<any>(null);

// Hook utilities
export { createContextHook } from "./utils/hooks/createContextHook";
export { createStateHook } from "./utils/hooks/createStateHook";
export { createApiHook } from "./utils/hooks/createApiHook";
```

---

### Task 5: Configure Package and Exports

**Goal**: Set up package.json, TypeScript config, and main exports.

**Files to Create/Merge**:

#### 5.1 Package Configuration
*File*: `packages/react-agent-sdk/package.json`

```json
{
  "name": "@assistant-ui/react-agent-sdk",
  "version": "0.0.1",
  "description": "Agent SDK integration for assistant-ui",
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./streaming": {
      "types": "./dist/streaming/index.d.ts",
      "default": "./dist/streaming/index.js"
    },
    "./runtime": {
      "types": "./dist/runtime/index.d.ts",
      "default": "./dist/runtime/index.js"
    },
    "./runtime-cores": {
      "types": "./dist/runtime-cores/index.d.ts",
      "default": "./dist/runtime-cores/index.js"
    },
    "./context": {
      "types": "./dist/context/index.d.ts",
      "default": "./dist/context/index.js"
    }
  },
  "source": "./src/index.ts",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "README.md"
  ],
  "sideEffects": false,
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --external react --external react-dom --external @assistant-ui/tool-ui-server",
    "dev": "tsup src/index.ts --format esm --dts --external react --external react-dom --external @assistant-ui/tool-ui-server --watch",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@assistant-ui/tool-ui-server": "workspace:*"
  },
  "peerDependencies": {
    "@assistant-ui/react": ">=0.11.0",
    "react": "^18 || ^19 || ^19.0.0-rc"
  },
  "devDependencies": {
    "@assistant-ui/react": "workspace:*",
    "@assistant-ui/x-buildutils": "workspace:*",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "tsup": "^8.4.0",
    "typescript": "^5.7.0",
    "vitest": "^3.2.3"
  }
}
```

#### 5.2 Main Export File
*File*: `packages/react-agent-sdk/src/index.ts`

```typescript
// Runtime Cores
export * from "./runtime-cores";

// Runtime (bindings, paths)
export * from "./runtime";

// Context
export * from "./context";

// Streaming
export * from "./streaming";
```

#### 5.3 Streaming Export
*File*: `packages/react-agent-sdk/src/streaming/index.ts`

```typescript
export { RateLimiter } from "./RateLimiter";
export { StreamingMessageBridge } from "./StreamingMessageBridge";
export type {
  StreamingMessage,
  StreamingUpdateMessage,
  StreamingChunkMessage,
  StreamMetadata,
} from "./types";
```

#### 5.4 Runtime Export
*File*: `packages/react-agent-sdk/src/runtime/index.ts`

```typescript
export * from "./bindings";
export * from "./paths";

// Runtime classes will be added in Phase 2
// Placeholder types for compilation
export type { WorkspaceRuntime, TaskRuntime, AgentRuntime } from "./types-placeholder";
```

---

## Testing Strategy

### Unit Tests

**RateLimiter** (`src/streaming/RateLimiter.test.ts`):
```javascript
describe("RateLimiter", () => {
  it("should run callback immediately when rate limit not exceeded", () => {
    const limiter = new RateLimiter(100);
    const callback = vi.fn();

    const runImmediately = limiter.schedule(callback);

    expect(runImmediately).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should queue callback when rate limit exceeded", () => {
    const limiter = new RateLimiter(100);
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    limiter.schedule(callback1); // Runs immediately
    const runImmediately = limiter.schedule(callback2); // Queued

    expect(runImmediately).toBe(false);
    expect(callback2).not.toHaveBeenCalled();

    // Wait for flush
    advanceTimersByTime(100);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it("should merge multiple queued callbacks", () => {
    const limiter = new RateLimiter(100);
    const callbacks = Array.from({ length: 5 }, () => vi.fn());

    callbacks.forEach(cb => limiter.schedule(cb));

    advanceTimersByTime(100);

    // Only last callback should run (merge behavior)
    expect(callbacks[0]).not.toHaveBeenCalled();
    expect(callbacks[1]).not.toHaveBeenCalled();
    expect(callbacks[2]).not.toHaveBeenCalled();
    expect(callbacks[3]).not.toHaveBeenCalled();
    expect(callbacks[4]).toHaveBeenCalledTimes(1);
  });
});
```

**Streaming Message Bridge** (`src/streaming/StreamingMessageBridge.test.ts`):
```javascript
describe("StreamingMessageBridge", () => {
  it("should split large data into chunks", () => {
    const bridge = new StreamingMessageBridge({} as any);
    const largeData = "a".repeat(3000);

    const chunks = (bridge as any).chunkData(largeData, 1000);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(1000);
    expect(chunks[1]).toHaveLength(1000);
    expect(chunks[2]).toHaveLength(1000);
  });

  it("should reassemble streaming chunks", () => {
    const data = { result: "hello world" };

    const bridge = new StreamingMessageBridge({
      onStreamingData: vi.fn(),
    } as any);

    // Send 3 chunks
    (bridge as any).processStreamingChunk({
      type: "AUI_STREAMING_CHUNK",
      streamId: "test",
      chunkIndex: 0,
      totalChunks: 3,
      data: { result: "hello" },
    });

    (bridge as any).processStreamingChunk({
      type: "AUI_STREAMING_CHUNK",
      streamId: "test",
      chunkIndex: 1,
      totalChunks: 3,
      data: " ",
    });

    (bridge as any).processStreamingChunk({
      type: "AUI_STREAMING_CHUNK",
      streamId: "test",
      chunkIndex: 2,
      totalChunks: 3,
      data: "world",
    });

    expect((bridge as any).legacyHandlers.onStreamingData).toHaveBeenCalledWith(
      "test",
      [{ result: "hello" }, " ", "world"]
    );
  });
});
```

**Binding Utilities** (`src/runtime/bindings.test.ts`):
```javascript
describe("Binding Utilities", () => {
  it("should create memoized binding", () => {
    const coreBinding = {
      path: "test" as any,
      getState: vi.fn(() => ({ count: 1 })),
      subscribe: vi.fn(() => () => {}),
    };

    const binding = createMemoizedBinding(
      coreBinding,
      (core) => ({ doubled: core.count * 2 })
    );

    expect(binding.getState()).toEqual({ doubled: 2 });
    expect(coreBinding.getState).toHaveBeenCalled();
  });

  it("should create workspace path", () => {
    const path = createMainWorkspacePath();

    expect(path).toEqual({
      ref: "workspace",
      workspaceSelector: { type: "main" },
    });
  });

  it("should create task path with index", () => {
    const workspacePath = createMainWorkspacePath();
    const taskPath = createTaskIndexPath(workspacePath, 2);

    expect(taskPath.ref).toBe("workspace.tasks[2]");
    expect(taskPath.taskSelector).toEqual({ type: "index", index: 2 });
  });
});
```

**State Hook Utility** (`src/context/utils/hooks/createStateHook.test.ts`):
```javascript
describe("createStateHook", () => {
  it("should subscribe to state changes", () => {
    const mockRuntime = {
      getState: vi.fn(() => ({ value: 1 })),
      subscribe: vi.fn(() => () => {}),
    };

    const useTestRuntime = () => mockRuntime as any;
    const useTestState = createStateHook(useTestRuntime);

    const { result } = renderHook(() => useTestState());

    expect(result.current).toEqual({ value: 1 });
  });

  it("should apply selector", () => {
    const mockRuntime = {
      getState: vi.fn(() => ({ value: 1, label: "test" })),
      subscribe: vi.fn(() => () => {}),
    };

    const useTestRuntime = () => mockRuntime as any;
    const useTestState = createStateHook(useTestRuntime);

    const { result } = renderHook(() =>
      useTestState((state) => state.value)
    );

    expect(result.current).toBe(1);
  });
});
```

### Integration Tests

**End-to-end streaming** (optional for Phase 1, can be in Phase 2):
- Test full streaming flow through iframe
- Test rate limiting under load
- Test chunk reassembly

---

## What We're NOT Doing

- **No runtime implementations** - That's Phase 2
- **No primitives** - That's Phase 3
- **No Claude Agent SDK integration** - That's Phase 5
- **No real SDK connection** - Tests use mocks
- **No stream processor implementation** - Skeleton only in Phase 2
- **No message converters** - That's Phase 5

---

## Success Criteria

### Automated Verification

#### Build & Type Checking:
- [ ] Package builds successfully: `pnpm turbo build --filter=@assistant-ui/react-agent-sdk`
- [ ] TypeScript compiles without errors: `pnpm tsc --noEmit --project packages/react-agent-sdk/tsconfig.json`
- [ ] All exports are typed correctly

#### Unit Tests:
- [ ] RateLimiter tests pass: `pnpm test packages/react-agent-sdk/src/streaming/RateLimiter.test.ts`
- [ ] StreamingMessageBridge tests pass
- [ ] Binding utility tests pass
- [ ] Path creation helper tests pass
- [ ] State hook utility tests pass
- [ ] All tests pass: `pnpm test @assistant-ui/react-agent-sdk`

#### Code Quality:
- [ ] Linting passes: `pnpm lint --filter=@assistant-ui/react-agent-sdk`
- [ ] No TypeScript errors in VS Code

### Manual Verification

#### Streaming Infrastructure:
- [ ] Can create RateLimiter and verify timing behavior
- [ ] Can create StreamingMessageBridge instance
- [ ] Can send streaming updates and observe rate limiting
- [ ] Can chunk large data and reassemble correctly

#### Binding Patterns:
- [ ] Can create workspace runtime core binding
- [ ] Can use createMemoizedBinding to derive state
- [ ] Can create paths for navigation (workspace → task → agent → event)
- [ ] Can verify SubscribableWithState types match expectations

#### Context Providers:
- [ ] WorkspaceProvider renders without errors
- [ ] createContextHook utility creates working hooks
- [ ] createStateHook utility subscribes to state
- [ ] createApiHook utility creates stable API objects

#### Package Integration:
- [ ] Can import from @assistant-ui/react-agent-sdk
- [ ] Can import streaming module: `@assistant-ui/react-agent-sdk/streaming`
- [ ] Can import runtime module: `@assistant-ui/react-agent-sdk/runtime`
- [ ] Can import runtime-cores module: `@assistant-ui/react-agent-sdk/runtime-cores`
- [ ] Can import context module: `@assistant-ui/react-agent-sdk/context`

---

## Migration Notes

This is greenfield code - no migration needed for existing packages.

However, Phase 2 will:
- Implement actual runtime classes using these interfaces
- Create real runtime instances from core interfaces
- Integrate with binding utilities
- Connect context providers to runtimes

## References

- Master plan: `@/notes/proposals/agent-ui-implementation-plan.md` (Phase 1 section)
- Full proposal: `@/notes/proposals/agent-ui-proposal.md`
- Codebase analysis: `@/notes/research/agent-ui-proposal-codebase-implementationanalysis.md`
- Existing patterns: `packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts` (lines 295-534)
- Tool UI infrastructure: `packages/tool-ui-server/src/remote/message-bridge.ts`

---

## Notes

### Implementation Priorities

1. **Start with streaming** - RateLimiter is simple and foundational
2. **Define interfaces** - Runtime cores are the contract
3. **Create bindings** - Reuse existing patterns
4. **Scaffold context** - Minimal implementation, hooks utilities first

### Why This Order

- Streaming infrastructure is independent and can be tested in isolation
- Runtime core interfaces are referenced by bindings, so they must come first
- Binding utilities reference runtime core types
- Context utilities reference runtime types but don't need full implementations yet

### File Structure Summary

```
packages/react-agent-sdk/src/
├── streaming/
│   ├── RateLimiter.ts
│   ├── StreamingMessageBridge.ts
│   ├── types.ts
│   ├── index.ts
│   └── __tests__/
│       ├── RateLimiter.test.ts
│       └── StreamingMessageBridge.test.ts
│
├── runtime-cores/
│   ├── WorkspaceRuntimeCore.ts (defines all core interfaces)
│   └── index.ts
│
├── runtime/
│   ├── bindings.ts
│   ├── paths.ts
│   ├── index.ts
│   └── __tests__/
│       └── bindings.test.ts
│
├── context/
│   ├── types.ts
│   ├── providers/
│   │   └── WorkspaceProvider.tsx
│   ├── utils/
│   │   └── hooks/
│   │       ├── createContextHook.ts
│   │       ├── createStateHook.ts
│   │       ├── createApiHook.ts
│   │       └── __tests__/
│   │           ├── createContextHook.test.ts
│   │           ├── createStateHook.test.ts
│   │           └── createApiHook.test.ts
│   └── index.ts
│
└── index.ts (main export)

packages/react-agent-sdk/
├── package.json
├── tsconfig.json
└── README.md
```