# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Setup and Development
```bash
# Initial setup (uses PNPM)
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

### Monorepo Structure (1000+ files)
```
packages/
├── @assistant-ui/react          # Core primitives & runtime
├── assistant-stream             # Streaming protocol & utilities
├── @assistant-ui/react-*        # Integration packages (ai-sdk, langgraph, etc.)
├── @assistant-ui/styles         # CSS styles package
└── @assistant-ui/cli            # CLI for scaffolding

apps/
├── docs/                        # Documentation site (Next.js)
└── registry/                    # Component registry (shadcn-style)

examples/                        # Multiple example implementations
```

### Key Packages
- `@assistant-ui/react` - Core React primitives and runtime system
- `@assistant-ui/react-ai-sdk` - Vercel AI SDK integration
- `@assistant-ui/react-langgraph` - LangGraph/LangChain integration
- `assistant-stream` - Core streaming utilities and protocol
- `@assistant-ui/cloud` - Cloud persistence and analytics

### Runtime System
The runtime system acts as the central abstraction layer with core runtime types:
- **AssistantRuntime**: Top-level runtime managing the entire assistant
- **ThreadRuntime**: Manages a single conversation thread (messages, state, backend interaction)
- **MessageRuntime**: Controls individual message operations (edit, reload, feedback)
- **ComposerRuntime**: Handles user input and message composition
- **ThreadListRuntime**: Decorator that adds multi-thread management to any ThreadRuntime

Runtime implementations:
- `LocalRuntime` - Self-contained runtime with built-in state management
- `ExternalStoreRuntime` - Bridge pattern allowing you to bring your own state management
- `RemoteThreadListRuntime` - Wrapper that adds multi-thread capabilities to any runtime

### Component Registry (shadcn-style)
Components are distributed via a registry system at `https://r.assistant-ui.com`:
```bash
# Add components to your project
npx assistant-ui add thread
npx assistant-ui add assistant-modal
```
Components are copied directly into the user's codebase for full customization.

Registry source located in `apps/registry/` with components using `aui-*` classes for dual compatibility.

### Styling System
- **Dual Compatibility**: Uses `aui-*` prefixed classnames for universal compatibility
- **Build Process**: Tailwind classes in `packages/styles/src/styles/tailwindcss/` are transpiled to:
  - Pure CSS for non-Tailwind users (in `dist/styles/`)
  - JSON mappings for Tailwind users to replace `aui-*` classes
- **Registry Components**: Use `aui-*` classes that work with both CSS and Tailwind builds

### Primitive Component Pattern
Primitives follow naming convention: `[Type]Primitive[Component]`
- `ThreadPrimitive.Root`, `ThreadPrimitive.Viewport`
- `MessagePrimitive.Root`, `MessagePrimitive.Content`
- `ComposerPrimitive.Root`, `ComposerPrimitive.Input`

Key primitive features:
- Styled via `@assistant-ui/styles` package with `aui-` prefixed classes
- Data-attribute based state styling (`data-active`, `data-floating`, etc.)
- Intelligent state management (hover, focus, auto-scroll)
- Conditional rendering with `.If` components
- Built on Radix UI primitives for accessibility

### Runtime Adapters
Different runtime hooks for different use cases:
```tsx
// LocalRuntime - Built-in state management
const runtime = useLocalRuntime(adapter);

// ExternalStoreRuntime - Bring your own state
const runtime = useExternalStoreRuntime({
  messages,
  isRunning,
  onNew: async (message) => { /* handle new message */ },
  convertMessage: (msg) => ({ /* convert to assistant-ui format */ }),
});

// AI SDK integration (uses ExternalStore internally)
const runtime = useChatRuntime(chatApi);

// LangGraph integration
const runtime = useLangGraphRuntime(config);
```

### Stream Protocol
The `assistant-stream` package defines the streaming protocol:
1. Backend sends `AssistantStreamChunk` objects
2. Chunks include: `type`, `value`, and optional metadata
3. Accumulator system builds up messages from chunks
4. Runtime notifies UI components of updates
5. Components re-render with smooth streaming

### Tool System
- **Tool Calls**: Map LLM tool calls to custom UI components
- **Frontend Tools**: Let LLMs execute actions in the frontend
- **Human-in-the-loop**: Approval flows for sensitive operations
- Tools are registered via `makeAssistantTool()` and `makeAssistantToolUI()`

### Important Concepts
- **"Thread"**: A logical conversation context, NOT an OS thread. Each thread represents a separate conversation with its own message history.
- **Runtime Composition**: Runtimes can be wrapped/decorated. RemoteThreadListRuntime wraps any ThreadRuntime to add multi-thread support.
- **State Ownership**: LocalRuntime owns state internally, ExternalStoreRuntime lets YOU own state.
- **Message Conversion**: ExternalStore provides `convertMessage` to adapt between your message format and assistant-ui's format.

This architecture ensures smooth streaming, proper error handling, and consistent state across the application while providing maximum flexibility for customization.

### Resources
- [assistant-ui DeepWiki](https://deepwiki.com/assistant-ui/assistant-ui/1-overview)
- [assistant-ui Docs](https://assistant-ui.com/docs)
- [assistant-ui GitHub](https://github.com/assistant-ui/assistant-ui)
- [assistant-ui starter template](https://github.com/assistant-ui/assistant-ui-starter)
- [assistant-ui mcp starter template](https://github.com/assistant-ui/assistant-ui-starter-mcp)
- [assistant-ui langgraph starter template](https://github.com/assistant-ui/assistant-ui-starter-langgraph)
