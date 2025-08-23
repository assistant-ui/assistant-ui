# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Package Management

- **Install dependencies**: `pnpm install`
- **Initial build** (required before development): `pnpm turbo build`

### Development

- **Run docs locally**: `cd apps/docs && pnpm dev`
- **Run examples**: `cd examples/<example-name> && pnpm dev`
- **Run any package in dev mode**: `cd packages/<package-name> && pnpm dev`

### Testing & Quality

- **Run tests**: `pnpm test` (from root or individual packages)
- **Run tests in watch mode**: `pnpm test:watch` (in packages that support it)
- **Lint code**: `pnpm lint` (available in individual packages)
- **Build packages**: `pnpm turbo build` (from root) or `pnpm build` (from individual package)
- **Check types**: `pnpm typecheck` (where available)
- **Run prettier**: `pnpm prettier:fix` (from root to fix formatting)

### Contributing

- **Create changeset**: `pnpm changeset` (required for all package changes)
- **Version packages**: `pnpm ci:version`
- **Publish packages**: `pnpm ci:publish`

## Architecture Overview

### Core Architecture

assistant-ui is a TypeScript/React library for building AI chat interfaces. It follows a multi-layered architecture:

1. **Runtime Layer** (`packages/react/src/api/`): Core abstractions that manage state and behavior
   - `AssistantRuntime`: Main runtime coordinating all chat operations
   - `ThreadRuntime`: Manages conversation threads
   - `ComposerRuntime`: Handles message composition
   - `MessageRuntime`: Individual message state management

2. **Client Layer** (`packages/react/src/client/`): New abstraction layer being developed
   - `AssistantClient`: Client-side assistant management
   - `ThreadClient`: Thread operations client
   - `ThreadListClient`: Thread list management

3. **Context Layer** (`packages/react/src/context/`): React context providers and hooks
   - Provides React bindings for runtime components
   - Manages state subscriptions and updates

4. **Primitives Layer** (`packages/react/src/primitives/`): Headless UI components
   - Composable, unstyled components following Radix UI patterns
   - Components like Thread, Message, Composer, ActionBar, etc.

### Package Structure

- **@assistant-ui/react**: Main React library with primitives and runtimes
- **@assistant-ui/react-ai-sdk**: Integration with Vercel AI SDK
- **@assistant-ui/react-langgraph**: LangGraph integration
- **@assistant-ui/cloud**: Cloud persistence and authentication
- **@assistant-ui/tap**: Custom reactive state management library (see detailed section below)
- **@assistant-ui/assistant-stream**: Streaming utilities for assistant responses
- **@assistant-ui/react-markdown**: Markdown rendering with memoization
- **@assistant-ui/styles**: CSS styles and themes

### Key Design Patterns

1. **Runtime/Provider Pattern**: Runtimes handle logic, providers expose to React
2. **Primitive Components**: Unstyled, composable components (like Radix UI)
3. **Subscribable Pattern**: Custom subscription system for state management
4. **Adapter Pattern**: Various adapters for different AI providers (AI SDK, LangGraph, etc.)

### Integration Points

- **AI SDK Integration**: First-class support through adapters in `react-ai-sdk` package
- **LangGraph Integration**: Streaming and message conversion in `react-langgraph`
- **Cloud Persistence**: Optional cloud storage via `assistant-cloud` environment variable
- **External Store**: Support for custom backends via `ExternalStoreAdapter`

### Build System

- Uses Turbo for monorepo management
- Custom build scripts using esbuild (see `scripts/build.mts` in packages)
- Changesets for version management and publishing

## The @assistant-ui/tap Package

### Overview

`@assistant-ui/tap` is a zero-dependency reactive state management library that brings React's hooks mental model to state management outside of React components. It's a critical foundation for assistant-ui's new client layer architecture.

### Why tap?

The tap package was created to solve a specific architectural challenge: managing complex state and side effects in a React-like way, but outside of React components. This enables:

- Framework-agnostic state management that can work with or without React
- Consistent mental model across the entire codebase
- Automatic lifecycle management and cleanup
- Fine-grained reactivity without React's re-render overhead

### Core Concepts

1. **Resources**: Self-contained units of reactive state and logic, similar to React components but without UI

   ```typescript
   const MyResource = resource((props) => {
     const [state, setState] = tapState(initialValue);
     tapEffect(() => {
       /* side effects */
     }, [deps]);
     return { state, setState };
   });
   ```

2. **Hooks**: Identical API to React hooks but work inside resources
   - `tapState`: Like useState
   - `tapEffect`: Like useEffect with automatic cleanup
   - `tapMemo`: Like useMemo for expensive computations
   - `tapCallback`: Like useCallback for stable callbacks
   - `tapRef`: Like useRef for mutable references
   - `tapResource`: Compose resources together
   - `tapResources`: Render lists of resources with keys

### Usage in assistant-ui

The tap package is primarily used in the new client layer (`packages/react/src/client/`):

1. **AssistantClient**: Uses `tapResource` to compose ThreadListClient and manage assistant state
2. **ThreadClient**: Manages individual thread state using tap hooks
3. **ThreadListClient**: Handles thread list operations with reactive state
4. **Utility Hooks**:
   - `tapSubscribable`: Subscribes to runtime observables
   - `tapRefValue`: Keeps ref values in sync

### Example from the Codebase

```typescript
// From AssistantClient.ts
export const AssistantClient = resource(
  ({ runtime }: { runtime: AssistantRuntime }) => {
    const threads = tapResource(ThreadListClient({ runtime: runtime.threads }));

    const state = tapMemo<AssistantClientState>(() => {
      return {
        threads: threads.state,
        thread: threads.state.main,
      };
    }, [threads.state]);

    // Returns store with state and actions
    return { state, actions };
  },
);
```

### Key Benefits for assistant-ui

1. **Separation of Concerns**: Business logic lives in resources, UI in React components
2. **Testability**: Resources can be tested without React
3. **Performance**: Fine-grained updates without React re-renders
4. **Consistency**: Same hooks API developers already know from React
5. **Type Safety**: Full TypeScript support with proper inference

### Migration Strategy

The tap package is part of a larger architectural migration where assistant-ui is moving from a tightly-coupled React architecture to a more modular client/runtime architecture. The new client layer (using tap) will eventually replace direct runtime usage in React components.

## Development Notes

- Always run `pnpm turbo build` after fresh clone before development
- Packages have interdependencies - build order matters
- Use changesets for any changes to published packages
- Examples in `/examples` directory showcase different integration patterns
- Documentation site in `/apps/docs` uses Fumadocs
