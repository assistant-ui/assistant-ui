# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Setup and Development
```bash
# Initial setup (uses PNPM v10.12.4)
pnpm install --frozen-lockfile

# Run documentation site
pnpm docs:dev

# Run tests across monorepo
pnpm test

# Run tests for specific package
pnpm --filter=@assistant-ui/react test
pnpm --filter=@assistant-ui/react test:watch

# Check code formatting
pnpm prettier

# Fix code formatting
pnpm prettier:fix

# Build all packages
pnpm turbo build --filter="./packages/*"

# Lint specific package
pnpm --filter=@assistant-ui/react lint
```

### Publishing and Versioning
```bash
# Create changesets for version updates
pnpm ci:version

# Build and publish packages
pnpm ci:publish
```

## Architecture Overview

assistant-ui is a monorepo TypeScript/React library for building AI chat interfaces. It follows a primitive component architecture inspired by Radix UI and shadcn/ui.

### Core Design Principles
- **Composable Primitives**: Instead of monolithic components, provides small, focused components that combine flexibly
- **Runtime Abstraction**: Supports multiple backends (AI SDK, LangGraph, custom) through adapter pattern
- **Stream-based Architecture**: Real-time handling of AI responses with custom streaming protocol
- **Provider Pattern**: Extensive use of React Context for state management via Zustand stores

### Key Packages
- `@assistant-ui/react` - Core React primitives and runtime system
- `@assistant-ui/react-ai-sdk` - Vercel AI SDK integration
- `@assistant-ui/react-langgraph` - LangGraph/LangChain integration
- `assistant-stream` - Core streaming utilities and protocol
- `@assistant-ui/cloud` - Cloud persistence and analytics

### Runtime System
The runtime system (`AssistantRuntime`, `ThreadRuntime`, etc.) acts as the central state management layer. All UI components interact with the runtime through context providers. The runtime handles:
- Message state and history
- Streaming updates and accumulation
- Tool calls and UI rendering
- Thread management and branching
- External store synchronization

### Component Architecture
Components follow a consistent pattern:
1. **Primitive Components** in `/primitives` - Core UI building blocks
2. **Runtime Integration** via hooks that connect to the runtime system
3. **Context Providers** that expose runtime state to child components
4. **Composable APIs** allowing full customization while handling complexity

### Stream Protocol
The `assistant-stream` package defines the streaming protocol for real-time AI responses. Messages flow through:
1. Backend sends `AssistantStreamChunk` objects
2. Stream chunks are accumulated into messages
3. Runtime notifies UI components of updates
4. Components re-render with new content

This architecture ensures smooth streaming, proper error handling, and consistent state across the application.