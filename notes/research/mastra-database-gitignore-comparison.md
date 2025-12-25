---
date: 2025-10-21T00:00:00Z
researcher: Claude
git_commit: bec7d8e1df3c3c43406a0f5c7752cfe5a84970eb
branch: aui-25-dedicated-mastra-implementation
repository: assistant-ui/assistant-ui
topic: "Why are database files added to gitignore for Mastra only? How do other implementations handle storage?"
tags: [research, codebase, mastra, storage, database, sqlite, libsql, comparison]
status: complete
last_updated: 2025-10-21
last_updated_by: Claude
---

# Research: Mastra Database Files in Gitignore vs Other Implementations

**Date**: 2025-10-21T00:00:00Z
**Researcher**: Claude
**Git Commit**: bec7d8e1df3c3c43406a0f5c7752cfe5a84970eb
**Branch**: aui-25-dedicated-mastra-implementation
**Repository**: assistant-ui/assistant-ui

## Research Question

Why are database files (`.db`, `.db-shm`, `.db-wal`) added to gitignore specifically for Mastra and Mastra only? How do other implementations and examples handle storage? What sets Mastra apart that we need to do that?

## Summary

**Mastra is the ONLY example that uses local database files** because it's designed for stateful AI agents with persistent memory. All other examples in the repository either:
1. Use no persistence (stateless)
2. Store state in React state only (lost on refresh)
3. Delegate persistence to external services (LangGraph Cloud, Assistant Cloud)

The `.gitignore` entry for Mastra database files (lines 64-67) is necessary because:
- Mastra's default storage provider is **LibSQL** (a SQLite fork)
- LibSQL automatically creates `.db`, `.db-shm`, and `.db-wal` files when initialized
- These files contain user-specific conversation data and should not be committed to version control
- No other example generates local database files

## Detailed Findings

### The Gitignore Configuration

**Location**: `.gitignore:64-67`

```gitignore
# Mastra database files
*.db
*.db-shm
*.db-wal
```

**Why These Files?**
- `.db` - SQLite database file (main storage)
- `.db-shm` - Shared memory file (for multi-process access)
- `.db-wal` - Write-ahead log file (for transaction durability)

These are standard SQLite files created by LibSQL storage provider.

### Mastra's Storage Architecture

#### What Makes Mastra Different

Mastra is fundamentally designed for **stateful agents with persistent memory**, which requires database storage for:

1. **Memory System** (`examples/with-mastra/mastra/memory.ts:5-24`)
   ```typescript
   export const memory = new Memory({
     storage: new LibSQLStore({
       url: process.env["LIBSQL_URL"] || "file:./mastra.db",
     }),
     options: {
       lastMessages: 10,
       workingMemory: {
         enabled: true,
         scope: "resource", // Persist across all threads for same user
       },
       threads: {
         generateTitle: true,
       },
     },
   });
   ```

2. **Workflow State** (`examples/with-mastra/mastra/index.ts:7-18`)
   ```typescript
   export const mastra = new Mastra({
     agents: { screeningAgent, interviewAgent },
     workflows: { hiringWorkflow },
     storage: new LibSQLStore({
       url: process.env["LIBSQL_URL"] || "file:./mastra.db",
     }),
   });
   ```

#### What Gets Stored in the Database

From Mastra documentation and code analysis:

1. **Conversation Threads**
   - Thread ID, resource ID (user identifier), title, metadata
   - API: `examples/with-mastra/app/api/memory/threads/route.ts`

2. **Message History**
   - Full conversation history with roles, content, timestamps
   - Supports semantic search via embeddings

3. **Working Memory**
   - Persistent user-specific data across all conversations
   - Similar to ChatGPT's memory feature

4. **Workflow State**
   - Suspended workflow states for human-in-the-loop patterns
   - Example: `mastra/workflows/hiringWorkflow.ts:78-79`

5. **Traces and Evals**
   - OpenTelemetry traces from agents
   - Evaluation datasets and scores

#### Why LibSQL/SQLite?

From [Mastra official documentation](https://mastra.ai/docs/server-db/storage):

- **Development convenience**: No external dependencies, works out of the box
- **Local development**: Runs fully self-contained without containers
- **Production flexibility**: Can switch to PostgreSQL or Upstash for production
- **Default choice**: Built-in by default in Mastra framework

**Important Note**: Database storage is **optional** in Mastra. Agents can run without it:
- Without storage: Ephemeral (no persistence between restarts)
- With `:memory:` URL: In-memory storage (no files generated)
- With `file:./mastra.db`: File-based persistence (generates .db files)

### How Other Examples Handle Storage

#### Pattern 1: Stateless (No Persistence)

**Examples**: `with-ai-sdk-v5`, `with-react-hook-form`, `with-ffmpeg`

**Architecture**:
- Messages sent from client with each request
- No server-side state
- No database, no local files
- Lost on page refresh

**Code Example** (`examples/with-ai-sdk-v5/app/api/chat/route.ts`):
```typescript
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

**Storage**: None
**Local Files**: None (only Next.js build artifacts)

---

#### Pattern 2: Client-Side React State Only

**Examples**: `with-external-store`, `with-parent-id-grouping`

**Architecture**:
- Messages stored in React `useState` hook
- No persistence (lost on refresh)
- No server-side storage

**Code Example** (`examples/with-external-store/app/MyRuntimeProvider.tsx`):
```typescript
export function MyRuntimeProvider({ children }) {
  const [messages, setMessages] = useState<readonly ThreadMessageLike[]>([]);

  const onNew = async (message: AppendMessage) => {
    // Add user message to React state
    setMessages(current => [...current, userMessage]);

    // Simulate API call
    await fetch("/api/chat");

    // Add assistant response to React state
    setMessages(current => [...current, assistantMessage]);
  };

  const runtime = useExternalStoreRuntime({
    messages,
    setMessages,
    onNew,
  });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
```

**Storage**: React state only
**Local Files**: None
**Persistence**: None (lost on page refresh)

---

#### Pattern 3: External Service Storage (LangGraph Cloud)

**Examples**: `with-langgraph`

**Architecture**:
- All persistence handled by LangGraph Cloud service
- Local code only proxies API requests
- Thread state stored remotely

**Code Example** (`examples/with-langgraph/lib/chatApi.ts`):
```typescript
import { Client } from "@langchain/langgraph-sdk";

export const createThread = async () => {
  const client = createClient();
  return client.threads.create(); // Thread stored in LangGraph Cloud
};

export const getThreadState = async (threadId: string) => {
  const client = createClient();
  return client.threads.getState(threadId); // Retrieved from LangGraph Cloud
};
```

**Storage**: External LangGraph Cloud service
**Local Files**: None (only API proxy)
**Persistence**: Yes (remote)

---

#### Pattern 4: External Cloud Service (Assistant Cloud)

**Examples**: `with-cloud`

**Architecture**:
- All persistence in Assistant Cloud service
- Zero local storage

**Code Example** (`examples/with-cloud/app/MyRuntimeProvider.tsx`):
```typescript
const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  anonymous: true,
});

export function MyRuntimeProvider({ children }) {
  const runtime = useChatRuntime({
    cloud, // Cloud handles all persistence
  });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
```

**Storage**: Assistant Cloud service
**Local Files**: None
**Persistence**: Yes (remote)

---

### Storage Pattern Comparison Table

| Example | Storage Type | Local DB Files | Persistence | Survives Restart | Dependencies |
|---------|-------------|----------------|-------------|------------------|--------------|
| **with-mastra** | **LibSQL (SQLite)** | **Yes** | **Yes (local)** | **Yes** | **@mastra/core, @mastra/libsql** |
| with-ai-sdk-v5 | None | No | No | No | AI SDK only |
| with-external-store | React State | No | No | No | None |
| with-langgraph | LangGraph Cloud | No | Yes (remote) | Yes | @langchain/langgraph-sdk |
| with-cloud | Assistant Cloud | No | Yes (remote) | Yes | @assistant-ui/cloud |
| with-assistant-transport | External API | No | Via API | Yes | None |
| with-react-hook-form | None | No | No | No | react-hook-form |
| with-ffmpeg | None | No | No | No | @ffmpeg/ffmpeg |

## Code References

### Mastra Database Configuration
- `.gitignore:65-67` - Database file patterns
- `examples/with-mastra/mastra/index.ts:15-17` - Workflow storage config
- `examples/with-mastra/mastra/memory.ts:6-8` - Memory storage config
- `examples/with-mastra/mastra-test.ts:10-12` - Test database config

### Mastra Memory Implementation
- `packages/react-mastra/src/useMastraMemory.ts` - Client-side memory hooks
- `packages/react-mastra/src/useMastraRuntime.ts:144-159` - Memory context integration
- `examples/with-mastra/app/api/memory/threads/route.ts` - Thread CRUD API
- `examples/with-mastra/mastra/agents/screeningAgent.ts:29` - Agent memory linking

### Other Examples (No Database)
- `examples/with-ai-sdk-v5/app/api/chat/route.ts` - Stateless pattern
- `examples/with-external-store/app/MyRuntimeProvider.tsx` - React state pattern
- `examples/with-langgraph/lib/chatApi.ts` - External service pattern
- `examples/with-cloud/app/MyRuntimeProvider.tsx` - Cloud service pattern

## Architecture Insights

### Why Mastra Needs Local Database Storage

1. **Agent Memory is Core to Mastra**
   - Mastra agents are designed to remember context across conversations
   - Working memory persists user preferences, facts, and goals
   - Semantic recall retrieves relevant past messages from all conversations

2. **Workflow Suspension Requires State Storage**
   - Workflows can be suspended waiting for human input
   - State must be persisted to survive server restarts
   - Example: Hiring workflow waits for manager approval (`hiringWorkflow.ts:78-79`)

3. **Thread Management**
   - Users can have multiple conversation threads
   - Each thread needs persistent storage
   - Threads can be listed, retrieved, and resumed

4. **Semantic Search Requires Embeddings**
   - Memory system stores vector embeddings for messages
   - Enables similarity-based retrieval of relevant context
   - Configured in `memory.ts:18-23`

### Why Other Examples Don't Need Databases

1. **AI SDK Examples**: Single-turn or short conversations without memory
2. **LangGraph Examples**: Memory handled by LangGraph Cloud service
3. **External Store Examples**: Demonstration of custom state management (no real persistence needed)
4. **Cloud Examples**: Persistence delegated to Assistant Cloud infrastructure

### Alternative Approaches for Mastra

While Mastra currently uses file-based LibSQL by default, the documentation shows these alternatives:

1. **In-Memory Storage** (no files generated):
   ```typescript
   storage: new LibSQLStore({ url: ":memory:" })
   ```

2. **PostgreSQL** (production):
   ```typescript
   storage: new PostgresStore({
     connectionString: process.env.DATABASE_URL
   })
   ```

3. **Upstash** (serverless):
   ```typescript
   storage: new UpstashStore({
     url: process.env.UPSTASH_REDIS_URL
   })
   ```

4. **No Storage** (ephemeral):
   ```typescript
   const mastra = new Mastra({
     agents: { agent },
     // No storage specified - everything is ephemeral
   });
   ```

## Historical Context (from Git)

**Git History**: The database files have been marked for deletion in current branch:
```bash
$ git log --all --full-history --oneline -- '*mastra.db*'
dd6c1500 refactor(react-mastra): remove non-Mastra features and focus on real SDK integration
```

The commit `dd6c1500` shows these files were removed as part of focusing on real Mastra SDK integration, but they would be regenerated when running the application locally.

## External Documentation

From [Mastra Official Documentation](https://mastra.ai/docs):

- [Storage System Guide](https://mastra.ai/docs/server-db/storage) - "If you do not specify any storage configuration, Mastra will not persist data across application restarts"
- [Memory Overview](https://mastra.ai/docs/memory/overview) - "Memory requires a storage provider to persist conversation history"
- [Agent Memory Guide](https://mastra.ai/docs/agents/agent-memory) - Three types: working memory, conversation history, semantic recall
- [Storage Blog Post](https://mastra.ai/blog/mastra-storage) - "Mastra comes with default storage (LibSQL) built-in"

## Open Questions

1. **Should we document the .db file generation in the README?**
   - Users might be confused when `.db` files appear locally
   - Could add a note in `examples/with-mastra/README.md`

2. **Should we support alternative storage in the example?**
   - Show PostgreSQL setup for production
   - Demonstrate `:memory:` mode for testing

3. **Should we add cleanup scripts?**
   - Script to delete local `.db` files
   - Add to `package.json` scripts

4. **Should other examples consider adding persistence?**
   - AI SDK example could benefit from optional localStorage
   - External store example could show PostgreSQL pattern

## Recommendations

1. **Documentation**: Add explicit note in `examples/with-mastra/README.md` about generated database files
2. **Environment Variables**: Document `LIBSQL_URL` environment variable for production configuration
3. **Testing**: Consider using `:memory:` storage for automated tests to avoid file cleanup
4. **.gitignore is correct**: Current gitignore pattern (`*.db`, `*.db-shm`, `*.db-wal`) properly excludes all SQLite files

## Conclusion

**Mastra is unique among the examples because it's the only integration designed for stateful AI agents with persistent memory.** While other examples either avoid persistence entirely or delegate it to external services, Mastra's architecture requires local storage for:
- Multi-turn conversations with memory
- Workflow suspension and resumption
- Semantic search across conversation history
- Thread management

The `.gitignore` entry for database files is necessary and correct, as these files:
1. Contain user-specific data that shouldn't be committed
2. Are automatically generated by LibSQL on initialization
3. Would cause merge conflicts across different development environments
4. Can be regenerated from schema on each developer's machine

This pattern aligns with standard practices for database files in version control and is the expected configuration for any SQLite-based application.
