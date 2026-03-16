# Fix Mastra Memory Integration - Implementation Plan

## Overview

The current Mastra memory integration in `@assistant-ui/react-mastra` is fundamentally broken. It attempts to use Mastra Memory APIs that don't exist, misunderstands the architecture (memory should be configured at agent level, not as a React hook), and tries to instantiate server-side components in the browser. This plan fixes the integration to align with Mastra's actual Memory API and architectural patterns.

## Current State Analysis

### What's Broken

1. **Incorrect API Calls** (packages/react-mastra/src/useMastraMemory.ts):
   - Line 186: `memoryInstance.saveMessages()` - doesn't exist in Mastra Memory API
   - Line 250: `memoryInstance.getThreadById()` - exists but used incorrectly
   - Line 106-112: `memory.query()` called with wrong parameters structure
   - Missing required `resourceId` parameter throughout

2. **Architecture Mismatch**:
   - Trying to initialize Mastra Memory client-side (lines 15-85)
   - Memory is server-side only in Mastra
   - Should be configured at agent level, not in React hooks

3. **Missing Agent Integration** (examples/with-mastra/):
   - Agents don't have memory configured (mastra/agents/chefAgent.ts:10-25)
   - API route doesn't pass thread/resource IDs (app/api/chat/route.ts:6, 12)
   - No integration with agent's built-in memory system

4. **Wrong Memory Concepts**:
   - Not handling three memory types: working memory, conversation history, semantic recall
   - Semantic recall configuration is wrong (lines 71-78)
   - Thread/resource relationship not properly understood

### Key Discoveries from Research

From the web research agent, we learned:

- **Memory is Agent-Level**: Memory must be configured when creating an Agent, not as a separate service
- **Thread + Resource Required**: Both `thread` (conversation ID) and `resource` (user ID) must be provided in every `agent.generate()` or `agent.stream()` call
- **Three Memory Types Work Together**:
  - Working Memory: Persistent user data (Markdown template or Zod schema)
  - Conversation History: Recent messages (default: last 10)
  - Semantic Recall: RAG-based vector search for older messages
- **Real API Methods**:
  - `memory.query({ threadId, resourceId, selectBy })` - retrieve messages
  - `memory.createThread({ threadId, resourceId })` - create thread
  - `memory.updateThread({ id, title, metadata })` - update thread
  - Agent handles message saving automatically when you call `agent.stream(message, { memory: { thread, resource } })`

## Desired End State

After this implementation:

1. **Agent Configuration**: Agents have Memory properly configured with storage adapter
2. **API Integration**: Chat API route accepts and passes thread/resource IDs to agent
3. **React Hook**: `useMastraMemory` becomes a client-side wrapper that manages thread/resource IDs and calls API endpoints
4. **Memory Endpoints**: New API routes for thread management and memory queries
5. **Type Safety**: All types align with actual Mastra Memory API

### Verification

To verify the implementation is complete:

#### Automated Verification:

- [ ] TypeScript compilation passes: `cd packages/react-mastra && pnpm run typecheck`
- [ ] All tests pass: `cd packages/react-mastra && pnpm run test`
- [ ] Example builds successfully: `cd examples/with-mastra && pnpm run build`
- [ ] No console errors on page load

#### Manual Verification:

- [ ] Start example app: `cd examples/with-mastra && pnpm run dev`
- [ ] Send a message mentioning your name (e.g., "Hi, I'm Alice")
- [ ] In a new conversation, ask "What's my name?" - agent should remember
- [ ] Verify working memory is persisted in `examples/with-mastra/mastra.db`
- [ ] Check conversation history loads when switching threads
- [ ] Verify semantic recall works for older messages (requires multiple conversations)

## What We're NOT Doing

- Not implementing vector-based semantic recall in Phase 1 (will use basic conversation history only)
- Not adding PostgreSQL storage adapter (LibSQL only for now)
- Not implementing custom working memory templates (will use default)
- Not adding memory statistics/analytics
- Not implementing memory deletion (threads can be deleted, but individual messages cannot)
- Not modifying the core `@mastra/memory` package (only consuming its API)

## Implementation Approach

We'll follow a **server-side first, client-side wrapper** approach:

1. Configure memory at agent level (server-side)
2. Update API routes to handle memory parameters
3. Convert React hook to API client wrapper
4. Add dedicated memory API endpoints

This aligns with Mastra's architecture where agents own their memory configuration.

---

## Phase 1: Configure Agent Memory (Server-Side)

### Overview

Add proper Memory configuration to agents and ensure the Mastra instance has storage configured.

### Changes Required

#### 1. Install Memory Dependencies

**File**: `examples/with-mastra/package.json`
**Changes**: Already has dependencies, verify versions:

```json
{
  "@mastra/memory": "^0.15.6",
  "@mastra/libsql": "latest"
}
```

#### 2. Create Shared Memory Instance

**File**: `examples/with-mastra/mastra/memory.ts` (NEW FILE)
**Changes**: Create shared memory configuration

```typescript
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

// Create shared memory instance for all agents
export const memory = new Memory({
  storage: new LibSQLStore({
    url: process.env["LIBSQL_URL"] || "file:./mastra.db",
  }),
  options: {
    // Recent conversation history
    lastMessages: 10,

    // Working memory - persistent user data
    workingMemory: {
      enabled: true,
      scope: "resource", // Persist across all threads for same user
    },

    // Auto-generate thread titles
    threads: {
      generateTitle: true,
    },
  },
});
```

#### 3. Update chefAgent Configuration

**File**: `examples/with-mastra/mastra/agents/chefAgent.ts`
**Changes**: Add memory to agent

```typescript
import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { weatherTool } from "../tools/weatherTool";
import { memory } from "../memory"; // Add this import

const openai = createOpenAI({
  apiKey: process.env["OPENAI_API_KEY"] || "",
});

export const chefAgent = new Agent({
  name: "chef-agent",
  instructions: `You are Michel, a practical and experienced home chef passionate about cooking. You help people with:

1. Recipe suggestions and cooking techniques
2. Meal planning and ingredient substitutions
3. Cooking tips and troubleshooting
4. Food safety and storage advice

You are friendly, knowledgeable, and always willing to help with any cooking-related questions. When users ask about weather, use the weather tool to provide current conditions that might affect their cooking plans.`,

  model: openai("gpt-4o-mini"),
  tools: {
    weatherTool,
  },
  memory, // Add this line
});
```

#### 4. Update weatherAgent Configuration

**File**: `examples/with-mastra/mastra/agents/weatherAgent.ts`
**Changes**: Add memory to agent

```typescript
import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { weatherTool } from "../tools/weatherTool";
import { memory } from "../memory"; // Add this import

const openai = createOpenAI({
  apiKey: process.env["OPENAI_API_KEY"] || "",
});

export const weatherAgent = new Agent({
  name: "weather-agent",
  instructions: `You are a helpful weather assistant that provides accurate weather information and climate-related advice. You help people with:

1. Current weather conditions and forecasts
2. Weather alerts and safety information
3. Climate patterns and seasonal trends
4. Travel weather recommendations

Always use the weather tool to get current, accurate weather information. Provide helpful context about how the weather might impact daily activities, travel plans, or outdoor events.`,

  model: openai("gpt-4o-mini"),
  tools: {
    weatherTool,
  },
  memory, // Add this line
});
```

### Success Criteria

#### Automated Verification:

- [x] TypeScript compilation passes: `cd examples/with-mastra && pnpm run typecheck`
- [x] No import errors when building: `cd examples/with-mastra && pnpm run build`
- [x] Database file is created: `ls examples/with-mastra/mastra.db`

#### Manual Verification:

- [x] Start the app without errors: `cd examples/with-mastra && pnpm run dev`
- [x] No console errors related to memory initialization
- [x] Check that `mastra.db` file is created in `examples/with-mastra/` directory

---

## Phase 2: Update Chat API Route to Pass Memory Context

### Overview

Modify the chat API route to accept thread/resource IDs and pass them to the agent's stream method.

### Changes Required

#### 1. Update Chat API Route

**File**: `examples/with-mastra/app/api/chat/route.ts`
**Changes**: Accept and pass memory parameters

```typescript
import { mastra } from "@/mastra";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      threadId,
      resourceId = "default-user", // Default user ID if not provided
      agentId = "chefAgent",
    } = await req.json();

    // Validate required memory parameters
    if (!threadId) {
      return new Response(
        JSON.stringify({ error: "threadId is required for memory" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Get the specified agent
    const agent = mastra.getAgent(agentId);

    // Create stream with agent, passing memory context
    const result = await agent.stream(messages, {
      memory: {
        thread: threadId,
        resource: resourceId,
      },
    });

    // Convert Mastra's data stream format to the format expected by useMastraRuntime
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = result.toDataStream().getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Send completion signal
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              break;
            }

            // Parse Mastra's data stream format (e.g., "0:{"type":"text","content":"hello"}\n")
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.trim() === "") continue;

              // Mastra uses format like "0:{json}"
              if (line.startsWith("0:")) {
                const data = line.slice(2);
                try {
                  const parsed = JSON.parse(data);

                  // Convert to event format expected by useMastraRuntime
                  const event = {
                    event: "message.partial",
                    data: {
                      role: "assistant",
                      content: parsed,
                    },
                  };

                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                  );
                } catch (e) {
                  console.error("Failed to parse Mastra chunk:", e);
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          const errorEvent = {
            event: "error",
            data: error instanceof Error ? error.message : "Unknown error",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### Success Criteria

#### Automated Verification:

- [ ] TypeScript compilation passes: `cd examples/with-mastra && pnpm run typecheck`
- [ ] API builds without errors: `cd examples/with-mastra && pnpm run build`

#### Manual Verification:

- [ ] API returns 400 error when threadId is missing
- [ ] API accepts threadId and resourceId in request body
- [ ] Memory context is passed to agent.stream() correctly
- [ ] Test with curl: `curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":"test","threadId":"test-123","resourceId":"user-456"}'`

---

## Phase 3: Create Memory API Endpoints

### Overview

Create dedicated API endpoints for thread management and memory queries that the React hook can call.

### Changes Required

#### 1. Create Memory API - List Threads

**File**: `examples/with-mastra/app/api/memory/threads/route.ts` (NEW FILE)
**Changes**: Create endpoint to list threads for a resource

```typescript
import { memory } from "@/mastra/memory";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const resourceId = searchParams.get("resourceId");

    if (!resourceId) {
      return new Response(JSON.stringify({ error: "resourceId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const threads = await memory.getThreadsByResourceId({ resourceId });

    return new Response(JSON.stringify({ threads }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List threads error:", error);
    return new Response(JSON.stringify({ error: "Failed to list threads" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

#### 2. Create Memory API - Get Thread

**File**: `examples/with-mastra/app/api/memory/threads/[threadId]/route.ts` (NEW FILE)
**Changes**: Create endpoint to get specific thread

```typescript
import { memory } from "@/mastra/memory";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;

    if (!threadId) {
      return new Response(JSON.stringify({ error: "threadId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const thread = await memory.getThreadById({ threadId });

    if (!thread) {
      return new Response(JSON.stringify({ error: "Thread not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get messages for the thread
    const { uiMessages } = await memory.query({
      threadId: thread.id,
    });

    return new Response(
      JSON.stringify({
        thread: {
          ...thread,
          messages: uiMessages,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Get thread error:", error);
    return new Response(JSON.stringify({ error: "Failed to get thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

#### 3. Create Memory API - Create Thread

**File**: `examples/with-mastra/app/api/memory/threads/route.ts` (MODIFY EXISTING)
**Changes**: Add POST handler to create thread

```typescript
import { memory } from "@/mastra/memory";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  // ... existing GET handler from step 1 ...
}

export async function POST(req: NextRequest) {
  try {
    const { threadId, resourceId, title, metadata } = await req.json();

    if (!resourceId) {
      return new Response(JSON.stringify({ error: "resourceId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const thread = await memory.createThread({
      ...(threadId && { threadId }),
      resourceId,
      ...(title && { title }),
      ...(metadata && { metadata }),
    });

    return new Response(JSON.stringify({ thread }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create thread error:", error);
    return new Response(JSON.stringify({ error: "Failed to create thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

#### 4. Create Memory API - Update Thread

**File**: `examples/with-mastra/app/api/memory/threads/[threadId]/route.ts` (MODIFY EXISTING)
**Changes**: Add PATCH handler to update thread

```typescript
import { memory } from "@/mastra/memory";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  // ... existing GET handler from step 2 ...
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const { title, metadata } = await req.json();

    if (!threadId) {
      return new Response(JSON.stringify({ error: "threadId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await memory.updateThread({
      id: threadId,
      ...(title && { title }),
      ...(metadata && { metadata }),
    });

    const updatedThread = await memory.getThreadById({ threadId });

    return new Response(JSON.stringify({ thread: updatedThread }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Update thread error:", error);
    return new Response(JSON.stringify({ error: "Failed to update thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

#### 5. Create Memory API - Query/Search Memory

**File**: `examples/with-mastra/app/api/memory/query/route.ts` (NEW FILE)
**Changes**: Create endpoint for memory queries

```typescript
import { memory } from "@/mastra/memory";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { threadId, resourceId, query: searchQuery } = await req.json();

    if (!threadId) {
      return new Response(JSON.stringify({ error: "threadId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const queryOptions: any = {
      threadId,
      ...(resourceId && { resourceId }),
    };

    // If search query is provided, use semantic search
    if (searchQuery) {
      queryOptions.selectBy = {
        vectorSearchString: searchQuery,
      };
    }

    const { uiMessages } = await memory.query(queryOptions);

    // Transform to MastraMemoryResult format expected by the hook
    const results = uiMessages.map((msg: any) => ({
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
      metadata: msg.metadata || {},
      similarity: msg.similarity || 0,
      threadId: msg.threadId || threadId,
      timestamp: msg.createdAt?.toISOString() || new Date().toISOString(),
    }));

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Memory query error:", error);
    return new Response(JSON.stringify({ error: "Failed to query memory" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### Success Criteria

#### Automated Verification:

- [ ] TypeScript compilation passes: `cd examples/with-mastra && pnpm run typecheck`
- [ ] API builds without errors: `cd examples/with-mastra && pnpm run build`
- [ ] All endpoints are accessible (no 404s)

#### Manual Verification:

- [ ] Test GET /api/memory/threads?resourceId=user-123 - returns thread list
- [ ] Test POST /api/memory/threads - creates new thread
- [ ] Test GET /api/memory/threads/[id] - returns thread with messages
- [ ] Test PATCH /api/memory/threads/[id] - updates thread metadata
- [ ] Test POST /api/memory/query - returns memory results

---

## Phase 4: Rewrite useMastraMemory as API Client Wrapper

### Overview

Convert `useMastraMemory` from trying to instantiate Mastra Memory client-side to being a clean API client wrapper.

### Changes Required

#### 1. Rewrite useMastraMemory Hook

**File**: `packages/react-mastra/src/useMastraMemory.ts`
**Changes**: Complete rewrite to be API client

```typescript
"use client";

import { useState, useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  MastraMemoryConfig,
  MastraMemoryQuery,
  MastraMemoryResult,
  MastraThreadState,
  MastraMessage,
} from "./types";

export const useMastraMemory = (config: MastraMemoryConfig) => {
  const [threads, setThreads] = useState<Map<string, MastraThreadState>>(
    new Map(),
  );
  const [currentThread, setCurrentThread] = useState<string | null>(
    config.threadId || null,
  );
  const [isSearching, setIsSearching] = useState(false);

  // API base URL - can be configured
  const apiBase = useMemo(() => "/api/memory", []);
  const resourceId = useMemo(
    () => config.userId || "default-user",
    [config.userId],
  );

  // Search memory using the query API
  const searchMemory = useCallback(
    async (query: MastraMemoryQuery): Promise<MastraMemoryResult[]> => {
      setIsSearching(true);
      try {
        const threadId = query.threadId || currentThread;
        if (!threadId) {
          console.warn("No threadId available for memory search");
          return [];
        }

        const response = await fetch(`${apiBase}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId,
            resourceId: query.userId || resourceId,
            query: query.query,
          }),
        });

        if (!response.ok) {
          throw new Error(`Memory search failed: ${response.status}`);
        }

        const { results } = await response.json();
        return results;
      } catch (error) {
        console.error("Memory search failed:", error);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [apiBase, currentThread, resourceId],
  );

  // Note: saveToMemory is no longer needed - the agent handles this automatically
  // when you call agent.stream() with memory context
  const saveToMemory = useCallback(
    async (_threadId: string, _messages: MastraMessage[]) => {
      // This is a no-op now - messages are saved automatically by the agent
      console.warn(
        "saveToMemory is deprecated - messages are saved automatically by the agent",
      );
    },
    [],
  );

  // Get thread context from API
  const getThreadContext = useCallback(
    async (threadId: string): Promise<MastraThreadState> => {
      try {
        const response = await fetch(`${apiBase}/threads/${threadId}`);

        if (!response.ok) {
          if (response.status === 404) {
            // Thread doesn't exist yet, return empty state
            const newThread: MastraThreadState = {
              id: threadId,
              messages: [],
              interrupts: [],
              metadata: {},
              memory: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setThreads((prev) => new Map(prev).set(threadId, newThread));
            return newThread;
          }
          throw new Error(`Failed to get thread: ${response.status}`);
        }

        const { thread } = await response.json();

        // Transform messages to our format
        const threadState: MastraThreadState = {
          id: thread.id,
          messages: (thread.messages || []).map((msg: any) => {
            let type: "system" | "human" | "assistant" | "tool" = "human";
            if (msg.role === "user") type = "human";
            else if (msg.role === "assistant") type = "assistant";
            else if (msg.role === "system") type = "system";
            else if (msg.role === "tool") type = "tool";

            return {
              id: msg.id,
              type,
              content:
                typeof msg.content === "string"
                  ? msg.content
                  : JSON.stringify(msg.content),
              timestamp: msg.createdAt
                ? new Date(msg.createdAt).toISOString()
                : new Date().toISOString(),
              metadata: msg.metadata,
            };
          }),
          interrupts: [],
          metadata: thread.metadata || {},
          memory: [],
          createdAt: new Date(thread.createdAt).toISOString(),
          updatedAt: new Date(thread.updatedAt).toISOString(),
        };

        // Update local cache
        setThreads((prev) => new Map(prev).set(threadId, threadState));

        return threadState;
      } catch (error) {
        console.error("Failed to get thread context:", error);
        throw error;
      }
    },
    [apiBase],
  );

  // Create new thread via API
  const createThread = useCallback(
    async (metadata?: Record<string, any>): Promise<string> => {
      const threadId = uuidv4();

      try {
        const response = await fetch(`${apiBase}/threads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId,
            resourceId,
            metadata,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create thread: ${response.status}`);
        }

        const { thread } = await response.json();

        const threadState: MastraThreadState = {
          id: thread.id,
          messages: [],
          interrupts: [],
          metadata: thread.metadata || {},
          memory: [],
          createdAt: new Date(thread.createdAt).toISOString(),
          updatedAt: new Date(thread.updatedAt).toISOString(),
        };

        setThreads((prev) => new Map(prev).set(threadId, threadState));
        setCurrentThread(threadId);

        return threadId;
      } catch (error) {
        console.error("Failed to create thread:", error);
        throw error;
      }
    },
    [apiBase, resourceId],
  );

  // Delete thread - Note: Mastra doesn't have a delete thread API yet
  const deleteThread = useCallback(
    async (threadId: string): Promise<void> => {
      // Remove from local state
      setThreads((prev) => {
        const updated = new Map(prev);
        updated.delete(threadId);
        return updated;
      });

      if (currentThread === threadId) {
        setCurrentThread(null);
      }

      // TODO: Add API call when Mastra adds delete thread support
      console.warn("Thread deletion is not yet supported by Mastra Memory API");
    },
    [currentThread],
  );

  // Update thread metadata via API
  const updateThreadMetadata = useCallback(
    async (threadId: string, metadata: Record<string, any>): Promise<void> => {
      try {
        const response = await fetch(`${apiBase}/threads/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update thread: ${response.status}`);
        }

        const { thread } = await response.json();

        // Update local state
        setThreads((prev) => {
          const updated = new Map(prev);
          const existingThread = updated.get(threadId);
          if (existingThread) {
            updated.set(threadId, {
              ...existingThread,
              metadata: thread.metadata,
              updatedAt: new Date(thread.updatedAt).toISOString(),
            });
          }
          return updated;
        });
      } catch (error) {
        console.error("Failed to update thread metadata:", error);
        throw error;
      }
    },
    [apiBase],
  );

  return {
    threads,
    currentThread,
    isSearching,
    searchMemory,
    saveToMemory, // Deprecated but kept for compatibility
    getThreadContext,
    createThread,
    deleteThread,
    updateThreadMetadata,
    setCurrentThread,
  };
};
```

### Success Criteria

#### Automated Verification:

- [ ] TypeScript compilation passes: `cd packages/react-mastra && pnpm run typecheck`
- [ ] Unit tests pass: `cd packages/react-mastra && pnpm run test`
- [ ] Package builds successfully: `cd packages/react-mastra && pnpm run build`

#### Manual Verification:

- [ ] Hook no longer tries to instantiate Mastra Memory client-side
- [ ] All methods call appropriate API endpoints
- [ ] Local state is updated correctly after API calls
- [ ] Thread switching works correctly
- [ ] No console warnings about missing dependencies

---

## Phase 5: Update useMastraRuntime to Pass Memory Context

### Overview

Update the runtime to properly pass threadId and resourceId to the chat API.

### Changes Required

#### 1. Update useMastraRuntime Hook

**File**: `packages/react-mastra/src/useMastraRuntime.ts`
**Changes**: Pass memory context to API

```typescript
// In the handleNew function, around line 154:

const handleNew = useCallback(
  async (message: any) => {
    setIsRunning(true);

    // Initialize accumulator for this conversation
    accumulatorRef.current = new MastraMessageAccumulator<MastraMessage>({
      initialMessages: messages,
      appendMessage: appendMastraChunk,
      onMessageUpdate: (msg) => {
        // Handle tool call updates
        const toolCalls = extractMastraToolCalls(msg);
        toolCalls.forEach((toolCall) => {
          config.eventHandlers?.onToolCall?.(toolCall);
        });
      },
    });

    try {
      // Get memory context if available
      const memoryContext = config.memory
        ? {
            threadId: memory?.currentThread || undefined,
            resourceId: config.memory.userId || "default-user",
          }
        : undefined;

      const response = await fetch(config.api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: getMessageContent(message) }],
          agentId: config.agentId,
          // Add memory context to request
          ...(memoryContext && memoryContext),
        }),
      });

      // ... rest of the function remains the same
    } catch (error) {
      // ... error handling
    }
  },
  [config, messages, processEvent, memory], // Add memory to dependencies
);
```

### Success Criteria

#### Automated Verification:

- [ ] TypeScript compilation passes: `cd packages/react-mastra && pnpm run typecheck`
- [ ] Package builds successfully: `cd packages/react-mastra && pnpm run build`

#### Manual Verification:

- [ ] Runtime passes threadId and resourceId to chat API
- [ ] Memory context is included in API requests when config.memory is provided
- [ ] Chat continues to work when memory is not configured

---

## Phase 6: Update Example App to Use Memory

### Overview

Update the example application to properly use the memory system.

### Changes Required

#### 1. Update MyRuntimeProvider

**File**: `examples/with-mastra/app/MyRuntimeProvider.tsx`
**Changes**: Add memory configuration

```typescript
"use client";

import { useMastraRuntime } from "@assistant-ui/react-mastra";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { type ReactNode } from "react";

export function MyRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const runtime = useMastraRuntime({
    agentId: "chefAgent",
    api: "/api/chat",
    memory: {
      storage: "libsql",
      userId: "default-user", // In real app, get from auth
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

### Success Criteria

#### Automated Verification:

- [ ] TypeScript compilation passes: `cd examples/with-mastra && pnpm run typecheck`
- [ ] Example builds successfully: `cd examples/with-mastra && pnpm run build`

#### Manual Verification:

- [ ] App starts without errors: `cd examples/with-mastra && pnpm run dev`
- [ ] Open app in browser at http://localhost:3000
- [ ] Send message mentioning your name: "Hi, I'm Alice"
- [ ] Check database: `sqlite3 examples/with-mastra/mastra.db "SELECT * FROM threads;"`
- [ ] Send another message asking about your name: "What's my name?"
- [ ] Agent should remember and respond with your name

---

## Phase 7: Update Tests

### Overview

Update the existing tests to match the new API-based architecture.

### Changes Required

#### 1. Update useMastraMemory Tests

**File**: `packages/react-mastra/src/useMastraMemory.test.ts`
**Changes**: Mock fetch calls instead of Mastra Memory

```typescript
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMastraMemory } from "./useMastraMemory";
import { MastraMemoryConfig, MastraMessage } from "./types";

// Mock fetch globally
global.fetch = vi.fn();

// Mock the uuid module
vi.mock("uuid", () => ({
  v4: () => "test-thread-id",
}));

describe("useMastraMemory", () => {
  const mockMemoryConfig: MastraMemoryConfig = {
    storage: "libsql",
    threadId: "test-thread",
    userId: "test-user",
    maxResults: 10,
    similarityThreshold: 0.8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    expect(result.current.threads.size).toBe(0);
    expect(result.current.currentThread).toBe("test-thread");
    expect(result.current.isSearching).toBe(false);
  });

  it("should search memory via API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            content: "Previous conversation about cooking",
            metadata: { source: "memory" },
            similarity: 0.9,
            threadId: "test-thread",
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const searchResults = await act(async () => {
      return await result.current.searchMemory({
        query: "cooking preferences",
        threadId: "test-thread",
      });
    });

    expect(searchResults).toHaveLength(1);
    expect(searchResults[0]?.similarity).toBe(0.9);
    expect(searchResults[0]?.content).toContain("cooking");
    expect(result.current.isSearching).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/query",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("cooking preferences"),
      }),
    );
  });

  it("should create new thread via API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        thread: {
          id: "test-thread-id",
          resourceId: "test-user",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: { source: "test" },
        },
      }),
    });

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const threadId = await act(async () => {
      return await result.current.createThread({ source: "test" });
    });

    expect(threadId).toBe("test-thread-id");
    expect(result.current.currentThread).toBe("test-thread-id");
    expect(result.current.threads.has("test-thread-id")).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/threads",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("should get thread context via API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        thread: {
          id: "test-thread",
          resourceId: "test-user",
          messages: [],
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const threadState = await act(async () => {
      return await result.current.getThreadContext("test-thread");
    });

    expect(threadState.id).toBe("test-thread");
    expect(threadState.messages).toEqual([]);
    expect(result.current.threads.has("test-thread")).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/threads/test-thread",
    );
  });

  it("should update thread metadata via API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        thread: {
          id: "test-thread",
          metadata: { category: "test", priority: "high" },
          updatedAt: new Date().toISOString(),
        },
      }),
    });

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    // First add the thread to local state
    act(() => {
      result.current.setCurrentThread("test-thread");
    });

    await act(async () => {
      await result.current.updateThreadMetadata("test-thread", {
        category: "test",
        priority: "high",
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/memory/threads/test-thread",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
  });

  it("should handle API errors gracefully", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useMastraMemory(mockMemoryConfig));

    const searchResults = await act(async () => {
      return await result.current.searchMemory({
        query: "test query",
      });
    });

    expect(searchResults).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });
});
```

### Success Criteria

#### Automated Verification:

- [ ] All tests pass: `cd packages/react-mastra && pnpm run test`
- [ ] Test coverage is maintained or improved
- [ ] No console warnings during test execution

#### Manual Verification:

- [ ] Run tests in watch mode: `cd packages/react-mastra && pnpm run test:watch`
- [ ] All test cases pass
- [ ] No flaky tests

---

## Testing Strategy

### Unit Tests

- Mock fetch calls in `useMastraMemory` tests
- Test error handling for failed API calls
- Test state management (threads map, currentThread)
- Test all CRUD operations: create, read, update, delete threads

### Integration Tests

- Test full flow: create thread → send message → retrieve thread
- Test memory persistence across page reloads
- Test multiple threads for same user
- Test working memory updates

### Manual Testing Steps

1. **Basic Memory Flow**:
   - Start app: `cd examples/with-mastra && pnpm run dev`
   - Send message: "Hi, I'm Alice and I love Italian food"
   - Verify message is saved to database
   - Reload page and verify conversation loads
   - Send new message: "What do you know about me?"
   - Verify agent remembers your name and preference

2. **Thread Management**:
   - Create new conversation
   - Switch between threads
   - Verify each thread maintains separate context
   - Check database to verify threads are stored correctly

3. **Working Memory**:
   - In conversation 1, tell agent your name
   - Create new conversation (new thread)
   - Ask "What's my name?" in new thread
   - Verify agent remembers (resource-scoped memory)

4. **Error Handling**:
   - Stop the server mid-conversation
   - Verify UI shows error gracefully
   - Restart server and verify recovery

5. **Database Verification**:
   ```bash
   sqlite3 examples/with-mastra/mastra.db
   .tables
   SELECT * FROM threads;
   SELECT * FROM messages LIMIT 10;
   .quit
   ```

## Performance Considerations

- **Database Connection**: LibSQL file-based storage is suitable for development but consider PostgreSQL for production
- **Memory Queries**: Keep `lastMessages` config reasonable (default 10)
- **Thread Loading**: Only load messages when thread is accessed, not all threads upfront
- **API Caching**: Consider adding cache headers to thread list/get endpoints

## Migration Notes

### Breaking Changes

1. **useMastraMemory API**:
   - `saveToMemory()` is now deprecated (automatic via agent)
   - Requires API endpoints to be set up
   - All operations are now async API calls

2. **Configuration Required**:
   - Must configure memory at agent level
   - Must pass threadId and resourceId to chat API
   - Must set up memory API endpoints

### Migration Path

For existing users:

1. Add memory configuration to agents (Phase 1)
2. Set up memory API endpoints (Phase 3)
3. Update chat API to accept memory params (Phase 2)
4. Update useMastraRuntime to pass memory context (Phase 5)
5. Remove any direct calls to `saveToMemory()` (Phase 4)

## References

- Web research on Mastra Memory API: [See research results above]
- Mastra Memory Documentation: https://mastra.ai/docs/memory/overview
- Mastra Memory API Reference: https://mastra.ai/reference/memory/Memory
- Current Implementation: `packages/react-mastra/src/useMastraMemory.ts:1-447`
- Example Agent Config: `examples/with-mastra/mastra/agents/chefAgent.ts:10-25`
- Chat API Route: `examples/with-mastra/app/api/chat/route.ts:1-90`
