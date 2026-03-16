---
date: 2025-09-25 12:16:43 -0700
researcher: Claude Code
git_commit: f04fe696
branch: main
repository: assistant-ui
topic: "How can I manually test fixes and changes I make?"
tags: [research, codebase, testing, development, manual-testing]
status: complete
last_updated: 2025-09-25
last_updated_by: Claude Code
---

# Research: Manual Testing Workflows for assistant-ui

**Date**: 2025-09-25 12:16:43 -0700
**Researcher**: Claude Code
**Git Commit**: f04fe696
**Branch**: main
**Repository**: assistant-ui

## Research Question
How can I manually test fixes and changes I make?

## Summary
The assistant-ui monorepo provides comprehensive manual testing capabilities through 8 example applications, automated testing infrastructure, and a development workflow that allows testing local changes before publishing. Key approaches include running example apps with local workspace packages, using development servers, and leveraging the monorepo's build system for testing changes across different integration patterns.

## Detailed Findings

### Testing Infrastructure

#### Test Framework and Tools
- **Primary Framework**: Vitest used across all packages for JavaScript/TypeScript testing
- **Mutation Testing**: Stryker (used in @assistant-ui/react package)
- **Build System**: Turbo for orchestration and caching
- **Package Manager**: pnpm v10.14.0 with workspace protocol

#### Test Commands
```bash
# Run all tests across packages
pnpm test

# Run tests for specific package
cd packages/react
pnpm test          # Run once
pnpm test:watch    # Watch mode
pnpm test:mutation # Mutation testing

# Run tests with filter from root
pnpm --filter=@assistant-ui/react test
```

#### Test Configuration
- **Configuration Files**: `vitest.config.ts` in each package
- **Test Dependencies**: Tests depend on builds completing first (`turbo.json`)
- **Setup Files**: Global test setup for deterministic testing (fixed dates, mocking)

### Example Applications for Manual Testing

#### Available Examples (8 total)
1. **with-ai-sdk-v5** - Vercel AI SDK v5 integration
2. **with-assistant-transport** - Custom backend using assistant-transport protocol
3. **with-cloud** - Assistant Cloud integration (managed chat persistence)
4. **with-external-store** - External store runtime pattern
5. **with-ffmpeg** - Audio/video processing with FFmpeg
6. **with-langgraph** - LangGraph/LangChain integration
7. **with-parent-id-grouping** - Message grouping with parent IDs
8. **with-react-hook-form** - Form integration patterns

#### Development Server Setup
```bash
# Navigate to example directory
cd examples/with-ai-sdk-v5

# Install dependencies
pnpm install

# Start development server (port 3000)
pnpm dev
```

#### Workspace Integration
Examples use workspace protocol (`workspace:*`) to reference local packages, enabling testing of unpublished changes:
```json
{
  "dependencies": {
    "@assistant-ui/react": "workspace:*",
    "@assistant-ui/react-ai-sdk": "workspace:*"
  }
}
```

### Development Workflow

#### Step-by-Step Testing Process
1. **Initial Setup**
   ```bash
   pnpm install                    # Install all dependencies
   pnpm turbo build               # Initial build
   ```

2. **Make Changes**
   - Edit files in `/packages/*/src/`
   - Changes are automatically available to examples via workspace

3. **Test Changes**
   ```bash
   # Rebuild packages
   pnpm turbo build

   # Test in relevant example
   cd examples/with-ai-sdk-v5
   pnpm dev                      # Start dev server
   ```

4. **Run Tests**
   ```bash
   # All tests
   pnpm test

   # Specific package tests
   cd packages/react && pnpm test:watch
   ```

#### Environment Configuration
- **API Keys**: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- **Backend URLs**: `NEXT_PUBLIC_API_URL`
- **Assistant IDs**: `NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID`
- **Template**: Copy `.env.example` to `.env.local`

### Integration Testing Patterns

#### AI SDK Integration Testing
- **Location**: `examples/with-ai-sdk-v5/`
- **Features**: Tool calling, streaming, system message forwarding
- **Backend**: Anthropic/OpenAI via Vercel AI SDK v5

#### LangGraph Integration Testing
- **Location**: `examples/with-langgraph/`
- **Features**: LangGraph Stockbroker demo integration
- **Command**: `next dev --turbo` for enhanced performance

#### Custom Backend Testing
- **Location**: `examples/with-assistant-transport/`
- **Features**: Any backend implementing assistant-transport protocol
- **Configuration**: Point `NEXT_PUBLIC_API_URL` to custom backend

### Quality Assurance Tools

#### Code Quality
```bash
# Check formatting
pnpm run prettier

# Fix formatting
pnpm run prettier:fix

# Run linting
pnpm run lint          # Root level
cd packages/react && pnpm lint  # Package level
```

#### Integration Testing
- **Real API Testing**: `packages/react/INTEGRATION_TEST_README.md`
- **Test Script**: `packages/react/scripts/test-integration.sh`
- **Environment**: Requires `AUI_API_KEY`, `AUI_USER_ID`, `AUI_WORKSPACE_ID`

## Code References

### Core Configuration Files
- `package.json:5-26` - Root scripts and dependencies
- `turbo.json:12-22` - Build and test task configuration
- `pnpm-workspace.yaml:1-5` - Workspace package definitions

### Testing Infrastructure
- `packages/react/vitest.config.ts:1-12` - Vitest configuration
- `packages/react/stryker.config.mjs:1-15` - Mutation testing setup
- `packages/react/src/tests/setup.ts:1-8` - Global test setup

### Example Applications
- `examples/with-ai-sdk-v5/package.json:6-20` - AI SDK example configuration
- `examples/with-langgraph/package.json:6-20` - LangGraph example setup
- `examples/with-ai-sdk-v5/README.md:1-50` - Example documentation

### Development Guides
- `CONTRIBUTING.md:1-100` - Contributing guidelines
- `CLAUDE.md:1-150` - Claude Code development instructions
- `packages/react/INTEGRATION_TEST_README.md:1-80` - Integration testing guide

## Architecture Insights

#### Monorepo Structure
- **Workspace Protocol**: Enables testing local changes without publishing
- **Build Dependencies**: Tests depend on upstream builds completing first
- **Turbo Orchestration**: Handles build caching and task execution

#### Testing Strategy
- **Unit Tests**: Core utilities and runtime systems
- **Integration Tests**: Real API validation with live endpoints
- **Manual Testing**: Example applications provide comprehensive test environments
- **Mutation Testing**: Validates test coverage effectiveness

#### Package Dependencies
- **Core Packages**: `@assistant-ui/react`, `assistant-stream`, `@assistant-ui/tap`
- **Integration Packages**: `@assistant-ui/react-ai-sdk`, `@assistant-ui/react-langgraph`
- **Examples**: Reference workspace packages for local testing

## Historical Context (from notes/)
No relevant historical notes found for this research topic.

## Related Research
No related research documents found in notes/ directory.

## Open Questions
1. Are there additional testing frameworks or tools not covered in the current infrastructure?
2. How does the team handle testing across different React versions?
3. Are there plans for end-to-end testing with tools like Playwright or Cypress?
4. What's the strategy for testing accessibility and responsive design?

## Manual Testing Best Practices

### For Core Package Changes
1. **Make Changes**: Edit files in `/packages/*/src/`
2. **Rebuild**: Run `pnpm turbo build`
3. **Test**: Run relevant example application
4. **Validate**: Test multiple integration patterns

### For Integration Changes
1. **Update Integration**: Modify files in integration packages
2. **Test Integration**: Run corresponding example application
3. **Verify Backend**: Test with actual backend services
4. **Check Streaming**: Validate real-time response handling

### For UI/Visual Changes
1. **Update Components**: Modify React components and styles
2. **Test Examples**: Verify changes work across multiple examples
3. **Check Responsive**: Test on different screen sizes
4. **Validate Accessibility**: Test with screen readers and keyboard navigation