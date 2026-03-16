---
date: 2025-01-29T14:30:00-08:00
researcher: Claude Code
git_commit: f04fe696
branch: main
repository: assistant-ui
topic: "Current State of Mastra Integration"
tags: [research, codebase, mastra, integration, runtime]
status: complete
last_updated: 2025-01-29
last_updated_by: Claude Code
last_updated_note: "Added follow-up research with external documentation analysis"
---

# Research: Current State of Mastra Integration

**Date**: 2025-01-29T14:30:00-08:00
**Researcher**: Claude Code
**Git Commit**: f04fe696
**Branch**: main
**Repository**: assistant-ui

## Research Question
What is the current state of the Mastra integration? (First research what Mastra is and what SHOULD be there, then look at what IS there)

## Summary
The Mastra integration in assistant-ui is **documented but not implemented**. While comprehensive documentation exists showing users how to integrate with Mastra, there is no actual `@assistant-ui/react-mastra` package implementation like there is for AI SDK and LangGraph integrations. Users are instructed to use the generic `@assistant-ui/react-data-stream` package instead of a dedicated Mastra runtime.

## Detailed Findings

### What Mastra Is: Comprehensive Framework Overview

**Mastra** is a comprehensive TypeScript AI agent framework founded in 2024 that provides a complete development ecosystem for building AI applications. It offers **production-ready primitives** across eight major areas:

#### 🤖 **Advanced Agent System**
- **Intelligent Agents**: Memory-enabled agents with persistent context and tool-calling
- **Model Routing**: Support for 600+ models via unified provider API (OpenAI, Anthropic, Google, local models)
- **Dynamic Tool Integration**: Automatic function registration and execution
- **Multi-Agent Orchestration**: Agent communication and composition patterns

#### 🔀 **Workflow Orchestration Engine**
- **XState-Powered Workflows**: Deterministic graph-based state machines
- **Advanced Control Flow**: `.then()`, `.branch()`, `.parallel()`, `.suspend()`, `.resume()`
- **Human-in-the-Loop**: Suspend/resume workflows with real-time state streaming
- **Agent/Workflow Composition**: Embed agents in workflows, use workflows as tools

#### 🧠 **Sophisticated Memory Management**
- **Persistent Memory Systems**: Thread-based storage with semantic recall
- **Vector-Based Search**: Context retrieval using similarity and metadata filtering
- **Multiple Storage Backends**: LibSQL, PostgreSQL, Turso, Pinecone, Chroma
- **Resource Organization**: User/thread-based memory isolation and management

#### 🔍 **Production-Grade RAG Pipeline**
- **Multi-Format Processing**: Text, HTML, Markdown, JSON with intelligent chunking
- **Unified Vector Store API**: Consistent interface across all vector providers
- **Advanced Filtering**: Source, time-based, and custom metadata filtering
- **Embedding Management**: Multiple embedding model support with automatic optimization

#### 📊 **Comprehensive Observability Stack**
- **AI-Specific Tracing**: Specialized tracing for agents, LLM calls, tool executions
- **Performance Metrics**: Token usage, latency, accuracy, relevance tracking
- **Multi-Platform Export**: Langfuse, Braintrust, LangSmith, OpenTelemetry integration
- **Real-time Debugging**: Instant trace visibility in development with batch optimization for production

#### ✅ **Built-in Evaluation System**
- **Automated Evaluation**: Model-graded, rule-based, and statistical evaluation methods
- **Comprehensive Metrics**: Toxicity, bias, relevance, factual accuracy assessment
- **CI/CD Integration**: Automated evaluation in deployment pipelines
- **Custom Evaluation Framework**: Define domain-specific evaluation criteria

#### 🛠 **Developer Experience Tools**
- **Interactive Playground**: Local development environment with hot reload
- **CLI Toolchain**: Project scaffolding, development server, deployment automation
- **TypeScript-First Design**: Full type safety with intelligent autocomplete
- **Model Router**: Automatic fallbacks and intelligent model selection

#### 🚀 **Flexible Deployment Infrastructure**
- **Multiple Targets**: Vercel, Cloudflare, Netlify, standalone servers
- **Serverless Optimization**: Edge deployment with automatic scaling
- **Container Support**: Docker deployment with environment configuration
- **Cloud Integration**: Mastra Cloud for managed deployment and monitoring

### Current Documentation State

**Excellent Documentation Exists**:
- `/apps/docs/content/docs/runtimes/mastra/overview.mdx` - Complete overview
- `/apps/docs/content/docs/runtimes/mastra/full-stack-integration.mdx` - Next.js API route integration
- `/apps/docs/content/docs/runtimes/mastra/separate-server-integration.mdx` - Standalone server integration
- Listed in README.md:27 as supported framework alongside AI SDK and LangGraph

**Integration Approaches Documented**:
1. **Full-Stack**: Direct integration in Next.js API routes using Mastra agents
2. **Separate Server**: Connect to standalone Mastra server via HTTP endpoints

### What Should Exist (Based on Integration Patterns)

**Expected Package Structure** (following existing patterns):
```
packages/react-mastra/
├── src/
│   ├── index.ts                    # Main exports
│   ├── useMastraRuntime.ts         # Core runtime hook
│   ├── convertMastraMessages.ts    # Message conversion utilities
│   ├── MastraMessageAccumulator.ts # Streaming message handling
│   ├── types.ts                    # TypeScript definitions
│   └── adapters/                   # Format adapters
├── package.json                    # Dependencies and build config
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # Package documentation
```

**Expected Core Components**:
- `useMastraRuntime()` - Main runtime hook built on `useExternalStoreRuntime`
- `convertMastraMessages()` - Message format conversion using `useExternalMessageConverter`
- `MastraMessageAccumulator` - Handle streaming message accumulation
- Type definitions for Mastra message formats and tool calls
- Format adapter for message persistence and retrieval

**Expected Dependencies**:
- `@assistant-ui/react` (peer dependency)
- `@mastra/core`, `@mastra/memory` (Mastra dependencies)
- `assistant-stream` (streaming utilities)
- Standard build tooling with `@assistant-ui/x-buildutils`

### What Actually Exists

**Missing Implementation**:
- ❌ No `packages/react-mastra/` directory
- ❌ No `@assistant-ui/react-mastra` package
- ❌ No `useMastraRuntime()` hook
- ❌ No Mastra-specific message converters
- ❌ No Mastra type definitions in the codebase
- ❌ No examples using Mastra integration package

**Current Workaround**:
The documentation instructs users to use the generic data stream approach:

```typescript
// From separate-server-integration.mdx:149-151
const runtime = useDataStreamRuntime({
  api: "http://localhost:4111/api/agents/chefAgent/stream",
});
```

This uses `@assistant-ui/react-data-stream` instead of a dedicated Mastra runtime.

### Comparison with Existing Integrations

**AI SDK Integration** (`@assistant-ui/react-ai-sdk`):
- ✅ Complete implementation with `useAISDKRuntime()` hook
- ✅ Message converters for AI SDK format
- ✅ Transport layer extending AI SDK's `DefaultChatTransport`
- ✅ Format adapters for message persistence
- ✅ Tool integration utilities

**LangGraph Integration** (`@assistant-ui/react-langgraph`):
- ✅ Complete implementation with `useLangGraphRuntime()` hook
- ✅ Message converters for LangChain/LangGraph formats
- ✅ Streaming management with `useLangGraphMessages()`
- ✅ Comprehensive type definitions
- ✅ Interrupt and command handling support

**Mastra Integration**:
- ❌ No dedicated implementation package
- ✅ Comprehensive documentation only
- ⚠️ Users must use generic `useDataStreamRuntime()` approach

### Integration Architecture Gap

**Missing Runtime Hook Pattern**:
All integrations follow this pattern which Mastra lacks:

```typescript
// Expected pattern (based on AI SDK and LangGraph)
export const useMastraRuntime = (config: MastraConfig) => {
  const messages = MastraMessageConverter.useThreadMessages({
    isRunning: /* Mastra streaming state */,
    messages: /* Mastra messages */,
  });

  return useExternalStoreRuntime({
    messages,
    // ... other runtime configuration
  });
};
```

**Missing Message Conversion**:
```typescript
// Expected message converter
export const MastraMessageConverter =
  unstable_createMessageConverter({
    // Convert Mastra agent messages to assistant-ui ThreadMessage format
  });
```

## Architecture Insights

### Integration Pattern Consistency
The codebase follows a **consistent integration architecture** where each external service gets:
1. A dedicated runtime hook using `useExternalStoreRuntime`
2. Message converters using core conversion utilities
3. Type definitions for the external service's formats
4. Format adapters for message persistence
5. Package structure following `@assistant-ui/react-{service}` naming

### Mastra Integration Strategy
The documentation suggests Mastra integration should be:
1. **Full-Stack**: Direct agent usage in API routes with streaming
2. **Separate Server**: HTTP-based communication with standalone Mastra server
3. **Agent-First**: Focus on Mastra's agent capabilities rather than raw model access

### Missing Runtime Abstraction
The gap is that users get **Mastra documentation** but no **Mastra runtime abstraction**. They must use generic streaming instead of a proper `useMastraRuntime()` hook that would provide:
- Type safety for Mastra agent configurations
- Automatic message format conversion
- Proper integration with assistant-ui's runtime system
- Tool calling and memory support

## Historical Context (from notes/)

No specific notes about Mastra integration decisions were found in the notes/ directory. The documentation appears to have been written with the expectation that a dedicated integration package would follow the established patterns.

## Follow-up Research 2025-01-29T14:45:00-08:00

### External Documentation Analysis

**Mastra's Official Documentation** (https://mastra.ai/en/docs/frameworks/agentic-uis/assistant-ui):
- Confirms the separate server approach as the primary integration pattern
- Uses `useChatRuntime` instead of `useDataStreamRuntime` in their examples:
  ```typescript
  const runtime = useChatRuntime({
      api: "http://localhost:4111/api/agents/weatherAgent/stream",
  });
  ```
- References assistant-ui's own documentation for full-stack integration
- Focuses on standalone Mastra server architecture

**Assistant UI's Official Documentation** (https://www.assistant-ui.com/docs/runtimes/mastra/overview):
- Matches exactly with the local documentation found in the codebase
- Confirms both full-stack and separate server integration approaches
- Uses the same content structure and wording

### Key Discrepancy Found

The external Mastra documentation shows usage of `useChatRuntime` while the assistant-ui local documentation shows `useDataStreamRuntime`. This suggests:

1. **API Evolution**: There may have been changes in the assistant-ui API between when Mastra wrote their documentation and the current state
2. **Different Integration Approaches**: `useChatRuntime` might be a higher-level abstraction that internally uses `useDataStreamRuntime`
3. **Documentation Sync**: The two documentation sources may not be perfectly aligned

### Integration Pattern Clarification

The external documentation confirms that:
- Mastra integration is intended to use **generic runtime hooks** rather than a dedicated `useMastraRuntime()`
- The approach is to point a generic runtime hook at Mastra's streaming endpoints
- This suggests the **current documentation approach may be intentional** rather than missing implementation

### Updated Assessment

Based on the external documentation review, the Mastra integration strategy appears to be:
1. **Intentional Generic Approach**: Use existing runtime hooks (`useChatRuntime` or `useDataStreamRuntime`) pointed at Mastra endpoints
2. **No Dedicated Package Needed**: Unlike AI SDK and LangGraph which have deep integration needs, Mastra works through standard streaming endpoints
3. **Documentation-First Integration**: The integration is documentation-based rather than code-based

This changes the assessment from "missing implementation" to "different integration philosophy" where Mastra integrates through standard protocols rather than requiring a dedicated adapter package.

## Related Research

This research identifies a significant implementation gap between documented features and actual code availability. Similar gaps may exist for other documented integrations.

## Open Questions

1. **Implementation Priority**: Why was Mastra documented but not implemented? Was this intentional (data stream approach preferred) or an implementation oversight?

2. **Integration Strategy**: Should Mastra follow the same pattern as AI SDK/LangGraph integrations, or is the generic `useDataStreamRuntime()` approach the intended long-term solution?

3. **Resource Allocation**: What resources would be needed to implement a complete `@assistant-ui/react-mastra` package?

4. **Feature Scope**: What Mastra-specific features (memory, workflows, tools) should the integration support beyond basic agent streaming?

## Code References

- **Documentation**: `apps/docs/content/docs/runtimes/mastra/overview.mdx:5-17` - Integration overview
- **Full-Stack Guide**: `apps/docs/content/docs/runtimes/mastra/full-stack-integration.mdx:169-199` - API route integration example
- **Separate Server Guide**: `apps/docs/content/docs/runtimes/mastra/separate-server-integration.mdx:149-151` - Data stream approach example
- **AI SDK Pattern**: `packages/react-ai-sdk/src/ui/use-chat/useAISDKRuntime.tsx:33-126` - Runtime hook implementation
- **LangGraph Pattern**: `packages/react-langgraph/src/useLangGraphRuntime.ts:120-319` - Runtime hook implementation
- **Core Runtime**: `packages/react/src/legacy-runtime/runtime-cores/external-store/useExternalStoreRuntime.tsx:12-29` - Base runtime hook used by integrations
- **Message Conversion**: `packages/react/src/legacy-runtime/runtime-cores/external-store/external-message-converter.tsx:13-30` - Core message conversion utilities