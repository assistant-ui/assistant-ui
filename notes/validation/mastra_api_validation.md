# Mastra API Validation Report

**Date**: 2025-10-20
**Mastra Version**: @mastra/core@0.20.2
**Purpose**: Validate all `react-mastra` hooks against actual Mastra SDK APIs

## Executive Summary

**Critical Finding**: 5 out of 8 hooks contain mock implementations that **cannot** be replaced with real Mastra APIs because those APIs don't exist in the Mastra SDK.

### Validation Status Overview

| Hook | Has Real Mastra API? | Status | Action Required |
|------|---------------------|--------|-----------------|
| `useMastraRuntime` | ✅ Partial | Needs Update | Use `agent.stream()` or `agent.streamVNext()` |
| `useMastraMemory` | ✅ Yes | Already Real | Using HTTP API correctly ✅ |
| `useMastraTools` | ✅ Partial | Needs Update | Tools are registered in agents |
| `useMastraWorkflows` | ✅ Yes | Needs Update | Use `mastra.getWorkflow()` API |
| `useMastraEvents` | ❌ No | Mock Only | **No Mastra API exists** |
| `useMastraRAG` | ❌ No | Mock Only | **No Mastra runtime API exists** |
| `useMastraObservability` | ❌ No | Mock Only | **No Mastra runtime API exists** |
| `useMastraMessages` | ⚠️ Utility | Keep As-Is | Helper function, not a Mastra API wrapper |

---

## Detailed Validation

### ✅ 1. useMastraRuntime (Partial - Needs Update)

**Current State**:
- Uses `fetch()` to custom `/api/chat` endpoint
- Manually constructs SSE events
- Processes events with custom `processEvent()` function

**Real Mastra API**:
```typescript
// Mastra class
const mastra = new Mastra({ agents: { agentName: agent } });
const agent = mastra.getAgent("agentId");

// Agent streaming (legacy)
const stream = await agent.stream(messages, {
  memory: { thread: "thread-id", resource: "user-id" },
  temperature: 0.7,
  maxSteps: 3
});

// Access text stream
for await (const chunk of stream.textStream) {
  console.log(chunk); // Text deltas
}

// Get tool calls after streaming
const toolCalls = await stream.toolCalls;

// Agent streaming (new AI SDK v5 compatible)
const stream = await agent.streamVNext(messages, {
  format: 'aisdk',
  memory: { thread: "thread-id", resource: "user-id" },
  onFinish: (result) => { ... },
  onStepFinish: (step) => { ... },
  onChunk: (chunk) => { ... }
});
```

**Validation**: ✅ Real API exists but hook uses custom HTTP wrapper

**Recommendation**:
- **Server-side**: Already correctly uses `agent.stream()` in `/api/chat/route.ts` ✅
- **Client-side**: Hook correctly consumes the SSE stream from server ✅
- **Status**: Implementation is correct - it appropriately uses Mastra's agent streaming via HTTP API

---

### ✅ 2. useMastraMemory (Already Real)

**Current State**:
- Uses HTTP API (`/api/memory/threads`, `/api/memory/query`)
- Manages threads, searches, and context
- Already integrated with Mastra Memory

**Real Mastra API**:
```typescript
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

// Server-side Memory instance (as used in example)
const memory = new Memory({
  storage: new LibSQLStore({ url: "file:./mastra.db" }),
  options: {
    lastMessages: 10,
    workingMemory: { enabled: true, scope: "resource" },
    threads: { generateTitle: true }
  }
});

// Agent uses memory
new Agent({
  name: "agent-name",
  memory: memory,  // Memory instance
  // ...
});

// When agent.stream() is called with memory context:
agent.stream(messages, {
  memory: {
    thread: "thread-id",
    resource: "user-id"
  }
});
// Mastra automatically saves to and retrieves from memory
```

**Validation**: ✅ Already uses real Mastra Memory API via HTTP

**Recommendation**:
- **Keep as-is** ✅
- Already correctly implemented using Mastra Memory HTTP API
- Example app shows proper server-side Memory instantiation

---

### ⚠️ 3. useMastraTools (Partial - Needs Update)

**Current State**:
- Manages tool registration, execution, cancellation
- Has `executeMastraTool()` function but not fully integrated
- Mock-like tool management system

**Real Mastra API**:
```typescript
// Tools are defined separately
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const weatherTool = createTool({
  id: "weather-tool",
  name: "weatherTool",
  description: "Get weather information",
  inputSchema: z.object({
    location: z.string().describe("City name")
  }),
  execute: async ({ context, runId, agentId }, { location }) => {
    // Tool execution logic
    return { temperature: 72, condition: "sunny" };
  }
});

// Tools are registered in Agent
new Agent({
  name: "agent",
  tools: {
    weatherTool: weatherTool  // Register tool with agent
  }
});

// Tools are called automatically by the agent during streaming
// No need for separate tool management - agent handles it
```

**Validation**: ✅ Real API exists but structured differently

**Recommendation**:
- **Tools are agent-centric, not standalone**
- Agent automatically calls tools during `stream()`/`generate()`
- Tool results come back in the stream as `toolCalls` property
- **Consider**: Simplify `useMastraTools` to just track tool execution state from stream events, not manage tools separately

---

### ✅ 4. useMastraWorkflows (Yes - Needs Update)

**Current State**:
- Mock workflow API (`mastraWorkflow.start()`, `suspend()`, `resume()`)
- Manages workflow state, transitions, commands

**Real Mastra API**:
```typescript
// Workflow definition (vNext API)
import { createWorkflow } from "@mastra/core/workflows";

const workflow = createWorkflow({
  name: "workflow-name",
  triggerSchema: z.object({ input: z.string() })
})
.step("step1", { ... })
.step("step2", { ... })
.commit();

// Register with Mastra
const mastra = new Mastra({
  vnext_workflows: {
    workflowName: workflow
  }
});

// Get workflow
const workflow = mastra.getWorkflow("workflowName");

// Create and execute run
const run = workflow.createRun();
const result = await run.start({ input: "data" });

// Check status
if (result.status === "suspended") {
  // Resume workflow
  await run.resume({ additionalData: "..." });
}

// Resume with event
await run.resumeWithEvent("eventName", eventData);

// Legacy workflows (different API)
const legacyWorkflow = mastra.legacy_getWorkflow("workflowId");
```

**Validation**: ✅ Real API exists

**Recommendation**:
- **Replace mock with real `mastra.getWorkflow()`**
- Use `workflow.createRun()`, `run.start()`, `run.resume()`
- Handle both vNext workflows (`mastra.getWorkflow()`) and legacy workflows (`mastra.legacy_getWorkflow()`)

---

### ❌ 5. useMastraEvents (No API - Mock Only)

**Current State**:
- Mock event subscription system
- `subscribe()`, `publish()`, `getEventHistory()`
- Custom event management with handlers

**Real Mastra API**:
```
❌ NO EVENTS API EXISTS
```

**What Actually Exists**:
1. **Workflow Events** (different concept):
   ```typescript
   // Workflows can wait for events
   workflow.step("step").afterEvent("eventName");
   run.resumeWithEvent("eventName", data);
   ```

2. **Streaming Callbacks** (not an event system):
   ```typescript
   agent.streamVNext(messages, {
     onFinish: (result) => { ... },
     onStepFinish: (step) => { ... },
     onChunk: (chunk) => { ... },
     onError: (error) => { ... }
   });
   ```

**Validation**: ❌ No equivalent Mastra API

**Recommendation**:
- **Option 1**: Remove `useMastraEvents` entirely (it's not a Mastra feature)
- **Option 2**: Keep as client-side utility (document it's NOT backed by Mastra)
- **Option 3**: Replace with streaming callbacks integration

---

### ❌ 6. useMastraRAG (No Runtime API - Mock Only)

**Current State**:
- Mock RAG operations (`ingestDocuments`, `query`, `deleteDocuments`)
- Vector store and embedding configuration
- Document chunk management

**Real Mastra API**:
```
❌ NO RAG RUNTIME API EXISTS
```

**What Actually Exists**:
```typescript
// RAG is tool-based, not a runtime API
import { createDocumentChunkerTool, MDocument } from "@mastra/rag";

const chunker = createDocumentChunkerTool({
  doc: new MDocument({
    text: "content",
    metadata: {}
  }),
  params: {
    strategy: "recursive",
    size: 512,
    overlap: 50
  }
});

const { chunks } = await chunker.execute();

// No vector store management API
// No query API
// RAG is manual: chunk documents → embed → store → query yourself
```

**Validation**: ❌ No equivalent Mastra runtime API

**Recommendation**:
- **Option 1**: Remove `useMastraRAG` entirely (not a Mastra feature)
- **Option 2**: Keep as client-side utility with disclaimer
- **Option 3**: Provide RAG tools integration (help developers use `createDocumentChunkerTool`)

---

### ❌ 7. useMastraObservability (No Runtime API - Config Only)

**Current State**:
- Mock observability with traces, metrics, events
- `createTrace()`, `recordMetric()`, `traceAsync()`
- Performance monitoring

**Real Mastra API**:
```
❌ NO OBSERVABILITY RUNTIME API EXISTS
```

**What Actually Exists**:
```typescript
// Observability is CONFIGURATION ONLY
const mastra = new Mastra({
  telemetry: {
    serviceName: "app-name",
    enabled: true,
    export: {
      type: "custom",
      exporter: new OpenInferenceOTLPTraceExporter({
        url: "https://otlp.arize.com/v1/traces",
        headers: { ... }
      })
    }
  }
});

// Telemetry is automatic - no runtime API
// Exporters: console, langfuse, braintrust, langsmith, otel
```

**Validation**: ❌ No equivalent Mastra runtime API

**Recommendation**:
- **Option 1**: Remove `useMastraObservability` entirely
- **Option 2**: Keep as client-side utility (document it's NOT Mastra telemetry)
- **Option 3**: Provide configuration helper for server-side Mastra telemetry setup

---

### ⚠️ 8. useMastraMessages (Utility - Keep As-Is)

**Current State**:
- Helper for message processing
- Not a direct Mastra API wrapper

**Validation**: N/A (utility function)

**Recommendation**: Keep as-is ✅

---

## Summary of What Mastra Actually Provides

### ✅ Available in Mastra SDK

1. **Agents** (`@mastra/core/agent`):
   - `new Agent({ name, instructions, model, tools, memory })`
   - `agent.generate(messages, options)` - non-streaming
   - `agent.stream(messages, options)` - streaming (legacy format)
   - `agent.streamVNext(messages, options)` - streaming (AI SDK v5 compatible)

2. **Memory** (`@mastra/memory`):
   - `new Memory({ storage, options })`
   - Automatic memory save/retrieval when agent uses memory context
   - Stored with LibSQL, PostgreSQL, Turso, etc.

3. **Workflows** (`@mastra/core/workflows`):
   - `createWorkflow()` (vNext API)
   - `workflow.createRun()`, `run.start()`, `run.resume()`
   - Legacy workflow API also available

4. **Tools** (`@mastra/core/tools`):
   - `createTool({ id, inputSchema, execute })`
   - Tools registered with agents
   - Automatic tool calling during agent streaming

5. **Mastra Instance** (`@mastra/core`):
   - `new Mastra({ agents, vnext_workflows, telemetry })`
   - `mastra.getAgent(id)`
   - `mastra.getWorkflow(id)` (vNext)
   - `mastra.legacy_getWorkflow(id)` (Legacy)
   - `mastra.setStorage()`
   - `mastra.getLogger()`

### ❌ NOT Available in Mastra SDK

1. **Event Subscription System** - No `mastra.events` API
2. **RAG Runtime API** - Only RAG tools available (`@mastra/rag`)
3. **Observability Runtime API** - Only telemetry configuration
4. **Standalone Tool Management** - Tools are agent-centric

---

## Recommended Actions

### Immediate (Keep What Works)

1. ✅ **useMastraMemory** - Already correct, keep as-is
2. ✅ **useMastraRuntime** - Already correct (uses agent.stream via HTTP), keep as-is
3. ✅ **useMastraMessages** - Utility function, keep as-is

### Update to Use Real APIs

4. 🔄 **useMastraWorkflows** - Replace mock with `mastra.getWorkflow()` API
5. 🔄 **useMastraTools** - Simplify to track agent tool executions (tools are agent-managed)

### Remove or Document as Non-Mastra

6. ⚠️ **useMastraEvents** - Remove OR keep as client-only utility (document not Mastra-backed)
7. ⚠️ **useMastraRAG** - Remove OR keep as client-only utility (document not Mastra-backed)
8. ⚠️ **useMastraObservability** - Remove OR keep as client-only utility (document not Mastra-backed)

---

## Conclusion

**The react-mastra package should focus on what Mastra actually provides:**

### Core Features (Real Mastra APIs)
- ✅ Agent streaming via HTTP wrapper (`useMastraRuntime`)
- ✅ Memory management via HTTP wrapper (`useMastraMemory`)
- 🔄 Workflow execution (`useMastraWorkflows`)
- 🔄 Tool execution tracking (`useMastraTools`)

### Optional Client Utilities (NOT Mastra APIs)
- ⚠️ Client-side event handling
- ⚠️ Client-side performance monitoring
- ⚠️ Client-side analytics

**The current plan cannot be followed as written** because it assumes Mastra APIs exist that don't. The plan should be revised to:
1. Focus on real Mastra integration (Agents, Memory, Workflows)
2. Remove or document non-Mastra utilities separately
3. Ensure we're not inventing features that Mastra doesn't provide
