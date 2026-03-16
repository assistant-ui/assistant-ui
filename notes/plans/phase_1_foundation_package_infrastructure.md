# Phase 1: Foundation Package Infrastructure Implementation Plan

## Overview

Phase 1 establishes the foundational infrastructure for the Mastra integration by creating the basic `@assistant-ui/react-mastra` package structure and core runtime hook. This phase enables basic Mastra agent communication through a proper integration package, replacing the generic HTTP streaming approach with a first-class runtime hook that follows established patterns from AI SDK and LangGraph integrations.

**Success Criteria**: Users can import and use `useMastraRuntime()` for basic agent communication, achieving feature parity with the current generic approach but with proper package structure and type safety.

**Dependencies**: None (first phase)
**Estimated Complexity**: Medium - follows established patterns but requires careful integration with Mastra APIs
**Risk Level**: Low - builds on well-understood integration patterns

## Current State Analysis

**What exists now**: No `@assistant-ui/react-mastra` package exists. Users must manually configure `useDataStreamRuntime()` with HTTP endpoints, requiring 7+ setup steps.

**What's missing**:
- Package structure and build configuration
- Core runtime hook using `useExternalStoreRuntime`
- Basic type definitions for Mastra messages
- Message conversion between Mastra and assistant-ui formats
- Monorepo integration (build pipeline, workspace dependencies)

## Desired End State

A functional `@assistant-ui/react-mastra` package that provides:
```typescript
import { useMastraRuntime } from '@assistant-ui/react-mastra';

const runtime = useMastraRuntime({
  agentId: 'chef-agent',
  api: 'http://localhost:4111/api/agents/chefAgent/stream'
});
```

This achieves basic agent communication with proper type safety and follows the established integration pattern.

## What We're NOT Doing in Phase 1

- **Advanced Mastra features**: Memory, workflows, tools integration (Phase 3)
- **CLI integration**: Automatic package installation and setup (Phase 4)
- **Examples and documentation**: Complete examples and comprehensive docs (Phase 4)
- **Advanced testing**: Integration tests and performance optimization (Phase 5)
- **Error handling enhancements**: Advanced error recovery and retry logic (Phase 3)

## Implementation Approach

Follow the established integration pattern used by AI SDK and LangGraph:
1. **Package Structure**: Create standard package configuration following monorepo patterns
2. **Runtime Hook**: Implement `useMastraRuntime` using `useExternalStoreRuntime`
3. **Type System**: Define Mastra-specific types and message conversion
4. **Build Integration**: Integrate with turbo build pipeline and workspace
5. **Basic Testing**: Set up testing infrastructure for core components

## Phase 1 Implementation

### 1. Package Infrastructure Setup

#### 1.1 Package Configuration
**File**: `packages/react-mastra/package.json`
**Purpose**: Define package metadata, dependencies, and build scripts following established patterns
**Dependencies**: None
**Implementation Notes**:
- Use `@assistant-ui/react-mastra` naming convention
- Include `@mastra/core` and `@mastra/memory` as dependencies
- Set up peer dependencies for `@assistant-ui/react` and React
- Configure build scripts and workspace integration

```json
{
  "name": "@assistant-ui/react-mastra",
  "version": "0.1.0",
  "description": "Mastra integration for assistant-ui",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "src",
    "README.md"
  ],
  "scripts": {
    "build": "tsx scripts/build.mts",
    "dev": "tsx scripts/build.mts --watch",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@mastra/core": "^0.3.0",
    "@mastra/memory": "^0.3.0",
    "assistant-stream": "^0.2.29",
    "uuid": "^10.0.0",
    "zustand": "^5.0.7"
  },
  "peerDependencies": {
    "@assistant-ui/react": "^0.11.18",
    "react": "^18 || ^19 || ^19.0.0-rc"
  },
  "peerDependenciesMeta": {
    "@types/react": {
      "optional": true
    }
  },
  "devDependencies": {
    "@assistant-ui/x-buildutils": "workspace:*",
    "@types/react": "*",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.2",
    "vitest": "^2.1.8"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/assistant-ui/assistant-ui.git",
    "directory": "packages/react-mastra"
  }
}
```

#### 1.2 TypeScript Configuration
**File**: `packages/react-mastra/tsconfig.json`
**Purpose**: Configure TypeScript compilation following established patterns
**Dependencies**: package.json
**Implementation Notes**: Extend base configuration and include source files

```json
{
  "extends": "@assistant-ui/x-buildutils/ts/base",
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx"
  ],
  "exclude": [
    "**/*.test.ts",
    "**/*.test.tsx",
    "node_modules",
    "dist"
  ]
}
```

#### 1.3 Build Script
**File**: `packages/react-mastra/scripts/build.mts`
**Purpose**: Transpile TypeScript and generate declarations using standard build utilities
**Dependencies**: tsconfig.json, @assistant-ui/x-buildutils
**Implementation Notes**: Use standard Build class pattern like other integrations

```typescript
import { Build } from "@assistant-ui/x-buildutils";

Build.start()
  .transpileTypescript()
  .end();
```

#### 1.4 Testing Configuration
**File**: `packages/react-mastra/vitest.config.ts`
**Purpose**: Configure vitest for unit testing following established patterns
**Dependencies**: Package dependencies
**Implementation Notes**: Use jsdom environment and standard test patterns

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  include: ["src/**/*.test.{ts,tsx}"],
});
```

### 2. Type System Implementation

#### 2.1 Core Type Definitions
**File**: `packages/react-mastra/src/types.ts`
**Purpose**: Define TypeScript types for Mastra integration following established patterns
**Dependencies**: None
**Implementation Notes**: Define message types, runtime config, and event types based on Mastra API

```typescript
import type { ThreadMessage } from "@assistant-ui/react";

// Core Mastra message types based on Mastra API
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

export type MastraToolResult = {
  tool_call_id: string;
  result: any;
};

// Event types for streaming
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

// Runtime configuration
export type MastraRuntimeConfig = {
  agentId: string;
  api: string;
  onError?: (error: Error) => void;
  adapters?: {
    attachments?: any; // TODO: proper types in Phase 3
    feedback?: any;
    speech?: any;
  };
};

// Runtime extras for additional functionality
export const MastraRuntimeExtrasSymbol = Symbol("mastra-runtime-extras");

export type MastraRuntimeExtras = {
  agentId: string;
  isStreaming: boolean;
};
```

### 3. Core Runtime Implementation

#### 3.1 Message Converter
**File**: `packages/react-mastra/src/convertMastraMessages.ts`
**Purpose**: Convert between Mastra message format and assistant-ui ThreadMessage format
**Dependencies**: types.ts
**Implementation Notes**: Use `unstable_createMessageConverter` following established patterns

```typescript
import { unstable_createMessageConverter } from "@assistant-ui/react";
import type { ThreadMessage } from "@assistant-ui/react";
import type { MastraMessage, MastraContent } from "./types";

export const MastraMessageConverter = unstable_createMessageConverter(
  (message: MastraMessage): ThreadMessage => {
    const baseMessage = {
      id: message.id ?? crypto.randomUUID(),
      createdAt: new Date(message.timestamp ?? Date.now()),
      role: message.type === 'human' ? 'user' :
            message.type === 'assistant' ? 'assistant' :
            message.type,
      content: convertMastraContentToParts(message.content),
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: message.metadata ?? {},
      },
    };

    // Handle status and other properties as needed
    // TODO: Add status handling in Phase 3

    return baseMessage;
  }
);

const convertMastraContentToParts = (content: string | MastraContent[]): any[] => {
  if (typeof content === 'string') {
    return [{ type: 'text' as const, text: content }];
  }

  return content.map(part => {
    switch (part.type) {
      case 'text':
        return { type: 'text' as const, text: part.text };
      case 'reasoning':
        return { type: 'reasoning' as const, reasoning: part.reasoning };
      case 'tool_call':
        // TODO: Convert tool calls in Phase 3
        return { type: 'text' as const, text: `Tool call: ${part.tool_call.name}` };
      case 'tool_result':
        // TODO: Convert tool results in Phase 3
        return { type: 'text' as const, text: `Tool result: ${part.tool_result.result}` };
      default:
        return { type: 'text' as const, text: String(part) };
    }
  });
};
```

#### 3.2 Message Accumulator
**File**: `packages/react-mastra/src/MastraMessageAccumulator.ts`
**Purpose**: Manage message state during streaming following accumulator pattern
**Dependencies**: types.ts
**Implementation Notes**: Handle message deduplication and chunk accumulation

```typescript
import type { MastraMessage } from "./types";

export class MastraMessageAccumulator<TMessage extends { id?: string }> {
  private messagesMap = new Map<string, TMessage>();

  addMessages(newMessages: TMessage[]): TMessage[] {
    for (const message of newMessages.map(this.ensureMessageId)) {
      const previous = this.messagesMap.get(message.id!);
      this.messagesMap.set(message.id!, this.appendMessage(previous, message));
    }
    return this.getMessages();
  }

  getMessages(): TMessage[] {
    return Array.from(this.messagesMap.values());
  }

  private ensureMessageId = (message: TMessage): TMessage => {
    if (!message.id) {
      return { ...message, id: crypto.randomUUID() };
    }
    return message;
  };

  private appendMessage = (previous: TMessage | undefined, current: TMessage): TMessage => {
    if (!previous) return current;

    // For now, replace the message
    // TODO: Implement proper chunk appending in Phase 2
    return current;
  };
}
```

#### 3.3 Core Runtime Hook
**File**: `packages/react-mastra/src/useMastraRuntime.ts`
**Purpose**: Main runtime hook providing Mastra integration using established patterns
**Dependencies**: types.ts, convertMastraMessages.ts, MastraMessageAccumulator.ts
**Implementation Notes**: Use `useExternalStoreRuntime` and handle streaming communication

```typescript
import { useState, useCallback, useRef } from "react";
import { useExternalStoreRuntime } from "@assistant-ui/react";
import { MastraMessageConverter } from "./convertMastraMessages";
import { MastraMessageAccumulator } from "./MastraMessageAccumulator";
import type { MastraRuntimeConfig, MastraMessage, MastraEvent, MastraKnownEventTypes, MastraRuntimeExtrasSymbol, MastraRuntimeExtras } from "./types";

export const useMastraRuntime = (config: MastraRuntimeConfig) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const accumulatorRef = useRef(() => new MastraMessageAccumulator<MastraMessage>());

  const processEvent = useCallback((event: MastraEvent) => {
    switch (event.event) {
      case MastraKnownEventTypes.MessagePartial:
      case MastraKnownEventTypes.MessageComplete:
        const accumulator = accumulatorRef.current();
        const newMessages = accumulator.addMessages([event.data]);
        setMessages(MastraMessageConverter.useThreadMessages({
          isRunning,
          messages: newMessages,
        }));
        break;
      case MastraKnownEventTypes.Error:
        config.onError?.(new Error(event.data));
        setIsRunning(false);
        break;
      case MastraKnownEventTypes.Metadata:
        // TODO: Handle metadata in Phase 3
        break;
    }
  }, [config.onError, isRunning]);

  const handleNew = useCallback(async (message: any) => {
    setIsRunning(true);

    try {
      const response = await fetch(config.api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message.content }],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsRunning(false);
              return;
            }

            try {
              const event = JSON.parse(data);
              processEvent(event);
            } catch (e) {
              console.error('Failed to parse event:', e);
            }
          }
        }
      }
    } catch (error) {
      config.onError?.(error instanceof Error ? error : new Error('Unknown error'));
      setIsRunning(false);
    }
  }, [config.api, config.onError, processEvent]);

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    onNew: handleNew,
    adapters: config.adapters,
    extras: {
      [MastraRuntimeExtrasSymbol]: {
        agentId: config.agentId,
        isStreaming: isRunning,
      } as MastraRuntimeExtras,
    },
  });

  return runtime;
};
```

### 4. Package Entry Point

#### 4.1 Main Exports
**File**: `packages/react-mastra/src/index.ts`
**Purpose**: Export public API following established patterns
**Dependencies**: All core components
**Implementation Notes**: Export runtime hook, types, and utilities

```typescript
export { useMastraRuntime } from "./useMastraRuntime";
export { MastraMessageConverter } from "./convertMastraMessages";
export { MastraMessageAccumulator } from "./MastraMessageAccumulator";

export type {
  MastraMessage,
  MastraContent,
  MastraToolCall,
  MastraToolResult,
  MastraEvent,
  MastraRuntimeConfig,
  MastraRuntimeExtras,
} from "./types";

export { MastraKnownEventTypes, MastraRuntimeExtrasSymbol } from "./types";
```

### 5. Monorepo Integration

#### 5.1 Root Package Update
**File**: `package.json` (root)
**Changes**: Add Mastra package to workspace dependencies
**Dependencies**: package.json (Mastra)
**Implementation Notes**: Add workspace dependency for internal development

```json
{
  "dependencies": {
    "@assistant-ui/react-mastra": "workspace:*",
    // ... other dependencies
  }
}
```

#### 5.2 Turbo Configuration Update
**File**: `turbo.json`
**Changes**: Add Mastra package to build pipeline
**Dependencies**: package.json (Mastra)
**Implementation Notes**: Ensure proper build ordering

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

#### 5.3 Package Documentation
**File**: `packages/react-mastra/README.md`
**Purpose**: Basic package documentation and usage example
**Dependencies**: All components
**Implementation Notes**: Provide simple getting started guide

```markdown
# @assistant-ui/react-mastra

Mastra integration for assistant-ui.

## Installation

```bash
npm install @assistant-ui/react-mastra @mastra/core @mastra/memory
```

## Usage

```typescript
import { useMastraRuntime } from '@assistant-ui/react-mastra';

const runtime = useMastraRuntime({
  agentId: 'chef-agent',
  api: 'http://localhost:4111/api/agents/chefAgent/stream'
});
```

## API Reference

### useMastraRuntime

Main runtime hook for Mastra integration.

**Parameters:**
- `config.agentId`: ID of the Mastra agent to use
- `config.api`: API endpoint for agent streaming
- `config.onError`: Optional error handler
- `config.adapters`: Optional adapters for attachments, feedback, etc.

**Returns:** AssistantRuntime instance
```

### 6. Basic Testing Infrastructure

#### 6.1 Runtime Hook Test
**File**: `packages/react-mastra/src/useMastraRuntime.test.tsx`
**Purpose**: Test core runtime hook functionality
**Dependencies**: useMastraRuntime.ts
**Implementation Notes**: Test basic initialization and error handling

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMastraRuntime } from './useMastraRuntime';

describe('useMastraRuntime', () => {
  it('should initialize runtime with config', () => {
    const config = {
      agentId: 'test-agent',
      api: 'http://localhost:4111/api/test-agent/stream',
    };

    const { result } = renderHook(() => useMastraRuntime(config));

    expect(result.current).toBeDefined();
    expect(result.current.isRunning).toBe(false);
  });

  it('should handle errors when provided', async () => {
    const onError = vi.fn();
    const config = {
      agentId: 'test-agent',
      api: 'http://invalid-url',
      onError,
    };

    renderHook(() => useMastraRuntime(config));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });
});
```

#### 6.2 Message Converter Test
**File**: `packages/react-mastra/src/convertMastraMessages.test.ts`
**Purpose**: Test message conversion functionality
**Dependencies**: convertMastraMessages.ts
**Implementation Notes**: Test conversion between Mastra and assistant-ui formats

```typescript
import { describe, it, expect } from 'vitest';
import { MastraMessageConverter } from './convertMastraMessages';
import type { MastraMessage } from './types';

describe('MastraMessageConverter', () => {
  it('should convert simple text message', () => {
    const mastraMessage: MastraMessage = {
      type: 'assistant',
      content: 'Hello, world!',
    };

    const result = MastraMessageConverter.useThreadMessages({
      isRunning: false,
      messages: [mastraMessage],
    });

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual([{ type: 'text', text: 'Hello, world!' }]);
  });

  it('should handle content arrays', () => {
    const mastraMessage: MastraMessage = {
      type: 'assistant',
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'reasoning', reasoning: 'I should greet them' },
      ],
    };

    const result = MastraMessageConverter.useThreadMessages({
      isRunning: false,
      messages: [mastraMessage],
    });

    expect(result).toHaveLength(1);
    expect(result[0].content).toHaveLength(2);
  });
});
```

## Success Criteria

### Automated Verification:
- [x] Package builds successfully: `cd packages/react-mastra && npm run build`
- [x] TypeScript compilation passes: `cd packages/react-mastra && npm run typecheck`
- [x] Linting passes: `cd packages/react-mastra && npm run lint`
- [x] Unit tests pass: `cd packages/react-mastra && npm run test`
- [x] Package installs in workspace: `pnpm install` (from root)
- [x] Monorepo build includes package: `pnpm run build` (from root)
- [x] Package exports load correctly: `node -e "require('@assistant-ui/react-mastra')"`

### Manual Verification:
- [x] Runtime hook initializes without errors
- [x] Basic configuration object is accepted
- [x] Error handler is called when provided
- [x] Package can be imported in example project
- [x] TypeScript types are available and correct
- [x] Documentation is clear and accurate

## Risk Mitigation

### Technical Risks:
1. **Mastra API Changes**: Mitigate by focusing on stable, documented APIs
2. **Streaming Protocol Complexity**: Start with basic SSE handling, enhance in Phase 2
3. **Message Format Differences**: Focus on basic text messages, complex content in Phase 2

### External Dependencies:
1. **@mastra/core Version**: Use flexible version ranges and test compatibility
2. **React Version Compatibility**: Follow established peer dependency patterns
3. **Node.js Environment**: Ensure compatibility with existing monorepo setup

### Rollback Strategy:
1. **Package Removal**: Can safely remove package if critical issues arise
2. **Generic Approach**: Users can fall back to existing generic HTTP approach
3. **Incremental Implementation**: Phase-based approach allows stopping at any point

## Dependencies and Prerequisites

### Must Be Completed Before Phase 1:
- None (this is the foundation phase)

### External Dependencies:
- **@mastra/core**: Latest stable version for basic agent functionality
- **@mastra/memory**: Latest stable version for future memory integration
- **@assistant-ui/react**: Current stable version for runtime integration
- **React 18/19**: Compatible React version for hooks

### Tools and Environment:
- **Node.js 18+**: Required for modern TypeScript and ESM
- **pnpm**: Package manager for monorepo
- **Turbo**: Build orchestration tool
- **Vitest**: Testing framework
- **TypeScript**: Type checking and compilation

### Knowledge Requirements:
- Understanding of established integration patterns (AI SDK, LangGraph)
- Familiarity with Mastra's basic agent API
- Knowledge of React hooks and streaming protocols

## Testing Strategy

### Unit Tests:
- Runtime hook initialization and configuration
- Message converter functionality
- Error handling scenarios
- Type safety validation

### Integration Tests:
- Basic streaming communication (mocked)
- Message format conversion end-to-end
- Error propagation through the runtime

### Manual Testing Steps:
1. Create test Next.js application
2. Install and configure useMastraRuntime
3. Test basic message sending and receiving
4. Verify error handling behavior
5. Validate TypeScript usage

## Performance Considerations

### Streaming Performance:
- Efficient event parsing and message accumulation
- Minimal re-renders during streaming
- Proper cleanup of resources

### Memory Usage:
- Message accumulator should not grow indefinitely
- Proper cleanup of event listeners
- Efficient message conversion

### Bundle Size:
- Tree-shaking support through proper exports
- Minimal dependencies for Phase 1
- Efficient message conversion logic

## Migration Notes

### From Generic HTTP Approach:
Users currently using `useDataStreamRuntime` can migrate by:

1. Install new package: `npm install @assistant-ui/react-mastra`
2. Replace runtime hook: `useMastraRuntime` instead of `useDataStreamRuntime`
3. Update configuration to use Mastra-specific options
4. Remove manual HTTP endpoint handling

### Backward Compatibility:
- Phase 1 maintains feature parity with existing generic approach
- No breaking changes to existing assistant-ui APIs
- Gradual migration path for existing users

## References

- Original research: `notes/research/mastra_integration_requirements.md`
- Integration patterns: `packages/react-langgraph/`, `packages/react-ai-sdk/`
- Core runtime: `packages/react/src/legacy-runtime/runtime-cores/external-store/`
- Message conversion: `packages/react/src/legacy-runtime/runtime-cores/external-store/external-message-converter.tsx`
- Build patterns: `packages/react-langgraph/package.json`, `packages/react-ai-sdk/scripts/build.mts`