# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

### Package Management
- This repository uses **pnpm** as the package manager (v10.18.3)
- All packages are managed through workspace protocol in the monorepo

### Build System
- **Turbo** is used for build orchestration and caching
- Main build commands from root:
  - `pnpm run test` - Run all tests across packages
  - `pnpm run prettier` - Check formatting
  - `pnpm run prettier:fix` - Fix formatting issues
  - `pnpm run docs:dev` - Start documentation development server
  - `pnpm run ci:version` - Version packages using changesets
  - `pnpm run ci:publish` - Build and publish packages

### Individual Package Commands
Each package has its own scripts:
- `pnpm run build` - Build the package
- `pnpm run test` - Run tests (vitest)
- `pnpm run lint` - Run ESLint
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:mutation` - Run mutation testing with Stryker (available in select packages where configured)

## Codebase Architecture

### Monorepo Structure
This is a **monorepo** containing multiple packages:

#### Core Packages
- **`@assistant-ui/react`** - Main React library with core chat primitives
- **`assistant-stream`** - Streaming utilities for AI responses
- **`@assistant-ui/tap`** - Core utilities and helpers

#### Integration Packages
- **`@assistant-ui/react-ai-sdk`** - Vercel AI SDK integration
- **`@assistant-ui/react-langgraph`** - LangGraph integration
- **`@assistant-ui/react-data-stream`** - Data streaming utilities
- **`@assistant-ui/react-hook-form`** - React Hook Form integration
- **`@assistant-ui/react-markdown`** - Markdown rendering components
- **`@assistant-ui/react-syntax-highlighter`** - Code syntax highlighting

#### Tooling & Infrastructure
- **`@assistant-ui/cli`** - CLI tools
- **`@assistant-ui/cloud`** - Cloud services integration
- **`@assistant-ui/create-assistant-ui`** - Project scaffolding
- **`@assistant-ui/mcp-docs-server`** - MCP documentation server
- **`@assistant-ui/x-buildutils`** - Build utilities

#### Applications
- **`apps/docs`** - Documentation site
- **`apps/registry`** - Component registry

### Core Architecture - @assistant-ui/react

#### Runtime System
The library is built around a **runtime-based architecture** with multiple runtime types:

1. **AssistantRuntime** - Top-level runtime managing the entire assistant
2. **ThreadRuntime** - Manages individual conversation threads
3. **MessageRuntime** - Handles individual messages
4. **MessagePartRuntime** - Manages parts within messages (text, images, files, tool calls)
5. **ComposerRuntime** - Handles message composition and editing
6. **ThreadListRuntime** - Manages multiple threads
7. **AttachmentRuntime** - Handles file attachments

#### Component Architecture
Components follow a **primitive-based design** inspired by Radix UI:

- **Primitives** - Low-level unstyled components in `src/primitives/`
- **Context Providers** - State management in `src/context/`
- **Stores** - Zustand-based state stores
- **Types** - Comprehensive TypeScript definitions

Key primitive categories:
- `ThreadPrimitive` - Conversation thread container
- `MessagePrimitive` - Individual message display
- `MessagePartPrimitive` - Message content parts
- `ComposerPrimitive` - Message input and editing
- `AttachmentPrimitive` - File attachments
- `ThreadListPrimitive` - Thread list management

#### Message System
The message system supports various message part types:
- **Text** - Plain text content
- **Reasoning** - AI reasoning display
- **Source** - Citation/source references
- **Image** - Image attachments
- **File** - File attachments
- **Audio** - Audio attachments (unstable)
- **ToolCall** - Function/tool call results

### Backend Integration Patterns

#### AI SDK Integration
- First-class support for Vercel AI SDK
- Handles streaming responses automatically
- Works with any AI SDK-supported provider

#### LangGraph Integration
- Support for LangGraph and LangGraph Cloud
- Handles LangGraph's streaming protocol
- Supports LangChain provider ecosystem

#### Custom Backend Support
- Can work with any custom backend
- Extensible streaming protocol support
- Custom adapter pattern for different APIs

### Examples Structure
Examples demonstrate different integration patterns:
- `examples/with-ai-sdk-v5/` - AI SDK v5 integration
- `examples/with-langgraph/` - LangGraph integration
- `examples/with-cloud/` - Assistant Cloud integration
- `examples/with-react-hook-form/` - Form integration patterns
- `examples/with-ffmpeg/` - Audio/video processing
- `examples/with-assistant-transport/` - Custom transport layer

### Development Workflow

#### Building Packages
1. Changes to packages should include appropriate tests
2. Run `pnpm run build` from root to build all packages
3. Use `pnpm run test` to ensure all tests pass
4. Check formatting with `pnpm run prettier`

#### Versioning & Publishing
- Uses **Changesets** for versioning
- Run `pnpm run ci:version` to version packages
- Run `pnpm run ci:publish` to publish to npm

#### Testing
- **Vitest** for unit tests
- **Stryker** for mutation testing
- Tests should be run before building (`dependsOn: ["^build"]`)

### Key Dependencies
- **React 18+** with React 19 support
- **Radix UI** for primitive components
- **Zustand** for state management
- **Tailwind CSS** for styling
- **TypeScript** for type safety

### Environment Variables
Build process supports various environment variables (see turbo.json):
- `OPENAI_*` - OpenAI API configuration
- `ASSISTANT_*` - Assistant Cloud configuration
- `NEXT_PUBLIC_*` - Next.js public variables
- `KV_*`, `REDIS_*` - Database configurations
- `SENTRY_*` - Error tracking

### Code Style
- Uses **Prettier** with Tailwind CSS plugin
- ESLint for linting
- Trailing commas required
- Follows existing patterns in the codebase

