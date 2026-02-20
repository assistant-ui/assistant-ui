# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies (use pnpm, requires Node.js >=24, pnpm 10.28.2)
pnpm install

# Initial build (required before development - packages depend on each other's outputs)
pnpm build

# Build specific packages (includes upstream deps via ^build)
pnpm turbo build --filter=@assistant-ui/react

# Run docs site in development
pnpm docs:dev

# Run an example in development (note: use PORT= not --port for Next.js)
PORT=3001 pnpm --filter=example-name dev

# Lint (uses Biome)
pnpm lint
pnpm lint:fix

# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @assistant-ui/react test
pnpm --filter @assistant-ui/react test:watch  # watch mode
```

## Changesets

Every PR that changes published packages must include a changeset:

```bash
pnpm changeset
```

This does NOT apply to private packages like `@assistant-ui/docs`, `@assistant-ui/shadcn-registry`, or `@assistant-ui/x-buildutils`.

## Code Style & Linting

Biome enforces all formatting and linting. Key rules:
- **Tailwind class sorting**: `useSortedClasses` is ERROR level — applies to `className`, `clsx`, `cva`, `tw`, `twMerge`, `cn`, `twJoin`, `tv`
- **Exhaustive dependencies**: ERROR level — includes custom `tap*` hooks (`tapEffect`, `tapMemo`, `tapCallback`, etc.)
- Double quotes, semicolons, trailing commas, 80-char line width
- Pre-commit hook runs `biome check --fix` via lint-staged on all changed files

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
- Serialization formats: `DataStream` (AI SDK format), `AssistantTransport` (native format), `UIMessageStream`
- Tool definitions, accumulators, and partial JSON parsing

**`@assistant-ui/tap`** - Zero-dependency reactive state management (internal)
- React hooks-inspired API: `tapState`, `tapEffect`, `tapMemo`, `tapCallback`, `tapRef`
- Used internally for runtime state management

**`@assistant-ui/store`** - Tap-based state management layer for React (internal)
- Bridges `@assistant-ui/tap` with React components
- `useAui`, `useAuiState`, `useAuiEvent` hooks

**`@assistant-ui/react-native`** - React Native bindings (new)
- Mirrors the React package structure (primitives, hooks, context, runtimes)
- Depends on `@assistant-ui/core` for shared logic

### Integration Packages

- **`@assistant-ui/react-ai-sdk`**: Vercel AI SDK integration (`useChatRuntime()`, `useAISDKRuntime()`)
- **`@assistant-ui/react-langgraph`**: LangGraph integration
- **`@assistant-ui/react-data-stream`**: Data stream protocol runtime
- **`@assistant-ui/react-ag-ui`**: AG-UI protocol integration
- **`@assistant-ui/react-a2a`**: A2A (Agent-to-Agent) protocol integration
- **`@assistant-ui/react-hook-form`**: React Hook Form integration
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

- **Turbo**: Monorepo task orchestration (`test` depends on `^build`)
- **`@assistant-ui/x-buildutils`**: Internal build tool (`aui-build` command)
  - TypeScript compiler-based, handles extension rewriting (→ `.js`) and package sub-path rewriting
- **Biome**: Linting and formatting (replaces ESLint/Prettier)
- **Vitest**: Unit testing (globals enabled, `passWithNoTests` in some packages)

### Package Exports Convention

All packages use a custom `aui-source` export condition for monorepo development:
```json
"exports": {
  ".": {
    "aui-source": "./src/index.ts",
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  }
}
```
This lets packages reference source directly during development. The `aui-build` tool strips `aui-source` when building for publish.
