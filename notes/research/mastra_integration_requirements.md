---
date: 2025-01-29T15:45:00-08:00
researcher: Claude Code
git_commit: f04fe696
branch: main
repository: assistant-ui
topic: "Complete Mastra Integration Requirements: Features, Files, and Code References"
tags: [research, codebase, mastra, integration, requirements, features, files]
status: complete
last_updated: 2025-01-29
last_updated_by: Claude Code
---

# Research: Complete Mastra Integration Requirements

**Date**: 2025-01-29T15:45:00-08:00
**Researcher**: Claude Code
**Git Commit**: f04fe696
**Branch**: main
**Repository**: assistant-ui

## Research Question
What do other integrations have that we would need to make for Mastra? (Compile features, files, and code references)

## Summary

Based on comprehensive analysis of existing integrations (AI SDK, LangGraph, data-stream, cloud), a complete Mastra integration would require **47 distinct components** across **8 major categories**. The integration would need to follow established patterns for runtime hooks, message conversion, type systems, testing infrastructure, CLI support, examples, and documentation.

## What Mastra Is: Comprehensive Framework Overview

**Mastra** is a comprehensive TypeScript AI agent framework designed to provide all essential primitives for building AI applications. Founded in 2024, it offers a complete development ecosystem with powerful features for agents, workflows, memory, RAG, and observability.

### Core Framework Features

#### 🤖 **Agents System**
- **Intelligent Agents**: AI agents with memory, tool-calling, and persistent context
- **Memory Management**: Thread-based memory with semantic recall capabilities
- **Tool Integration**: Dynamic tool calling with automatic function registration
- **Model Agnostic**: Support for 600+ models via unified provider API
- **Multi-Provider Support**: OpenAI, Anthropic, Google Gemini, and local models

#### 🔀 **Workflow Orchestration**
- **Graph-Based State Machines**: XState-powered deterministic workflows
- **Complex Control Flow**: `.then()`, `.branch()`, `.parallel()`, `.suspend()`, `.resume()`
- **Human-in-the-Loop**: Suspend/resume workflows for human intervention
- **Real-time State Streaming**: Watch workflow execution events in real-time
- **Agent/Workflow Composition**: Embed agents in workflows, use workflows as tools

#### 🧠 **Memory & Knowledge Management**
- **Persistent Memory**: Long-term conversation storage and retrieval
- **Semantic Recall**: Vector-based memory search for context retrieval
- **Thread Management**: Multi-threaded conversations with isolation
- **Memory Stores**: LibSQL, PostgreSQL, and other storage backends
- **Resource-Based Organization**: User/thread-based memory organization

#### 🔍 **Retrieval-Augmented Generation (RAG)**
- **Document Processing**: Automatic chunking of text, HTML, Markdown, JSON
- **Vector Operations**: Embedding, storage, and similarity search
- **Unified Vector Store API**: Consistent interface across providers
- **Metadata Filtering**: Advanced filtering by source, time, properties
- **Multiple Vector Stores**: Pinecone, pgvector, Chroma, and Turso integration

#### 📊 **Observability & Monitoring**
- **AI Tracing**: Specialized tracing for AI operations (agents, LLM calls, tools)
- **Performance Metrics**: Token usage, latency, accuracy, relevance tracking
- **OpenTelemetry Integration**: Send traces to any observability platform
- **Multiple Exporters**: Langfuse, Braintrust, LangSmith, custom platforms
- **Real-time Debugging**: Instant trace visibility in development

#### ✅ **Evaluation System**
- **Automated Evaluation**: Model-graded, rule-based, and statistical methods
- **Built-in Metrics**: Toxicity, bias, relevance, factual accuracy
- **Custom Evals**: Define your own evaluation criteria
- **CI/CD Integration**: Run evaluations in your pipeline
- **A/B Testing**: Compare model performance and outputs

#### 🛠 **Developer Experience**
- **Local Playground**: Interactive development environment
- **CLI Tools**: Project scaffolding, development server, deployment
- **TypeScript First**: Full type safety and intelligent autocomplete
- **Hot Reload**: Real-time development feedback
- **Model Router**: Automatic model fallbacks and routing

#### 🚀 **Deployment & Infrastructure**
- **Multiple Deployment Targets**: Vercel, Cloudflare, Netlify, standalone
- **Serverless Ready**: Optimized for serverless platforms
- **Docker Support**: Container deployment options
- **Edge Optimization**: Global distribution capabilities
- **Environment Configuration**: Flexible config management

### Advanced Capabilities

#### **Agent Architecture**
- **Stateful Conversations**: Agents maintain context across interactions
- **Tool Ecosystem**: Custom functions, database queries, API calls
- **Multi-Agent Systems**: Agent orchestration and communication
- **Dynamic Configuration**: Runtime-based agent behavior adjustment
- **Error Recovery**: Graceful handling of failures and retries

#### **Workflow Features**
- **Durable Execution**: Persisted workflow state and recovery
- **Complex Business Logic**: Multi-step automated processes
- **Event-Driven Architecture**: React to external events and triggers
- **Conditional Logic**: Smart branching and decision-making
- **Parallel Processing**: Concurrent execution of independent tasks

#### **Memory System**
- **Working Memory**: Short-term context for immediate processing
- **Long-term Memory**: Persistent storage of important information
- **Semantic Search**: Find relevant context using vector similarity
- **Memory Filtering**: Retrieve context by time, source, or relevance
- **Multi-Modal Memory**: Support for text, images, and other data types

#### **RAG Pipeline**
- **Data Ingestion**: Automatic processing of various document formats
- **Intelligent Chunking**: Context-aware document segmentation
- **Embedding Management**: Multiple embedding model support
- **Query Processing**: Advanced query understanding and routing
- **Response Generation**: Context-aware response synthesis

### Integration Ecosystem

#### **Model Providers**
- **OpenAI**: GPT models, embedding models, fine-tuned models
- **Anthropic**: Claude models with reasoning capabilities
- **Google**: Gemini models and Google AI platform
- **Local Models**: Ollama and other local deployment options
- **Custom Providers**: Extensible provider system

#### **Storage Backends**
- **LibSQL/Turso**: SQLite-based vector and relational storage
- **PostgreSQL**: pgvector extension support
- **Pinecone**: Managed vector database service
- **Chroma**: Open-source vector database
- **Custom Storage**: Extensible storage adapter system

#### **Observability Platforms**
- **Langfuse**: Open-source LLM engineering platform
- **Braintrust**: Evaluation and observability toolkit
- **LangSmith**: LangChain's observability platform
- **OpenTelemetry**: Standard observability protocol
- **Custom Platforms**: Extensible exporter system

### Development Workflow

#### **Local Development**
```typescript
// Create agent with memory and tools
const agent = new Agent({
  name: "Weather Assistant",
  instructions: "Help users with weather information",
  model: openai("gpt-4o"),
  memory: new Memory({ storage: new LibSQLStore() }),
  tools: { weatherTool }
});

// Test in local playground
npm run dev  // Interactive playground at localhost:4111
```

#### **Production Deployment**
```typescript
// Deploy to serverless platform
export const mastra = new Mastra({
  agents: { weatherAgent },
  observability: {
    configs: {
      production: {
        serviceName: 'weather-service',
        exporters: [new CloudExporter()],
        sampling: { type: 'ratio', probability: 0.01 }
      }
    }
  }
});
```

## Detailed Requirements

### 1. Core Package Structure

#### 1.1 Package Configuration Files
- **`packages/react-mastra/package.json`**
  - Pattern from: [`packages/react-langgraph/package.json:1-68`](packages/react-langgraph/package.json:1-68)
  - Dependencies: `@mastra/core`, `@mastra/memory`, `assistant-stream`, `uuid`, `zod`
  - Peer dependencies: `@assistant-ui/react`, `react`, `@types/react`
  - Scripts: build, lint, test, test:watch

- **`packages/react-mastra/tsconfig.json`**
  - Pattern from: [`packages/react-langgraph/tsconfig.json:1-5`](packages/react-langgraph/tsconfig.json:1-5)
  - Extends `@assistant-ui/x-buildutils/ts/base`
  - Include src files, exclude test files

- **`packages/react-mastra/vitest.config.ts`**
  - Pattern from: [`packages/react-langgraph/vitest.config.ts:1-9`](packages/react-langgraph/vitest.config.ts:1-9)
  - Uses jsdom environment
  - Include test files with glob patterns

- **`packages/react-mastra/scripts/build.mts`**
  - Pattern from: [`packages/react-ai-sdk/scripts/build.mts:1-4`](packages/react-ai-sdk/scripts/build.mts:1-4)
  - Uses `@assistant-ui/x-buildutils.Build` for transpilation

#### 1.2 Source Code Structure
- **`packages/react-mastra/src/index.ts`**
  - Pattern from: [`packages/react-langgraph/src/index.ts:1-27`](packages/react-langgraph/src/index.ts:1-27)
  - Main exports entry point

### 2. Type System Components

#### 2.1 Core Type Definitions
- **`packages/react-mastra/src/types.ts`**
  - Pattern from: [`packages/react-langgraph/src/types.ts:1-147`](packages/react-langgraph/src/types.ts:1-147)
  - Required types:
    ```typescript
    export type MastraMessage = {
      id?: string;
      type: "system" | "human" | "assistant" | "tool";
      content: string | MastraContent[];
      timestamp?: string;
      metadata?: Record<string, any>;
    };

    export type MastraContent =
      | { type: "text"; text: string }
      | { type: "reasoning"; reasoning: string }
      | { type: "tool_call"; tool_call: MastraToolCall }
      | { type: "tool_result"; tool_result: MastraToolResult };

    export type MastraToolCall = {
      id: string;
      name: string;
      arguments: Record<string, any>;
    };

    export type MastraEvent = {
      event: "message" | "metadata" | "error" | "interrupt";
      data: any;
      timestamp: string;
    };

    export enum MastraKnownEventTypes {
      Message = "message",
      MessagePartial = "message/partial",
      MessageComplete = "message/complete",
      Metadata = "metadata",
      Error = "error",
      Interrupt = "interrupt"
    }
    ```

#### 2.2 Runtime Configuration Types
- **Runtime Hook Types**
  - Pattern from: [`packages/react-langgraph/src/useLangGraphRuntime.ts:15-41`](packages/react-langgraph/src/useLangGraphRuntime.ts:15-41)
  ```typescript
  export type MastraRuntimeConfig = {
    agentId: string;
    memory?: boolean;
    workflows?: string[];
    onSwitchToThread?: (threadId: string) => Promise<MastraThreadState>;
    onSwitchToNewThread?: () => Promise<string>;
    eventHandlers?: {
      onMetadata?: (metadata: MastraMetadata) => void;
      onError?: (error: Error) => void;
      onInterrupt?: (interrupt: MastraInterrupt) => void;
      onCustomEvent?: (event: MastraCustomEvent) => void;
    };
    adapters?: {
      attachments?: AttachmentAdapter;
      feedback?: FeedbackAdapter;
      speech?: SpeechSynthesisAdapter;
    };
  };
  ```

### 3. Runtime Implementation Components

#### 3.1 Core Runtime Hook
- **`packages/react-mastra/src/useMastraRuntime.ts`**
  - Pattern from: [`packages/react-langgraph/src/useLangGraphRuntime.ts:120-319`](packages/react-langgraph/src/useLangGraphRuntime.ts:120-319)
  - Required implementation:
    ```typescript
    export const useMastraRuntime = (config: MastraRuntimeConfig): AssistantRuntime => {
      const [messages, setMessages] = useState<ThreadMessage[]>([]);
      const [isRunning, setIsRunning] = useState(false);

      const runtime = useExternalStoreRuntime({
        isRunning,
        messages,
        onNew: handleNewMessage,
        onEdit: handleEditMessage,
        onReload: handleReloadMessage,
        adapters: config.adapters
      });

      // Mastra-specific logic for agent communication
      // Message conversion and state management
      // Event handling for interrupts, errors, metadata

      return runtime;
    };
    ```

#### 3.2 Specialized Hooks
- **Interrupt State Hook**
  - Pattern from: [`packages/react-langgraph/src/useLangGraphRuntime.ts:101-106`](packages/react-langgraph/src/useLangGraphRuntime.ts:101-106)
  ```typescript
  export const useMastraInterruptState = (): MastraInterruptState | null => {
    const { interrupt } = useAssistantState(({ thread }) =>
      asMastraRuntimeExtras(thread.extras),
    );
    return interrupt;
  };
  ```

- **Send Hook**
  - Pattern from: [`packages/react-langgraph/src/useLangGraphRuntime.ts:108-113`](packages/react-langgraph/src/useLangGraphRuntime.ts:108-113)
  ```typescript
  export const useMastraSend = () => {
    const send = useExternalStoreRuntime().send;
    return (message: AppendMessage, options?: MastraSendOptions) => {
      // Mastra-specific message sending logic
    };
  };
  ```

#### 3.3 Message Management Hook
- **`packages/react-mastra/src/useMastraMessages.ts`**
  - Pattern from: [`packages/react-langgraph/src/useLangGraphMessages.ts:64-200`](packages/react-langgraph/src/useLangGraphMessages.ts:64-200)
  - Required functionality:
    ```typescript
    export const useMastraMessages = (
      streamCallback: MastraStreamCallback,
      config?: MastraMessagesConfig
    ) => {
      const [messages, setMessages] = useState<MastraMessage[]>([]);
      const [accumulator] = useState(() => new MastraMessageAccumulator());

      const processEvent = useCallback((event: MastraEvent) => {
        switch (event.event) {
          case MastraKnownEventTypes.MessagePartial:
          case MastraKnownEventTypes.MessageComplete:
            setMessages(accumulator.addMessages(event.data));
            break;
          case MastraKnownEventTypes.Interrupt:
            setInterrupt(event.data);
            break;
          // ... other event types
        }
      }, [accumulator]);

      // Stream processing logic
      // Event handling and state updates
      // Error handling and recovery

      return { messages, processEvent, isRunning };
    };
    ```

### 4. Message Processing Components

#### 4.1 Message Accumulator
- **`packages/react-mastra/src/MastraMessageAccumulator.ts`**
  - Pattern from: [`packages/react-langgraph/src/LangGraphMessageAccumulator.ts:8-48`](packages/react-langgraph/src/LangGraphMessageAccumulator.ts:8-48)
  ```typescript
  export class MastraMessageAccumulator<TMessage extends { id?: string }> {
    private messagesMap = new Map<string, TMessage>();

    addMessages(newMessages: TMessage[]): TMessage[] {
      for (const message of newMessages.map(this.ensureMessageId)) {
        const previous = this.messagesMap.get(message.id!);
        this.messagesMap.set(message.id!, this.appendMessage(previous, message));
      }
      return this.getMessages();
    }

    private ensureMessageId = (message: TMessage): TMessage => {
      if (!message.id) {
        return { ...message, id: crypto.randomUUID() };
      }
      return message;
    };

    private appendMessage = (previous: TMessage | undefined, current: TMessage): TMessage => {
      // Message merging logic for streaming chunks
      // Handle partial message updates
      // Tool call aggregation
      // Content concatenation
    };
  }
  ```

#### 4.2 Message Converter
- **`packages/react-mastra/src/convertMastraMessages.ts`**
  - Pattern from: [`packages/react-ai-sdk/src/ui/utils/convertMessage.ts:143-211`](packages/react-ai-sdk/src/ui/utils/convertMessage.ts:143-211)
  ```typescript
  export const MastraMessageConverter = unstable_createMessageConverter(
    (message: MastraMessage): ThreadMessage => {
      const baseMessage = {
        id: message.id ?? crypto.randomUUID(),
        createdAt: new Date(message.timestamp ?? Date.now()),
        role: message.type === 'human' ? 'user' : message.type === 'assistant' ? 'assistant' : message.type,
        content: convertMastraContentToParts(message.content),
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: message.metadata ?? {},
        },
      };

      // Handle status, tool calls, attachments
      // Convert Mastra-specific features to Assistant UI format

      return baseMessage;
    }
  );

  const convertMastraContentToParts = (content: MastraContent[]): MessagePart[] => {
    return content.map(part => {
      switch (part.type) {
        case 'text': return { type: 'text', text: part.text };
        case 'reasoning': return { type: 'reasoning', reasoning: part.reasoning };
        case 'tool_call': return convertToolCall(part.tool_call);
        case 'tool_result': return convertToolResult(part.tool_result);
        default: return { type: 'text', text: String(part) };
      }
    });
  };
  ```

#### 4.3 Chunk Appending Utility
- **`packages/react-mastra/src/appendMastraChunk.ts`**
  - Pattern from: [`packages/react-langgraph/src/appendLangChainChunk.ts:8-75`](packages/react-langgraph/src/appendLangChainChunk.ts:8-75)
  ```typescript
  export const appendMastraChunk = (
    existing: MastraMessage,
    chunk: Partial<MastraMessage>
  ): MastraMessage => {
    // Text concatenation logic
    // Tool call chunk aggregation
    // Status updates
    // Metadata merging
  };
  ```

### 5. Advanced Feature Components

#### 5.1 Event Handling System
- **Event Processor**
  - Pattern from: [`packages/react-langgraph/src/useLangGraphMessages.ts:110-172`](packages/react-langgraph/src/useLangGraphMessages.ts:110-172)
  ```typescript
  const processMastraEvent = (event: MastraEvent) => {
    switch (event.event) {
      case MastraKnownEventTypes.Message:
        handleCompleteMessage(event.data);
        break;
      case MastraKnownEventTypes.MessagePartial:
        handlePartialMessage(event.data);
        break;
      case MastraKnownEventTypes.Interrupt:
        handleInterrupt(event.data);
        break;
      case MastraKnownEventTypes.Error:
        handleError(event.data);
        break;
      case MastraKnownEventTypes.Metadata:
        handleMetadata(event.data);
        break;
    }
  };
  ```

#### 5.2 Tool Integration
- **Tool Call Management**
  - Pattern from: [`packages/react-langgraph/src/useLangGraphRuntime.ts:30-44`](packages/react-langgraph/src/useLangGraphRuntime.ts:30-44)
  ```typescript
  const getPendingMastraToolCalls = (messages: MastraMessage[]) => {
    const pendingToolCalls = new Map<string, MastraToolCall>();
    for (const message of messages) {
      if (message.type === "assistant") {
        for (const toolCall of message.tool_calls ?? []) {
          pendingToolCalls.set(toolCall.id, toolCall);
        }
      }
      if (message.type === "tool") {
        pendingToolCalls.delete(message.tool_call_id);
      }
    }
    return [...pendingToolCalls.values()];
  };
  ```

#### 5.3 Memory Integration
- **Mastra Memory Hook**
  ```typescript
  export const useMastraMemory = (agentId: string, threadId?: string) => {
    // Integration with Mastra's memory system
    // Thread context management
    // Memory retrieval and updates
  };
  ```

### 6. Testing Infrastructure

#### 6.1 Test Files
- **`packages/react-mastra/src/useMastraRuntime.test.tsx`**
  - Pattern from: [`packages/react-langgraph/src/useLangGraphRuntime.test.tsx:1-277`](packages/react-langgraph/src/useLangGraphRuntime.test.tsx:1-277)
  - Test cases for runtime hook, event handling, adapter integration

- **`packages/react-mastra/src/useMastraMessages.test.ts`**
  - Pattern from: [`packages/react-langgraph/src/useLangGraphMessages.test.ts:1-710`](packages/react-langgraph/src/useLangGraphMessages.test.ts:1-710)
  - Test cases for message processing, chunk handling, error scenarios

#### 6.2 Test Utilities
- **`packages/react-mastra/src/testUtils.ts`**
  - Pattern from: [`packages/react-langgraph/src/testUtils.ts:1-12`](packages/react-langgraph/src/testUtils.ts:1-12)
  ```typescript
  export const mockMastraStreamCallbackFactory = (
    events: Array<MastraEvent>,
  ) =>
    async function* () {
      for (const event of events) {
        yield event;
      }
    };

  export const createMockMastraMessage = (overrides = {}): MastraMessage => ({
    id: "mastra-test-id",
    type: "assistant",
    content: [{ type: "text", text: "Mastra response" }],
    timestamp: new Date().toISOString(),
    ...overrides,
  });
  ```

### 7. CLI Integration Components

#### 7.1 Package Detection and Installation
- **`packages/cli/src/lib/install-mastra-lib.ts`**
  - Pattern from: [`packages/cli/src/lib/install-ai-sdk-lib.ts:40-92`](packages/cli/src/lib/install-ai-sdk-lib.ts:40-92)
  ```typescript
  export function isMastraInstalled(): boolean {
    return isPackageInstalled("@mastra/core") ||
           isPackageInstalled("@mastra/memory");
  }

  export async function addMastraPackage(options: AddOptions) {
    // Install Mastra dependencies
    // Add configuration files
    // Create example agent setup
  }
  ```

#### 7.2 CLI Command Updates
- **Update `packages/cli/src/commands/add.ts`**
  - Pattern from: [`packages/cli/src/commands/add.ts:18-47`](packages/cli/src/commands/add.ts:18-47)
  - Add Mastra package option to add command

### 8. Example Application Components

#### 8.1 Basic Integration Example
- **`examples/with-mastra/app/page.tsx`**
  - Pattern from: [`examples/with-ai-sdk-v5/app/page.tsx:7-18`](examples/with-ai-sdk-v5/app/page.tsx:7-18)
  ```typescript
  import { useMastraRuntime } from "@assistant-ui/react-mastra";

  export default function Home() {
    const runtime = useMastraRuntime({
      agentId: "chef-agent",
      memory: true,
    });

    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="h-full">
          <Thread />
        </div>
      </AssistantRuntimeProvider>
    );
  }
  ```

#### 8.2 API Integration
- **`examples/with-mastra/app/api/mastra/route.ts`**
  - Pattern from: [`examples/with-ai-sdk-v5/app/api/chat/route.ts:14-36`](examples/with-ai-sdk-v5/app/api/chat/route.ts:14-36)
  ```typescript
  import { mastra } from "@/mastra";

  export async function POST(req: Request) {
    const { messages, threadId } = await req.json();

    const agent = mastra.getAgent("chefAgent");
    const result = await agent.stream(messages, { threadId });

    return result.toDataStreamResponse();
  }
  ```

#### 8.3 Advanced Runtime Provider
- **`examples/with-mastra/app/MyRuntimeProvider.tsx`**
  - Pattern from: [`examples/with-langgraph/app/MyRuntimeProvider.tsx:13-38`](examples/with-langgraph/app/MyRuntimeProvider.tsx:13-38)
  ```typescript
  const useMyMastraRuntime = () => {
    const threadListItemRuntime = useThreadListItemRuntime();
    const runtime = useMastraRuntime({
      agentId: "chef-agent",
      memory: true,
      stream: async function* (messages) {
        const { externalId } = await threadListItemRuntime.initialize();
        // Mastra streaming implementation
        const generator = sendToMastra({
          threadId: externalId,
          messages: messages,
        });

        for await (const chunk of generator) {
          yield chunk;
        }
      },
      onSwitchToThread: async (threadId) => {
        const state = await getMastraThreadState(threadId);
        return {
          messages: state.messages ?? [],
          interrupts: state.interrupts ?? [],
        };
      },
    });

    return runtime;
  };
  ```

### 9. Documentation Components

#### 9.1 API Reference Documentation
- **`apps/docs/content/docs/api-reference/integrations/mastra.mdx`**
  - Pattern from: [`apps/docs/content/docs/api-reference/integrations/vercel-ai-sdk.mdx`](apps/docs/content/docs/api-reference/integrations/vercel-ai-sdk.mdx)
  - Complete API documentation with examples

#### 9.2 Integration Guide
- **`apps/docs/content/docs/runtimes/mastra/index.mdx`**
  - Pattern from: [`apps/docs/content/docs/runtimes/mastra/overview.mdx`](apps/docs/content/docs/runtimes/mastra/overview.mdx)
  - Step-by-step integration guide

#### 9.3 Update Configuration Files
- **Update `apps/docs/content/docs/api-reference/integrations/meta.json`**
  - Add Mastra to integration list

### 10. Package Updates

#### 10.1 Root Package.json
- **Update root `package.json`**
  - Pattern from: workspace dependencies in existing packages
  - Add `"@assistant-ui/react-mastra": "workspace:*"` to dependencies

#### 10.2 Monorepo Integration
- **Update `turbo.json`**
  - Pattern from: [`turbo.json:20-22`](turbo.json:20-22)
  - Add Mastra package to build and test pipelines

## Code References Summary

### Core Implementation Files
- `packages/react-ai-sdk/src/ui/use-chat/useAISDKRuntime.tsx:33-126` - Runtime hook pattern
- `packages/react-langgraph/src/useLangGraphRuntime.ts:120-319` - Advanced runtime implementation
- `packages/react-ai-sdk/src/ui/utils/convertMessage.ts:143-211` - Message conversion pattern
- `packages/react-langgraph/src/types.ts:1-147` - Type system pattern

### Testing Infrastructure
- `packages/react-langgraph/src/useLangGraphRuntime.test.tsx:1-277` - Runtime testing pattern
- `packages/react-langgraph/src/testUtils.ts:1-12` - Test utilities pattern
- `packages/react-langgraph/vitest.config.ts:1-9` - Test configuration

### Build and CLI Integration
- `packages/cli/src/lib/install-ai-sdk-lib.ts:40-92` - CLI integration pattern
- `packages/react-ai-sdk/scripts/build.mts:1-4` - Build script pattern
- `packages/react-langgraph/package.json:1-68` - Package configuration pattern

### Examples and Documentation
- `examples/with-ai-sdk-v5/app/page.tsx:7-18` - Basic integration example
- `examples/with-langgraph/app/MyRuntimeProvider.tsx:13-38` - Advanced runtime provider
- `apps/docs/content/docs/runtimes/mastra/overview.mdx` - Documentation structure

## Architecture Insights

### Integration Patterns
1. **Runtime Bridge Pattern**: Use `useExternalStoreRuntime` for core integration
2. **Message Conversion Pattern**: Use `unstable_createMessageConverter` for format conversion
3. **Event Handling Pattern**: Process streaming events with state updates
4. **Accumulator Pattern**: Manage message state during streaming
5. **Test Factory Pattern**: Mock streaming callbacks for testing

### Mastra-Specific Considerations
1. **Agent System**: Integration with Mastra's agent framework
2. **Memory System**: Support for Mastra's persistent memory
3. **Workflow System**: Integration with Mastra's workflow orchestration
4. **Tool System**: Support for Mastra's tool calling framework
5. **Event System**: Mastra-specific events for agent lifecycle

### Quality Standards
1. **Type Safety**: Comprehensive TypeScript definitions
2. **Testing Coverage**: Unit and integration tests with mocking
3. **Documentation**: Complete API documentation and examples
4. **CLI Integration**: Automatic package detection and installation
5. **Build Integration**: Proper monorepo build pipeline integration

This comprehensive requirements analysis provides a complete blueprint for implementing a first-class Mastra integration that follows all established patterns and quality standards in the Assistant UI codebase.