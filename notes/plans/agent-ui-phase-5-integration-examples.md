# Phase 5: Integration & Examples Implementation Plan

**Status**: Implementation Planning
**Related**:
- `/notes/proposals/agent-ui-implementation-plan.md` - Master plan
- `/notes/proposals/agent-ui-proposal.md` - Feature specification

---

## Overview

Phase 5 completes the agent-ui system by integrating it with the Claude Agent SDK, creating a working example application, and writing comprehensive documentation. This phase makes agent-ui usable in production by providing the necessary SDK adapters, examples, and guides.

**Key Goals**:
1. Complete `@assistant-ui/react-agent-sdk` with Claude Agent SDK integration
2. Build a working "Agent Dashboard" example app
3. Write complete documentation for all primitives and hooks

**Dependencies**:
- Phase 1-4 must be complete (streaming infrastructure, runtimes, primitives)

---

## Current State Analysis

As of Phase 4 completion, we have:
- ✅ Streaming-enabled AssistantFrame from Phase 1
- ✅ Runtime classes (Workspace, Task, Agent, AgentEvent) from Phase 2
- ✅ All 11 primitives with Properties vs Actions pattern from Phase 3-4
- ⏳ NO SDK integration - Claude Agent SDK not connected
- ⏳ NO example application - no way to see agent-ui in action
- ⏳ NO documentation - users don't know how to use the system

**What's Missing**:
1. Claude Agent SDK client wrapper and adapters
2. Stream processor for converting SDK messages to runtime state
3. Permission hooks integration with approval system
4. Message conversion utilities
5. Working example app demonstrating all features
6. Documentation for primitives, hooks, and integration

---

## Desired End State

After Phase 5, the system will be **fully production-ready** end-to-end:

### 1. `@assistant-ui/react-agent-sdk` Package

A complete integration package that:
- Wraps Claude Agent SDK client with TypeScript types
- Provides `useAgentRuntime()` hook for runtime creation
- Converts SDK messages to runtime state in real-time
- Integrates permission hooks with approval system
- Supports streaming updates at 30fps rate limit
- Has comprehensive type exports and JSDoc documentation

### 2. Example Application: `examples/agent-dashboard`

A fully functional Next.js app demonstrating:
- Workspace overview with task list
- Task detail view with agent hierarchy
- Real-time approval queue with interactive buttons
- Task launcher form
- Cost tracking across tasks/agents
- All 11 primitives in action

### 3. Complete Documentation

All primitives, hooks, and integration documented:
- Overview and mental model
- Getting started guide (setup, first task)
- API reference for all primitives (11 docs)
- API reference for all hooks (4 docs)
- Advanced integration guide

### Verification Criteria

**Automated**:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-sdk` builds package
- [ ] `pnpm turbo build --filter=examples/agent-dashboard` builds example
- [ ] All tests pass: `pnpm test --filter=@assistant-ui/react-agent-sdk`
- [ ] Type checking passes: `pnpm tsc --noEmit --project packages/react-agent-sdk/tsconfig.json`

**Manual**:
- [ ] Example app runs locally: `cd examples/agent-dashboard && npm run dev`
- [ ] Can create agent tasks via UI and see real-time updates
- [ ] Approval system works with approve/deny buttons
- [ ] Cost tracking displays correctly
- [ ] Documentation renders without errors in docs site
- [ ] Code examples in docs compile and run

---

## What We're NOT Doing

- ❌ NO new primitives (all 11 primitives already built in Phase 3-4)
- ❌ NO new runtime interfaces (all defined in Phase 1)
- ❌ NO additional integrations beyond Claude Agent SDK
- ❌ NO backend server implementation (SDK provides this)
- ❌ NO authentication/authorization (handled by SDK)
- ⏸️ ~~Video tutorials~~ (deferred to post-launch)
- ⏸️ ~~Advanced deployment guides~~ (deferred to post-launch)

---

## Implementation Approach

This phase follows the integration package pattern established by `packages/react-ai-sdk`:

1. **SDK Client Layer**: Wrap Claude Agent SDK client with TypeScript abstractions
2. **Stream Processing Layer**: Convert SDK message streams to runtime state updates
3. **Hook Layer**: Provide `useAgentRuntime()` hook for easy integration
4. **Example Layer**: Build a full example app using primitives
5. **Documentation Layer**: Write comprehensive guides and API docs

**Key Patterns (from existing codebase)**:
- Integration package structure: `packages/react-ai-sdk` (simple exports, `aui-build`)
- Runtime binding: `ThreadRuntimeImpl` pattern with ShallowMemoizeSubject
- Example app: `examples/with-ag-ui` pattern with `MyRuntimeProvider.tsx`
- Documentation: `apps/docs/content/docs/runtimes/ai-sdk/use-chat.mdx` pattern

---

## Phase 5 Implementation

### Task 1: Complete @assistant-ui/react-agent-sdk Package

#### 1.1. SDK Client Wrapper

**Location**: `packages/react-agent-sdk/src/sdk/` (new directory)

Create `ClaudeAgentClient.ts`:

```typescript
// packages/react-agent-sdk/src/sdk/ClaudeAgentClient.ts

/**
 * Wrapper around Anthropic Agent SDK client for agent-ui integration.
 *
 * This class provides a type-safe interface to Claude Agent SDK,
 * handling workspace creation, task management, and event streaming.
 */
export class ClaudeAgentClient {
  private readonly sdkClient: AnthropicAgentClient;

  constructor(config: AgentRuntimeConfig) {
    // Initialize AnthropicAgentSDK client with config
    this.sdkClient = new AnthropicAgentClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
    });
  }

  /**
   * Creates or retrieves a workspace for running agent tasks.
   *
   * @param workspaceId - Optional existing workspace ID
   * @returns SDK workspace core object
   */
  async createWorkspace(workspaceId?: string): Promise<WorkspaceCore> {
    return await this.sdkClient.createWorkspace({ id: workspaceId });
  }

  /**
   * Creates a new agent task within a workspace.
   *
   * @param workspaceId - The workspace ID
   * @param config - Task configuration (goal, model, permissions, etc.)
   * @returns SDK task core object
   */
  async createTask(
    workspaceId: string,
    config: CreateTaskConfig,
  ): Promise<TaskCore> {
    return await this.sdkClient.createTask(workspaceId, config);
  }

  /**
   * Cancels an active task.
   *
   * @param taskId - The task ID to cancel
   */
  cancelTask(taskId: string): void {
    this.sdkClient.cancelTask(taskId);
  }

  /**
   * Subscribes to real-time events from a task.
   *
   * Returns an async generator yielding SDK messages as they arrive.
   *
   * @param taskId - The task ID to subscribe to
   * @returns Async generator of SDK messages
   */
  subscribeToTaskEvents(taskId: string): AsyncGenerator<SDKMessage> {
    return this.sdkClient.subscribeToEvents(taskId);
  }

  /**
   * Registers a permission hook for tool use approval.
   *
   * This integrates with assistant-ui's approval system to intercept
   * tool calls and require human approval before execution.
   *
   * @param hook - Permission hook that returns approval decision
   */
  setPermissionHook(hook: PermissionHook): void {
    this.sdkClient.registerHook('PreToolUse', hook);
  }
}

/**
 * Configuration for agent runtime.
 */
export interface AgentRuntimeConfig {
  /** Anthropic API key */
  apiKey: string;

  /** Base URL for SDK (optional, defaults to Anthropic API) */
  baseUrl?: string;

  /** Default model to use for agents (optional, defaults to Claude) */
  model?: string;

  /** Workspace ID for resuming sessions (optional) */
  workspaceId?: string;
}
```

#### 1.2. Permission Hook Integration

**Location**: `packages/react-agent-sdk/src/sdk/permissionHooks.ts` (new file)

Create permission hook bridge between SDK and approval system:

```typescript
// packages/react-agent-sdk/src/sdk/permissionHooks.ts

import { ApprovalRuntime } from '../approval/ApprovalRuntime';

/**
 * Type for approval decision from user.
 */
export type PermissionDecision = 'allow' | 'deny';

/**
 * Permission request from SDK (tool call).
 */
export interface PermissionRequest {
  toolName: string;
  toolInput: any;
  description: string;
}

/**
 * Permission hook interface for SDK.
 */
export interface PermissionHook {
  matcher: string;
  hooks: ((input: ToolUseInput) => Promise<PermissionDecision>)[];
}

/**
 * Creates a permission hook that integrates with the approval system.
 *
 * When an agent tries to use a tool, this hook:
 * 1. Creates a pending approval for the tool call
 * 2. Waits for user decision (approve/deny)
 * 3. Returns decision to SDK
 *
 * @param approvalRuntime - The approval runtime to create approvals with
 * @returns Permission hook for SDK registration
 */
export function createPermissionHook(
  approvalRuntime: ApprovalRuntime,
): PermissionHook {
  return {
    matcher: '*', // Match all tool uses
    hooks: [async (input: ToolUseInput) => {
      // 1. Create pending approval
      const approval = approvalRuntime.createApproval({
        toolName: input.name,
        toolInput: input.input,
        request: input.description || `Use ${input.name} tool`,
      });

      // 2. Wait for human decision
      const decision = await approval.waitForDecision();

      // 3. Return decision to SDK
      return { permissionDecision: decision };
    }],
  };
}
```

#### 1.3. Runtime Core Implementations

**Location**: `packages/react-agent-sdk/src/runtime-cores/` (new directory)

Create SDK-backed runtime cores (following Phase 1 interfaces):

```typescript
// packages/react-agent-sdk/src/runtime-cores/WorkspaceRuntimeCoreFromSDK.ts

import { WorkspaceRuntimeCore } from '@assistant-ui/react-agent-sdk/runtime-cores';
import { ClaudeAgentClient } from '../sdk/ClaudeAgentClient';

/**
 * SDK-backed implementation of WorkspaceRuntimeCore.
 *
 * This core manages workspace state by delegating to Claude Agent SDK,
 * and tracks tasks and approvals as they are created by the SDK.
 */
export class WorkspaceRuntimeCoreFromSDK implements WorkspaceRuntimeCore {
  private _tasks: TaskRuntimeCore[] = [];
  private _approvals: ApprovalRuntimeCore[] = [];

  constructor(
    private readonly sdkClient: ClaudeAgentClient,
    workspaceCore: WorkspaceCore,
  ) {
    this.id = workspaceCore.id;
  }

  // State (read-only)
  readonly id: string;

  get tasks(): readonly TaskRuntimeCore[] {
    return this._tasks;
  }

  get approvalQueue(): readonly ApprovalRuntimeCore[] {
    return this._approvals;
  }

  get resourceMonitor(): ResourceMonitorRuntimeCore {
    // TODO: Implement resource monitoring from SDK
    return {
      aggregateCost: 0,
      rateLimitUsage: { used: 0, limit: 100 },
      tokenUsage: { input: 0, output: 0, limit: 200000 },
    };
  }

  // Actions
  async createTask(config: CreateTaskConfig): Promise<TaskRuntimeCore> {
    // 1. Create task via SDK
    const sdkTask = await this.sdkClient.createTask(this.id, config);

    // 2. Wrap in TaskRuntimeCore
    const taskCore = new TaskRuntimeCoreFromSDK(
      sdkTask,
      this.sdkClient,
      this,
    );

    // 3. Add to internal list
    this._tasks.push(taskCore);

    // 4. Notify observers
    this.notifyUpdate();

    return taskCore;
  }

  cancelTask(taskId: string): void {
    // Delegate to SDK
    this.sdkClient.cancelTask(taskId);

    // Remove from internal list
    this._tasks = this._tasks.filter(t => t.id !== taskId);

    // Notify observers
    this.notifyUpdate();
  }

  // Internal method for task cores to add approvals
  _addApproval(approval: ApprovalRuntimeCore) {
    this._approvals.push(approval);
    this.notifyUpdate();
  }

  // Internal method for task cores to notify updates
  _notifyTaskUpdate() {
    this.notifyUpdate();
  }

  private notifyUpdate(): void {
    // Trigger observer notification (SubscribableWithState pattern)
    this._updateCallback?.();
  }

  private _updateCallback?: () => void;

  // Called by binding layer to register notification callback
  _setUpdateCallback(callback: () => void): void {
    this._updateCallback = callback;
  }

  // Navigation
  getTaskByIndex(idx: number): TaskRuntimeCore | undefined {
    return this._tasks[idx];
  }

  getTaskById(taskId: string): TaskRuntimeCore | undefined {
    return this._tasks.find(t => t.id === taskId);
  }
}
```

Similarly create:
- `TaskRuntimeCoreFromSDK.ts` - SDK-backed task core
- `AgentRuntimeCoreFromSDK.ts` - SDK-backed agent core
- `AgentEventRuntimeCoreFromSDK.ts` - SDK-backed event core

#### 1.4. Message Converters

**Location**: `packages/react-agent-sdk/src/converters/` (new directory)

Create utilities to convert SDK messages to state objects:

```typescript
// packages/react-agent-sdk/src/converters/sdkToState.ts

import {
  SDKAssistantMessage,
  SDKPartialAssistantMessage,
  SDKResultMessage,
  SDKToolUseMessage,
} from '@anthropic/agent-sdk';

import {
  AgentEventState,
  AgentState,
  AgentTreeNode,
  TaskState,
} from '@assistant-ui/react-agent-sdk/runtime';

/**
 * Conversion context for tracking agent/relationships.
 */
export interface ConversionContext {
  /** Map of tool_use_id → agentId for parent-child agent tracking */
  agentIdByToolUse: Map<string, string>;
  /** Current task being processed */
  task: TaskRuntimeCore;
}

/**
 * Converts a full SDK assistant message to AgentEventState.
 *
 * @param message - SDK assistant message
 * @param context - Conversion context for cross-event state
 * @returns Complete AgentEventState
 */
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

/**
 * Converts a partial SDK message (streaming update) to partial AgentEventState.
 *
 * Used for incremental updates like streaming tool output.
 *
 * @param message - SDK partial message
 * @param existing - existing event state
 * @returns Partial update to apply
 */
export function convertSDKPartialMessageToAgentEventState(
  message: SDKPartialAssistantMessage,
  existing: AgentEventState,
): Partial<AgentEventState> {
  if (message.type === 'content_block_delta' && message.delta.type === 'text_delta') {
    // Append streaming tool output
    return {
      toolExecution: {
        ...existing.toolExecution,
        output: existing.toolExecution.output + message.delta.text,
      },
    };
  }
  return {};
}

/**
 * Converts SDK result message to partial AgentState.
 *
 * Result messages contain final agent metrics like cost and token usage.
 *
 * @param message - SDK result message
 * @returns Partial update to agent state
 */
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

/**
 * Extracts parent agent information from SDK tool message.
 *
 * Used to build agent tree hierarchy.
 *
 * @param message - SDK tool use message with parent_tool_use_id
 * @param context - Conversion context
 * @returns Parent agent info or null
 */
export function extractParentAgentInfo(
  message: SDKToolUseMessage,
  context: ConversionContext,
): { agentId: string; toolUseId: string } | null {
  if (!message.parent_tool_use_id) return null;

  return {
    agentId: context.agentIdByToolUse.get(message.parent_tool_use_id)!,
    toolUseId: message.parent_tool_use_id,
  };
}

/**
 * Detects if a message contains a subagent spawn.
 *
 * Used to track agent tree hierarchy for Task.agentTree.
 *
 * @param message - SDK assistant message
 * @returns Spawned agent info or null
 */
export function detectSubagentSpawn(
  message: SDKAssistantMessage,
): { taskId: string; agentId: string } | null {
  if (message.type === 'tool_use' && message.name === 'Task') {
    return {
      taskId: extractTaskIdFromToolInput(message.input),
      agentId: extractAgentIdFromToolInput(message.input),
    };
  }
  return null;
}
```

#### 1.5. Stream Processor (Full Implementation)

**Location**: `packages/react-agent-sdk/src/streaming/AgentStreamProcessor.ts`

Update the skeleton from Phase 2 with full implementation:

```typescript
// packages/react-agent-sdk/src/streaming/AgentStreamProcessor.ts

import {
  WorkspaceRuntime,
  TaskRuntime,
} from '@assistant-ui/react-agent-sdk/runtime';

import {
  SDKMessage,
  SDKAssistantMessage,
  SDKPartialAssistantMessage,
  SDKResultMessage,
  SDKErrorMessage,
} from '@anthropic/agent-sdk';

import { MessageConverters, ConversionContext } from '../converters';

/**
 * Rate-limiter for UI updates (30fps max).
 */
class RateLimiter {
  private lastUpdate = 0;
  private pendingUpdate = false;
  private readonly interval = 33; // 30fps = ~33ms

  schedule(callback: () => void): void {
    if (this.pendingUpdate) return;

    const now = Date.now();
    const elapsed = now - this.lastUpdate;

    if (elapsed >= this.interval) {
      this.execute(callback);
    } else {
      this.pendingUpdate = true;
      setTimeout(() => {
        this.execute(callback);
      }, this.interval - elapsed);
    }
  }

  private execute(callback: () => void): void {
    this.pendingUpdate = false;
    this.lastUpdate = Date.now();
    callback();
  }
}

/**
 * Processes Claude Agent SDK message streams and updates runtime state.
 *
 * This class:
 * 1. Subscribes to SDK event streams
 * 2. Converts SDK messages to state objects
 * 3. Updates runtime state via navigation methods
 * 4. Rate-limits UI updates to 30fps
 * 5. Tracks agent hierarchy and spawns
 */
export class AgentStreamProcessor {
  private readonly rateLimiter = new RateLimiter();
  private readonly conversionContext: Map<string, ConversionContext>;

  constructor(
    private readonly workspaceRuntime: WorkspaceRuntime,
    private readonly converters: MessageConverters,
  ) {
    this.conversionContext = new Map();
  }

  /**
   * Processes the event stream for a task.
   *
   * This is the main entry point - call this after starting a task
   * to begin processing real-time updates.
   *
   * @param taskId - The task ID to process events for
   */
  async processStream(taskId: string): Promise<void> {
    const taskRuntime = this.workspaceRuntime.getTaskById(taskId);
    if (!taskRuntime) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Subscribe to SDK event stream
    const stream = this.workspaceRuntime.__internal_sdkClient.subscribeToTaskEvents(taskId);

    // Initialize conversion context for this task
    this.conversionContext.set(taskId, {
      agentIdByToolUse: new Map(),
      task: taskRuntime.__internal_taskCore,
    });

    try {
      // Process each message from the stream
      for await (const message of stream) {
        this.processMessage(message, taskRuntime);
      }
    } finally {
      // Clean up context
      this.conversionContext.delete(taskId);
    }
  }

  /**
   * Processes a single SDK message.
   */
  private processMessage(message: SDKMessage, taskRuntime: TaskRuntime): void {
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

  /**
   * Handles full assistant messages (tool use, reasoning).
   */
  private async handleAssistantMessage(
    message: SDKAssistantMessage,
    taskRuntime: TaskRuntime,
  ): Promise<void> {
    const context = this.getContext(taskRuntime.id);

    // 1. Get or create the agent for this message
    const agentRuntime = this.getOrCreateAgent(message, taskRuntime, context);

    // 2. Convert message to event state
    const eventState = this.converters.toAgentEventState(message, context);

    // 3. Add event to agent's feed
    agentRuntime.addEvent(eventState);

    // 4. Handle parent agent tracking
    const parentAgentInfo = this.converters.extractParentAgentInfo(message, context);
    if (parentAgentInfo) {
      agentRuntime.setParentAgent(parentAgentInfo);
    }

    // 5. Handle subagent spawn
    const spawnInfo = this.converters.detectSubagentSpawn(message);
    if (spawnInfo) {
      await this.handleSubagentSpawn(spawnInfo, taskRuntime);
    }
  }

  /**
   * Handles partial messages (streaming updates).
   */
  private handlePartialMessage(
    message: SDKPartialAssistantMessage,
    taskRuntime: TaskRuntime,
  ): void {
    const context = this.getContext(taskRuntime.id);

    // 1. Get the latest event for this agent
    const agentRuntime = taskRuntime.getLeadAgent();
    const latestEvent = agentRuntime.getLatestEvent();
    if (!latestEvent) return;

    // 2. Apply partial update (e.g., streaming tool output)
    const partialState = this.converters.toPartialAgentEventState(
      message,
      latestEvent.getState(),
    );

    // 3. Update the event with partial state
    latestEvent.updateState(partialState);

    // 4. Rate-limited UI update
    this.throttledUpdate();
  }

  /**
   * Handles result messages (agent completion).
   */
  private handleResultMessage(
    message: SDKResultMessage,
    taskRuntime: TaskRuntime,
  ): void {
    const agentRuntime = taskRuntime.getLeadAgent();

    // Update agent state with final metrics
    const partialState = this.converters.toAgentStateFromResult(message);
    agentRuntime.updateState(partialState);

    // Update task progress
    this.updateTaskProgress(taskRuntime);
  }

  /**
   * Handles error messages.
   */
  private handleErrorMessage(
    message: SDKErrorMessage,
    taskRuntime: TaskRuntime,
  ): void {
    const agentRuntime = taskRuntime.getLeadAgent();
    agentRuntime.setError(message.error);
  }

  /**
   * Gets or creates an agent runtime for a message.
   */
  private getOrCreateAgent(
    message: SDKAssistantMessage,
    taskRuntime: TaskRuntime,
    context: ConversionContext,
  ): AgentRuntime {
    // Check if agent already exists
    const existing = taskRuntime.getLeadAgent();
    if (existing) return existing;

    // Create new agent (TODO: implement from SDK data)
    const agentCore = new AgentRuntimeCoreFromSDK(/* ... */);
    const agentRuntime = createAgentRuntime(agentCore, taskRuntime);

    // Track agent for hierarchy
    if (message.tool_use_id) {
      context.agentIdByToolUse.set(message.tool_use_id, agentCore.id);
    }

    return agentRuntime;
  }

  /**
   * Handles subagent spawn events.
   */
  private async handleSubagentSpawn(
    spawnInfo: { taskId: string; agentId: string },
    taskRuntime: TaskRuntime,
  ): Promise<void> {
    // Create new subtask for the spawned agent
    const subtask = await taskRuntime.runtime.createTask({
      title: `Subtask for agent ${spawnInfo.agentId}`,
      // ... other config
    });

    // Update Task.agentTree with new hierarchy
    taskRuntime.updateAgentTree(subtask.id, spawnInfo.agentId);
  }

  /**
   * Updates task progress metrics.
   */
  private updateTaskProgress(taskRuntime: TaskRuntime): void {
    // Calculate progress from subtask completion
    const progress = this.calculateTaskProgress(taskRuntime);
    taskRuntime.updateProgress(progress);
  }

  /**
   * Calculates task progress from subtasks.
   */
  private calculateTaskProgress(taskRuntime: TaskRuntime): { completed: number; total: number } {
    const subtasks = taskRuntime.getSubtasks();
    const completed = subtasks.filter(t => t.getState().status === 'completed').length;
    return { completed, total: subtasks.length };
  }

  /**
   * Gets conversion context for a task.
   */
  private getContext(taskId: string): ConversionContext {
    const context = this.conversionContext.get(taskId);
    if (!context) {
      throw new Error(`No conversion context for task ${taskId}`);
    }
    return context;
  }

  /**
   * Schedules a throttled UI update.
   */
  private throttledUpdate(): void {
    this.rateLimiter.schedule(() => {
      this.workspaceRuntime.notifyUpdate();
    });
  }
}
```

#### 1.6. Main Runtime Hook

**Location**: `packages/react-agent-sdk/src/hooks/useAgentRuntime.ts`

Create the main hook for end users:

```typescript
// packages/react-agent-sdk/src/hooks/useAgentRuntime.ts

'use client';

import { useMemo } from 'react';

import {
  WorkspaceRuntime,
  WorkspaceRuntimeImpl,
} from '../runtime';

import { WorkspaceRuntimeCoreFromSDK } from '../runtime-cores/WorkspaceRuntimeCoreFromSDK';
import {
  ClaudeAgentClient,
  AgentRuntimeConfig,
} from '../sdk/ClaudeAgentClient';

import {
  createPermissionHook,
  PermissionHook,
} from '../sdk/permissionHooks';

import { AgentStreamProcessor } from '../streaming/AgentStreamProcessor';
import { MessageConverters } from '../converters';

/**
 * Creates an agent runtime connected to Claude Agent SDK.
 *
 * This hook:
 * 1. Instantiates the Claude Agent SDK client
 * 2. Creates a workspace (or retrieves existing one)
 * 3. Sets up the runtime binding with memoized state
 * 4. Integrates permission hooks for approval system
 * 5. Configures stream processor for real-time updates
 *
 * @param config - Runtime configuration (API key, model, etc.)
 * @returns WorkspaceRuntime instance
 *
 * @example
 * ```tsx
 * import { useAgentRuntime } from '@assistant-ui/react-agent-sdk';
 * import { WorkspaceProvider } from '@assistant-ui/react-agent-sdk/context';
 *
 * export default function App() {
 *   const runtime = useAgentRuntime({
 *     apiKey: process.env.ANTHROPIC_API_KEY!,
 *   });
 *
 *   return (
 *     <WorkspaceProvider runtime={runtime}>
 *       {/* Your agent-ui primitives */}
 *     </WorkspaceProvider>
 *   );
 * }
 * ```
 */
export function useAgentRuntime(config: AgentRuntimeConfig): WorkspaceRuntime {
  return useMemo(() => {
    // 1. Create SDK client
    const sdkClient = new ClaudeAgentClient(config);

    // 2. Create workspace via SDK
    let workspaceCore: WorkspaceRuntimeCoreFromSDK;
    (async () => {
      const sdkWorkspace = await sdkClient.createWorkspace(config.workspaceId);
      workspaceCore = new WorkspaceRuntimeCoreFromSDK(sdkClient, sdkWorkspace);
    })();

    // For now, use a placeholder - in real implementation, this would be async
    // The pattern from useChatRuntime uses Promise-based initialization
    workspaceCore = new WorkspaceRuntimeCoreFromSDK(sdkClient, null as any);

    // 3. Create runtime binding with memoized state
    const binding = createWorkspaceBinding(workspaceCore);

    // 4. Create runtime implementation
    const runtime = new WorkspaceRuntimeImpl(binding);

    // 5. Set up stream processor
    const converters = new MessageConverters();
    const streamProcessor = new AgentStreamProcessor(runtime, converters);

    // 6. Attach stream processor to runtime (for use in createTask)
    runtime.__internal_streamProcessor = streamProcessor;

    return runtime;
  }, [config]);
}
```

**Note**: The real implementation needs to handle async workspace creation properly. The pattern from `useChatRuntime` should be studied more closely.

#### 1.7. Package Exports

**Location**: `packages/react-agent-sdk/src/index.ts`

```typescript
// Main hook
export { useAgentRuntime } from './hooks/useAgentRuntime';
export type { AgentRuntimeConfig } from './hooks/useAgentRuntime';

// SDK client
export { ClaudeAgentClient } from './sdk/ClaudeAgentClient';
export type { AgentRuntimeConfig } from './sdk/ClaudeAgentClient';

// Permission hooks
export { createPermissionHook } from './sdk/permissionHooks';
export type { PermissionHook, PermissionDecision } from './sdk/permissionHooks';

// Runtime types (for public API)
export type {
  WorkspaceRuntime,
  TaskRuntime,
  AgentRuntime,
  AgentEventRuntime,
} from './runtime';

export type {
  WorkspaceState,
  TaskState,
  AgentState,
  AgentEventState,
} from './runtime';

// Context providers
export { WorkspaceProvider } from './context/WorkspaceProvider';
export { TaskProvider } from './context/TaskProvider';
export { AgentProvider } from './context/AgentProvider';
export { ApprovalProvider } from './context/ApprovalProvider';
```

#### 1.8. Package Configuration

**Location**: `packages/react-agent-sdk/package.json`

```json
{
  "name": "@assistant-ui/react-agent-sdk",
  "version": "0.0.1",
  "description": "Claude Agent SDK integration for @assistant-ui/react-agent-primitives",
  "keywords": [
    "ai",
    "agent",
    "claude",
    "anthropic",
    "agent-sdk",
    "react",
    "assistant-ui"
  ],
  "author": "AgentbaseAI Inc.",
  "license": "MIT",
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
  "files": [
    "dist",
    "src",
    "README.md"
  ],
  "sideEffects": false,
  "scripts": {
    "build": "aui-build"
  },
  "dependencies": {
    "@anthropic/agent-sdk": "^1.0.0"
  },
  "peerDependencies": {
    "@assistant-ui/react": "^0.13.0",
    "@assistant-ui/react-agent-primitives": "^0.1.0",
    "@types/react": "*",
    "react": "^18 || ^19"
  },
  "peerDependenciesMeta": {
    "@types/react": {
      "optional": true
    }
  },
  "devDependencies": {
    "@assistant-ui/react": "workspace:*",
    "@assistant-ui/react-agent-primitives": "workspace:*",
    "@assistant-ui/x-buildutils": "workspace:*",
    "@types/react": "^19.2.7",
    "react": "^19.2.3"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "homepage": "https://www.assistant-ui.com/",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/assistant-ui/assistant-ui.git",
    "directory": "packages/react-agent-sdk"
  },
  "bugs": {
    "url": "https://github.com/assistant-ui/assistant-ui/issues"
  }
}
```

### Success Criteria for Task 1

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-sdk` compiles successfully
- [ ] `pnpm tsc --noEmit --project packages/react-agent-sdk/tsconfig.json` type checks
- [ ] Unit tests pass: `pnpm test --filter=@assistant-ui/react-agent-sdk`
- [ ] Linting passes: `pnpm lint --filter=@assistant-ui/react-agent-sdk`
- [ ] Changeset created: `pnpm changeset` (describe integration for npm publish)

#### Manual Verification:
- [ ] Can import and use `useAgentRuntime()` hook in test file
- [ ] Can create ClaudeAgentClient and call methods
- [ ] Can create permission hook that integrates with approval system
- [ ] Stream processor compiles and type-checks with all converter methods
- [ ] Package exports listed correctly in README

---

### Task 2: Create Example Application

**Location**: `examples/agent-dashboard/` (new directory)

#### 2.1. Project Structure

```
examples/agent-dashboard/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── .env.local.example
├── .gitignore
├── app/
│   ├── layout.tsx           # Main layout with WorkspaceProvider
│   ├── page.tsx             # Workspace overview (task list)
│   ├── task/
│   │   ├── [taskId]/
│   │   │   ├── page.tsx     # Task detail view
│   │   │   ├── agent-tree.tsx   # Agent hierarchy tree
│   │   │   └── agent-feed.tsx   # Agent activity feed
│   │   └── new/
│   │       └── page.tsx     # Task launcher form
│   └── api/
│       └── agents/
│           └── route.ts     # API route (optional for production)
├── components/
│   ├── TaskCard.tsx         # Task list item
│   ├── AgentCard.tsx        # Agent summary card
│   ├── ApprovalQueue.tsx    # Approval sidebar
│   ├── TaskLauncher.tsx     # New task form
│   └── ToolWidget.tsx       # Tool output renderer
├── lib/
│   ├── runtime.ts           # useAgentRuntime setup
│   └── utils.ts             # Helper functions
└── README.md
```

#### 2.2. Package Configuration

**Location**: `examples/agent-dashboard/package.json`

```json
{
  "name": "agent-dashboard-example",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@assistant-ui/react": "workspace:*",
    "@assistant-ui/react-agent-sdk": "workspace:*",
    "@assistant-ui/react-agent-primitives": "workspace:*",
    "@anthropic/agent-sdk": "^1.0.0",
    "next": "15.0.0",
    "react": "^19.2.3",
    "react-dom": "^19.2.3"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10",
    "postcss": "^8",
    "eslint": "^8",
    "eslint-config-next": "15.0.0"
  }
}
```

#### 2.3. Runtime Provider Setup

**Location**: `examples/agent-dashboard/lib/runtime.ts`

```typescript
'use client';

import { useAgentRuntime } from '@assistant-ui/react-agent-sdk';
import { WorkspaceProvider } from '@assistant-ui/react-agent-sdk/context';
import { useMemo } from 'react';

/**
 * Runtime provider for the agent dashboard.
 *
 * Initializes the agent runtime with Claude Agent SDK and wraps
 * the app with WorkspaceProvider for context access.
 */
export function AgentRuntimeProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env['ANTHROPIC_API_KEY'];

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const runtime = useAgentRuntime({
    apiKey,
    baseUrl: process.env['ANTHROPIC_BASE_URL'], // optional
    model: process.env['ANTHROPIC_MODEL'] || 'claude-3-5-sonnet-20241022', // optional
  });

  return (
    <WorkspaceProvider runtime={runtime}>
      {children}
    </WorkspaceProvider>
  );
}
```

#### 2.4. Root Layout

**Location**: `examples/agent-dashboard/app/layout.tsx`

```typescript
import { AgentRuntimeProvider } from '@/lib/runtime';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agent Dashboard | assistant-ui',
  description: 'Real-time agent supervision UI powered by Claude Agent SDK',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AgentRuntimeProvider>
          {children}
        </AgentRuntimeProvider>
      </body>
    </html>
  );
}
```

#### 2.5. Workspace Overview (Home Page)

**Location**: `examples/agent-dashboard/app/page.tsx`

```typescript
'use client';

import { Link } from 'next/link';
import {
  WorkspacePrimitive,
  WorkspacePrimitiveTasks,
  WorkspacePrimitiveActionsViewTableView,
} from '@assistant-ui/react-agent-primitives';
import { TaskCard } from '@/components/TaskCard';
import { ApprovalQueue } from '@/components/ApprovalQueue';

/**
 * Workspace overview page showing all tasks and approvals.
 */
export default function HomePage() {
  return (
    <main className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
          <div className="flex gap-3">
            <WorkspacePrimitiveActionsViewTableView className="rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100" />
            <Link
              href="/task/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              New Task
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Task list */}
        <div className="flex-1 overflow-auto p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Tasks</h2>
          <WorkspacePrimitiveTasks>
            {(tasks) => (
              <div className="grid gap-4">
                {tasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
                    <p>No tasks yet. Create your first agent task to get started.</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <Link key={task.id} href={`/task/${task.id}`}>
                      <TaskCard taskId={task.id} />
                    </Link>
                  ))
                )}
              </div>
            )}
          </WorkspacePrimitiveTasks>
        </div>

        {/* Approval queue sidebar */}
        <div className="w-96 border-l bg-white p-6">
          <ApprovalQueue />
        </div>
      </div>
    </main>
  );
}
```

#### 2.6. Task Card Component

**Location**: `examples/agent-dashboard/components/TaskCard.tsx`

```typescript
'use client';

import Link from 'next/link';
import {
  TaskPrimitive,
  TaskPrimitiveRoot,
  TaskPrimitiveTitle,
  TaskPrimitiveStatus,
  TaskPrimitiveProgress,
  TaskPrimitiveCost,
  TaskPrimitiveActionsLifecycleCancel,
  TaskPrimitiveActionsLifecycleRetry,
} from '@assistant-ui/react-agent-primitives';

interface TaskCardProps {
  taskId: string;
}

export function TaskCard({ taskId }: TaskCardProps) {
  return (
    <TaskPrimitive.Root taskId={taskId}>
      <TaskPrimitiveRoot className="group rounded-lg border bg-white p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900">
              <TaskPrimitiveTitle />
            </h3>

            {/* Status badge */}
            <div className="mt-2 flex items-center gap-3">
              <TaskPrimitiveStatus />
              <span className="text-sm text-gray-600">
                Cost: <TaskPrimitiveCost />
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <TaskPrimitiveProgress>
                {(progress) => (
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{
                        width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                )}
              </TaskPrimitiveProgress>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <TaskPrimitiveActionsLifecycleCancel className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50" />
            <TaskPrimitiveActionsLifecycleRetry className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50" />
          </div>
        </div>
      </TaskPrimitiveRoot>
    </TaskPrimitive.Root>
  );
}
```

#### 2.7. Approval Queue Component

**Location**: `examples/agent-dashboard/components/ApprovalQueue.tsx`

```typescript
'use client';

import {
  ApprovalQueuePrimitive,
  ApprovalQueuePrimitiveRoot,
  ApprovalQueuePrimitiveItems,
} from '@assistant-ui/react-agent-primitives';
import { ApprovalCard } from './ApprovalCard';

export function ApprovalQueue() {
  return (
    <ApprovalQueuePrimitiveRoot>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Approvals</h2>

      <ApprovalQueuePrimitiveItems>
        {(approvals) => (
          <div className="space-y-3">
            {approvals.length === 0 ? (
              <p className="text-sm text-gray-500">No pending approvals</p>
            ) : (
              approvals.map((approval) => (
                <ApprovalCard key={approval.id} approvalId={approval.id} />
              ))
            )}
          </div>
        )}
      </ApprovalQueuePrimitiveItems>
    </ApprovalQueuePrimitiveRoot>
  );
}
```

#### 2.8. Approval Card Component

**Location**: `examples/agent-dashboard/components/ApprovalCard.tsx`

```typescript
'use client';

import {
  ApprovalPrimitive,
  ApprovalPrimitiveRoot,
  ApprovalPrimitiveRequest,
  ApprovalPrimitiveToolName,
  ApprovalPrimitiveActionsApproveOnce,
  ApprovalPrimitiveActionsRejectOnce,
} from '@assistant-ui/react-agent-primitives';

interface ApprovalCardProps {
  approvalId: string;
}

export function ApprovalCard({ approvalId }: ApprovalCardProps) {
  return (
    <ApprovalPrimitive.Root approvalId={approvalId}>
      <ApprovalPrimitiveRoot className="rounded-lg border bg-gray-50 p-4">
        {/* Tool name and request */}
        <div className="mb-3">
          <span className="text-sm font-semibold text-gray-700">
            <ApprovalPrimitiveToolName />
          </span>
          <p className="mt-1 text-sm text-gray-600">
            <ApprovalPrimitiveRequest />
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <ApprovalPrimitiveActionsApproveOnce className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
            Approve
          </ApprovalPrimitiveActionsApproveOnce>
          <ApprovalPrimitiveActionsRejectOnce className="flex-1 rounded-md border border-red-600 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            Reject
          </ApprovalPrimitiveActionsRejectOnce>
        </div>
      </ApprovalPrimitiveRoot>
    </ApprovalPrimitive.Root>
  );
}
```

#### 2.9. Task Detail Page

**Location**: `examples/agent-dashboard/app/task/[taskId]/page.tsx`

```typescript
'use client';

import Link from 'next/link';
import {
  TaskPrimitive,
  TaskPrimitiveRoot,
  TaskPrimitiveTitle,
  TaskPrimitiveStatus,
  TaskPrimitiveStrategy,
  TaskPrimitiveAgentTree,
  TaskPrimitiveActionsLifecycleCancel,
} from '@assistant-ui/react-agent-primitives';
import { AgentTreeView } from './agent-tree';
import { AgentFeedView } from './agent-feed';

export default function TaskDetailPage({ params }: { params: { taskId: string } }) {
  return (
    <main className="h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Task Detail</h1>
          <TaskPrimitiveActionsLifecycleCancel className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100">
            Cancel Task
          </TaskPrimitiveActionsLifecycleCancel>
        </div>
      </header>

      {/* Task content */}
      <TaskPrimitive.Root taskId={params.taskId}>
        <TaskPrimitiveRoot className="h-full overflow-auto p-6">
          {/* Task info */}
          <div className="mb-6">
            <TaskPrimitiveTitle className="text-3xl font-bold text-gray-900" />
            <div className="mt-2 flex items-center gap-3">
              <TaskPrimitiveStatus />
              <TaskPrimitiveStrategy>
                {(strategy) => strategy && (
                  <span className="text-sm text-gray-600">
                    Strategy: {strategy}
                  </span>
                )}
              </TaskPrimitiveStrategy>
            </div>
          </div>

          {/* Split view: Agent tree + Activity feed */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Agent tree */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Agent Hierarchy</h2>
              <TaskPrimitiveAgentTree>
                <AgentTreeView />
              </TaskPrimitiveAgentTree>
            </div>

            {/* Right: Activity feed */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Activity Feed</h2>
              <AgentFeedView />
            </div>
          </div>
        </TaskPrimitiveRoot>
      </TaskPrimitive.Root>
    </main>
  );
}
```

#### 2.10. Task Launcher Page

**Location**: `examples/agent-dashboard/app/task/new/page.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import {
  TaskLauncherPrimitive,
  TaskLauncherPrimitiveRoot,
  TaskLauncherPrimitiveInput,
  TaskLauncherPrimitiveAgentSelector,
  TaskLauncherPrimitiveModelSelector,
  TaskLauncherPrimitivePermissionConfig,
  TaskLauncherPrimitiveActionsLaunchSubmit,
} from '@assistant-ui/react-agent-primitives';

export default function TaskLauncherPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Create New Task</h1>

        <TaskLauncherPrimitiveRoot>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            {/* Task description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Task Description
              </label>
              <TaskLauncherPrimitiveInput
                className="mt-1 w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Describe what you want the agent to do..."
              />
            </div>

            {/* Agent configuration */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Lead Agent Type
              </label>
              <TaskLauncherPrimitiveAgentSelector className="mt-1 w-full rounded-md border border-gray-300 p-2" />
            </div>

            {/* Model selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Model
              </label>
              <TaskLauncherPrimitiveModelSelector className="mt-1 w-full rounded-md border border-gray-300 p-2" />
            </div>

            {/* Permission settings */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700">
                Permission Mode
              </label>
              <TaskLauncherPrimitivePermissionConfig>
                <PermissionModeSelector />
              </TaskLauncherPrimitivePermissionConfig>
            </div>

            {/* Submit button */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <TaskLauncherPrimitiveActionsLaunchSubmit className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Launch Task
              </TaskLauncherPrimitiveActionsLaunchSubmit>
            </div>
          </div>
        </TaskLauncherPrimitiveRoot>
      </div>
    </main>
  );
}

function PermissionModeSelector() {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" name="permission" value="ask" defaultChecked />
        Ask for approval (recommended)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" name="permission" value="auto-reads" />
        Auto-approve read-only operations
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" name="permission" value="auto-all" />
        Auto-approve all operations
      </label>
    </div>
  );
}
```

#### 2.11. Environment Variables

**Location**: `examples/agent-dashboard/.env.local.example`

```bash
# Anthropic API key (required)
ANTHROPIC_API_KEY=your-api-key-here

# Optional: Base URL for Anthropic API
# ANTHROPIC_BASE_URL=https://api.anthropic.com

# Optional: Default model
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

#### 2.12. README

**Location**: `examples/agent-dashboard/README.md`

```markdown
# Agent Dashboard Example

A complete example of building an agent supervision UI with assistant-ui agent primitives.

## Features

- **Workspace Overview**: View all tasks in your agent workspace
- **Task Details**: See agent hierarchy and activity feeds for each task
- **Real-time Approvals**: Interactive approval queue with approve/deny buttons
- **Task Launcher**: Create new agent tasks with configuration
- **Cost Tracking**: Monitor costs across tasks and agents

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up your environment:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```env
ANTHROPIC_API_KEY=your-api-key-here
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Creating a Task

1. Click "New Task" button
2. Enter a task description
3. Select agent type and model
4. Choose permission mode
5. Click "Launch Task"

### Monitoring Tasks

- View all tasks on the dashboard
- Click a task to see details
- Watch agent activity feed in real-time
- Track costs and progress

### Managing Approvals

- Approval queue shows pending tool uses
- Click "Approve" to allow tool execution
- Click "Reject" to deny tool execution

## Architecture

- **Runtime**: `useAgentRuntime()` from `@assistant-ui/react-agent-sdk`
- **Primitives**: All 11 primitives from `@assistant-ui/react-agent-primitives`
- **Framework**: Next.js 15 with App Router

## License

MIT
```

### Success Criteria for Task 2

#### Automated Verification:
- [ ] `pnpm turbo build --filter=examples/agent-dashboard` builds successfully
- [ ] `pnpm lint --filter=examples/agent-dashboard` passes
- [ ] `pnpm tsc --noEmit --project examples/agent-dashboard/tsconfig.json` type checks

#### Manual Verification:
- [ ] `cd examples/agent-dashboard && npm run dev` starts dev server
- [ ] Navigate to http://localhost:3000 and home page loads
- [ ] Click "New Task" and form renders correctly
- [ ] Submit a task and see it appear in task list
- [ ] Click task to see detail view with agent tree and feed
- [ ] Approval queue sidebar renders
- [ ] All primitives render without errors
- [ ] Test with real API key and see tasks execute

---

### Task 3: Documentation

**Location**: `apps/docs/content/docs/agent-ui/` (new directory)

#### 3.1. Overview Document

**Location**: `apps/docs/content/docs/agent-ui/overview.mdx`

```mdx
---
title: Agent UI Overview
description: Building supervision interfaces for AI agents with assistant-ui agent primitives.
---

## What is Agent UI?

Agent UI is a specialized layer of assistant-ui for building **supervision UX** for autonomous AI agents. While the main chat UX is designed for human-in-the-loop conversations, agent UX is for watching and managing AI agents that work autonomously.

### Supervision UX vs Chat UX

| Aspect | Chat UX | Agent UX |
|--------|---------|----------|
| **Purpose** | Human-in-the-loop conversation | Autonomous task execution |
| **Users** | Direct users of chatbot | Supervisors watching agents |
| **Flow** | Request → Response → Iterate | Plan → Execute → Monitor |
| **Key Concerns** | Response quality, helpfulness | Safety, cost, correctness |
| **Controls** | User edits, retry | Approvals, cancellations |

### The Agent Mental Model

Agent UI represents the execution environment of AI agents through three core concepts:

#### Workspaces

A **workspace** is the top-level container for agent tasks. Think of it as a project directory that contains:

- **Tasks**: Individual work units being executed
- **Agents**: The AI agent instances (lead agent + workers)
- **Approvals**: Pending tool use requests requiring human review
- **Resources**: Aggregated costs, rate limits, token usage

#### Tasks

A **task** is a unit of work executed by one or more agents. Each task has:

- **Status**: queued, planning, executing, synthesizing, completed, failed
- **Progress**: Completion percentage from subtasks
- **Strategy**: The decomposition plan from the lead agent
- **Cost**: Money spent on LLM API calls
- **Agent Tree**: Hierarchy of lead agent → worker agents → subagents

#### Agents

An **agent** is an LLM-powered worker. Each agent has:

- **Role**: orchestrator, worker, or specialist
- **Events**: Stream of actions (tool calls, reasoning, errors)
- **Cost**: Individual cost tracking
- **Context Usage**: Token consumption vs limits

### Properties vs Actions Pattern

All agent-ui primitives follow a **Properties vs Actions** pattern:

- **Properties**: Read-only data display (`.Title`, `.Status`, `.Cost`)
- **Actions**: Interactive controls (`.Actions.Lifecycle.Cancel`, `.Actions.Approve`)

This separation makes it easy to compose UIs for both viewing and controlling.

## Primitives

Agent UI provides 11 primitives organized into 3 categories:

### Core Primitives (Phase 3)

1. **TaskPrimitive** - Task information and lifecycle controls
2. **AgentPrimitive** - Agent details and state
3. **ApprovalPrimitive** - Pending tool use requests

### Supporting Primitives (Phase 4)

4. **TaskTreePrimitive** - Hierarchical task/agent tree view
5. **AgentFeedPrimitive** - Agent event/activity feed
6. **AgentEventPrimitive** - Individual agent events
7. **ToolExecutionPrimitive** - Tool calls with streaming output
8. **ApprovalQueuePrimitive** - Bulk approval management
9. **PermissionModePrimitive** - Global permission settings
10. **TaskLauncherPrimitive** - Task creation form
11. **WorkspacePrimitive** - Workspace overview list

## Quick Start

```tsx
import { useAgentRuntime } from '@assistant-ui/react-agent-sdk';
import { WorkspaceProvider } from '@assistant-ui/react-agent-sdk/context';
import { WorkspacePrimitive, WorkspacePrimitiveTasks } from '@assistant-ui/react-agent-primitives';

export default function App() {
  const runtime = useAgentRuntime({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  return (
    <WorkspaceProvider runtime={runtime}>
      <WorkspacePrimitiveRoot>
        <h1>My Workspace</h1>
        <WorkspacePrimitiveTasks>
          {(tasks) => tasks.map(task => <TaskCard key={task.id} taskId={task.id} />)}
        </WorkspacePrimitiveTasks>
      </WorkspacePrimitiveRoot>
    </WorkspaceProvider>
  );
}
```

See the [Getting Started guide](./getting-started) for complete setup instructions.
```

#### 3.2. Getting Started Guide

**Location**: `apps/docs/content/docs/agent-ui/getting-started.mdx`

```mdx
---
title: Getting Started with Agent UI
description: Set up your first agent workspace and run tasks with Claude Agent SDK.
---

<Steps>

<Step>

### Create a new project

```bash
npx create-next-app@latest my-agent-app
cd my-agent-app
```

</Step>

<Step>

### Install dependencies

<InstallCommand npm={[
  "@assistant-ui/react",
  "@assistant-ui/react-agent-sdk",
  "@assistant-ui/react-agent-primitives",
  "@anthropic/agent-sdk"
]} />

</Step>

<Step>

### Set up Claude Agent SDK

Create `.env.local`:

```env
ANTHROPIC_API_KEY=your-api-key-here
```

</Step>

<Step>

### Create the agent runtime wrapper

Create `lib/agent-runtime.tsx`:

```tsx
'use client';

import { useAgentRuntime } from '@assistant-ui/react-agent-sdk';
import { WorkspaceProvider } from '@assistant-ui/react-agent-sdk/context';
import { useMemo } from 'react';

export function AgentRuntimeProvider({ children }: { children: React.ReactNode }) {
  const runtime = useAgentRuntime({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  return (
    <WorkspaceProvider runtime={runtime}>
      {children}
    </WorkspaceProvider>
  );
}
```

</Step>

<Step>

### Wrap your app

Update `app/layout.tsx`:

```tsx
import { AgentRuntimeProvider } from '@/lib/agent-runtime';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AgentRuntimeProvider>
          {children}
        </AgentRuntimeProvider>
      </body>
    </html>
  );
}
```

</Step>

<Step>

### Create your first task view

Create `app/page.tsx`:

```tsx
'use client';

import {
  WorkspacePrimitive,
  WorkspacePrimitiveRoot,
  WorkspacePrimitiveTasks,
} from '@assistant-ui/react-agent-primitives';

export default function HomePage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Agent Workspace</h1>

      <WorkspacePrimitiveRoot>
        <WorkspacePrimitiveTasks>
          {(tasks) => (
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskCard key={task.id} taskId={task.id} />
              ))}
            </div>
          )}
        </WorkspacePrimitiveTasks>
      </WorkspacePrimitiveRoot>
    </main>
  );
}

function TaskCard({ taskId }: { taskId: string }) {
  return (
    <div className="border rounded-lg p-4">
      {/* Task content */}
      <h2 className="font-semibold">Task {taskId}</h2>
    </div>
  );
}
```

</Step>

<Step>

### Run your app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You now have a working agent workspace!

</Step>

</Steps>

## Next Steps

- Learn about [TaskPrimitive](./primitives/task) for task display
- Add [ApprovalQueuePrimitive](./primitives/approval-queue) for approvals
- See the [Agent Dashboard](https://github.com/assistant-ui/assistant-ui/tree/main/examples/agent-dashboard) example
```

#### 3.3. Primitive Documentation (11 docs)

Each primitive gets its own doc following this template:

**Location**: `apps/docs/content/docs/agent-ui/primitives/task.mdx`

```mdx
---
title: TaskPrimitive
description: Core primitive for displaying agent task information and lifecycle controls.
---

ComponentReference
  name: TaskPrimitive

TaskPrimitive displays information about a task and provides lifecycle controls.

## Overview

The TaskPrimitive is the primary way to display task information in agent-ui. It shows:
- Task title, status, and progress
- Strategy (decomposition plan)
- Lead agent and worker agents
- Cost and duration metrics
- Lifecycle actions (cancel, retry)

## Properties

### Title

Displays the task title.

```tsx
const title = useTaskState(state => state.title);
return <h2>{title}</h2>;
```

Or use the property component:

```tsx
<TaskPrimitiveTitle />
```

### Status

Shows the task status with an icon indicator.

```tsx
<TaskPrimitiveStatus />
```

Status values:
- `queued` - Waiting to start
- `planning` - Decomposing work into subtasks
- `executing` - Working on tasks
- `synthesizing` - Compiling final result
- `completed` - Finished successfully
- `failed` - Encountered an error

### Progress

Displays subtask completion progress as a progress bar.

```tsx
<TaskPrimitiveProgress>
  {(progress) => (
    <div className="h-2 bg-gray-200 rounded-full">
      <div
        className="h-full bg-blue-600"
        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
      />
    </div>
  )}
</TaskPrimitiveProgress>
```

### Strategy

Shows the decomposition plan from the lead agent.

```tsx
<TaskPrimitiveStrategy>
  {(strategy) => strategy && (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold">Strategy</h3>
      <p>{strategy}</p>
    </div>
  )}
</TaskPrimitiveStrategy>
```

### Lead Agent / Worker Agents

Displays the agents working on the task.

```tsx
<TaskPrimitiveLeadAgent>
  {(agent) => (
    <AgentCard agent={agent.id} />
  )}
</TaskPrimitiveLeadAgent>
```

### Agent Tree

Hierarchical view of all agents in the task.

```tsx
<TaskPrimitiveAgentTree>
  <AgentTreeView />
</TaskPrimitiveAgentTree>
```

### Subtasks

List of child TaskPrimitive components.

```tsx
<TaskPrimitiveSubtasks>
  {(subtasks) => subtasks.map(task => (
    <TaskCard key={task.id} taskId={task.id} />
  ))}
</TaskPrimitiveSubtasks>
```

### Cost

Displays total money spent on the task.

```tsx
<span>Cost: <TaskPrimitiveCost /></span>
```

### Duration

Shows how long the task has been running.

```tsx
<TaskPrimitiveDuration />
```

### Artifacts

List of created/modified files.

```tsx
<TaskPrimitiveArtifacts>
  {(artifacts) => artifacts.map(artifact => (
    <ArtifactCard key={artifact.id} artifact={artifact} />
  ))}
</TaskPrimitiveArtifacts>
```

### Dependencies

List of tasks that must complete before this task.

```tsx
<TaskPrimitiveDependencies>
  {(deps) => deps.map(dep => (
    <DependencyCard key={dep.taskId} dependency={dep} />
  ))}
</TaskPrimitiveDependencies>
```

## Actions

### Lifecycle.Cancel

Cancel the task and all running agents.

```tsx
<TaskPrimitiveActionsLifecycleCancel>
  Cancel
</TaskPrimitiveActionsLifecycleCancel>
```

### Lifecycle.Retry

Restart the task with new agents.

```tsx
<TaskPrimitiveActionsLifecycleRetry>
  Retry
</TaskPrimitiveActionsLifecycleRetry>
```

### Lifecycle.RetrySubtask

Retry a specific failed subtask.

```tsx
<TaskPrimitiveActionsLifecycleRetrySubtask subtaskId="subtask-123">
  Retry Subtask
</TaskPrimitiveActionsLifecycleRetrySubtask>
```

### Lifecycle.Prioritize

Move the task up in the queue.

```tsx
<TaskPrimitiveActionsLifecyclePrioritize>
  Prioritize
</TaskPrimitiveActionsLifecyclePrioritize>
```

## Complete Example

```tsx
import {
  TaskPrimitive,
  TaskPrimitiveRoot,
  TaskPrimitiveTitle,
  TaskPrimitiveStatus,
  TaskPrimitiveProgress,
  TaskPrimitiveCost,
  TaskPrimitiveActionsLifecycleCancel,
  TaskPrimitiveActionsLifecycleRetry,
} from '@assistant-ui/react-agent-primitives';

export function TaskCard({ taskId }: { taskId: string }) {
  return (
    <TaskPrimitive.Root taskId={taskId}>
      <TaskPrimitiveRoot className="border rounded-lg p-4">
        <div className="flex justify-between">
          <div>
            <TaskPrimitiveTitle className="text-xl font-bold" />
            <div className="mt-2 flex gap-3">
              <TaskPrimitiveStatus />
              <span>Cost: <TaskPrimitiveCost /></span>
            </div>
            <TaskPrimitiveProgress className="mt-3" />
          </div>
          <div className="flex gap-2">
            <TaskPrimitiveActionsLifecycleCancel />
            <TaskPrimitiveActionsLifecycleRetry />
          </div>
        </div>
      </TaskPrimitiveRoot>
    </TaskPrimitive.Root>
  );
}
```

## Hooks

### useTaskState

Subscribe to task state updates.

```tsx
const status = useTaskState(state => state.status);
```

### useTaskApi

Get task runtime for actions.

```tsx
const api = useTaskApi();
api.task().cancel();
```
```

Similarly create docs for:
- `agent.mdx` - AgentPrimitive
- `approval.mdx` - ApprovalPrimitive
- `task-tree.mdx` - TaskTreePrimitive
- `agent-feed.mdx` - AgentFeedPrimitive
- `agent-event.mdx` - AgentEventPrimitive
- `tool-execution.mdx` - ToolExecutionPrimitive
- `approval-queue.mdx` - ApprovalQueuePrimitive
- `permission-mode.mdx` - PermissionModePrimitive
- `task-launcher.mdx` - TaskLauncherPrimitive
- `workspace.mdx` - WorkspacePrimitive

#### 3.4. Hooks Documentation

**Location**: `apps/docs/content/docs/agent-ui/hooks/useAgentRuntime.mdx`

```mdx
---
title: useAgentRuntime Hook
description: Create and connect to Claude Agent SDK runtime.
---

Creates an agent runtime instance connected to the Claude Agent SDK.

## Signature

```tsx
function useAgentRuntime(config: AgentRuntimeConfig): WorkspaceRuntime;
```

## Parameters

### config

Configuration for the agent runtime.

```tsx
interface AgentRuntimeConfig {
  /** Anthropic API key (required) */
  apiKey: string;

  /** Base URL for SDK (optional, defaults to Anthropic API) */
  baseUrl?: string;

  /** Default model for agents (optional) */
  model?: string;

  /** Workspace ID for resuming sessions (optional) */
  workspaceId?: string;
}
```

## Return Value

Returns a `WorkspaceRuntime` instance for use with primitives.

## Example

```tsx
import { useAgentRuntime } from '@assistant-ui/react-agent-sdk';
import { WorkspaceProvider } from '@assistant-ui/react-agent-sdk/context';

export default function App() {
  const runtime = useAgentRuntime({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
  });

  return (
    <WorkspaceProvider runtime={runtime}>
      {/* Your primitives */}
    </WorkspaceProvider>
  );
}
```

## Creating Tasks

```tsx
const api = useWorkspaceApi();
const task = await api.createTask({
  title: 'Fix bug in auth system',
  model: 'claude-3-5-sonnet-20241022',
  permissionMode: 'ask',
});
```

## Features

- **Automatic workspace management** - Creates or retrieves workspace on init
- **Real-time streaming** - Subscribes to SDK event streams for live updates
- **Permission hooks** - Integrates approval system with tool use checks
- **Type-safe** - Full TypeScript support
```

Create similar docs for:
- `useTaskRuntime.mdx`
- `useAgentRuntime.mdx` (agent-level)
- `useApprovalRuntime.mdx`

#### 3.5. Integration Guide

**Location**: `apps/docs/content/docs/agent-ui/integration.mdx`

```mdx
---
title: Claude Agent SDK Integration
description: Deep dive into how agent-ui integrates with Claude Agent SDK.
---

## How It Works

The `@assistant-ui/react-agent-sdk` package integrates with the Claude Agent SDK in three layers:

### 1. SDK Client Layer

The `ClaudeAgentClient` class wraps the Anthropic Agent SDK with a type-safe interface:

```tsx
const client = new ClaudeAgentClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const workspace = await client.createWorkspace();
const task = await client.createTask(workspace.id, { title: 'My task' });
```

### 2. Stream Processing Layer

The `AgentStreamProcessor` converts SDK message streams to runtime state updates:

```tsx
const processor = new AgentStreamProcessor(workspaceRuntime, converters);
await processor.processStream(task.id);
```

This processes SDK messages (tool use, reasoning, results) and updates runtime state in real-time.

### 3. Permission Hook Layer

Permission hooks integrate tool use checks with the approval system:

```tsx
const hook = createPermissionHook(approvalRuntime);
client.setPermissionHook(hook);
```

When an agent tries to use a tool, this hook:
1. Creates a pending approval
2. Waits for human decision
3. Returns decision to SDK

## Message Conversion

SDK messages are converted to state objects:

| SDK Message Type → Runtime State |
|--------------------------------|
| `SDKAssistantMessage` (tool_use) → `AgentEventState.toolExecution` |
| `SDKAssistantMessage` (reasoning) → `AgentEventState.reasoning` |
| `SDKPartialAssistantMessage` (text_delta) → partial `toolExecution.output` |
| `SDKResultMessage` → `AgentState.cost`, `AgentState.contextUsage` |
| `SDKErrorMessage` → `AgentState.error` |

## Performance

Streaming updates are rate-limited to 30fps to prevent overwhelming React:

```tsx
private readonly rateLimiter = new RateLimiter();
```

This ensures smooth performance even with high-frequency SDK events.

See the [example dashboard](https://github.com/assistant-ui/assistant-ui/tree/main/examples/agent-dashboard) for a complete integration.
```

### Success Criteria for Task 3

#### Automated Verification:
- [ ] Documentation builds locally: `cd apps/docs && npm run dev`
- [ ] No MDX syntax errors
- [ ] All code examples compile in TypeScript

#### Manual Verification:
- [ ] Navigate to /docs/agent-ui and see overview page
- [ ] Getting started guide renders with Steps component
- [ ] Click through primitive docs (11 pages)
- [ ] Code examples display with syntax highlighting
- [ ] API references render correctly
- [ ] Internal links work

---

## Testing Strategy

### Unit Tests

**Package Tests** (`packages/react-agent-sdk/__tests__/`):
- `ClaudeAgentClient.test.ts` - Test SDK client wrapper
- `converters.test.ts` - Test message conversion functions
- `streamProcessor.test.ts` - Test stream processing logic
- `hooks.test.ts` - Test useAgentRuntime hook

**Example**: Test converter function

```typescript
import { describe, it, expect } from 'vitest';
import { convertSDKMessageToAgentEventState } from '../src/converters';

describe('convertSDKMessageToAgentEventState', () => {
  it('converts tool_use message to event state', () => {
    const message = {
      type: 'tool_use',
      id: 'event-123',
      name: 'Bash',
      input: { command: 'ls' },
      timestamp: '2026-01-21T12:00:00Z',
    };

    const result = convertSDKMessageToAgentEventState(message, context);

    expect(result.type).toBe('tool-call');
    expect(result.status).toBe('completed');
    expect(result.toolExecution.name).toBe('Bash');
  });
});
```

### Integration Tests

**End-to-End Tests**:
- Use Vitest with SDK mocking
- Test complete flow: create task → process stream → approve tool
- Mock Claude Agent SDK responses

**Example**: Complete task flow

```typescript
it('creates task and processes stream', async () => {
  const { sdkClient, streamProcessor } = setupTest({
    mockStream: [
      { type: 'planning', content: 'Plan goes here' },
      { type: 'tool_use', name: 'Bash', input: { command: 'test' } },
      { type: 'result', cost: 0.01 },
    ],
  });

  const task = await runtime.createTask({ title: 'Test task' });
  await streamProcessor.processStream(task.id);

  expect(runtime.getState().tasks.length).toBe(1);
  expect(task.getState().status).toBe('completed');
});
```

### Manual Verification

**Example App Testing**:
1. [ ] Start app with real API key
2. [ ] Create task via launcher form
3. [ ] Verify task appears in list
4. [ ] Click task and see detail view
5. [ ] Watch approval system work with permissions: 'ask'
6. [ ] Approve/deny tools and verify execution
7. [ ] Check cost tracking updates in real-time
8. [ ] Test cancel action on running task

**Documentation Verification**:
1. [ ] Follow getting started guide end-to-end
2. [ ] Build example from docs
3. [ ] Verify all code examples run
4. [ ] Check links and navigation

---

## Migration Notes

No migration needed - this is a new feature.

However, note that:
- Claude Agent SDK is required (external dependency)
- Works with `@assistant-ui/react` v0.13+
- Requires React 18 or 19

---

## Performance Considerations

1. **Rate-limited Updates**: Stream processor caps UI updates at 30fps
2. **Memoized State**: Runtime state uses ShallowMemoizeSubject to avoid unnecessary re-renders
3. **Subscription Management**: Primitives auto-unsubscribe on unmount
4. **Streaming Output**: Tool output buffers to avoid excessive DOM updates

---

## Troubleshooting

### Issues with SDK Connection

**Problem**: `useAgentRuntime()` throws "API key required"

**Solution**: Ensure `ANTHROPIC_API_KEY` is set in environment variables

### Stream Not Processing

**Problem**: Task created but no events appearing

**Solution**: Verify stream processor is attached and task ID matches

### Permission Hooks Not Working

**Problem**: Tools execute without approval

**Solution**: Ensure `createPermissionHook(approvalRuntime)` is registered

### Example App Build Errors

**Problem**: TypeScript errors in example app

**Solution**: Run `pnpm turbo build --filter=examples/agent-dashboard` to see full error

---

## References

- Original proposal: `/notes/proposals/agent-ui-proposal.md`
- Implementation plan: `/notes/proposals/agent-ui-implementation-plan.md`
- Claude Agent SDK docs: [https://docs.anthropic.com/agent-sdk](https://docs.anthropic.com/agent-sdk)
- Example dashboard: `/examples/agent-dashboard/`
- Core primitives docs: `/apps/docs/content/docs/agent-ui/primitives/`