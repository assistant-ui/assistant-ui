# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies (use pnpm, requires Node.js >=24)
pnpm install

# Initial build (required before development - packages depend on each other's outputs)
pnpm build

# Run docs site in development
pnpm docs:dev

# Run an example in development
cd examples/<example-name>
pnpm dev

# Lint (uses Biome)
pnpm lint
pnpm lint:fix

# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @assistant-ui/react test
pnpm --filter @assistant-ui/react test:watch  # watch mode

# Build specific packages
pnpm turbo build --filter=@assistant-ui/react
```

## Changesets

Every PR that changes published packages must include a changeset:

```bash
pnpm changeset
```

This does NOT apply to private packages like `@assistant-ui/docs` or `@assistant-ui/shadcn-registry`.

## Architecture Overview

### Monorepo Structure

- **packages/**: Published npm packages
- **apps/**: Internal applications (docs, registry, devtools)
- **examples/**: Example implementations for various integrations

### Core Packages

**`@assistant-ui/react`** - Main React component library
- `primitives/`: Radix-style composable UI primitives (ActionBarPrimitive, ComposerPrimitive, ThreadPrimitive, MessagePrimitive, etc.)
- `context/`: React context providers and hooks for accessing runtime state
- `legacy-runtime/`: Runtime system with different adapters
  - `runtime/`: Type definitions for AssistantRuntime, ThreadRuntime, MessageRuntime, etc.
  - `runtime-cores/`: Core implementations
    - `local/`: useLocalRuntime - for in-browser chat with a ChatModelAdapter
    - `external-store/`: useExternalStoreRuntime - for custom message stores
    - `remote-thread-list/`: Thread list management with persistence adapters
- `model-context/`: Tool registration and model context (useAssistantTool, makeAssistantTool)

**`assistant-stream`** - Streaming protocol and utilities
- `AssistantStream`: Core streaming class
- `DataStreamEncoder/Decoder`: For AI SDK data stream format
- `AssistantTransportEncoder/Decoder`: For assistant-ui's native transport format
- Tool definitions and accumulators

### Integration Packages

- **`@assistant-ui/react-ai-sdk`**: Vercel AI SDK integration
  - `useChatRuntime()`: Connect to AI SDK's useChat
  - `useAISDKRuntime()`: Lower-level AI SDK runtime

- **`@assistant-ui/react-langgraph`**: LangGraph integration
  - `useLangGraphRuntime()`: Connect to LangGraph agents
  - `useLangGraphMessages()`: Message handling utilities

- **`@assistant-ui/react-markdown`**: Markdown rendering
- **`@assistant-ui/react-syntax-highlighter`**: Code highlighting
- **`@assistant-ui/styles`**: Pre-built CSS for non-Tailwind users

### Runtime Architecture

The runtime system follows a layered architecture:

1. **RuntimeCore**: Internal implementation (LocalRuntimeCore, ExternalStoreRuntimeCore)
2. **Runtime**: Public API exposed via hooks (AssistantRuntime, ThreadRuntime, MessageRuntime)
3. **Context hooks**: useAssistantRuntime(), useThreadRuntime(), useMessageRuntime()
4. **Primitives**: UI components that consume runtime state

Runtimes manage:
- Thread state (messages, status, capabilities)
- Composer state (input, attachments)
- Message branching and editing
- Tool execution and UI rendering

### Build System

- **Turbo**: Monorepo task orchestration
- **`@assistant-ui/x-buildutils`**: Internal build tool (`aui-build` command)
- **Biome**: Linting and formatting (replaces ESLint/Prettier)
- **Vitest**: Testing framework
