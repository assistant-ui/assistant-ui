# Fix Mastra Hook Implementations - Complete Refactoring Plan

## Overview

The `@assistant-ui/react-mastra` package has 88 failing tests due to fundamental architectural issues in hook implementations. This plan addresses all issues through a comprehensive refactoring that removes mocks, requires real Mastra integration, and fixes state management across all 6 feature hooks.

## Current State Analysis

### Test Failure Distribution
- **useMastraEvents**: 19 tests (state isolation + 4 derived hooks)
- **useMastraObservability**: 19 tests (async initialization timing)
- **useMastraRAG**: 19 tests (multiple sub-hooks with state issues)
- **useMastraWorkflows**: 15 tests (async state machine)
- **useMastraMessages**: 13 tests (message conversion)
- **Integration Tests**: 14 tests (end-to-end)
- **convertMastraMessages**: 11 tests (utility function)
- **useMastraTools**: 7 tests (partial real implementation)
- **useMastraRuntime**: 6 tests (main integration, CRITICAL)
- **useMastraMemory**: 6 tests (already uses real API)

### Root Causes Identified

**1. State Isolation Problem (CRITICAL)**
- **Location**: `useMastraEvents.ts:176, 205, 269, 320`
- **Issue**: Derived hooks (`useMastraEventSubscription`, `useMastraEventPattern`, `useMastraEventAnalytics`, `useMastraEventSubscriptionManager`) each call `useMastraEvents()` internally, creating completely separate instances with isolated state
- **Impact**: No state sharing between hook instances - tests expect shared state but each instance is isolated
- **Affects**: 4 derived hooks in useMastraEvents file

**2. Mock Implementation Pattern (BLOCKING PRODUCTION USE)**
- **Locations**: All hooks except useMastraMemory use inline mocks
  - `useMastraEvents.ts:12-38` - Mock event system
  - `useMastraRAG.ts:16-61` - Mock RAG API
  - `useMastraWorkflows.ts:12-61` - Mock workflow API
  - `useMastraObservability.ts:12-44` - Mock observability API
  - `useMastraTools.ts:17-36` - Partial mock (wraps real tool.execute)
- **Issue**: Mocks are hardcoded in implementation files, not test files
- **Impact**: Cannot use real Mastra backend, package is demonstration-only
- **User Requirement**: "Remove mocks entirely and require real Mastra integration"

**3. Async Initialization Timing Issues**
- **Hooks Affected**: `useMastraEvents`, `useMastraObservability`, `useMastraWorkflows`
- **Issue**: Auto-initialization via `useEffect` runs after first render
- **Impact**: Tests checking `result.current` immediately may see stale state
- **Evidence**: `useMastraEvents.ts:145-149` auto-connects after mount

**4. Test Mock Configuration Mismatch**
- **Issue**: Tests create mocks for module-level APIs, but implementations define inline mocks
- **Example**: `useMastraEvents.test.ts:13-17` mocks `mastraEvents`, but implementation has its own inline mock at `useMastraEvents.ts:12-38`
- **Impact**: Test mocks don't affect implementation behavior

**5. React Hooks Rules Violations**
- **useMastraEvents.ts:149**: Deliberately omits dependencies to avoid infinite loops
- **useMastraEvents.ts:133-142**: `disconnect()` depends on `subscriptions` but parent effect doesn't track it
- **Impact**: Stale closures, incorrect cleanup, potential memory leaks

### Key Discoveries
- **useMastraMemory is the only hook using real API** (HTTP fetch to `/api/memory/*`)
- **useMastraTools partially uses real implementation** (calls `tool.execute()` but wraps it)
- **All other hooks use hardcoded mocks** that just log to console
- **State isolation affects only useMastraEvents** (its 4 derived hooks)
- **Async timing affects 3 hooks** (Events, Observability, Workflows)
- **Architecture is fundamentally mock-based**, not production-ready

## Desired End State

After implementation:

1. **All hooks use real Mastra SDK** - No inline mocks, production-ready code
2. **State sharing works correctly** - Context Provider pattern for shared state
3. **All 88+ tests pass** - Fixed implementations pass all existing tests
4. **React hooks rules compliance** - No ESLint violations or stale closures
5. **Breaking changes documented** - Migration guide for consumers
6. **Production-ready** - Package can be used with real Mastra backend

### Verification

#### Automated Verification:
- [ ] All unit tests pass: `cd packages/react-mastra && pnpm test`
- [ ] All integration tests pass: `cd packages/react-mastra && pnpm test:integration`
- [ ] No linting errors: `cd packages/react-mastra && pnpm lint`
- [ ] TypeScript compiles: `cd packages/react-mastra && pnpm typecheck`
- [ ] Build succeeds: `cd packages/react-mastra && pnpm build`
- [ ] Can run tests 3 times consecutively without errors

#### Manual Verification:
- [ ] Example application works with real Mastra backend
- [ ] No console warnings in browser
- [ ] Memory usage is stable (no leaks)
- [ ] All hooks work together in integration

## What We're NOT Doing

- Not keeping any mock implementations
- Not maintaining backward compatibility with mock-based API
- Not supporting both mock and real implementations
- Not splitting into separate packages
- Not changing the public API signatures (only implementation)
- Not adding new features (pure refactoring)

## Implementation Approach

**Strategy**: Fix hooks in priority order, starting with foundation (Events) and building up to integration (Runtime). Each phase is independently testable.

**Breaking Changes**: This refactoring introduces breaking changes:
1. Consumers must provide real Mastra SDK instances
2. Context Providers required for shared state hooks
3. No more mock/demo mode - requires real backend
4. Configuration objects must include real API endpoints

---

## Phase 1: Fix useMastraEvents - State Isolation & Real Implementation

### Overview
Convert useMastraEvents from mock-based isolated state to Context Provider pattern with real Mastra event system integration. This fixes the state isolation problem affecting 4 derived hooks.

### Changes Required

#### 1. Create Mastra Events Context Provider
**File**: `packages/react-mastra/src/useMastraEvents.ts`
**Changes**: Add Context Provider for shared state

```typescript
import { createContext, useContext, ReactNode } from "react";
import { Mastra } from "@mastra/core";

// 1. Define context type based on existing return type
type MastraEventsContextType = ReturnType<typeof useMastraEventsInternal>;

// 2. Create context
const MastraEventsContext = createContext<MastraEventsContextType | null>(null);

// 3. Rename current useMastraEvents to internal version
const useMastraEventsInternal = (mastra: Mastra) => {
  // ... existing implementation but use real mastra.events API
  // Remove mock mastraEvents object (lines 12-38)
  // Use mastra.events.subscribe(), mastra.events.publish(), etc.
};

// 4. Create Provider component
export const MastraEventsProvider = ({
  mastra,
  children
}: {
  mastra: Mastra;
  children: ReactNode;
}) => {
  const events = useMastraEventsInternal(mastra);
  return (
    <MastraEventsContext.Provider value={events}>
      {children}
    </MastraEventsContext.Provider>
  );
};

// 5. Export public hook that uses context
export const useMastraEvents = () => {
  const context = useContext(MastraEventsContext);
  if (!context) {
    throw new Error("useMastraEvents must be used within MastraEventsProvider");
  }
  return context;
};
```

**Rationale**:
- Context Provider ensures single instance shared across all consumers
- Derived hooks can now access the same state instance
- Standard React pattern for shared state
- Removes state isolation problem

#### 2. Remove Inline Mock Implementation
**File**: `packages/react-mastra/src/useMastraEvents.ts`
**Lines to Remove**: 12-38 (entire mock mastraEvents object)
**Replace With**: Real Mastra SDK API calls

```typescript
// REMOVE:
const mastraEvents = {
  subscribe: (eventTypes: string[], handler: MastraEventHandler) => { ... },
  // ... rest of mock
};

// REPLACE WITH:
// Use mastra.events API directly in hook implementation
const subscribe = useCallback((eventType: string, handler: MastraEventHandler): string => {
  const subscription = mastra.events.subscribe([eventType], handler);
  // ... rest of implementation
}, [mastra]);
```

**Rationale**:
- Removes mock code that blocks production use
- Uses real Mastra SDK for event management
- Enables actual backend integration

#### 3. Fix Derived Hooks to Use Context
**File**: `packages/react-mastra/src/useMastraEvents.ts`
**Changes**: Update all 4 derived hooks to use context instead of calling useMastraEvents()

```typescript
// BEFORE (line 176):
export const useMastraEventSubscription = (...) => {
  const { subscribe, unsubscribe } = useMastraEvents(); // Creates new instance!
  // ...
};

// AFTER:
export const useMastraEventSubscription = (...) => {
  const events = useContext(MastraEventsContext); // Uses shared instance
  if (!events) throw new Error("Must be used within MastraEventsProvider");
  const { subscribe, unsubscribe } = events;
  // ...
};
```

**Apply to**:
- `useMastraEventSubscription` (line 176)
- `useMastraEventPattern` (line 205)
- `useMastraEventAnalytics` (line 269)
- `useMastraEventSubscriptionManager` (line 320)

**Rationale**:
- All derived hooks now share the same state instance
- Fixes test failures caused by state isolation
- Maintains all existing functionality

#### 4. Fix React Hooks Rules Violations
**File**: `packages/react-mastra/src/useMastraEvents.ts`
**Changes**: Fix dependency arrays and stale closures

```typescript
// Fix auto-connect effect (line 145-149)
// BEFORE:
useEffect(() => {
  connect();
  return () => disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Violates rules

// AFTER:
useEffect(() => {
  setIsConnected(true);
  console.log("Connected to Mastra event system");

  return () => {
    // Cleanup uses refs instead of closures
    subscriptionsRef.current.forEach(subscription => {
      subscription?.unsubscribe?.();
    });
    setIsConnected(false);
    console.log("Disconnected from Mastra event system");
  };
}, [mastra]); // Only depends on mastra instance

// Use refs to avoid stale closures
const subscriptionsRef = useRef<Map<string, MastraEventSubscription>>(new Map());
```

**Rationale**:
- Removes ESLint violations
- Prevents stale closures and memory leaks
- Simplifies lifecycle management

#### 5. Update Tests for Context Provider Pattern
**File**: `packages/react-mastra/src/useMastraEvents.test.ts`
**Changes**: Wrap all tests with MastraEventsProvider

```typescript
import { Mastra } from "@mastra/core";

describe("useMastraEvents", () => {
  let mockMastra: Mastra;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMastra = {
      events: {
        subscribe: vi.fn(),
        publish: vi.fn(),
        getEventHistory: vi.fn(),
      },
    } as any;
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MastraEventsProvider mastra={mockMastra}>
      {children}
    </MastraEventsProvider>
  );

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useMastraEvents(), { wrapper });
    expect(result.current.subscriptions).toEqual([]);
    // ... rest of test
  });
});
```

**Rationale**:
- Tests now use proper Context Provider pattern
- Mocks the real Mastra SDK instead of inline mock
- Tests real integration patterns

### Success Criteria

#### Automated Verification:
- [ ] All 19 useMastraEvents tests pass: `pnpm test useMastraEvents.test.ts`
- [ ] No ESLint errors: `pnpm lint`
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Context Provider exports correctly
- [ ] Derived hooks work with shared state

#### Manual Verification:
- [ ] Multiple hooks can share same event state
- [ ] No "Cannot read properties of null" errors
- [ ] Event subscriptions work correctly
- [ ] Cleanup happens on unmount
- [ ] No memory leaks with multiple hook instances

---

## Phase 2: Fix useMastraRuntime - Main Integration Point

### Overview
Fix the main runtime hook that integrates all feature hooks. This is CRITICAL as it's the primary API consumers use. Remove mocks and ensure proper integration with all other hooks.

### Changes Required

#### 1. Update Runtime to Use Real Mastra Agent
**File**: `packages/react-mastra/src/useMastraRuntime.ts`
**Changes**: Replace API endpoint calls with real Mastra Agent integration

```typescript
export const useMastraRuntime = (config: MastraRuntimeConfig) => {
  // config.mastra is now required (instead of config.api)
  const { mastra, agentId, memory: memoryConfig, ...rest } = config;

  // Get the actual agent from Mastra
  const agent = mastra.getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent "${agentId}" not found in Mastra instance`);
  }

  // Use agent.generate() instead of fetch()
  const handleNew = useCallback(async (message: any) => {
    setIsRunning(true);

    const userMessage: MastraMessage = {
      id: crypto.randomUUID(),
      type: "human",
      content: getMessageContent(message),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = accumulatorRef.current.addMessages([userMessage]);
    setMessages(updatedMessages);

    try {
      // Use real Mastra agent instead of HTTP fetch
      const stream = await agent.generate(
        [{ role: "user", content: getMessageContent(message) }],
        {
          threadId: memory?.currentThread,
          resourceId: memoryConfig?.userId,
        }
      );

      // Process streaming response
      for await (const chunk of stream) {
        // Handle different chunk types from Mastra
        processChunk(chunk);
      }
    } catch (error) {
      config.onError?.(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setIsRunning(false);
    }
  }, [agent, config, memory]);

  // ... rest of runtime
};
```

**Rationale**:
- Uses real Mastra Agent API instead of HTTP endpoints
- Properly integrates with Mastra SDK streaming
- Removes hardcoded API endpoint assumptions

#### 2. Update Runtime Config Type
**File**: `packages/react-mastra/src/types.ts`
**Changes**: Update config to require Mastra instance

```typescript
// BEFORE:
export interface MastraRuntimeConfig {
  agentId: string;
  api: string; // HTTP endpoint
  // ...
}

// AFTER:
export interface MastraRuntimeConfig {
  agentId: string;
  mastra: Mastra; // Real Mastra SDK instance
  onError?: (error: Error) => void;
  eventHandlers?: {
    onToolCall?: (toolCall: MastraToolCall) => void;
    // ...
  };
  // ... rest of config
}
```

**Rationale**:
- Breaking change: requires real Mastra instance
- Removes mock API endpoint pattern
- Enables full SDK feature access

#### 3. Integrate Context Providers in Runtime
**File**: `packages/react-mastra/src/useMastraRuntime.ts`
**Changes**: Runtime should work with Context Providers

```typescript
// Runtime extras now reference context providers
export const useMastraRuntime = (config: MastraRuntimeConfig) => {
  // These hooks must be called inside appropriate providers
  const memory = config.memory ? useMastraMemory(config.memory) : undefined;
  const events = config.events ? useMastraEvents() : undefined; // Uses context
  const tools = useMastraTools(); // Always available
  // ...

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages: filteredMessages,
    onNew: handleNew,
    // ...
    extras: {
      [symbolMastraRuntimeExtras]: {
        agentId: config.agentId,
        isStreaming: isRunning,
        memory,
        events,
        tools,
        // ...
      },
    },
  });

  return runtime;
};
```

**Rationale**:
- Runtime properly integrates with Context Provider pattern
- Maintains extras API for advanced features
- Allows optional feature enablement

#### 4. Update Tests for Real Integration
**File**: `packages/react-mastra/src/useMastraRuntime.test.tsx`
**Changes**: Test with real Mastra instance

```typescript
import { Mastra, Agent } from "@mastra/core";

describe("useMastraRuntime", () => {
  let mockMastra: Mastra;
  let mockAgent: Agent;

  beforeEach(() => {
    mockAgent = {
      generate: vi.fn().mockImplementation(async function* () {
        yield { type: "text", content: "Hello" };
        yield { type: "text", content: " world" };
      }),
    } as any;

    mockMastra = {
      getAgent: vi.fn().mockReturnValue(mockAgent),
    } as any;
  });

  it("should stream responses from agent", async () => {
    const { result } = renderHook(() =>
      useMastraRuntime({
        agentId: "test-agent",
        mastra: mockMastra,
      })
    );

    await act(async () => {
      await result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      });
    });

    await waitFor(() => {
      expect(mockAgent.generate).toHaveBeenCalled();
    });
  });
});
```

**Rationale**:
- Tests real Mastra SDK integration
- Mocks Mastra instance instead of HTTP fetch
- Tests streaming response handling

### Success Criteria

#### Automated Verification:
- [ ] All 6 useMastraRuntime tests pass: `pnpm test useMastraRuntime.test.tsx`
- [ ] Runtime works with Mastra instance
- [ ] Streaming responses process correctly
- [ ] TypeScript compiles with new types
- [ ] No HTTP fetch calls in implementation

#### Manual Verification:
- [ ] Runtime works in example application with real Mastra
- [ ] Messages stream correctly to UI
- [ ] Error handling works properly
- [ ] All extras (memory, tools, etc.) integrate correctly

---

## Phase 3: Fix useMastraObservability - Production Monitoring

### Overview
Convert observability hook from mock implementation to real Mastra observability/telemetry integration. Fix async initialization timing issues.

### Changes Required

#### 1. Remove Mock Observability API
**File**: `packages/react-mastra/src/useMastraObservability.ts`
**Lines to Remove**: 12-44 (mock API)
**Replace With**: Real Mastra observability integration

```typescript
// REMOVE mock mastraObservability object

// Use real Mastra observability API
export const useMastraObservability = (config: MastraObservabilityConfig & { mastra: Mastra }) => {
  const { mastra, serviceName, environment, exporters, sampling } = config;

  // Initialize observability with Mastra's telemetry
  const observability = useMemo(() => {
    return mastra.observability.createService({
      serviceName,
      environment,
      exporters,
      sampling,
    });
  }, [mastra, serviceName, environment]);

  const createTrace = useCallback(async (operationName: string): Promise<string> => {
    const trace = await observability.createTrace({
      operationName,
      timestamp: new Date().toISOString(),
    });
    return trace.traceId;
  }, [observability]);

  // ... rest using real API
};
```

**Rationale**:
- Uses real Mastra telemetry/observability system
- Removes console.log mocks
- Enables actual production monitoring

#### 2. Fix Async Initialization
**File**: `packages/react-mastra/src/useMastraObservability.ts`
**Changes**: Simplify initialization, remove auto-init

```typescript
// REMOVE complex auto-initialization (lines 284-288)
// Service is created immediately in useMemo, no async init needed

export const useMastraObservability = (config: ...) => {
  const [traces, setTraces] = useState<Map<string, MastraTrace>>(new Map());
  const [metrics, setMetrics] = useState<MastraMetric[]>([]);

  // Synchronous initialization via useMemo
  const observability = useMemo(() => {
    return mastra.observability.createService(config);
  }, [mastra, config.serviceName, config.environment]);

  // No useEffect for initialization needed

  return {
    traces: Array.from(traces.values()),
    metrics,
    activeTraces: Array.from(traces.values()).filter(t => !t.endTime),
    createTrace,
    addEvent,
    finishTrace,
    recordMetric,
    // ...
  };
};
```

**Rationale**:
- Removes async timing issues
- Synchronous initialization prevents test flakiness
- Simpler lifecycle management

#### 3. Update Tests
**File**: `packages/react-mastra/src/useMastraObservability.test.ts`
**Changes**: Test with real Mastra observability

```typescript
describe("useMastraObservability", () => {
  let mockMastra: Mastra;

  beforeEach(() => {
    mockMastra = {
      observability: {
        createService: vi.fn().mockReturnValue({
          createTrace: vi.fn(),
          recordMetric: vi.fn(),
          // ...
        }),
      },
    } as any;
  });

  it("should create traces", async () => {
    const { result } = renderHook(() =>
      useMastraObservability({
        mastra: mockMastra,
        serviceName: "test-service",
        environment: "development",
        exporters: [{ type: "console", config: {} }],
        sampling: { type: "all" },
      })
    );

    await act(async () => {
      const traceId = await result.current.createTrace("test-operation");
      expect(traceId).toBeDefined();
    });
  });
});
```

### Success Criteria

#### Automated Verification:
- [ ] All 19 useMastraObservability tests pass
- [ ] No async timing issues in tests
- [ ] Traces and metrics work correctly
- [ ] TypeScript compiles

#### Manual Verification:
- [ ] Traces appear in monitoring backend
- [ ] Metrics are recorded correctly
- [ ] No initialization race conditions

---

## Phase 4: Fix useMastraRAG - Document & Query Management

### Overview
Convert RAG hook from mock implementation to real Mastra RAG/vector store integration. Fix state management in sub-hooks.

### Changes Required

#### 1. Remove Mock RAG API
**File**: `packages/react-mastra/src/useMastraRAG.ts`
**Lines to Remove**: 16-61 (entire mock API)
**Replace With**: Real Mastra RAG integration

```typescript
export const useMastraRAG = (config: MastraRAGConfig & { mastra: Mastra }) => {
  const { mastra, embedder, vectorStore, chunking } = config;

  // Create RAG instance from Mastra
  const rag = useMemo(() => {
    return mastra.rag.create({
      embedder: {
        provider: embedder.provider,
        model: embedder.model,
      },
      vectorStore: {
        provider: vectorStore.provider,
        // ... config
      },
      chunking,
    });
  }, [mastra, embedder, vectorStore, chunking]);

  const ingestDocument = useCallback(async (document: MastraRAGDocument) => {
    const chunks = await rag.ingest(document);
    return chunks;
  }, [rag]);

  const query = useCallback(async (queryText: string, options?: MastraRAGQueryOptions) => {
    const results = await rag.query(queryText, options);
    return results;
  }, [rag]);

  // ... rest of implementation
};
```

**Rationale**:
- Uses real Mastra RAG system with vector stores
- Removes hardcoded mock responses
- Enables actual semantic search

#### 2. Consolidate Sub-Hooks
**File**: `packages/react-mastra/src/useMastraRAG.ts`
**Changes**: Simplify multiple hooks into one main hook

The file has multiple hooks (useMastraRAGDocuments, useMastraRAGQuery, useMastraRAGIndex, useMastraRAGSearch) that should potentially be methods on the main hook or separate hooks that use a Context Provider if they need shared state.

Review and either:
- Consolidate into single hook with methods
- Or create Context Provider if state sharing needed

#### 3. Update Tests
**File**: `packages/react-mastra/src/useMastraRAG.test.ts`
**Changes**: Test with real Mastra RAG

```typescript
describe("useMastraRAG", () => {
  let mockMastra: Mastra;

  beforeEach(() => {
    mockMastra = {
      rag: {
        create: vi.fn().mockReturnValue({
          ingest: vi.fn().mockResolvedValue([/* chunks */]),
          query: vi.fn().mockResolvedValue([/* results */]),
          delete: vi.fn().mockResolvedValue(undefined),
        }),
      },
    } as any;
  });

  it("should ingest documents", async () => {
    const { result } = renderHook(() =>
      useMastraRAG({
        mastra: mockMastra,
        embedder: { provider: "openai", model: "text-embedding-3-small" },
        vectorStore: { provider: "pinecone" },
        chunking: { strategy: "fixed", maxChunkSize: 1000 },
      })
    );

    await act(async () => {
      const chunks = await result.current.ingestDocument({
        id: "doc-1",
        content: "Test content",
        metadata: {},
      });
      expect(chunks).toBeDefined();
    });
  });
});
```

### Success Criteria

#### Automated Verification:
- [ ] All 19 useMastraRAG tests pass
- [ ] Document ingestion works
- [ ] Query returns results
- [ ] TypeScript compiles

#### Manual Verification:
- [ ] Documents are chunked correctly
- [ ] Vector search returns relevant results
- [ ] Metadata is preserved

---

## Phase 5: Fix useMastraWorkflows - State Machine Management

### Overview
Convert workflows hook from mock implementation to real Mastra workflow engine integration. Fix async state management and subscription timing.

### Changes Required

#### 1. Remove Mock Workflow API
**File**: `packages/react-mastra/src/useMastraWorkflows.ts`
**Lines to Remove**: 12-61 (mock API)
**Replace With**: Real Mastra workflow integration

```typescript
export const useMastraWorkflows = (config: MastraWorkflowConfig & { mastra: Mastra }) => {
  const { mastra, workflowId } = config;

  const workflow = useMemo(() => {
    return mastra.workflows.get(workflowId);
  }, [mastra, workflowId]);

  const startWorkflow = useCallback(async (input: any) => {
    const execution = await workflow.start(input);
    setWorkflowState({
      id: execution.id,
      status: execution.status,
      input,
      output: null,
      steps: [],
      error: null,
    });
    return execution.id;
  }, [workflow]);

  // Use real workflow subscription
  useEffect(() => {
    if (!workflowState?.id) return;

    const unsubscribe = workflow.subscribe(workflowState.id, (update) => {
      setWorkflowState(prev => ({
        ...prev,
        ...update,
      }));
    });

    return () => unsubscribe();
  }, [workflow, workflowState?.id]);

  // ... rest
};
```

**Rationale**:
- Uses real Mastra workflow engine
- Real-time state updates via subscriptions
- Removes hardcoded mock state transitions

#### 2. Fix Subscription Timing
**File**: `packages/react-mastra/src/useMastraWorkflows.ts`
**Changes**: Ensure subscription is set up before workflow starts

```typescript
// Ensure subscription is ready before starting workflow
const startWorkflow = useCallback(async (input: any) => {
  // Create execution
  const execution = await workflow.start(input);

  // Set state immediately (subscription will update it)
  setWorkflowState({
    id: execution.id,
    status: "running",
    input,
    output: null,
    steps: [],
    error: null,
  });

  return execution.id;
}, [workflow]);
```

#### 3. Update Tests
**File**: `packages/react-mastra/src/useMastraWorkflows.test.ts`
**Changes**: Test with real workflow engine

```typescript
describe("useMastraWorkflows", () => {
  let mockMastra: Mastra;
  let mockWorkflow: any;

  beforeEach(() => {
    mockWorkflow = {
      start: vi.fn().mockResolvedValue({
        id: "exec-1",
        status: "running",
      }),
      subscribe: vi.fn().mockReturnValue(() => {}),
      suspend: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    mockMastra = {
      workflows: {
        get: vi.fn().mockReturnValue(mockWorkflow),
      },
    } as any;
  });

  it("should start workflow", async () => {
    const { result } = renderHook(() =>
      useMastraWorkflows({
        mastra: mockMastra,
        workflowId: "my-workflow",
      })
    );

    await act(async () => {
      const execId = await result.current.startWorkflow({ data: "test" });
      expect(execId).toBe("exec-1");
    });

    expect(mockWorkflow.start).toHaveBeenCalled();
  });
});
```

### Success Criteria

#### Automated Verification:
- [ ] All 15 useMastraWorkflows tests pass
- [ ] Workflows start correctly
- [ ] State updates work via subscriptions
- [ ] Suspend/resume operations work

#### Manual Verification:
- [ ] Workflow executions track correctly
- [ ] Real-time updates appear in UI
- [ ] Error states are handled properly

---

## Phase 6: Fix useMastraMemory - Thread Management

### Overview
useMastraMemory already uses real API calls (HTTP fetch to `/api/memory/*`). Main work is cleanup and ensuring consistency with other hooks.

### Changes Required

#### 1. Ensure API Routes Exist
**Files**: Verify these exist and work:
- `/api/memory/query` - Search endpoint
- `/api/memory/threads` - Thread management
- `/api/memory/threads/[threadId]` - Single thread operations

If these don't exist in the example, create them to match the hook's expectations.

#### 2. Clean Up Implementation
**File**: `packages/react-mastra/src/useMastraMemory.ts`
**Changes**: Ensure consistent error handling and state management

```typescript
export const useMastraMemory = (config: MastraMemoryConfig) => {
  const { storage, userId } = config;

  const [currentThread, setCurrentThread] = useState<string | null>(
    config.threadId || null
  );
  const [threads, setThreads] = useState<Map<string, MastraThreadState>>(new Map());

  // Ensure error handling is consistent
  const searchMemory = useCallback(async (query: MastraMemoryQuery) => {
    try {
      const response = await fetch(`/api/memory/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: currentThread,
          resourceId: query.userId || userId,
          query: query.query,
        }),
      });

      if (!response.ok) {
        throw new Error(`Memory search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error("Memory search error:", error);
      throw error;
    }
  }, [currentThread, userId]);

  // ... rest
};
```

**Rationale**:
- Already uses real API - just needs consistency
- Ensure all operations have proper error handling
- Maintain state correctly across operations

#### 3. Update Tests
**File**: `packages/react-mastra/src/useMastraMemory.test.ts`
**Changes**: Ensure fetch mocks are comprehensive

Tests already mock `global.fetch` - just verify all API routes are covered.

### Success Criteria

#### Automated Verification:
- [ ] All 6 useMastraMemory tests pass
- [ ] All API routes work correctly
- [ ] Error handling is comprehensive

#### Manual Verification:
- [ ] Memory search returns results
- [ ] Threads are created correctly
- [ ] Context retrieval works

---

## Phase 7: Fix useMastraTools - Tool Execution

### Overview
useMastraTools already partially uses real implementation (calls `tool.execute()`). Remove wrapper mock and use Mastra tool system directly.

### Changes Required

#### 1. Remove executeMastraTool Wrapper
**File**: `packages/react-mastra/src/useMastraTools.ts`
**Lines to Remove**: 17-36 (executeMastraTool function)
**Replace With**: Direct tool execution

```typescript
export const useMastraTools = (config?: { mastra?: Mastra }) => {
  const [registeredTools, setRegisteredTools] = useState<Map<string, MastraToolConfig>>(
    new Map()
  );
  const [executions, setExecutions] = useState<Map<string, MastraToolExecution>>(
    new Map()
  );

  // Register tool from Mastra
  const registerTool = useCallback((tool: MastraToolConfig | { name: string }) => {
    if (config?.mastra && 'name' in tool) {
      // Get tool from Mastra registry
      const mastraTool = config.mastra.tools.get(tool.name);
      if (!mastraTool) {
        throw new Error(`Tool "${tool.name}" not found in Mastra instance`);
      }
      setRegisteredTools(prev => new Map(prev).set(tool.name, mastraTool));
    } else {
      // Direct tool registration
      setRegisteredTools(prev => new Map(prev).set(tool.name, tool as MastraToolConfig));
    }
  }, [config?.mastra]);

  const executeTool = useCallback(async (toolName: string, parameters: any) => {
    const tool = registeredTools.get(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not registered`);
    }

    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    setExecutions(prev => {
      const updated = new Map(prev);
      updated.set(executionId, {
        id: executionId,
        toolName,
        parameters,
        status: "running",
        startTime: new Date().toISOString(),
      });
      return updated;
    });

    try {
      // Execute tool directly
      const result = await tool.execute(parameters);

      const execution: MastraToolExecution = {
        id: executionId,
        toolName,
        parameters,
        status: "completed",
        result,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Date.now() - startTime,
      };

      setExecutions(prev => {
        const updated = new Map(prev);
        updated.set(executionId, execution);
        return updated;
      });

      return executionId;
    } catch (error) {
      const execution: MastraToolExecution = {
        id: executionId,
        toolName,
        parameters,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Date.now() - startTime,
      };

      setExecutions(prev => {
        const updated = new Map(prev);
        updated.set(executionId, execution);
        return updated;
      });

      throw error;
    }
  }, [registeredTools]);

  // ... rest
};
```

**Rationale**:
- Removes unnecessary wrapper function
- Direct tool execution is cleaner
- Optional Mastra integration for tool registry
- Maintains execution tracking

#### 2. Update Tests
**File**: `packages/react-mastra/src/useMastraTools.test.ts`
**Changes**: Test with real tool execution

Tests already use real `tool.execute()` - just verify they work correctly.

### Success Criteria

#### Automated Verification:
- [ ] All 7 useMastraTools tests pass
- [ ] Tools execute correctly
- [ ] Execution state tracking works

#### Manual Verification:
- [ ] Tool results appear correctly
- [ ] Errors are handled properly
- [ ] Execution history is accurate

---

## Phase 8: Fix Integration Tests

### Overview
Update integration tests to work with refactored hooks and real Mastra integration.

### Changes Required

#### 1. Update Integration Test Setup
**File**: `packages/react-mastra/tests/integration/mastra-integration.test.ts`
**Changes**: Use real Mastra instance in tests

```typescript
import { Mastra, Agent } from "@mastra/core";

describe("Mastra Integration Tests", () => {
  let mastra: Mastra;

  beforeEach(() => {
    mastra = new Mastra({
      // Configure real Mastra instance for tests
      agents: [
        {
          name: "test-agent",
          // ... config
        },
      ],
      // ... other config
    });
  });

  it("should integrate runtime with memory", async () => {
    // Test end-to-end integration
    // ...
  });
});
```

#### 2. Fix Specific Integration Test Failures
Address the 2 failing tests identified earlier:
- "handles health check errors gracefully" - line 167
- "handles memory cleanup efficiently" - line 270

#### 3. Add Provider Wrappers
**File**: Integration tests
**Changes**: Wrap tests with necessary providers

```typescript
const IntegrationWrapper = ({ children }: { children: ReactNode }) => (
  <MastraEventsProvider mastra={mastra}>
    {children}
  </MastraEventsProvider>
);

it("should work end-to-end", () => {
  const { result } = renderHook(() => useMastraRuntime({ /* ... */ }), {
    wrapper: IntegrationWrapper,
  });
  // ...
});
```

### Success Criteria

#### Automated Verification:
- [ ] All 14 integration tests pass
- [ ] End-to-end flows work correctly
- [ ] Performance tests pass
- [ ] Memory tests pass

#### Manual Verification:
- [ ] Full application flow works
- [ ] All features integrate correctly

---

## Testing Strategy

### Unit Tests Per Phase
Each phase must pass its own unit tests before moving to the next:

1. **Phase 1**: 19 useMastraEvents tests
2. **Phase 2**: 6 useMastraRuntime tests
3. **Phase 3**: 19 useMastraObservability tests
4. **Phase 4**: 19 useMastraRAG tests
5. **Phase 5**: 15 useMastraWorkflows tests
6. **Phase 6**: 6 useMastraMemory tests
7. **Phase 7**: 7 useMastraTools tests
8. **Phase 8**: 14 integration tests

### Regression Testing
After each phase, run ALL previous phase tests to ensure no regressions.

### Test Execution Commands
```bash
# Run specific hook tests
pnpm test useMastraEvents.test.ts
pnpm test useMastraRuntime.test.tsx
# etc.

# Run all unit tests
pnpm test

# Run integration tests
pnpm test:integration

# Run all tests including performance
pnpm test && pnpm test:integration && pnpm test:performance
```

### Manual Testing Checklist
After all phases complete:
- [ ] Create example app with real Mastra backend
- [ ] Test message streaming end-to-end
- [ ] Test tool execution
- [ ] Test memory/context retrieval
- [ ] Test workflow execution
- [ ] Test observability/metrics
- [ ] Test RAG document ingestion and query
- [ ] Monitor browser console for errors
- [ ] Check Network tab for API calls
- [ ] Verify no memory leaks (Chrome DevTools)

---

## Performance Considerations

### Memory Management
- Use refs for values that don't trigger re-renders
- Clean up subscriptions properly in useEffect cleanup
- Avoid unnecessary state in Context Providers
- Use useMemo for expensive computations

### State Updates
- Batch state updates where possible
- Use functional updates for state that depends on previous state
- Avoid creating new objects/arrays unnecessarily

### API Calls
- Implement request deduplication where appropriate
- Add request cancellation support
- Consider caching strategies for expensive operations

---

## Migration Notes

### Breaking Changes

**1. Context Provider Requirements**
```typescript
// BEFORE (mock-based, no provider needed):
function App() {
  const runtime = useMastraRuntime({
    agentId: "my-agent",
    api: "http://localhost:3000/api/agent/stream",
  });
  return <Thread runtime={runtime} />;
}

// AFTER (requires Mastra instance and providers):
import { Mastra } from "@mastra/core";

const mastra = new Mastra({ /* config */ });

function App() {
  return (
    <MastraEventsProvider mastra={mastra}>
      <MyRuntimeProvider mastra={mastra}>
        <Thread />
      </MyRuntimeProvider>
    </MastraEventsProvider>
  );
}

function MyRuntimeProvider({ mastra, children }) {
  const runtime = useMastraRuntime({
    agentId: "my-agent",
    mastra, // Real Mastra instance required
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

**2. Configuration Changes**
All hooks now require real Mastra instance or configuration:

```typescript
// BEFORE:
useMastraRAG({
  embedder: { provider: "openai", model: "text-embedding-3-small" },
  vectorStore: { provider: "pinecone" },
  chunking: { strategy: "fixed", maxChunkSize: 1000 },
});

// AFTER:
useMastraRAG({
  mastra, // Required
  embedder: { provider: "openai", model: "text-embedding-3-small" },
  vectorStore: { provider: "pinecone" },
  chunking: { strategy: "fixed", maxChunkSize: 1000 },
});
```

**3. API Endpoint Removal**
The `api` string endpoint is replaced with direct Mastra SDK usage:

```typescript
// BEFORE:
useMastraRuntime({
  agentId: "my-agent",
  api: "http://localhost:3000/api/agent/stream", // HTTP endpoint
});

// AFTER:
useMastraRuntime({
  agentId: "my-agent",
  mastra, // SDK instance
});
```

### Developer Impact
- Must install and configure Mastra SDK
- Must create Mastra instance in application
- Must wrap components with Context Providers
- Cannot use package without real Mastra backend
- Example code in docs will need updating

### Deployment Considerations
- Applications must have Mastra backend configured
- Environment variables for Mastra API keys needed
- Vector store, observability backends must be set up
- Memory storage (libsql) must be configured

---

## Risk Mitigation

### Technical Risks

**Risk**: Breaking changes prevent adoption
**Mitigation**:
- Provide comprehensive migration guide
- Include before/after examples
- Create migration helper utilities if needed

**Risk**: Tests fail due to Mastra SDK complexity
**Mitigation**:
- Mock Mastra SDK interfaces, not implementations
- Create test utilities for common Mastra mocking patterns
- Document test setup clearly

**Risk**: Performance regression with real SDK
**Mitigation**:
- Run performance tests after each phase
- Compare metrics before/after
- Optimize hot paths if needed

**Risk**: State management bugs in Context Providers
**Mitigation**:
- Test Context Providers thoroughly
- Verify no memory leaks
- Test with multiple hook instances

### Rollback Plan

If critical issues occur:
1. Each phase is independently committable - can rollback by phase
2. All changes are in react-mastra package - doesn't affect other packages
3. Can keep old mock-based code in a branch for reference
4. Tests guard against regressions at each step

---

## References

### Implementation Files
- `packages/react-mastra/src/useMastraEvents.ts` - Events hook
- `packages/react-mastra/src/useMastraRuntime.ts` - Main runtime
- `packages/react-mastra/src/useMastraObservability.ts` - Observability
- `packages/react-mastra/src/useMastraRAG.ts` - RAG/vector search
- `packages/react-mastra/src/useMastraWorkflows.ts` - Workflows
- `packages/react-mastra/src/useMastraMemory.ts` - Memory/threads
- `packages/react-mastra/src/useMastraTools.ts` - Tool execution
- `packages/react-mastra/src/types.ts` - Type definitions

### Test Files
- All `.test.ts` and `.test.tsx` files in `packages/react-mastra/src/`
- `packages/react-mastra/tests/integration/` - Integration tests

### Related Plans
- `notes/plans/fix_mastra_remaining_issues.md` - Fixed dependency cycle and config
- `notes/plans/mastra_final_completion_plan.md` - Original completion roadmap
- `notes/research/mastra_integration_requirements.md` - Integration specs

### Documentation
- `packages/react-mastra/README.md` - Package documentation
- `examples/with-mastra/` - Example application
- Mastra SDK documentation: https://docs.mastra.ai
