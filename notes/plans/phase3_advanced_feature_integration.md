# Phase 3: Advanced Feature Integration Implementation Plan

## Overview

**Goal**: Integrate Mastra's unique capabilities (memory, workflows, tools, events, RAG, observability) to unlock the features that make Mastra compelling and differentiate it from other frameworks.

**Success Criteria**: Users can access Mastra's advanced features through dedicated hooks and runtime components that follow established integration patterns while providing seamless access to memory management, workflow orchestration, tool systems, and observability.

**Dependencies**: Phase 1 (Foundation) and Phase 2 (Message Processing) must be completed. This phase builds on the core runtime hook and message conversion system.

**Estimated Complexity**: High - involves integrating complex external systems with multiple integration points and sophisticated state management.

**Risk Level**: Medium-High - depends on external Mastra APIs which may evolve, complex state synchronization requirements.

## Current State Analysis

**What exists now**:
- Basic runtime hook and message conversion from Phase 1-2
- Generic streaming communication with Mastra agents
- No access to Mastra's advanced feature ecosystem

**What's missing**:
- Memory system integration (persistent, thread-based, semantic search)
- Workflow orchestration (XState, human-in-the-loop, suspend/resume)
- Advanced tool management (dynamic registration, execution, cancellation)
- Event system integration (agent lifecycle, custom events, streaming)
- RAG pipeline integration (document processing, vector operations)
- Observability integration (tracing, metrics, monitoring)

## Desired End State

After Phase 3 completion:
- `useMastraMemory()` hook for persistent conversation memory and semantic search
- `useMastraWorkflows()` hook for XState-powered workflow orchestration
- `useMastraTools()` hook for dynamic tool management and execution
- `useMastraEvents()` hook for comprehensive event handling
- `useMastraRAG()` hook for document processing and retrieval
- `useMastraObservability()` hook for tracing and monitoring
- Full integration with Mastra's advanced feature ecosystem
- Type-safe interfaces for all Mastra-specific capabilities

## Key Discoveries

- **Memory System**: Mastra provides thread-based persistent memory with semantic recall using vector similarity search across conversations
- **Workflow System**: XState-powered deterministic workflows with human-in-the-loop interrupts and suspend/resume capabilities
- **Tool System**: Dynamic tool calling with automatic registration, execution management, and real-time status updates
- **Event System**: Comprehensive event-driven architecture with agent lifecycle, metadata, and custom events
- **RAG Pipeline**: Multi-format document processing with unified vector store API and intelligent chunking
- **Observability**: AI-specific tracing, performance metrics, and multi-platform export capabilities

## What We're NOT Doing

- Implementing the basic runtime hook (Phase 1)
- Message conversion and accumulation (Phase 2)
- CLI integration and examples (Phase 4)
- Comprehensive testing and optimization (Phase 5)
- Breaking changes to existing assistant-ui core APIs
- Integration with deprecated or experimental Mastra features

## Implementation Approach

Follow LangGraph's advanced feature patterns while adapting for Mastra's unique capabilities:

1. **Memory Integration**: Symbol-based runtime extras pattern for memory access
2. **Workflow Integration**: Event-driven architecture with interrupt state management
3. **Tool Integration**: Dynamic registration pattern with real-time execution updates
4. **Event Integration**: Comprehensive event handling with custom event support
5. **RAG Integration**: Document processing pipeline with vector operations
6. **Observability Integration**: AI-specific tracing with multi-platform export

## Phase 3.1: Memory System Integration

### Overview
Integrate Mastra's persistent memory system with thread-based storage, semantic recall, and vector search capabilities.

### Changes Required:

#### 1. Memory Types and Interfaces
**File**: `packages/react-mastra/src/types.ts`
**Changes**: Add comprehensive memory-related type definitions

```typescript
export interface MastraMemoryConfig {
  storage: 'libsql' | 'postgresql' | 'turso' | 'pinecone' | 'chroma';
  threadId?: string;
  userId?: string;
  maxResults?: number;
  similarityThreshold?: number;
}

export interface MastraMemoryQuery {
  query: string;
  threadId?: string;
  userId?: string;
  filters?: Record<string, any>;
  limit?: number;
}

export interface MastraMemoryResult {
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  threadId: string;
  timestamp: string;
}

export interface MastraThreadState {
  id: string;
  messages: MastraMessage[];
  metadata: Record<string, any>;
  memory: MastraMemoryResult[];
  createdAt: string;
  updatedAt: string;
}
```

#### 2. Memory Hook Implementation
**File**: `packages/react-mastra/src/useMastraMemory.ts`
**Changes**: Implement memory management hook following LangGraph patterns

```typescript
export const useMastraMemory = (config: MastraMemoryConfig) => {
  const [threads, setThreads] = useState<Map<string, MastraThreadState>>(new Map());
  const [currentThread, setCurrentThread] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const searchMemory = useCallback(async (query: MastraMemoryQuery): Promise<MastraMemoryResult[]> => {
    setIsSearching(true);
    try {
      // Call Mastra memory API for semantic search
      const results = await mastraMemory.search(query);
      return results;
    } catch (error) {
      console.error('Memory search failed:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [config]);

  const saveToMemory = useCallback(async (threadId: string, messages: MastraMessage[]) => {
    // Save messages to Mastra persistent memory
    await mastraMemory.save(threadId, messages);

    // Update local state
    setThreads(prev => {
      const updated = new Map(prev);
      const thread = updated.get(threadId) || { id: threadId, messages: [], metadata: {}, memory: [] };
      updated.set(threadId, {
        ...thread,
        messages: [...thread.messages, ...messages],
        updatedAt: new Date().toISOString()
      });
      return updated;
    });
  }, []);

  const getThreadContext = useCallback(async (threadId: string): Promise<MastraThreadState> => {
    // Retrieve complete thread state from Mastra memory
    const threadState = await mastraMemory.getThread(threadId);

    // Update local cache
    setThreads(prev => {
      const updated = new Map(prev);
      updated.set(threadId, threadState);
      return updated;
    });

    return threadState;
  }, []);

  return {
    threads,
    currentThread,
    isSearching,
    searchMemory,
    saveToMemory,
    getThreadContext,
    setCurrentThread
  };
};
```

#### 3. Memory Runtime Integration
**File**: `packages/react-mastra/src/useMastraRuntime.ts`
**Changes**: Extend runtime to support memory operations

```typescript
// Add memory support to runtime configuration
export interface MastraRuntimeConfig {
  // ... existing config
  memory?: MastraMemoryConfig;
  onMemoryUpdate?: (threadId: string, memory: MastraMemoryResult[]) => void;
}

// Add memory to runtime extras
export interface MastraRuntimeExtras {
  [symbolMastraRuntimeExtras]: true;
  send: MastraSendFunction;
  interrupt: MastraInterruptState | undefined;
  memory: ReturnType<typeof useMastraMemory>;
}
```

#### 4. Memory Tests
**File**: `packages/react-mastra/src/useMastraMemory.test.ts`
**Changes**: Comprehensive test coverage for memory operations

```typescript
describe('useMastraMemory', () => {
  it('should search memory with semantic similarity', async () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const searchResults = await result.current.searchMemory({
      query: "cooking preferences",
      threadId: "test-thread"
    });

    expect(searchResults).toHaveLength(2);
    expect(searchResults[0].similarity).toBeGreaterThan(0.8);
  });

  it('should save messages to persistent memory', async () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    await act(async () => {
      await result.current.saveToMemory("test-thread", [mockMessage]);
    });

    expect(mastraMemory.save).toHaveBeenCalledWith("test-thread", [mockMessage]);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Memory types compile without errors: `npm run typecheck`
- [ ] Memory hook tests pass: `npm test useMastraMemory`
- [ ] Runtime integration tests pass: `npm test useMastraRuntime`
- [ ] Memory search functionality works: `npm run test:integration memory`
- [ ] Thread state management verified: `npm run test:memory threads`

#### Manual Verification:
- [ ] Semantic search returns relevant memory results
- [ ] Thread-based memory isolation works correctly
- [ ] Memory persistence survives page refreshes
- [ ] Performance acceptable with large memory sets
- [ ] Memory updates reflect in real-time across components

---

## Phase 3.2: Workflow System Integration

### Overview
Integrate Mastra's XState-powered workflow orchestration with human-in-the-loop interrupts, suspend/resume functionality, and advanced control flow.

### Changes Required:

#### 1. Workflow Types and Interfaces
**File**: `packages/react-mastra/src/types.ts`
**Changes**: Add workflow-related type definitions

```typescript
export interface MastraWorkflowConfig {
  workflowId: string;
  initialState?: string;
  context?: Record<string, any>;
  onStateChange?: (state: MastraWorkflowState) => void;
  onInterrupt?: (interrupt: MastraWorkflowInterrupt) => void;
}

export interface MastraWorkflowState {
  id: string;
  current: string;
  status: 'running' | 'suspended' | 'completed' | 'error';
  context: Record<string, any>;
  history: MastraWorkflowTransition[];
  interrupt?: MastraWorkflowInterrupt;
}

export interface MastraWorkflowInterrupt {
  id: string;
  state: string;
  context: Record<string, any>;
  requiresInput: boolean;
  prompt?: string;
  allowedActions?: string[];
}

export interface MastraWorkflowTransition {
  from: string;
  to: string;
  event: string;
  timestamp: string;
}

export interface MastraWorkflowCommand {
  resume?: any;
  transition?: string;
  context?: Record<string, any>;
}
```

#### 2. Workflow Hook Implementation
**File**: `packages/react-mastra/src/useMastraWorkflows.ts`
**Changes**: Implement workflow management hook following LangGraph interrupt patterns

```typescript
export const useMastraWorkflows = (config: MastraWorkflowConfig) => {
  const [workflowState, setWorkflowState] = useState<MastraWorkflowState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  const startWorkflow = useCallback(async (initialContext?: Record<string, any>) => {
    setIsRunning(true);
    try {
      // Start Mastra workflow execution
      const workflow = await mastraWorkflow.start({
        id: config.workflowId,
        context: { ...config.context, ...initialContext }
      });

      setWorkflowState(workflow);
      return workflow;
    } catch (error) {
      console.error('Workflow start failed:', error);
      throw error;
    }
  }, [config]);

  const suspendWorkflow = useCallback(async () => {
    if (!workflowState || !isRunning) return;

    try {
      await mastraWorkflow.suspend(workflowState.id);
      setIsSuspended(true);
      setIsRunning(false);
    } catch (error) {
      console.error('Workflow suspend failed:', error);
      throw error;
    }
  }, [workflowState, isRunning]);

  const resumeWorkflow = useCallback(async (input?: any) => {
    if (!workflowState || !isSuspended) return;

    try {
      const resumed = await mastraWorkflow.resume(workflowState.id, input);
      setWorkflowState(resumed);
      setIsSuspended(false);
      setIsRunning(true);
      return resumed;
    } catch (error) {
      console.error('Workflow resume failed:', error);
      throw error;
    }
  }, [workflowState, isSuspended]);

  const sendCommand = useCallback(async (command: MastraWorkflowCommand) => {
    if (!workflowState) return;

    try {
      const updated = await mastraWorkflow.sendCommand(workflowState.id, command);
      setWorkflowState(updated);
      return updated;
    } catch (error) {
      console.error('Workflow command failed:', error);
      throw error;
    }
  }, [workflowState]);

  // Handle workflow state updates via streaming
  useEffect(() => {
    if (!workflowState) return;

    const subscription = mastraWorkflow.onStateChange(workflowState.id, (newState) => {
      setWorkflowState(newState);
      setIsRunning(newState.status === 'running');
      setIsSuspended(newState.status === 'suspended');

      if (newState.interrupt) {
        config.onInterrupt?.(newState.interrupt);
      }

      config.onStateChange?.(newState);
    });

    return () => subscription.unsubscribe();
  }, [workflowState, config]);

  return {
    workflowState,
    isRunning,
    isSuspended,
    startWorkflow,
    suspendWorkflow,
    resumeWorkflow,
    sendCommand
  };
};
```

#### 3. Workflow Interrupt State Hook
**File**: `packages/react-mastra/src/useMastraWorkflowInterrupt.ts`
**Changes**: Dedicated hook for workflow interrupt management

```typescript
export const useMastraWorkflowInterrupt = () => {
  const { workflowState } = useAssistantState(({ thread }) =>
    asMastraRuntimeExtras(thread.extras),
  );

  return workflowState?.workflow?.interrupt || null;
};

export const useMastraSendWorkflowCommand = () => {
  const { workflow } = useAssistantState(({ thread }) =>
    asMastraRuntimeExtras(thread.extras),
  );

  return (command: MastraWorkflowCommand) => {
    if (!workflow?.sendCommand) {
      throw new Error('Workflow command not available');
    }
    return workflow.sendCommand(command);
  };
};
```

#### 4. Workflow Event Integration
**File**: `packages/react-mastra/src/useMastraMessages.ts`
**Changes**: Extend message processing to handle workflow events

```typescript
// Add workflow event handling to existing event processor
const processMastraEvent = (event: MastraEvent) => {
  switch (event.event) {
    // ... existing event handling
    case MastraKnownEventTypes.WorkflowStarted:
      handleWorkflowStarted(event.data);
      break;
    case MastraKnownEventTypes.WorkflowSuspended:
      handleWorkflowSuspended(event.data);
      break;
    case MastraKnownEventTypes.WorkflowResumed:
      handleWorkflowResumed(event.data);
      break;
    case MastraKnownEventTypes.WorkflowInterrupt:
      handleWorkflowInterrupt(event.data);
      break;
    case MastraKnownEventTypes.WorkflowCompleted:
      handleWorkflowCompleted(event.data);
      break;
  }
};
```

#### 5. Workflow Tests
**File**: `packages/react-mastra/src/useMastraWorkflows.test.ts`
**Changes**: Comprehensive test coverage for workflow operations

```typescript
describe('useMastraWorkflows', () => {
  it('should start workflow execution', async () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    await act(async () => {
      await result.current.startWorkflow({ user: 'test-user' });
    });

    expect(result.current.workflowState).toBeDefined();
    expect(result.current.isRunning).toBe(true);
    expect(mastraWorkflow.start).toHaveBeenCalledWith({
      id: 'test-workflow',
      context: { user: 'test-user' }
    });
  });

  it('should handle workflow interrupts', async () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    await act(async () => {
      await result.current.startWorkflow();
    });

    // Simulate workflow interrupt
    act(() => {
      mockWorkflowState.interrupt = {
        id: 'interrupt-1',
        state: 'awaiting-input',
        context: {},
        requiresInput: true,
        prompt: 'Please provide your preference'
      };
    });

    expect(result.current.isSuspended).toBe(true);
  });

  it('should resume suspended workflows', async () => {
    const { result } = renderHook(() => useMastraWorkflows(mockWorkflowConfig));

    // Setup suspended state
    await act(async () => {
      await result.current.startWorkflow();
    });
    act(() => {
      result.current.suspendWorkflow();
    });

    await act(async () => {
      await result.current.resumeWorkflow('user-input');
    });

    expect(result.current.isRunning).toBe(true);
    expect(result.current.isSuspended).toBe(false);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Workflow types compile without errors: `npm run typecheck`
- [ ] Workflow hook tests pass: `npm test useMastraWorkflows`
- [ ] Interrupt handling tests pass: `npm test useMastraWorkflowInterrupt`
- [ ] Event integration tests pass: `npm test useMastraMessages workflows`
- [ ] Workflow state management verified: `npm run test:integration workflows`

#### Manual Verification:
- [ ] Workflows start and execute correctly
- [ ] Human-in-the-loop interrupts work as expected
- [ ] Suspend/resume functionality maintains state
- [ ] Complex workflow patterns (branch, parallel) work
- [ ] Real-time workflow state updates reflect in UI

---

## Phase 3.3: Advanced Tool System Integration

### Overview
Integrate Mastra's dynamic tool calling system with automatic registration, execution management, real-time status updates, and tool cancellation capabilities.

### Changes Required:

#### 1. Advanced Tool Types
**File**: `packages/react-mastra/src/types.ts`
**Changes**: Extend tool types for advanced functionality

```typescript
export interface MastraToolConfig {
  id: string;
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: MastraToolExecutor;
  timeout?: number;
  retryPolicy?: MastraRetryPolicy;
  status?: 'available' | 'unavailable' | 'executing';
}

export interface MastraToolExecutor {
  (params: any): Promise<MastraToolResult>;
}

export interface MastraToolResult {
  success: boolean;
  data?: any;
  error?: string;
  artifacts?: any[];
  executionTime?: number;
}

export interface MastraToolExecution {
  id: string;
  toolId: string;
  parameters: any;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  result?: MastraToolResult;
  progress?: number;
}

export interface MastraRetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential';
  baseDelay: number;
}
```

#### 2. Tool Management Hook
**File**: `packages/react-mastra/src/useMastraTools.ts`
**Changes**: Implement comprehensive tool management system

```typescript
export const useMastraTools = (config?: MastraToolConfig[]) => {
  const [tools, setTools] = useState<Map<string, MastraToolConfig>>(new Map());
  const [executions, setExecutions] = useState<Map<string, MastraToolExecution>>(new Map());
  const [pendingTools, setPendingTools] = useState<string[]>([]);

  // Register tools dynamically
  const registerTool = useCallback((tool: MastraToolConfig) => {
    setTools(prev => {
      const updated = new Map(prev);
      updated.set(tool.id, tool);
      return updated;
    });
  }, []);

  // Unregister tools
  const unregisterTool = useCallback((toolId: string) => {
    setTools(prev => {
      const updated = new Map(prev);
      updated.delete(toolId);
      return updated;
    });
  }, []);

  // Execute tool with real-time status updates
  const executeTool = useCallback(async (toolId: string, parameters: any): Promise<string> => {
    const tool = tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const executionId = crypto.randomUUID();
    const execution: MastraToolExecution = {
      id: executionId,
      toolId,
      parameters,
      status: 'pending',
      startTime: new Date().toISOString()
    };

    setExecutions(prev => {
      const updated = new Map(prev);
      updated.set(executionId, execution);
      return updated;
    });

    setPendingTools(prev => [...prev, executionId]);

    try {
      // Update to executing status
      setExecutions(prev => {
        const updated = new Map(prev);
        updated.set(executionId, { ...updated.get(executionId)!, status: 'executing' });
        return updated;
      });

      // Execute tool
      const result = await tool.execute(parameters);

      // Update to completed status
      setExecutions(prev => {
        const updated = new Map(prev);
        updated.set(executionId, {
          ...updated.get(executionId)!,
          status: 'completed',
          endTime: new Date().toISOString(),
          result
        });
        return updated;
      });

      return executionId;
    } catch (error) {
      // Update to failed status
      setExecutions(prev => {
        const updated = new Map(prev);
        updated.set(executionId, {
          ...updated.get(executionId)!,
          status: 'failed',
          endTime: new Date().toISOString(),
          result: { success: false, error: error.message }
        });
        return updated;
      });
      throw error;
    } finally {
      setPendingTools(prev => prev.filter(id => id !== executionId));
    }
  }, [tools]);

  // Cancel tool execution
  const cancelExecution = useCallback(async (executionId: string) => {
    const execution = executions.get(executionId);
    if (!execution || execution.status !== 'executing') {
      return;
    }

    setExecutions(prev => {
      const updated = new Map(prev);
      updated.set(executionId, {
        ...updated.get(executionId)!,
        status: 'cancelled',
        endTime: new Date().toISOString()
      });
      return updated;
    });

    setPendingTools(prev => prev.filter(id => id !== executionId));

    // Cancel actual tool execution via Mastra
    await mastraTools.cancel(executionId);
  }, [executions]);

  // Get pending tool calls (similar to LangGraph pattern)
  const getPendingToolCalls = useCallback(() => {
    return Array.from(executions.values())
      .filter(exec => exec.status === 'pending' || exec.status === 'executing')
      .map(exec => ({
        id: exec.id,
        name: tools.get(exec.toolId)?.name || 'unknown',
        parameters: exec.parameters
      }));
  }, [executions, tools]);

  return {
    tools,
    executions,
    pendingTools,
    registerTool,
    unregisterTool,
    executeTool,
    cancelExecution,
    getPendingToolCalls
  };
};
```

#### 3. Tool Integration with Runtime
**File**: `packages/react-mastra/src/useMastraRuntime.ts`
**Changes**: Extend runtime to support advanced tool operations

```typescript
// Add tool support to runtime configuration
export interface MastraRuntimeConfig {
  // ... existing config
  tools?: MastraToolConfig[];
  onToolStart?: (execution: MastraToolExecution) => void;
  onToolComplete?: (execution: MastraToolExecution) => void;
  onToolError?: (execution: MastraToolExecution, error: Error) => void;
  autoCancelTools?: boolean;
}

// Add tools to runtime extras
export interface MastraRuntimeExtras {
  [symbolMastraRuntimeExtras]: true;
  send: MastraSendFunction;
  interrupt: MastraInterruptState | undefined;
  memory: ReturnType<typeof useMastraMemory>;
  workflow: ReturnType<typeof useMastraWorkflows>;
  tools: ReturnType<typeof useMastraTools>;
}
```

#### 4. Tool Event Processing
**File**: `packages/react-mastra/src/useMastraMessages.ts`
**Changes**: Extend event processing to handle tool events

```typescript
// Add tool event handling to existing event processor
const processMastraEvent = (event: MastraEvent) => {
  switch (event.event) {
    // ... existing event handling
    case MastraKnownEventTypes.ToolStarted:
      handleToolStarted(event.data);
      break;
    case MastraKnownEventTypes.ToolProgress:
      handleToolProgress(event.data);
      break;
    case MastraKnownEventTypes.ToolCompleted:
      handleToolCompleted(event.data);
      break;
    case MastraKnownEventTypes.ToolFailed:
      handleToolFailed(event.data);
      break;
    case MastraKnownEventTypes.ToolCancelled:
      handleToolCancelled(event.data);
      break;
  }
};
```

#### 5. Tool Tests
**File**: `packages/react-mastra/src/useMastraTools.test.ts`
**Changes**: Comprehensive test coverage for tool operations

```typescript
describe('useMastraTools', () => {
  it('should register and execute tools', async () => {
    const mockTool: MastraToolConfig = {
      id: 'test-tool',
      name: 'Test Tool',
      description: 'A test tool',
      parameters: z.object({ input: z.string() }),
      execute: jest.fn().mockResolvedValue({ success: true, data: 'result' })
    };

    const { result } = renderHook(() => useMastraTools());

    act(() => {
      result.current.registerTool(mockTool);
    });

    expect(result.current.tools.has('test-tool')).toBe(true);

    await act(async () => {
      const executionId = await result.current.executeTool('test-tool', { input: 'test' });
      expect(executionId).toBeDefined();
    });

    expect(mockTool.execute).toHaveBeenCalledWith({ input: 'test' });
  });

  it('should cancel tool executions', async () => {
    const { result } = renderHook(() => useMastraTools());

    const mockTool: MastraToolConfig = {
      id: 'slow-tool',
      name: 'Slow Tool',
      description: 'A slow tool',
      parameters: z.object({}),
      execute: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    };

    act(() => {
      result.current.registerTool(mockTool);
    });

    let executionId: string;
    await act(async () => {
      executionId = await result.current.executeTool('slow-tool', {});
    });

    act(() => {
      result.current.cancelExecution(executionId);
    });

    expect(result.current.executions.get(executionId)?.status).toBe('cancelled');
  });

  it('should handle tool execution failures', async () => {
    const mockTool: MastraToolConfig = {
      id: 'failing-tool',
      name: 'Failing Tool',
      description: 'A failing tool',
      parameters: z.object({}),
      execute: jest.fn().mockRejectedValue(new Error('Tool failed'))
    };

    const { result } = renderHook(() => useMastraTools());

    act(() => {
      result.current.registerTool(mockTool);
    });

    await act(async () => {
      await expect(result.current.executeTool('failing-tool', {})).rejects.toThrow('Tool failed');
    });

    const executions = Array.from(result.current.executions.values());
    const failedExecution = executions.find(exec => exec.status === 'failed');
    expect(failedExecution).toBeDefined();
    expect(failedExecution?.result?.error).toBe('Tool failed');
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Tool types compile without errors: `npm run typecheck`
- [ ] Tool hook tests pass: `npm test useMastraTools`
- [ ] Tool execution tests pass: `npm test useMastraTools execution`
- [ ] Tool cancellation tests pass: `npm test useMastraTools cancellation`
- [ ] Runtime tool integration verified: `npm run test:integration tools`

#### Manual Verification:
- [ ] Tools register and execute correctly
- [ ] Real-time execution status updates work
- [ ] Tool cancellation stops execution immediately
- [ ] Tool failures are handled gracefully
- [ ] Concurrent tool execution works properly

---

## Phase 3.4: Event System Integration

### Overview
Integrate Mastra's comprehensive event system with agent lifecycle events, metadata handling, custom events, and real-time streaming capabilities.

### Changes Required:

#### 1. Extended Event Types
**File**: `packages/react-mastra/src/types.ts`
**Changes**: Add comprehensive event type definitions

```typescript
export enum MastraKnownEventTypes {
  // Message events
  Message = "message",
  MessagePartial = "message/partial",
  MessageComplete = "message/complete",

  // Agent lifecycle events
  AgentStarted = "agent/started",
  AgentStopped = "agent/stopped",
  AgentError = "agent/error",
  AgentStatus = "agent/status",

  // Workflow events
  WorkflowStarted = "workflow/started",
  WorkflowSuspended = "workflow/suspended",
  WorkflowResumed = "workflow/resumed",
  WorkflowInterrupt = "workflow/interrupt",
  WorkflowCompleted = "workflow/completed",

  // Tool events
  ToolStarted = "tool/started",
  ToolProgress = "tool/progress",
  ToolCompleted = "tool/completed",
  ToolFailed = "tool/failed",
  ToolCancelled = "tool/cancelled",

  // Memory events
  MemorySaved = "memory/saved",
  MemoryRetrieved = "memory/retrieved",
  MemorySearched = "memory/searched",

  // System events
  Metadata = "metadata",
  Error = "error",
  Custom = "custom"
}

export interface MastraEvent {
  type: MastraKnownEventTypes;
  id: string;
  timestamp: string;
  data: any;
  metadata?: Record<string, any>;
  source: string;
}

export interface MastraEventHandler {
  (event: MastraEvent): void | Promise<void>;
}

export interface MastraEventSubscription {
  id: string;
  eventTypes: MastraKnownEventTypes[];
  handler: MastraEventHandler;
  filter?: (event: MastraEvent) => boolean;
}
```

#### 2. Event Management Hook
**File**: `packages/react-mastra/src/useMastraEvents.ts`
**Changes**: Implement comprehensive event management system

```typescript
export const useMastraEvents = () => {
  const [subscriptions, setSubscriptions] = useState<Map<string, MastraEventSubscription>>(new Map());
  const [eventHistory, setEventHistory] = useState<MastraEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Subscribe to events
  const subscribe = useCallback((
    eventTypes: MastraKnownEventTypes[],
    handler: MastraEventHandler,
    filter?: (event: MastraEvent) => boolean
  ): string => {
    const subscriptionId = crypto.randomUUID();
    const subscription: MastraEventSubscription = {
      id: subscriptionId,
      eventTypes,
      handler,
      filter
    };

    setSubscriptions(prev => {
      const updated = new Map(prev);
      updated.set(subscriptionId, subscription);
      return updated;
    });

    return subscriptionId;
  }, []);

  // Unsubscribe from events
  const unsubscribe = useCallback((subscriptionId: string) => {
    setSubscriptions(prev => {
      const updated = new Map(prev);
      updated.delete(subscriptionId);
      return updated;
    });
  }, []);

  // Process incoming events
  const processEvent = useCallback((event: MastraEvent) => {
    // Add to history
    setEventHistory(prev => [...prev.slice(-99), event]); // Keep last 100 events

    // Notify matching subscriptions
    subscriptions.forEach(subscription => {
      if (
        subscription.eventTypes.includes(event.type) &&
        (!subscription.filter || subscription.filter(event))
      ) {
        try {
          subscription.handler(event);
        } catch (error) {
          console.error('Event handler error:', error);
        }
      }
    });
  }, [subscriptions]);

  // Connect to Mastra event stream
  const connect = useCallback(async () => {
    try {
      const eventStream = await mastraEvents.connect();

      eventStream.onEvent(processEvent);
      eventStream.onConnected(() => setIsConnected(true));
      eventStream.onDisconnected(() => setIsConnected(false));

      await eventStream.start();
    } catch (error) {
      console.error('Event stream connection failed:', error);
      setIsConnected(false);
      throw error;
    }
  }, [processEvent]);

  // Disconnect from event stream
  const disconnect = useCallback(async () => {
    try {
      await mastraEvents.disconnect();
      setIsConnected(false);
    } catch (error) {
      console.error('Event stream disconnection failed:', error);
    }
  }, []);

  // Send custom events
  const sendEvent = useCallback(async (event: Omit<MastraEvent, 'id' | 'timestamp'>) => {
    const fullEvent: MastraEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    await mastraEvents.send(fullEvent);
    return fullEvent;
  }, []);

  return {
    subscriptions,
    eventHistory,
    isConnected,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    sendEvent
  };
};
```

#### 3. Event Integration with Runtime
**File**: `packages/react-mastra/src/useMastraRuntime.ts`
**Changes**: Extend runtime to support event handling

```typescript
// Add event support to runtime configuration
export interface MastraRuntimeConfig {
  // ... existing config
  eventHandlers?: {
    onAgentEvent?: (event: MastraEvent) => void;
    onWorkflowEvent?: (event: MastraEvent) => void;
    onToolEvent?: (event: MastraEvent) => void;
    onMemoryEvent?: (event: MastraEvent) => void;
    onCustomEvent?: (event: MastraEvent) => void;
  };
}

// Add events to runtime extras
export interface MastraRuntimeExtras {
  [symbolMastraRuntimeExtras]: true;
  send: MastraSendFunction;
  interrupt: MastraInterruptState | undefined;
  memory: ReturnType<typeof useMastraMemory>;
  workflow: ReturnType<typeof useMastraWorkflows>;
  tools: ReturnType<typeof useMastraTools>;
  events: ReturnType<typeof useMastraEvents>;
}
```

#### 4. Event Tests
**File**: `packages/react-mastra/src/useMastraEvents.test.ts`
**Changes**: Comprehensive test coverage for event operations

```typescript
describe('useMastraEvents', () => {
  it('should subscribe to and receive events', async () => {
    const { result } = renderHook(() => useMastraEvents());
    const mockHandler = jest.fn();

    act(() => {
      result.current.subscribe(
        [MastraKnownEventTypes.Message],
        mockHandler
      );
    });

    const testEvent: MastraEvent = {
      type: MastraKnownEventTypes.Message,
      id: 'test-event',
      timestamp: new Date().toISOString(),
      data: { content: 'test message' },
      source: 'test'
    };

    act(() => {
      result.current.processEvent(testEvent);
    });

    expect(mockHandler).toHaveBeenCalledWith(testEvent);
    expect(result.current.eventHistory).toContain(testEvent);
  });

  it('should filter events based on subscription filter', () => {
    const { result } = renderHook(() => useMastraEvents());
    const mockHandler = jest.fn();

    act(() => {
      result.current.subscribe(
        [MastraKnownEventTypes.Message],
        mockHandler,
        (event) => event.data.content.includes('important')
      );
    });

    const unimportantEvent: MastraEvent = {
      type: MastraKnownEventTypes.Message,
      id: 'unimportant-event',
      timestamp: new Date().toISOString(),
      data: { content: 'regular message' },
      source: 'test'
    };

    const importantEvent: MastraEvent = {
      type: MastraKnownEventTypes.Message,
      id: 'important-event',
      timestamp: new Date().toISOString(),
      data: { content: 'important message' },
      source: 'test'
    };

    act(() => {
      result.current.processEvent(unimportantEvent);
      result.current.processEvent(importantEvent);
    });

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(importantEvent);
  });

  it('should manage event history size', () => {
    const { result } = renderHook(() => useMastraEvents());

    // Add 150 events
    const events = Array.from({ length: 150 }, (_, i) => ({
      type: MastraKnownEventTypes.Message,
      id: `event-${i}`,
      timestamp: new Date().toISOString(),
      data: { content: `message ${i}` },
      source: 'test'
    }));

    act(() => {
      events.forEach(event => result.current.processEvent(event));
    });

    // Should only keep last 100 events
    expect(result.current.eventHistory).toHaveLength(100);
    expect(result.current.eventHistory[0].id).toBe('event-50');
    expect(result.current.eventHistory[99].id).toBe('event-149');
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Event types compile without errors: `npm run typecheck`
- [ ] Event hook tests pass: `npm test useMastraEvents`
- [ ] Event subscription tests pass: `npm test useMastraEvents subscription`
- [ ] Event filtering tests pass: `npm test useMastraEvents filtering`
- [ ] Runtime event integration verified: `npm run test:integration events`

#### Manual Verification:
- [ ] Events are received and processed correctly
- [ ] Event subscriptions work as expected
- [ ] Event filtering prevents unnecessary processing
- [ ] Event history is maintained properly
- [ ] Custom events can be sent and received

---

## Phase 3.5: RAG Pipeline Integration

### Overview
Integrate Mastra's RAG (Retrieval-Augmented Generation) pipeline with document processing, vector operations, and intelligent context retrieval.

### Changes Required:

#### 1. RAG Types and Interfaces
**File**: `packages/react-mastra/src/types.ts`
**Changes**: Add RAG-related type definitions

```typescript
export interface MastraRAGConfig {
  embedder: MastraEmbedderConfig;
  vectorStore: MastraVectorStoreConfig;
  chunking: MastraChunkingConfig;
  filters?: Record<string, any>;
}

export interface MastraEmbedderConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  dimensions?: number;
}

export interface MastraVectorStoreConfig {
  provider: 'pinecone' | 'chroma' | 'libsql' | 'postgresql';
  connectionString?: string;
  indexName?: string;
}

export interface MastraChunkingConfig {
  strategy: 'fixed' | 'semantic' | 'recursive';
  maxChunkSize: number;
  overlap?: number;
}

export interface MastraDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  chunks?: MastraDocumentChunk[];
  embeddings?: number[][];
}

export interface MastraDocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  index: number;
}

export interface MastraRAGQuery {
  query: string;
  filters?: Record<string, any>;
  limit?: number;
  similarityThreshold?: number;
}

export interface MastraRAGResult {
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  documentId: string;
  chunkId: string;
}
```

#### 2. RAG Management Hook
**File**: `packages/react-mastra/src/useMastraRAG.ts`
**Changes**: Implement RAG pipeline management system

```typescript
export const useMastraRAG = (config: MastraRAGConfig) => {
  const [documents, setDocuments] = useState<Map<string, MastraDocument>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);

  // Ingest documents
  const ingestDocuments = useCallback(async (docs: Array<{
    content: string;
    metadata?: Record<string, any>;
  }>) => {
    setIsProcessing(true);
    try {
      const processedDocs = await mastraRAG.ingest(docs, config);

      // Update local state
      setDocuments(prev => {
        const updated = new Map(prev);
        processedDocs.forEach(doc => {
          updated.set(doc.id, doc);
        });
        return updated;
      });

      return processedDocs;
    } catch (error) {
      console.error('Document ingestion failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [config]);

  // Query RAG pipeline
  const query = useCallback(async (ragQuery: MastraRAGQuery): Promise<MastraRAGResult[]> => {
    setIsQuerying(true);
    try {
      const results = await mastraRAG.query(ragQuery, config);
      return results;
    } catch (error) {
      console.error('RAG query failed:', error);
      return [];
    } finally {
      setIsQuerying(false);
    }
  }, [config]);

  // Delete documents
  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      await mastraRAG.delete(documentId);

      setDocuments(prev => {
        const updated = new Map(prev);
        updated.delete(documentId);
        return updated;
      });
    } catch (error) {
      console.error('Document deletion failed:', error);
      throw error;
    }
  }, []);

  // Update document
  const updateDocument = useCallback(async (documentId: string, content: string, metadata?: Record<string, any>) => {
    try {
      const updated = await mastraRAG.update(documentId, content, metadata);

      setDocuments(prev => {
        const updatedDocs = new Map(prev);
        updatedDocs.set(documentId, updated);
        return updatedDocs;
      });

      return updated;
    } catch (error) {
      console.error('Document update failed:', error);
      throw error;
    }
  }, []);

  return {
    documents,
    isProcessing,
    isQuerying,
    ingestDocuments,
    query,
    deleteDocument,
    updateDocument
  };
};
```

#### 3. RAG Integration with Runtime
**File**: `packages/react-mastra/src/useMastraRuntime.ts`
**Changes**: Extend runtime to support RAG operations

```typescript
// Add RAG support to runtime configuration
export interface MastraRuntimeConfig {
  // ... existing config
  rag?: MastraRAGConfig;
  onDocumentIngested?: (documents: MastraDocument[]) => void;
  onRAGQuery?: (query: MastraRAGQuery, results: MastraRAGResult[]) => void;
}

// Add RAG to runtime extras
export interface MastraRuntimeExtras {
  [symbolMastraRuntimeExtras]: true;
  send: MastraSendFunction;
  interrupt: MastraInterruptState | undefined;
  memory: ReturnType<typeof useMastraMemory>;
  workflow: ReturnType<typeof useMastraWorkflows>;
  tools: ReturnType<typeof useMastraTools>;
  events: ReturnType<typeof useMastraEvents>;
  rag: ReturnType<typeof useMastraRAG>;
}
```

#### 4. RAG Tests
**File**: `packages/react-mastra/src/useMastraRAG.test.ts`
**Changes**: Comprehensive test coverage for RAG operations

```typescript
describe('useMastraRAG', () => {
  it('should ingest and process documents', async () => {
    const mockRAGConfig: MastraRAGConfig = {
      embedder: { provider: 'openai', model: 'text-embedding-ada-002' },
      vectorStore: { provider: 'pinecone' },
      chunking: { strategy: 'semantic', maxChunkSize: 1000 }
    };

    const { result } = renderHook(() => useMastraRAG(mockRAGConfig));

    const documents = [{
      content: 'This is a test document about cooking pasta.',
      metadata: { source: 'cookbook', category: 'recipes' }
    }];

    await act(async () => {
      const processed = await result.current.ingestDocuments(documents);
      expect(processed).toHaveLength(1);
      expect(processed[0].chunks).toBeDefined();
      expect(processed[0].embeddings).toBeDefined();
    });

    expect(result.current.documents.size).toBe(1);
    expect(mastraRAG.ingest).toHaveBeenCalledWith(documents, mockRAGConfig);
  });

  it('should query RAG pipeline and return relevant results', async () => {
    const { result } = renderHook(() => useMastraRAG(mockRAGConfig));

    const query: MastraRAGQuery = {
      query: 'How to cook pasta?',
      limit: 5,
      similarityThreshold: 0.7
    };

    await act(async () => {
      const results = await result.current.query(query);
      expect(results).toHaveLength(2);
      expect(results[0].similarity).toBeGreaterThan(0.8);
      expect(results[0].content).toContain('pasta');
    });

    expect(result.current.isQuerying).toBe(false);
    expect(mastraRAG.query).toHaveBeenCalledWith(query, mockRAGConfig);
  });

  it('should delete documents from RAG store', async () => {
    const { result } = renderHook(() => useMastraRAG(mockRAGConfig));

    // Setup with documents
    await act(async () => {
      await result.current.ingestDocuments([mockDocument]);
    });

    expect(result.current.documents.size).toBe(1);

    await act(async () => {
      await result.current.deleteDocument(mockDocument.id);
    });

    expect(result.current.documents.size).toBe(0);
    expect(mastraRAG.delete).toHaveBeenCalledWith(mockDocument.id);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] RAG types compile without errors: `npm run typecheck`
- [ ] RAG hook tests pass: `npm test useMastraRAG`
- [ ] Document ingestion tests pass: `npm test useMastraRAG ingestion`
- [ ] RAG query tests pass: `npm test useMastraRAG query`
- [ ] Runtime RAG integration verified: `npm run test:integration rag`

#### Manual Verification:
- [ ] Documents are ingested and chunked correctly
- [ ] Vector embeddings are generated and stored
- [ ] RAG queries return relevant context
- [ ] Document updates work properly
- [ ] Similarity search produces accurate results

---

## Phase 3.6: Observability Integration

### Overview
Integrate Mastra's observability system with AI-specific tracing, performance metrics, and multi-platform export capabilities.

### Changes Required:

#### 1. Observability Types and Interfaces
**File**: `packages/react-mastra/src/types.ts`
**Changes**: Add observability-related type definitions

```typescript
export interface MastraObservabilityConfig {
  serviceName: string;
  environment: 'development' | 'staging' | 'production';
  exporters: MastraExporterConfig[];
  sampling: MastraSamplingConfig;
}

export interface MastraExporterConfig {
  type: 'console' | 'langfuse' | 'braintrust' | 'langsmith' | 'otel';
  config: Record<string, any>;
}

export interface MastraSamplingConfig {
  type: 'all' | 'ratio' | 'adaptive';
  probability?: number;
  limitPerSecond?: number;
}

export interface MastraTrace {
  id: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: string;
  endTime?: string;
  status: 'ok' | 'error';
  attributes: Record<string, any>;
  events: MastraTraceEvent[];
  metrics: MastraMetric[];
}

export interface MastraTraceEvent {
  name: string;
  timestamp: string;
  attributes: Record<string, any>;
}

export interface MastraMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  attributes: Record<string, any>;
}
```

#### 2. Observability Hook
**File**: `packages/react-mastra/src/useMastraObservability.ts`
**Changes**: Implement observability management system

```typescript
export const useMastraObservability = (config: MastraObservabilityConfig) => {
  const [traces, setTraces] = useState<Map<string, MastraTrace>>(new Map());
  const [metrics, setMetrics] = useState<MastraMetric[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Start a new trace
  const startTrace = useCallback((
    operationName: string,
    attributes: Record<string, any> = {},
    parentSpanId?: string
  ): string => {
    const traceId = crypto.randomUUID();
    const spanId = crypto.randomUUID();

    const trace: MastraTrace = {
      id: traceId,
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: new Date().toISOString(),
      status: 'ok',
      attributes,
      events: [],
      metrics: []
    };

    setTraces(prev => {
      const updated = new Map(prev);
      updated.set(traceId, trace);
      return updated;
    });

    // Send to Mastra observability
    mastraObservability.startTrace(trace);

    return traceId;
  }, []);

  // End a trace
  const endTrace = useCallback((
    traceId: string,
    status: 'ok' | 'error' = 'ok',
    finalAttributes: Record<string, any> = {}
  ) => {
    setTraces(prev => {
      const updated = new Map(prev);
      const trace = updated.get(traceId);

      if (trace) {
        const endedTrace: MastraTrace = {
          ...trace,
          endTime: new Date().toISOString(),
          status,
          attributes: { ...trace.attributes, ...finalAttributes }
        };

        updated.set(traceId, endedTrace);

        // Send to Mastra observability
        mastraObservability.endTrace(endedTrace);
      }

      return updated;
    });
  }, []);

  // Add event to trace
  const addTraceEvent = useCallback((
    traceId: string,
    eventName: string,
    attributes: Record<string, any> = {}
  ) => {
    setTraces(prev => {
      const updated = new Map(prev);
      const trace = updated.get(traceId);

      if (trace) {
        const event: MastraTraceEvent = {
          name: eventName,
          timestamp: new Date().toISOString(),
          attributes
        };

        updated.set(traceId, {
          ...trace,
          events: [...trace.events, event]
        });

        // Send to Mastra observability
        mastraObservability.addTraceEvent(traceId, event);
      }

      return updated;
    });
  }, []);

  // Record metric
  const recordMetric = useCallback((
    name: string,
    value: number,
    unit: string,
    attributes: Record<string, any> = {}
  ) => {
    const metric: MastraMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      attributes
    };

    setMetrics(prev => [...prev.slice(-999), metric]); // Keep last 1000 metrics

    // Send to Mastra observability
    mastraObservability.recordMetric(metric);
  }, []);

  // Connect to observability backend
  const connect = useCallback(async () => {
    try {
      await mastraObservability.connect(config);
      setIsConnected(true);
    } catch (error) {
      console.error('Observability connection failed:', error);
      setIsConnected(false);
      throw error;
    }
  }, [config]);

  // Disconnect from observability backend
  const disconnect = useCallback(async () => {
    try {
      await mastraObservability.disconnect();
      setIsConnected(false);
    } catch (error) {
      console.error('Observability disconnection failed:', error);
    }
  }, []);

  return {
    traces,
    metrics,
    isConnected,
    startTrace,
    endTrace,
    addTraceEvent,
    recordMetric,
    connect,
    disconnect
  };
};
```

#### 3. Observability Integration with Runtime
**File**: `packages/react-mastra/src/useMastraRuntime.ts`
**Changes**: Extend runtime to support observability

```typescript
// Add observability support to runtime configuration
export interface MastraRuntimeConfig {
  // ... existing config
  observability?: MastraObservabilityConfig;
  enableTracing?: boolean;
  enableMetrics?: boolean;
}

// Add observability to runtime extras
export interface MastraRuntimeExtras {
  [symbolMastraRuntimeExtras]: true;
  send: MastraSendFunction;
  interrupt: MastraInterruptState | undefined;
  memory: ReturnType<typeof useMastraMemory>;
  workflow: ReturnType<typeof useMastraWorkflows>;
  tools: ReturnType<typeof useMastraTools>;
  events: ReturnType<typeof useMastraEvents>;
  rag: ReturnType<typeof useMastraRAG>;
  observability: ReturnType<typeof useMastraObservability>;
}
```

#### 4. Observability Tests
**File**: `packages/react-mastra/src/useMastraObservability.test.ts`
**Changes**: Comprehensive test coverage for observability operations

```typescript
describe('useMastraObservability', () => {
  it('should start and end traces', () => {
    const mockObservabilityConfig: MastraObservabilityConfig = {
      serviceName: 'test-service',
      environment: 'development',
      exporters: [{ type: 'console', config: {} }],
      sampling: { type: 'all' }
    };

    const { result } = renderHook(() => useMastraObservability(mockObservabilityConfig));

    let traceId: string;
    act(() => {
      traceId = result.current.startTrace('test-operation', { user: 'test-user' });
    });

    expect(traceId).toBeDefined();
    expect(result.current.traces.has(traceId)).toBe(true);
    expect(result.current.traces.get(traceId)?.status).toBe('ok');
    expect(mastraObservability.startTrace).toHaveBeenCalled();

    act(() => {
      result.current.endTrace(traceId, 'ok', { result: 'success' });
    });

    expect(result.current.traces.get(traceId)?.endTime).toBeDefined();
    expect(result.current.traces.get(traceId)?.status).toBe('ok');
    expect(mastraObservability.endTrace).toHaveBeenCalled();
  });

  it('should add events to traces', () => {
    const { result } = renderHook(() => useMastraObservability(mockObservabilityConfig));

    let traceId: string;
    act(() => {
      traceId = result.current.startTrace('test-operation');
    });

    act(() => {
      result.current.addTraceEvent(traceId, 'tool-called', { tool: 'test-tool' });
    });

    const trace = result.current.traces.get(traceId);
    expect(trace?.events).toHaveLength(1);
    expect(trace?.events[0].name).toBe('tool-called');
    expect(trace?.events[0].attributes.tool).toBe('test-tool');
  });

  it('should record metrics', () => {
    const { result } = renderHook(() => useMastraObservability(mockObservabilityConfig));

    act(() => {
      result.current.recordMetric('token-usage', 150, 'tokens', { model: 'gpt-4' });
    });

    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.metrics[0].name).toBe('token-usage');
    expect(result.current.metrics[0].value).toBe(150);
    expect(result.current.metrics[0].unit).toBe('tokens');
  });

  it('should limit metrics history size', () => {
    const { result } = renderHook(() => useMastraObservability(mockObservabilityConfig));

    // Add 1500 metrics
    act(() => {
      for (let i = 0; i < 1500; i++) {
        result.current.recordMetric(`metric-${i}`, i, 'count');
      }
    });

    // Should only keep last 1000 metrics
    expect(result.current.metrics).toHaveLength(1000);
    expect(result.current.metrics[0].name).toBe('metric-500');
    expect(result.current.metrics[999].name).toBe('metric-1499');
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Observability types compile without errors: `npm run typecheck`
- [ ] Observability hook tests pass: `npm test useMastraObservability`
- [ ] Trace management tests pass: `npm test useMastraObservability traces`
- [ ] Metric recording tests pass: `npm test useMastraObservability metrics`
- [ ] Runtime observability integration verified: `npm run test:integration observability`

#### Manual Verification:
- [ ] Traces are created and managed correctly
- [ ] Events are added to traces properly
- [ ] Metrics are recorded and exported
- [ ] Observability data appears in configured backends
- [ ] Performance impact is minimal

---

## Testing Strategy

### Unit Tests
- Each hook has comprehensive test coverage with mocking
- Error handling and edge cases are thoroughly tested
- Performance characteristics are validated
- Integration with Mastra APIs is properly mocked

### Integration Tests
- End-to-end workflows using all advanced features
- Real-time event processing and state synchronization
- Cross-feature interactions (memory + workflows, tools + events, etc.)
- Performance under load with large datasets

### Manual Testing Steps
1. **Memory Integration**: Create conversations, search memory, verify semantic recall
2. **Workflow Integration**: Start workflows, trigger interrupts, resume with user input
3. **Tool Integration**: Register custom tools, execute them, cancel long-running tools
4. **Event Integration**: Subscribe to events, send custom events, verify filtering
5. **RAG Integration**: Ingest documents, query for context, verify relevance
6. **Observability Integration**: Generate traces, record metrics, verify export

## Performance Considerations

- **Memory Search**: Optimize vector similarity queries with proper indexing
- **Workflow State**: Minimize state synchronization overhead
- **Tool Execution**: Implement proper concurrency limits and queuing
- **Event Processing**: Use efficient event filtering and batching
- **RAG Operations**: Cache embeddings and query results
- **Observability**: Implement smart sampling and batching for production

## Migration Notes

This phase introduces new capabilities without breaking existing functionality:

### New Exports
```typescript
export {
  useMastraMemory,
  useMastraWorkflows,
  useMastraTools,
  useMastraEvents,
  useMastraRAG,
  useMastraObservability
} from './useMastraAdvanced';
```

### Backward Compatibility
- Existing runtime hook continues to work
- New features are opt-in via configuration
- No breaking changes to existing APIs

### Configuration Changes
```typescript
// Extended runtime configuration
const runtime = useMastraRuntime({
  agentId: 'chef-agent',
  memory: { storage: 'libsql', threadId: 'user-123' },
  workflow: { workflowId: 'cooking-workflow' },
  tools: [customTools],
  rag: ragConfig,
  observability: observabilityConfig
});
```

## Risk Mitigation

### Technical Risks
- **API Compatibility**: Mastra APIs may change - implement adapter pattern
- **Performance**: Advanced features could impact performance - implement lazy loading
- **Memory Leaks**: Complex state management - implement proper cleanup
- **Event Storming**: High event volume - implement throttling and batching

### Mitigation Strategies
- Comprehensive testing with mock Mastra instances
- Performance monitoring and optimization
- Graceful degradation when features are unavailable
- Clear error messages and fallback behaviors

## Dependencies and Prerequisites

### Phase Dependencies
- Phase 1: Core runtime hook and basic configuration
- Phase 2: Message conversion and accumulation system
- Phase 3: Advanced feature integration (this phase)

### External Dependencies
- Mastra core packages: `@mastra/core`, `@mastra/memory`, `@mastra/workflows`
- Vector stores: Pinecone, Chroma, pgvector (based on configuration)
- Observability platforms: Langfuse, Braintrust, OpenTelemetry

### Knowledge Requirements
- Understanding of Mastra's architecture and APIs
- Familiarity with vector databases and semantic search
- Knowledge of workflow orchestration patterns
- Experience with observability and monitoring systems

## References

- Overview document: `notes/plans/mastra_integration_overview.md`
- Research documents: `notes/research/mastra_integration_*.md`
- LangGraph patterns: `packages/react-langgraph/src/`
- Memory research: `notes/research/mastra_integration_requirements.md:45-53`
- Workflow research: `notes/research/mastra_integration_requirements.md:41-47`
- Tool research: `notes/research/mastra_integration_requirements.md:35-39`
- Event research: `notes/research/mastra_integration_requirements.md:59-65`
- RAG research: `notes/research/mastra_integration_requirements.md:53-59`
- Observability research: `notes/research/mastra_integration_requirements.md:59-65`