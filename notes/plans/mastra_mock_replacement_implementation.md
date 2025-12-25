# Mastra Mock Implementations Replacement Plan

## Overview

Replace 6 mock implementations in `@assistant-ui/react-mastra` with real Mastra SDK integrations. Currently, all advanced features (tools, memory, workflows, events, RAG, observability) use mock objects that console.log instead of calling actual Mastra APIs. This plan provides a phased approach to replace these mocks with production-ready integrations.

## Current State Analysis

### What Exists Now

From research documented in `notes/research/mastra_todos_and_mock_implementations.md`:

**Working features:**
- ✅ Message display and streaming (`useMastraRuntime`)
- ✅ Basic agent integration via API route
- ✅ Message accumulator and event processing
- ✅ React hooks structure for all features

**Mock implementations (6 total):**
1. **Tools API** (`useMastraTools.ts:12-25`) - Console logs, returns mock success
2. **Memory API** (`useMastraMemory.ts:13-45`) - Console logs, returns empty data
3. **Workflows API** (`useMastraWorkflows.ts:11-61`) - Console logs, simulates state locally
4. **Events API** (`useMastraEvents.ts:11-38`) - Console logs, no real subscriptions
5. **RAG API** (`useMastraRAG.ts:15-61`) - Console logs, returns hardcoded results
6. **Observability API** (`useMastraObservability.ts:11-44`) - Console logs, no exporters

**Current dependencies:**
- `@mastra/core`: NOT listed (needs to be added)
- `@mastra/memory`: NOT listed (needs to be added)
- `assistant-stream`: ^0.2.29
- `uuid`: ^11.1.0
- `zod`: ^4.0.17

### Key Discoveries

1. **Mastra SDK is modular**: Separate packages for core, memory, storage, RAG, etc.
2. **Example uses basic Mastra**: Only agent streaming is actually integrated
3. **Memory is commented out**: Example has Memory code but it's disabled
4. **Hook structure is good**: The React hooks architecture is well-designed, just needs real implementations
5. **Type definitions are complete**: All TypeScript types match Mastra's expected structures

### Current Constraints

- Must maintain backward compatibility with existing hook APIs
- Cannot break the working message streaming functionality
- Need to keep optional feature pattern (features only loaded if configured)
- Must work in both client and server React components ("use client")

## Desired End State

### After Phase 1 (Tools + Memory)
```typescript
// Users can use real tool execution
const tools = useMastraTools();
await tools.executeTool("weatherTool", { location: "SF" }); // Actually calls Mastra

// Users can persist conversation history
const memory = useMastraMemory({ storage: 'libsql', threadId });
await memory.saveToMemory(threadId, messages); // Actually saves to DB
const results = await memory.searchMemory({ query: "preferences" }); // Real search
```

**Verification:**
- Tools actually execute via Mastra SDK
- Memory persists to database (libsql, postgresql, etc.)
- Tests pass with real Mastra instances
- Example app demonstrates working features

### After Phase 2 (Workflows + Events)
```typescript
// Users can run real Mastra workflows
const workflow = useMastraWorkflows({ workflowId: "approval-flow" });
const result = await workflow.startWorkflow({ orderId: "123" }); // Real execution

// Users get real-time events
const events = useMastraEvents();
events.subscribe("workflow/suspended", (event) => {
  // Actually receives events from Mastra
});
```

### After Phase 3 (RAG + Observability)
```typescript
// Users can ingest and query documents
const rag = useMastraRAG({ vectorStore: 'pinecone', embedder: 'openai' });
await rag.ingestDocuments([doc1, doc2]); // Real indexing
const results = await rag.query({ query: "how to..." }); // Real similarity search

// Users get traces exported
const obs = useMastraObservability({ exporters: ['langfuse'] });
const traceId = obs.createTrace("user-query"); // Exported to Langfuse
```

### After Phase 4 (TODOs)
```typescript
// Users can edit messages
runtime.onEdit(async (message) => {
  // Actually edits and reprocesses
});

// Users can reload/regenerate responses
runtime.onReload(async (parentId) => {
  // Actually regenerates from this point
});
```

## What We're NOT Doing

- **Not changing hook APIs**: Maintaining current function signatures and return values
- **Not adding new features**: Only replacing mocks with real implementations
- **Not refactoring architecture**: Keeping the current accumulator/event processing pattern
- **Not breaking examples**: The with-mastra example must continue working
- **Not making features required**: All advanced features remain optional
- **Not removing console logs entirely**: Will keep important logs, remove "mock" language
- **Not supporting all Mastra features**: Focusing on the 6 systems currently mocked
- **Not optimizing performance**: That's a separate effort after mocks are replaced

## Implementation Approach

### Strategy

**Phased replacement with parallel testing:**
1. Add Mastra SDK dependencies
2. Create integration adapters for each system
3. Replace mock objects with real Mastra calls
4. Add integration tests with real Mastra instances
5. Update documentation and examples
6. Validate production readiness

**Key principles:**
- Maintain backward compatibility
- Add comprehensive error handling
- Support multiple storage/provider options
- Keep features optional and configurable
- Test with real Mastra instances

---

## Phase 1: Tools + Memory Integration

### Overview
Replace the two most user-critical mock implementations with real Mastra SDK calls. Tools enable agent functionality, and memory enables conversation persistence.

### Changes Required

#### 1. Add Mastra Dependencies

**File**: `packages/react-mastra/package.json`

**Changes**: Add new dependencies (lines 50-54)

```json
"dependencies": {
  "@mastra/core": "^0.20.2",
  "@mastra/memory": "^0.15.6",
  "@mastra/libsql": "latest",
  "assistant-stream": "^0.2.29",
  "uuid": "^11.1.0",
  "zod": "^4.0.17"
}
```

**Rationale**: Need official Mastra packages for real implementations. `@mastra/libsql` provides default storage adapter.

#### 2. Update useMastraTools.ts

**File**: `packages/react-mastra/src/useMastraTools.ts`

**Current**: Lines 12-25 contain mock object

**Changes**: Replace mock with Mastra tool execution

```typescript
// Remove mock object (lines 12-25)
// Replace with Mastra integration

import { MastraToolConfig, MastraToolExecution, MastraToolResult } from "./types";
import { Agent } from "@mastra/core/agent";

// Add agent instance management
const agentInstancesRef = new WeakMap<MastraToolConfig, Agent>();

const executeMastraTool = async (
  tool: MastraToolConfig,
  parameters: any
): Promise<MastraToolResult> => {
  try {
    // Execute via Mastra's tool system
    const result = await tool.execute(parameters);

    return {
      success: true,
      data: result,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
};

// Update executeTool method (line 51)
const executeTool = useCallback(async (toolId: string, parameters: any): Promise<string> => {
  const tool = tools.get(toolId);
  if (!tool) {
    throw new Error(`Tool ${toolId} not found`);
  }

  const executionId = uuidv4();
  const startTime = Date.now();

  // ... existing execution setup code ...

  try {
    // CHANGED: Call real Mastra tool instead of mock
    const result = await executeMastraTool(tool, parameters);

    // ... existing result handling code ...
  } catch (error) {
    // ... existing error handling ...
  }
}, [tools]);
```

**Lines affected**: 12-25 (remove), 51-135 (modify)

#### 3. Update useMastraMemory.ts

**File**: `packages/react-mastra/src/useMastraMemory.ts`

**Current**: Lines 13-45 contain mock object

**Changes**: Replace mock with Mastra Memory API

```typescript
// Remove mock object (lines 13-45)
// Replace with Mastra Memory integration

import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { useMemo, useState, useCallback } from "react";

export const useMastraMemory = (config: MastraMemoryConfig) => {
  // Initialize Mastra Memory instance
  const memoryInstance = useMemo(() => {
    const storage = createStorageAdapter(config.storage, config);

    return new Memory({
      storage,
      workingMemory: {
        enabled: true,
      },
      lastMessages: {
        count: 10,
      },
      semanticRecall: {
        enabled: config.similarityThreshold !== undefined,
        topK: config.maxResults || 5,
        similarityThreshold: config.similarityThreshold || 0.7,
      },
    });
  }, [config]);

  const [threads, setThreads] = useState<Map<string, MastraThreadState>>(new Map());
  const [currentThread, setCurrentThread] = useState<string | null>(config.threadId || null);
  const [isSearching, setIsSearching] = useState(false);

  // CHANGED: Real memory search
  const searchMemory = useCallback(async (query: MastraMemoryQuery): Promise<MastraMemoryResult[]> => {
    setIsSearching(true);
    try {
      const results = await memoryInstance.query({
        threadId: query.threadId || currentThread || undefined,
        resourceId: query.userId,
        query: query.query,
        topK: query.limit || config.maxResults || 5,
      });

      return results.map(result => ({
        content: result.content,
        metadata: result.metadata,
        similarity: result.similarity,
        threadId: result.threadId,
        timestamp: result.timestamp,
      }));
    } catch (error) {
      console.error("Memory search failed:", error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [memoryInstance, config, currentThread]);

  // CHANGED: Real memory save
  const saveToMemory = useCallback(async (threadId: string, messages: MastraMessage[]) => {
    try {
      // Create thread if it doesn't exist
      const existingThread = threads.get(threadId);
      if (!existingThread) {
        await memoryInstance.createThread({
          threadId,
          resourceId: config.userId,
        });
      }

      // Save messages to Mastra Memory
      for (const message of messages) {
        await memoryInstance.saveMessage({
          threadId,
          message: {
            role: message.type === 'human' ? 'user' : message.type,
            content: typeof message.content === 'string'
              ? message.content
              : message.content.map(c => c.type === 'text' ? c.text : '').join(''),
          },
        });
      }

      // Update local state
      setThreads(prev => {
        const updated = new Map(prev);
        const thread = updated.get(threadId) || {
          id: threadId,
          messages: [],
          interrupts: [],
          metadata: {},
          memory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        updated.set(threadId, {
          ...thread,
          messages: [...thread.messages, ...messages],
          updatedAt: new Date().toISOString()
        });
        return updated;
      });

      console.log("Saved messages to Mastra memory:", { threadId, count: messages.length });
    } catch (error) {
      console.error("Failed to save to Mastra memory:", error);
      throw error;
    }
  }, [memoryInstance, config, threads]);

  // CHANGED: Real thread retrieval
  const getThreadContext = useCallback(async (threadId: string): Promise<MastraThreadState> => {
    try {
      const thread = await memoryInstance.getThreadById(threadId);

      const threadState: MastraThreadState = {
        id: thread.id,
        messages: thread.messages || [],
        interrupts: [],
        metadata: thread.metadata || {},
        memory: [],
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      };

      // Update local cache
      setThreads(prev => {
        const updated = new Map(prev);
        updated.set(threadId, threadState);
        return updated;
      });

      return threadState;
    } catch (error) {
      console.error("Failed to get thread context from Mastra:", error);
      throw error;
    }
  }, [memoryInstance]);

  // Keep rest of hook methods unchanged
  // ... createThread, deleteThread, updateThreadMetadata ...

  return {
    threads,
    currentThread,
    isSearching,
    searchMemory,
    saveToMemory,
    getThreadContext,
    createThread,
    deleteThread,
    updateThreadMetadata,
    setCurrentThread,
  };
};

// Helper function to create storage adapter
function createStorageAdapter(storage: string, config: MastraMemoryConfig) {
  switch (storage) {
    case 'libsql':
      return new LibSQLStore({
        url: process.env.LIBSQL_URL || 'file:./mastra.db',
      });
    case 'postgresql':
      // Will require @mastra/pg package
      throw new Error('PostgreSQL storage requires @mastra/pg package');
    default:
      // Default to in-memory libsql
      return new LibSQLStore({
        url: ':memory:',
      });
  }
}
```

**Lines affected**: 13-45 (remove), 47-215 (modify extensively)

#### 4. Update Types (if needed)

**File**: `packages/react-mastra/src/types.ts`

**Changes**: Ensure types match Mastra's expected formats

```typescript
// Verify MastraMemoryConfig matches Mastra Memory options (line 88-94)
export interface MastraMemoryConfig {
  storage: 'libsql' | 'postgresql' | 'turso' | 'pinecone' | 'chroma';
  threadId?: string;
  userId?: string;  // Maps to resourceId in Mastra
  maxResults?: number;  // Maps to topK
  similarityThreshold?: number;
}

// Verify MastraToolConfig matches Mastra tool structure (line 155-164)
export interface MastraToolConfig {
  id: string;
  name: string;
  description: string;
  parameters: any; // Zod schema
  execute: MastraToolExecutor;
  timeout?: number;
  retryPolicy?: MastraRetryPolicy;
  status?: 'available' | 'unavailable' | 'executing';
}
```

#### 5. Update Example to Enable Memory

**File**: `examples/with-mastra/mastra/index.ts`

**Changes**: Uncomment and update memory initialization (lines 7-13)

```typescript
// CHANGED: Enable memory with proper configuration
const memory = new Memory({
  storage: new LibSQLStore({
    url: process.env.LIBSQL_URL || "file:./mastra.db",
  }),
  workingMemory: {
    enabled: true,
  },
  lastMessages: {
    count: 10,
  },
});

export const mastra = new Mastra({
  agents: {
    chefAgent,
    weatherAgent
  },
  memory,  // CHANGED: Now enabled
});
```

**Lines affected**: 7-13 (uncomment and modify), 20 (uncomment)

#### 6. Add Integration Tests

**File**: `packages/react-mastra/src/useMastraTools.test.integration.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMastraTools } from './useMastraTools';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

describe('useMastraTools - Real Mastra Integration', () => {
  const testTool = createTool({
    id: 'test-calculator',
    description: 'Add two numbers',
    inputSchema: z.object({
      a: z.number(),
      b: z.number(),
    }),
    outputSchema: z.object({
      output: z.number(),
    }),
    execute: async ({ context }) => {
      return { output: context.a + context.b };
    },
  });

  it('should execute real Mastra tool', async () => {
    const { result } = renderHook(() => useMastraTools());

    await act(async () => {
      result.current.registerTool({
        id: 'test-calculator',
        name: 'Calculator',
        description: 'Add numbers',
        parameters: z.object({ a: z.number(), b: z.number() }),
        execute: testTool.execute,
      });
    });

    await act(async () => {
      const executionId = await result.current.executeTool('test-calculator', { a: 5, b: 3 });
      const execution = result.current.getExecution(executionId);
      expect(execution?.result?.success).toBe(true);
      expect(execution?.result?.data.output).toBe(8);
    });
  });
});
```

**File**: `packages/react-mastra/src/useMastraMemory.test.integration.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMastraMemory } from './useMastraMemory';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = './test-mastra-memory.db';

describe('useMastraMemory - Real Mastra Integration', () => {
  beforeEach(() => {
    // Clean up test database
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
  });

  afterEach(() => {
    // Clean up test database
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
  });

  it('should save and retrieve messages from real database', async () => {
    const { result } = renderHook(() =>
      useMastraMemory({
        storage: 'libsql',
        threadId: 'test-thread',
      })
    );

    const testMessages = [
      {
        id: 'msg-1',
        type: 'human' as const,
        content: 'Hello',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'msg-2',
        type: 'assistant' as const,
        content: 'Hi there!',
        timestamp: new Date().toISOString(),
      },
    ];

    // Save messages
    await act(async () => {
      await result.current.saveToMemory('test-thread', testMessages);
    });

    // Retrieve thread
    await act(async () => {
      const threadState = await result.current.getThreadContext('test-thread');
      expect(threadState.id).toBe('test-thread');
      expect(threadState.messages.length).toBeGreaterThan(0);
    });

    // Search memory
    await act(async () => {
      const searchResults = await result.current.searchMemory({
        query: 'hello',
        threadId: 'test-thread',
      });
      expect(searchResults.length).toBeGreaterThan(0);
    });
  });

  it('should handle semantic search with similarity threshold', async () => {
    const { result } = renderHook(() =>
      useMastraMemory({
        storage: 'libsql',
        threadId: 'test-thread-2',
        similarityThreshold: 0.7,
        maxResults: 3,
      })
    );

    // Save diverse messages
    await act(async () => {
      await result.current.saveToMemory('test-thread-2', [
        { id: '1', type: 'human' as const, content: 'I love pizza', timestamp: new Date().toISOString() },
        { id: '2', type: 'human' as const, content: 'My favorite food is pasta', timestamp: new Date().toISOString() },
        { id: '3', type: 'human' as const, content: 'The weather is nice today', timestamp: new Date().toISOString() },
      ]);
    });

    // Search for food-related messages
    await act(async () => {
      const results = await result.current.searchMemory({
        query: 'What foods do I like?',
        threadId: 'test-thread-2',
        limit: 3,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);
      expect(results[0].similarity).toBeGreaterThanOrEqual(0.7);
    });
  });
});
```

#### 7. Update Package Scripts

**File**: `packages/react-mastra/package.json`

**Changes**: Add integration test script (line 43)

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:integration": "vitest --config vitest.integration.config.ts run",
  "test:integration:watch": "vitest --config vitest.integration.config.ts"
}
```

#### 8. Create Integration Test Configuration

**File**: `packages/react-mastra/vitest.integration.config.ts` (NEW)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    include: ['src/**/*.test.integration.ts'],
    environment: 'jsdom',
    setupFiles: ['./src/testSetup.ts'],
    testTimeout: 30000, // Longer timeout for real API calls
  },
});
```

### Success Criteria

#### Automated Verification:
- [ ] Package builds successfully: `pnpm run build` in `packages/react-mastra`
- [ ] Unit tests pass: `pnpm run test`
- [ ] Integration tests pass: `pnpm run test:integration`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] No linting errors: `pnpm run lint`
- [ ] Example app builds: `pnpm run build` in `examples/with-mastra`

#### Manual Verification:
- [ ] Tools execute and return real results in example app
- [ ] Memory persists across page refreshes in example app
- [ ] `mastra.db` file is created with actual data
- [ ] Memory search returns relevant results
- [ ] Tool execution shows in Mastra logs
- [ ] Error handling works (try invalid tool parameters)
- [ ] Thread switching maintains memory isolation

---

## Phase 2: Workflows + Events Integration

### Overview
Replace workflow state machine and event pub/sub mocks with Mastra's workflow execution and event watching systems. This requires API design decisions since Mastra's workflow model differs from the mock.

### Changes Required

#### 1. Add Workflow Dependencies

**File**: `packages/react-mastra/package.json`

**Changes**: Workflows are in `@mastra/core`, but may need additional packages

```json
// No new dependencies needed - workflows are in @mastra/core
// But verify version has workflow support
"@mastra/core": "^0.20.2"
```

#### 2. Update useMastraWorkflows.ts

**File**: `packages/react-mastra/src/useMastraWorkflows.ts`

**Current**: Lines 11-61 contain mock state machine

**Changes**: Replace with Mastra workflow execution

```typescript
// Remove mock object (lines 11-61)
// Replace with Mastra workflow integration

import { useState, useCallback, useEffect, useMemo } from "react";
import { Mastra } from "@mastra/core/mastra";
import { WorkflowRun } from "@mastra/core/workflows";

export const useMastraWorkflows = (config: MastraWorkflowConfig) => {
  const [workflowState, setWorkflowState] = useState<MastraWorkflowState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [runInstance, setRunInstance] = useState<WorkflowRun | null>(null);

  // Get workflow from Mastra instance
  const workflow = useMemo(() => {
    // In real usage, this would come from useMastraRuntime extras
    // For now, assume it's passed via config or context
    if (!config.mastraInstance) {
      throw new Error('Mastra instance required for workflows');
    }
    return config.mastraInstance.getWorkflow(config.workflowId);
  }, [config.mastraInstance, config.workflowId]);

  // CHANGED: Start real Mastra workflow
  const startWorkflow = useCallback(async (initialContext?: Record<string, any>) => {
    setIsRunning(true);
    setIsSuspended(false);

    try {
      // Create workflow run
      const run = await workflow.createRunAsync();
      setRunInstance(run);

      // Watch for events
      run.watch((event) => {
        switch (event.type) {
          case 'step:started':
          case 'step:completed':
            // Update state based on events
            config.onStateChange?.({
              id: run.runId,
              current: event.stepId || 'unknown',
              status: 'running',
              context: event.context || {},
              history: [], // Build from events
              timestamp: new Date().toISOString(),
            });
            break;

          case 'workflow:suspended':
            setIsSuspended(true);
            setIsRunning(false);
            config.onInterrupt?.({
              id: run.runId,
              state: event.stepId || 'unknown',
              context: event.context || {},
              requiresInput: true,
              prompt: event.message,
            });
            break;

          case 'workflow:completed':
            setIsRunning(false);
            setIsSuspended(false);
            break;
        }
      });

      // Start execution with streaming
      const result = await run.stream({
        inputData: {
          ...config.context,
          ...initialContext,
        },
      });

      // Process stream
      for await (const chunk of result.stream) {
        // Stream chunks update state in real-time
        config.onStateChange?.({
          id: run.runId,
          current: chunk.stepId || 'unknown',
          status: chunk.status === 'suspended' ? 'suspended' : 'running',
          context: chunk.context || {},
          history: [], // Build from chunks
          timestamp: new Date().toISOString(),
        });
      }

      const finalState: MastraWorkflowState = {
        id: run.runId,
        current: result.status === 'success' ? 'completed' : 'error',
        status: result.status === 'suspended' ? 'suspended' : result.status === 'success' ? 'completed' : 'error',
        context: result.output || {},
        history: [],
        timestamp: new Date().toISOString(),
      };

      setWorkflowState(finalState);
      config.onStateChange?.(finalState);

      return finalState;
    } catch (error) {
      console.error("Workflow start failed:", error);
      setIsRunning(false);
      throw error;
    }
  }, [workflow, config]);

  // CHANGED: Resume real workflow
  const resumeWorkflow = useCallback(async (input?: any) => {
    if (!runInstance || !isSuspended) return;

    try {
      const result = await runInstance.resume({ input });

      const updatedState: MastraWorkflowState = {
        ...workflowState!,
        status: 'running',
        context: { ...workflowState!.context, resumeInput: input },
      };

      setWorkflowState(updatedState);
      setIsSuspended(false);
      setIsRunning(true);
      config.onStateChange?.(updatedState);

      return updatedState;
    } catch (error) {
      console.error("Workflow resume failed:", error);
      throw error;
    }
  }, [runInstance, isSuspended, workflowState, config]);

  // Note: sendCommand and transitionTo don't map directly to Mastra
  // They'll need to be implemented differently or removed from API

  return {
    workflowState,
    isRunning,
    isSuspended,
    startWorkflow,
    suspendWorkflow: () => {
      // Mastra workflows suspend themselves when they hit waitForEvent
      console.warn('Manual workflow suspension not supported in Mastra');
    },
    resumeWorkflow,
    sendCommand: () => {
      console.warn('sendCommand not supported - use resumeWorkflow instead');
    },
    transitionTo: () => {
      console.warn('transitionTo not supported - workflows control their own state');
    },
  };
};
```

**Lines affected**: 11-241 (extensive rewrite)

**API breaking changes**:
- `suspendWorkflow()` - Now a no-op, workflows suspend themselves
- `sendCommand()` - Now a no-op, use `resumeWorkflow()` instead
- `transitionTo()` - Now a no-op, workflows control state internally

#### 3. Update useMastraEvents.ts

**File**: `packages/react-mastra/src/useMastraEvents.ts`

**Current**: Lines 11-38 contain mock pub/sub

**Changes**: Replace with workflow event watching

```typescript
// Remove mock pub/sub (lines 11-38)
// Replace with workflow event watching

import { useState, useCallback } from "react";
import { WorkflowRun } from "@mastra/core/workflows";

// Map Mastra workflow events to MastraEvent format
function mapWorkflowEventToMastraEvent(workflowEvent: any): MastraEvent {
  const eventTypeMap: Record<string, MastraKnownEventTypes> = {
    'step:started': MastraKnownEventTypes.ToolStarted,
    'step:completed': MastraKnownEventTypes.ToolCompleted,
    'step:failed': MastraKnownEventTypes.ToolFailed,
    'workflow:started': MastraKnownEventTypes.WorkflowStarted,
    'workflow:suspended': MastraKnownEventTypes.WorkflowSuspended,
    'workflow:resumed': MastraKnownEventTypes.WorkflowResumed,
    'workflow:completed': MastraKnownEventTypes.WorkflowCompleted,
  };

  return {
    id: `${workflowEvent.runId}-${Date.now()}`,
    event: eventTypeMap[workflowEvent.type] || MastraKnownEventTypes.Custom,
    data: workflowEvent,
    timestamp: new Date().toISOString(),
    metadata: {
      workflowId: workflowEvent.workflowId,
      runId: workflowEvent.runId,
      stepId: workflowEvent.stepId,
    },
  };
}

export const useMastraEvents = () => {
  const [subscriptions, setSubscriptions] = useState<Map<string, MastraEventSubscription>>(new Map());
  const [eventHistory, setEventHistory] = useState<MastraEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeWorkflowRuns, setActiveWorkflowRuns] = useState<Set<WorkflowRun>>(new Set());

  // CHANGED: Subscribe to workflow events (not general pub/sub)
  const subscribe = useCallback((eventType: string, handler: MastraEventHandler): string => {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const subscription: MastraEventSubscription & { unsubscribe: () => void } = {
      id: subscriptionId,
      eventTypes: [eventType as any],
      handler,
      unsubscribe: () => {
        setSubscriptions(prev => {
          const updated = new Map(prev);
          updated.delete(subscriptionId);
          return updated;
        });
      },
    };

    setSubscriptions(prev => {
      const updated = new Map(prev);
      updated.set(subscriptionId, subscription);
      return updated;
    });

    return subscriptionId;
  }, []);

  // CHANGED: Attach to workflow run
  const watchWorkflow = useCallback((workflowRun: WorkflowRun) => {
    workflowRun.watch((workflowEvent) => {
      const mastraEvent = mapWorkflowEventToMastraEvent(workflowEvent);

      // Call matching subscribers
      subscriptions.forEach((sub) => {
        if (sub.eventTypes.includes(mastraEvent.event)) {
          sub.handler(mastraEvent);
        }
      });

      // Add to history
      setEventHistory(prev => [mastraEvent, ...prev].slice(0, 1000));
    });

    setActiveWorkflowRuns(prev => new Set(prev).add(workflowRun));
  }, [subscriptions]);

  // Publish is now a no-op since events come from workflows
  const publish = useCallback(async (event: MastraEvent): Promise<void> => {
    console.warn('Direct event publishing not supported - events come from workflows');
    // Still add to local history for compatibility
    setEventHistory(prev => [event, ...prev].slice(0, 1000));
  }, []);

  // Rest of methods remain similar but note they're workflow-centric now
  // ... unsubscribe, getEventsByType, etc. ...

  return {
    subscriptions: Array.from(subscriptions.values()),
    eventHistory,
    isConnected,
    subscribe,
    unsubscribe,
    publish,
    watchWorkflow, // NEW: Attach event watching to workflow
    subscribeToMultiple,
    unsubscribeMultiple,
    getEventsByType,
    getEventsByTimeRange,
    clearHistory,
    loadHistory: () => {
      console.warn('loadHistory not supported - events are in-memory only');
    },
    connect: () => setIsConnected(true),
    disconnect: () => {
      setSubscriptions(new Map());
      setIsConnected(false);
    },
  };
};
```

**Lines affected**: 11-389 (extensive modifications)

**API changes**:
- Added `watchWorkflow(workflowRun)` - Attach to workflow for events
- `publish()` - Now a no-op warning, events come from workflows
- `loadHistory()` - Now a no-op warning, events are in-memory only

#### 4. Update Types for Workflow API Changes

**File**: `packages/react-mastra/src/types.ts`

**Changes**: Add optional Mastra instance field

```typescript
// Add to MastraWorkflowConfig (lines 114-120)
export interface MastraWorkflowConfig {
  workflowId: string;
  initialState?: string;
  context?: Record<string, any>;
  onStateChange?: (state: MastraWorkflowState) => void;
  onInterrupt?: (interrupt: MastraWorkflowInterrupt) => void;
  mastraInstance?: any; // Mastra instance - optional for backwards compatibility
}
```

#### 5. Add Workflow Integration Tests

**File**: `packages/react-mastra/src/useMastraWorkflows.test.integration.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMastraWorkflows } from './useMastraWorkflows';
import { Mastra } from '@mastra/core/mastra';
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

describe('useMastraWorkflows - Real Integration', () => {
  const step1 = createStep({
    id: 'greet',
    description: 'Greet user',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ greeting: z.string() }),
    execute: async ({ context }) => {
      return { greeting: `Hello, ${context.name}!` };
    },
  });

  const testWorkflow = createWorkflow({
    id: 'test-workflow',
    description: 'Test workflow',
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ greeting: z.string() }),
  })
    .then(step1)
    .commit();

  const mastra = new Mastra({
    workflows: { testWorkflow },
  });

  it('should execute real Mastra workflow', async () => {
    const { result } = renderHook(() =>
      useMastraWorkflows({
        workflowId: 'test-workflow',
        mastraInstance: mastra,
      })
    );

    await act(async () => {
      const state = await result.current.startWorkflow({ name: 'Alice' });
      expect(state?.status).toBe('completed');
    });
  });
});
```

### Success Criteria

#### Automated Verification:
- [ ] Package builds: `pnpm run build`
- [ ] All tests pass: `pnpm run test`
- [ ] Integration tests pass: `pnpm run test:integration`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] No linting errors: `pnpm run lint`

#### Manual Verification:
- [ ] Workflows execute and complete in example app
- [ ] Workflow events are received by subscribers
- [ ] Workflow suspension triggers onInterrupt callback
- [ ] Resume workflow continues from suspension point
- [ ] Event history accumulates during workflow execution
- [ ] Multiple workflows can run concurrently

---

## Phase 3: RAG + Observability Integration

### Overview
Replace RAG document processing and observability tracing mocks with real Mastra integrations. These are lower-priority "nice-to-have" features.

### Changes Required

#### 1. Add RAG Dependencies

**File**: `packages/react-mastra/package.json`

**Changes**: Add RAG package

```json
"dependencies": {
  "@mastra/core": "^0.20.2",
  "@mastra/memory": "^0.15.6",
  "@mastra/libsql": "latest",
  "@mastra/rag": "latest",
  "assistant-stream": "^0.2.29",
  "uuid": "^11.1.0",
  "zod": "^4.0.17"
}
```

#### 2. Update useMastraRAG.ts

**File**: `packages/react-mastra/src/useMastraRAG.ts`

**Current**: Lines 15-61 contain mock RAG operations

**Changes**: Replace with real Mastra RAG

```typescript
// Remove mock object (lines 15-61)
// Replace with Mastra RAG integration

import { embedMany, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { MDocument } from "@mastra/rag";
import { useState, useCallback, useMemo } from "react";

export const useMastraRAG = (config: MastraRAGConfig) => {
  const [documents, setDocuments] = useState<MastraDocument[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryHistory, setQueryHistory] = useState<MastraRAGQuery[]>([]);
  const [results, setResults] = useState<MastraRAGResult[]>([]);

  // Initialize vector store
  const vectorStore = useMemo(() => {
    return createVectorStore(config.vectorStore);
  }, [config.vectorStore]);

  // Initialize embedder
  const embeddingModel = useMemo(() => {
    switch (config.embedder.provider) {
      case 'openai':
        return openai.embedding(config.embedder.model || 'text-embedding-3-small');
      case 'anthropic':
        throw new Error('Anthropic embeddings not yet supported');
      default:
        throw new Error(`Unknown embedder provider: ${config.embedder.provider}`);
    }
  }, [config.embedder]);

  // CHANGED: Real document ingestion
  const ingestDocuments = useCallback(async (docs: MastraDocument[]): Promise<MastraDocumentChunk[]> => {
    setIsIndexing(true);

    try {
      const allChunks: MastraDocumentChunk[] = [];

      for (const doc of docs) {
        // Create MDocument
        const mDoc = MDocument.fromText(doc.content);

        // Chunk document
        const chunks = await mDoc.chunk({
          strategy: config.chunking.strategy as any,
          size: config.chunking.maxChunkSize,
          overlap: config.chunking.overlap || 0,
        });

        // Generate embeddings
        const { embeddings } = await embedMany({
          values: chunks.map(chunk => chunk.text),
          model: embeddingModel,
        });

        // Store in vector database
        const chunkMetadata = chunks.map((chunk, index) => ({
          id: `${doc.id}-chunk-${index}`,
          documentId: doc.id,
          content: chunk.text,
          metadata: { ...doc.metadata, chunkIndex: index },
          embedding: embeddings[index],
          index,
        }));

        await vectorStore.upsert({
          indexName: 'documents',
          vectors: embeddings,
          metadata: chunkMetadata,
        });

        allChunks.push(...chunkMetadata);
      }

      setDocuments(prev => {
        const existing = new Map(prev.map(doc => [doc.id, doc]));
        docs.forEach(doc => existing.set(doc.id, doc));
        return Array.from(existing.values());
      });

      return allChunks;
    } catch (error) {
      console.error("Document ingestion failed:", error);
      throw error;
    } finally {
      setIsIndexing(false);
    }
  }, [config, embeddingModel, vectorStore]);

  // CHANGED: Real RAG query
  const query = useCallback(async (queryOptions: MastraRAGQuery): Promise<MastraRAGResult[]> => {
    setIsQuerying(true);

    try {
      // Generate query embedding
      const { embedding: queryEmbedding } = await embed({
        value: queryOptions.query,
        model: embeddingModel,
      });

      // Query vector store
      const vectorResults = await vectorStore.query({
        indexName: 'documents',
        queryVector: queryEmbedding,
        topK: queryOptions.limit || 5,
        similarityThreshold: queryOptions.similarityThreshold || 0.7,
        filters: queryOptions.filters,
      });

      // Convert to MastraRAGResult format
      const ragResults: MastraRAGResult[] = vectorResults.map(result => ({
        content: result.metadata.content,
        metadata: result.metadata.metadata || {},
        similarity: result.score,
        documentId: result.metadata.documentId,
        chunkId: result.metadata.id,
      }));

      setResults(ragResults);
      setQueryHistory(prev => [...prev, queryOptions]);

      return ragResults;
    } catch (error) {
      console.error("RAG query failed:", error);
      throw error;
    } finally {
      setIsQuerying(false);
    }
  }, [embeddingModel, vectorStore]);

  // Real document deletion
  const deleteDocuments = useCallback(async (documentIds: string[]): Promise<void> => {
    try {
      // Delete from vector store by metadata filter
      for (const docId of documentIds) {
        await vectorStore.delete({
          indexName: 'documents',
          filters: { documentId: docId },
        });
      }

      setDocuments(prev => prev.filter(doc => !documentIds.includes(doc.id)));
    } catch (error) {
      console.error("Document deletion failed:", error);
      throw error;
    }
  }, [vectorStore]);

  // ... rest of hook methods ...

  return {
    documents,
    isIndexing,
    isQuerying,
    queryHistory,
    results,
    ingestDocuments,
    query,
    deleteDocuments,
    getDocuments,
    updateDocument,
    clearDocuments,
    getDocumentById,
  };
};

// Helper to create vector store
function createVectorStore(config: MastraVectorStoreConfig) {
  switch (config.provider) {
    case 'pinecone':
      // Requires @mastra/rag with Pinecone
      throw new Error('Pinecone integration not yet implemented');
    case 'libsql':
      // LibSQL vector support
      throw new Error('LibSQL vector integration not yet implemented');
    default:
      throw new Error(`Unknown vector store: ${config.provider}`);
  }
}
```

**Lines affected**: 15-391 (extensive rewrite)

#### 3. Update useMastraObservability.ts

**File**: `packages/react-mastra/src/useMastraObservability.ts`

**Current**: Lines 11-44 contain mock observability

**Changes**: Replace with Mastra telemetry

```typescript
// Remove mock observability (lines 11-44)
// Replace with Mastra telemetry integration

import { useState, useCallback, useMemo } from "react";
import { Mastra } from "@mastra/core/mastra";

export const useMastraObservability = (config: MastraObservabilityConfig) => {
  const [traces, setTraces] = useState<MastraTrace[]>([]);
  const [metrics, setMetrics] = useState<MastraMetric[]>([]);
  const [activeTraces, setActiveTraces] = useState<Map<string, MastraTrace>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Note: Mastra telemetry is configured at the Mastra instance level,
  // not at the hook level. This hook provides a React interface to it.

  const initialize = useCallback(async (): Promise<void> => {
    try {
      // In real usage, telemetry would be configured when creating Mastra instance
      console.log("Observability initialized:", config);
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize observability:", error);
      throw error;
    }
  }, [config]);

  // Traces are automatically created by Mastra - this just tracks them locally
  const createTrace = useCallback((
    operationName: string,
    tags?: Record<string, any>
  ): string => {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const trace: MastraTrace = {
      id: traceId,
      traceId,
      spanId: `span-${Date.now()}`,
      operationName,
      startTime: new Date().toISOString(),
      status: "ok",
      attributes: tags || {},
      events: [],
      metrics: [],
    };

    setActiveTraces(prev => {
      const updated = new Map(prev);
      updated.set(traceId, trace);
      return updated;
    });

    return traceId;
  }, []);

  // Note: Most observability methods become no-ops or local tracking only
  // Real tracing happens automatically via Mastra's telemetry configuration

  return {
    traces,
    metrics,
    activeTraces: Array.from(activeTraces.values()),
    isInitialized,
    initialize,
    createTrace,
    addEvent: () => console.warn('Event tracking is automatic via Mastra telemetry'),
    finishTrace: () => console.warn('Trace finishing is automatic via Mastra telemetry'),
    recordMetric: () => console.warn('Metrics are recorded automatically via Mastra telemetry'),
    traceAsync: async (name: string, fn: () => Promise<any>) => {
      // Just execute, Mastra handles tracing if configured
      return await fn();
    },
    traceSync: (name: string, fn: () => any) => {
      // Just execute, Mastra handles tracing if configured
      return fn();
    },
  };
};
```

**Lines affected**: 11-309 (simplified significantly)

**API changes**:
- Most methods become no-ops with warnings
- Real observability happens via Mastra instance configuration
- Hook becomes primarily local state tracking

#### 4. Update Documentation

**File**: `packages/react-mastra/README.md`

**Changes**: Document telemetry configuration

```markdown
## Observability

Observability in Mastra is configured at the instance level, not per-hook.

### Setup

Configure telemetry when creating your Mastra instance:

\`\`\`typescript
import { Mastra } from '@mastra/core/mastra';

const mastra = new Mastra({
  agents: { ... },
  telemetry: {
    serviceName: 'my-app',
    enabled: true,
    sampling: {
      type: 'ratio',
      probability: 0.5,
    },
    export: {
      type: 'otlp',
      endpoint: 'http://localhost:4318',
    },
  },
});
\`\`\`

### Environment Variables

\`\`\`bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=your-key
\`\`\`

### Hook Usage

The \`useMastraObservability\` hook is primarily for local state tracking:

\`\`\`typescript
const obs = useMastraObservability({
  serviceName: 'my-app',
  environment: 'production',
  exporters: [{ type: 'console', config: {} }],
  sampling: { type: 'all' },
});

// Traces are created automatically by Mastra
// This just tracks them locally in React state
const traceId = obs.createTrace('user-query', { userId: '123' });
\`\`\`
```

### Success Criteria

#### Automated Verification:
- [ ] Package builds: `pnpm run build`
- [ ] All tests pass: `pnpm run test`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] No linting errors: `pnpm run lint`

#### Manual Verification:
- [ ] Documents can be ingested and indexed
- [ ] RAG queries return relevant results based on similarity
- [ ] Vector store is populated with embeddings
- [ ] Observability traces appear in configured exporter (e.g., SigNoz)
- [ ] Telemetry data includes agent operations, tool calls, etc.
- [ ] Environment variables configure OTLP export correctly

---

## Phase 4: TODOs - Message Editing & Reloading

### Overview
Implement the 3 TODO items: message editing, message reloading, and attachment types. These enable users to edit previous messages and regenerate responses.

### Changes Required

#### 1. Implement Message Editing

**File**: `packages/react-mastra/src/useMastraRuntime.ts`

**Current**: Lines 218-230 have TODO and console.warn

**Changes**: Implement real message editing

```typescript
// Replace lines 218-230
onEdit: async (message: any) => {
  setIsRunning(true);
  try {
    // Get message index
    const messageIndex = messages.findIndex(m => m.id === message.id);
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    // Truncate messages after the edited message
    const truncatedMessages = messages.slice(0, messageIndex + 1);

    // Update the edited message
    truncatedMessages[messageIndex] = {
      ...truncatedMessages[messageIndex],
      content: getMessageContent(message),
    };

    // Save to memory if configured
    if (config.memory && currentThread) {
      await memory.saveToMemory(currentThread, truncatedMessages);
    }

    // Re-run from this point
    const response = await fetch(config.api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: truncatedMessages.map(m => ({
          role: m.type === 'human' ? 'user' : m.type,
          content: getMessageContent(m),
        })),
        threadId: currentThread,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Process streaming response (same as handleNew)
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    // Reset accumulator with truncated messages
    accumulatorRef.current = new MastraMessageAccumulator<MastraMessage>({
      initialMessages: truncatedMessages,
      appendMessage: appendMastraChunk,
      onMessageUpdate: (msg) => {
        const toolCalls = extractMastraToolCalls(msg);
        toolCalls.forEach((toolCall) => {
          config.eventHandlers?.onToolCall?.(toolCall);
        });
      },
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            setIsRunning(false);
            return;
          }

          try {
            const event = JSON.parse(data);
            processEvent(event);
          } catch (e) {
            console.error("Failed to parse event:", e);
          }
        }
      }
    }
  } catch (error) {
    config.onError?.(
      error instanceof Error ? error : new Error("Unknown error"),
    );
  } finally {
    setIsRunning(false);
  }
},
```

**Lines affected**: 218-230 (expand significantly)

#### 2. Implement Message Reloading

**File**: `packages/react-mastra/src/useMastraRuntime.ts`

**Current**: Lines 232-244 have TODO and console.warn

**Changes**: Implement real message reloading

```typescript
// Replace lines 232-244
onReload: async (parentId: string | null) => {
  setIsRunning(true);
  try {
    // Find the parent message
    const parentIndex = parentId
      ? messages.findIndex(m => m.id === parentId)
      : messages.length - 1;

    if (parentIndex === -1) {
      throw new Error('Parent message not found');
    }

    // Get messages up to and including parent
    const previousMessages = messages.slice(0, parentIndex + 1);

    // Remove any assistant messages after parent
    const trimmedMessages = previousMessages.filter((m, idx) =>
      idx <= parentIndex || m.type !== 'assistant'
    );

    // Regenerate from this point
    const lastUserMessage = trimmedMessages[trimmedMessages.length - 1];

    const response = await fetch(config.api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: trimmedMessages.map(m => ({
          role: m.type === 'human' ? 'user' : m.type,
          content: getMessageContent(m),
        })),
        threadId: currentThread,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Process streaming response (same as handleNew)
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    // Reset accumulator with trimmed messages
    accumulatorRef.current = new MastraMessageAccumulator<MastraMessage>({
      initialMessages: trimmedMessages,
      appendMessage: appendMastraChunk,
      onMessageUpdate: (msg) => {
        const toolCalls = extractMastraToolCalls(msg);
        toolCalls.forEach((toolCall) => {
          config.eventHandlers?.onToolCall?.(toolCall);
        });
      },
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            setIsRunning(false);
            return;
          }

          try {
            const event = JSON.parse(data);
            processEvent(event);
          } catch (e) {
            console.error("Failed to parse event:", e);
          }
        }
      }
    }
  } catch (error) {
    config.onError??(
      error instanceof Error ? error : new Error("Unknown error"),
    );
  } finally {
    setIsRunning(false);
  }
},
```

**Lines affected**: 232-244 (expand significantly)

#### 3. Add Attachment Types

**File**: `packages/react-mastra/src/types.ts`

**Current**: Line 390 has `attachments?: any; // TODO`

**Changes**: Define proper attachment types

```typescript
// Replace line 390
// Define attachment adapter interface
export interface MastraAttachmentAdapter {
  accept: string | string[]; // MIME types or file extensions
  maxSize?: number; // Max file size in bytes
  upload: (file: File) => Promise<MastraAttachment>;
  download: (attachmentId: string) => Promise<Blob>;
  delete?: (attachmentId: string) => Promise<void>;
}

export interface MastraAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number;
  url: string;
  metadata?: Record<string, any>;
}

// Update MastraRuntimeConfig (line 390)
export type MastraRuntimeConfig = {
  // ... existing fields ...
  adapters?: {
    attachments?: MastraAttachmentAdapter;
    feedback?: any;
    speech?: any;
  };
  // ... rest of config ...
};
```

**Lines affected**: 390 (replace), add new interfaces above

#### 4. Add Tests for Editing/Reloading

**File**: `packages/react-mastra/src/useMastraRuntime.test.integration.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMastraRuntime } from './useMastraRuntime';

describe('useMastraRuntime - Message Editing & Reloading', () => {
  const mockApi = '/api/test';

  beforeEach(() => {
    // Mock fetch for API calls
    global.fetch = vi.fn();
  });

  it('should edit message and regenerate from that point', async () => {
    const { result } = renderHook(() =>
      useMastraRuntime({
        api: mockApi,
        agentId: 'test-agent',
      })
    );

    // Setup mock response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    });

    // Trigger edit
    await act(async () => {
      await result.current.onEdit({
        id: 'msg-2',
        content: 'Edited message',
      });
    });

    // Verify fetch was called with truncated messages
    expect(global.fetch).toHaveBeenCalled();
    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.messages.length).toBeLessThan(10); // Assuming we had more messages
  });

  it('should reload message from parent', async () => {
    const { result } = renderHook(() =>
      useMastraRuntime({
        api: mockApi,
        agentId: 'test-agent',
      })
    );

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    });

    // Trigger reload
    await act(async () => {
      await result.current.onReload('msg-3');
    });

    expect(global.fetch).toHaveBeenCalled();
  });
});
```

### Success Criteria

#### Automated Verification:
- [ ] Package builds: `pnpm run build`
- [ ] All tests pass: `pnpm run test`
- [ ] Integration tests pass: `pnpm run test:integration`
- [ ] Type checking passes: `pnpm run typecheck`
- [ ] No linting errors: `pnpm run lint`

#### Manual Verification:
- [ ] Message editing works in example app
- [ ] Edited message triggers regeneration from that point
- [ ] Message reloading regenerates response from parent
- [ ] Conversation history is preserved correctly
- [ ] Memory is updated after edits
- [ ] Attachment types are properly typed (no TypeScript errors)

---

## Testing Strategy

### Unit Tests
Each phase should have comprehensive unit tests:

**Phase 1 (Tools + Memory):**
- Tool registration and unregistration
- Tool execution with real Mastra tools
- Tool retry policies
- Memory save and retrieval
- Memory search with similarity threshold
- Thread creation and deletion
- Storage adapter configuration

**Phase 2 (Workflows + Events):**
- Workflow initialization and execution
- Workflow state transitions
- Event subscription and unsubscription
- Event filtering by type
- Workflow suspension and resumption
- Multi-workflow coordination

**Phase 3 (RAG + Observability):**
- Document ingestion and chunking
- Embedding generation
- Similarity search
- Vector store operations
- Trace creation (local tracking)
- Metric recording (local tracking)

**Phase 4 (TODOs):**
- Message editing flow
- Message reloading flow
- Conversation truncation
- Attachment type validation

### Integration Tests
Integration tests should use real Mastra instances:

**Test Setup:**
```typescript
import { Mastra } from '@mastra/core/mastra';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

const testMastra = new Mastra({
  agents: { testAgent },
  memory: new Memory({
    storage: new LibSQLStore({ url: ':memory:' }),
  }),
});
```

**Key Scenarios:**
1. End-to-end tool execution flow
2. Memory persistence across hook unmount/remount
3. Workflow execution with suspension
4. RAG query with real embeddings
5. Complete message edit and regenerate flow

### Manual Testing Steps

**Phase 1 Verification:**
1. Start example app: `pnpm run dev` in `examples/with-mastra`
2. Send a message that requires a tool call
3. Verify tool executes and returns real result
4. Refresh the page
5. Verify conversation history is restored from memory
6. Check `mastra.db` file exists with data

**Phase 2 Verification:**
1. Create a workflow in the example
2. Start workflow execution
3. Verify workflow events appear in console/UI
4. Trigger workflow suspension (if applicable)
5. Resume workflow with user input
6. Verify workflow completes successfully

**Phase 3 Verification:**
1. Ingest sample documents via RAG hook
2. Perform similarity search query
3. Verify relevant results are returned
4. Configure observability exporter (e.g., console)
5. Verify traces appear in console output

**Phase 4 Verification:**
1. Send several messages in a conversation
2. Click edit on a previous user message
3. Verify conversation regenerates from that point
4. Click reload/regenerate on assistant message
5. Verify new response is generated
6. Check memory is updated correctly

## Performance Considerations

### Phase 1 (Tools + Memory)
- **Tool execution**: May be slow depending on tool complexity
  - Add timeout configuration
  - Show progress indicators for long-running tools
- **Memory queries**: Vector search can be slow
  - Limit similarity search to reasonable topK (5-10)
  - Consider caching recent queries
  - Use appropriate similarity threshold (0.7+)

### Phase 2 (Workflows + Events)
- **Workflow execution**: May involve multiple steps
  - Stream progress updates to UI
  - Allow cancellation of long-running workflows
- **Event subscriptions**: Many subscribers can impact performance
  - Limit active subscriptions
  - Clean up subscriptions on unmount

### Phase 3 (RAG + Observability)
- **Document ingestion**: Embedding generation is slow
  - Process in batches
  - Show progress bar for large document sets
  - Consider background processing
- **Vector queries**: Multiple API calls
  - Cache embeddings for repeated queries
  - Debounce search input

### Phase 4 (TODOs)
- **Message regeneration**: Full conversation re-processing
  - Only send necessary context to API
  - Consider incremental updates

## Migration Notes

### For Existing Users

**Breaking Changes:**
- Workflows API changes:
  - `suspendWorkflow()` is now a no-op (workflows suspend themselves)
  - `sendCommand()` replaced with `resumeWorkflow()`
  - `transitionTo()` not supported (workflows control their own state)
- Events API changes:
  - `publish()` is now a no-op (events come from workflows)
  - `loadHistory()` is now a no-op (events are in-memory only)
  - Must call `watchWorkflow(run)` to receive workflow events
- Observability API changes:
  - Most methods become local tracking only
  - Real observability configured at Mastra instance level

**Migration Guide:**
1. Update workflow usage to use new API patterns
2. Configure Mastra telemetry at instance level for observability
3. Attach event watching to workflow runs explicitly
4. Test thoroughly - behavior is now tied to real Mastra execution

### Database Setup

**LibSQL (Default):**
```typescript
// File-based (persistent)
storage: 'libsql'
// Database will be created at ./mastra.db

// In-memory (testing)
storage: 'libsql'
// Set LIBSQL_URL=:memory: environment variable
```

**PostgreSQL:**
```bash
# Install package
pnpm add @mastra/pg

# Set connection string
export POSTGRES_CONNECTION_STRING="postgresql://..."
```

## References

- Original research: `notes/research/mastra_todos_and_mock_implementations.md`
- Related research: `notes/research/mastra_integration_state.md`
- Related research: `notes/research/mastra_integration_requirements.md`
- Mastra documentation: https://mastra.ai/docs
- Mastra SDK: https://github.com/mastra-ai/mastra
- Example implementation: `examples/with-mastra/`

## Open Questions (Resolved)

All questions have been answered through research:

1. ~~What is the timeline for Phase 3?~~ → Proceeding with full 4-phase plan
2. ~~Which Mastra SDK version?~~ → `@mastra/core@^0.20.2` (current in example)
3. ~~Are there Mastra API examples?~~ → Yes, documented in research and examples
4. ~~How should authentication be handled?~~ → Via environment variables (OPENAI_API_KEY, etc.)
5. ~~What error handling patterns?~~ → Standard try/catch with user callbacks (onError)

## Success Metrics

**Phase 1 Complete When:**
- ✅ Tools execute via real Mastra SDK
- ✅ Memory persists to database
- ✅ Integration tests pass
- ✅ Example app demonstrates features

**Phase 2 Complete When:**
- ✅ Workflows execute real Mastra workflows
- ✅ Events are received from workflow runs
- ✅ Integration tests pass
- ✅ Example shows workflow usage

**Phase 3 Complete When:**
- ✅ Documents are indexed with real embeddings
- ✅ RAG queries return relevant results
- ✅ Observability exports to configured platform
- ✅ Integration tests pass

**Phase 4 Complete When:**
- ✅ Message editing regenerates conversation
- ✅ Message reloading works correctly
- ✅ Attachment types are properly defined
- ✅ Integration tests pass

**Overall Success:**
- ✅ All 6 mock implementations replaced
- ✅ All tests passing (unit + integration)
- ✅ Example app fully functional
- ✅ Documentation updated
- ✅ No console.warn() for mock implementations
