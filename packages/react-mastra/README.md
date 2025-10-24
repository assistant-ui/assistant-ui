# @assistant-ui/react-mastra

React integration for Mastra AI agents, providing hooks for building AI-powered applications with real Mastra APIs.

## Features

- ✅ **Real Mastra Integration**: Direct integration with Mastra SDK APIs
- ✅ **Agent Streaming**: Full support for `agent.stream()` via HTTP wrapper
- ✅ **Memory Management**: Built-in support for Mastra Memory with thread persistence
- ✅ **Workflow Support**: Integration with Mastra Workflows (vNext & legacy)
- ✅ **Message Processing**: Robust message conversion and accumulation
- ✅ **Performance Optimized**: Sub-millisecond message processing
- ✅ **Type Safety**: Full TypeScript support with comprehensive type definitions

## Quick Start

```typescript
import { useMastraRuntime } from "@assistant-ui/react-mastra";

const runtime = useMastraRuntime({
  agentId: "chef-agent",
  api: "/api/chat",
  memory: {
    storage: "libsql",
    userId: "user-123",
  },
});
```

## Installation

```bash
npm install @assistant-ui/react-mastra
```

## Status

🎉 **Production Ready** - All quality gates passing, fully tested and validated.

## API Reference

### useMastraRuntime

Main runtime hook for Mastra integration.

**Parameters:**

- `config.agentId`: ID of the Mastra agent to use
- `config.api`: API endpoint for agent streaming
- `config.onError`: Optional error handler
- `config.adapters`: Optional adapters for attachments, feedback, etc.

**Returns:** AssistantRuntime instance

### useMastraExtras

Hook to access Mastra-specific runtime extras.

**Returns:** Object with agentId and isStreaming properties

## Types

### MastraMessage

Core message type used by Mastra integration.

```typescript
type MastraMessage = {
  id?: string;
  type: "system" | "human" | "assistant" | "tool";
  content: string | MastraContent[];
  timestamp?: string;
  metadata?: Record<string, any>;
};
```

### MastraRuntimeConfig

Configuration for the Mastra runtime.

```typescript
type MastraRuntimeConfig = {
  agentId: string;
  api: string;
  onError?: (error: Error) => void;
  onSwitchToThread?: (threadId: string) => Promise<MastraThreadState>;
  onSwitchToNewThread?: () => Promise<string>;
  eventHandlers?: {
    onMetadata?: (metadata: Record<string, any>) => void;
    onError?: (error: Error) => void;
    onInterrupt?: (interrupt: MastraInterruptState) => void;
    onCustomEvent?: (event: MastraEvent) => void;
    onToolCall?: (toolCall: MastraToolCall) => void;
    onToolResult?: (toolResult: MastraToolResult) => void;
    onAgentEvent?: (event: MastraEvent) => void;
    onWorkflowEvent?: (event: MastraEvent) => void;
    onMemoryEvent?: (event: MastraEvent) => void;
  };
  adapters?: {
    attachments?: {
      accept?: string;
      maxSize?: number;
      onUpload?: (file: File) => Promise<string>;
    };
    feedback?: {
      onPositive?: (messageId: string) => void;
      onNegative?: (messageId: string) => void;
    };
    speech?: {
      onStart?: () => void;
      onStop?: () => void;
      onError?: (error: Error) => void;
    };
  };
  memory?: MastraMemoryConfig;
  workflow?: MastraWorkflowConfig;
  onMemoryUpdate?: (threadId: string, memory: MastraMemoryResult[]) => void;
  legacyMemory?: boolean;
  workflows?: string[];
  autoCancelTools?: boolean;
  enableTracing?: boolean;
  enableMetrics?: boolean;
};
```

## Testing

The test suite is configured with appropriate memory limits and cleanup. To run tests:

```bash
pnpm test
```

For memory profiling and diagnostics:

```bash
pnpm test:memory
```

See [TESTING.md](./TESTING.md) for detailed guidelines on writing memory-efficient tests and diagnosing issues.
