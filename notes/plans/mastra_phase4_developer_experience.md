# Phase 4: Mastra Developer Experience Implementation Plan

## Overview

Phase 4 focuses on creating excellent developer experience for the Mastra integration by implementing CLI integration, comprehensive examples, and complete documentation. This phase transforms Mastra from a technically working integration into a first-class, easily discoverable, and well-supported framework option that achieves developer experience parity with AI SDK and LangGraph integrations.

**Success Criteria**: Reduce setup time from 7+ manual steps to 1 line of code, provide comprehensive examples and documentation, and enable automatic CLI-based installation and configuration.

## Current State Analysis

**What exists now**:
- Comprehensive Mastra documentation in `apps/docs/content/docs/runtimes/mastra/`
- CLI integration patterns established for AI SDK (`packages/cli/src/lib/install-ai-sdk-lib.ts`)
- Example application patterns for AI SDK and LangGraph integrations
- Documentation structure and patterns well-defined in the docs site

**What's missing**:
- CLI integration for Mastra package detection and installation
- Working example applications demonstrating Mastra integration
- Updated documentation referencing the new dedicated package
- Migration guide from generic to dedicated integration
- CLI support for automatic Mastra project setup

**Key constraints discovered**:
- Must follow established CLI patterns in `packages/cli/`
- Examples must be complete, working applications
- Documentation must maintain consistency with existing patterns
- Need to handle Mastra's unique requirements (agents, memory, workflows)

## Desired End State

A complete developer experience ecosystem that provides:
- Automatic CLI detection: `npx assistant-ui add` automatically suggests Mastra integration
- One-command setup: `npx assistant-ui init --template=mastra` creates complete Mastra project
- Comprehensive examples: `examples/with-mastra/` demonstrating all major Mastra features
- Complete documentation: API reference, integration guides, and migration instructions
- Developer experience parity with AI SDK and LangGraph integrations

### Key Discoveries:
- CLI integration follows well-established patterns in `packages/cli/src/lib/install-*.ts:40-92`
- Examples should follow the comprehensive pattern in `examples/with-langgraph/app/MyRuntimeProvider.tsx:13-38`
- Documentation already exists but needs updating for new package structure
- Mastra's unique features (agents, memory, workflows) require specialized examples

## What We're NOT Doing

- Creating new CLI patterns (must follow existing patterns)
- Implementing core runtime functionality (handled in phases 1-3)
- Modifying existing AI SDK or LangGraph integrations
- Creating new documentation platforms (use existing docs structure)
- Implementing Mastra backend functionality (focus on frontend integration)

## Implementation Approach

Follow the established assistant-ui patterns for developer experience:
1. **CLI Integration**: Implement `install-mastra-lib.ts` following AI SDK pattern
2. **Example Applications**: Create comprehensive examples following LangGraph pattern
3. **Documentation Updates**: Update existing docs to reference new package
4. **Migration Support**: Provide smooth transition from generic to dedicated integration
5. **Template Integration**: Add Mastra template to create command

## Phase 4 Implementation Breakdown

### Sub-Phase 4.1: CLI Integration Implementation

#### Overview
Integrate Mastra package detection and installation into the assistant-ui CLI, enabling automatic discovery and setup of Mastra integrations.

#### Changes Required:

##### 1. CLI Package Detection and Installation
**File**: `packages/cli/src/lib/install-mastra-lib.ts`
**Changes**: Create new file following the established pattern from `install-ai-sdk-lib.ts:40-92`

```typescript
// Pattern from install-ai-sdk-lib.ts
export function isMastraInstalled(): boolean {
  return isPackageInstalled("@mastra/core") ||
         isPackageInstalled("@mastra/memory");
}

export async function addMastraPackage(options: AddOptions) {
  // Follow AI SDK pattern for:
  // - Package detection in codebase
  // - User confirmation prompts
  // - Package manager detection
  // - Dependency installation
  // - Configuration file generation
}
```

##### 2. CLI Command Integration
**File**: `packages/cli/src/commands/add.ts`
**Changes**: Add Mastra option to add command following existing pattern

```typescript
// Update import section to include Mastra library
import { addMastraPackage } from "@/lib/install-mastra-lib";

// Add Mastra detection in command flow (around line 30-40)
if (isMastraInstalled()) {
  await addMastraPackage(options);
}
```

##### 3. Create Command Template Support
**File**: `packages/cli/src/commands/create.ts`
**Changes**: Add Mastra template option alongside existing templates

```typescript
// Around line 53-59, add mastra template
const templates = {
  default: "https://github.com/assistant-ui/assistant-ui-starter",
  cloud: "https://github.com/assistant-ui/assistant-ui-starter-cloud",
  langgraph: "https://github.com/assistant-ui/assistant-ui-starter-langgraph",
  mcp: "https://github.com/assistant-ui/assistant-ui-starter-mcp",
  mastra: "https://github.com/assistant-ui/assistant-ui-starter-mastra", // Add this
};
```

#### Dependencies:
- Existing CLI infrastructure in `packages/cli/`
- Established package detection patterns
- Package manager integration via `detect-package-manager`
- User interaction patterns via Commander.js

#### Implementation Notes:
- Follow the exact pattern from `install-ai-sdk-lib.ts:40-92`
- Include detection for `@mastra/core`, `@mastra/memory`, `@mastra/tools`
- Handle Mastra's specific configuration requirements
- Provide helpful error messages for common setup issues

---

### Sub-Phase 4.2: Example Applications Implementation

#### Overview
Create comprehensive, production-ready example applications demonstrating Mastra integration patterns and unique capabilities.

#### Changes Required:

##### 1. Basic Mastra Integration Example
**File**: `examples/with-mastra/app/page.tsx`
**Changes**: Create basic runtime integration following AI SDK pattern

```typescript
"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";

export default function Home() {
  const runtime = useMastraRuntime({
    agentId: "chef-agent",
    memory: true,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
```

##### 2. Advanced Runtime Provider Example
**File**: `examples/with-mastra/app/MyRuntimeProvider.tsx`
**Changes**: Create advanced runtime provider following LangGraph pattern

```typescript
// Pattern from examples/with-langgraph/app/MyRuntimeProvider.tsx:13-38
export function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
  const runtime = useMastraRuntime({
    agentId: "weather-agent",
    memory: true,
    workflows: ["weather-workflow"],
    onSwitchToThread: async (threadId) => {
      // Mastra thread state retrieval
    },
    eventHandlers: {
      onMetadata: (metadata) => console.log("Metadata:", metadata),
      onError: (error) => console.error("Mastra error:", error),
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AgentSelector />
      <MemoryStatus />
      {children}
    </AssistantRuntimeProvider>
  );
}
```

##### 3. API Route Integration
**File**: `examples/with-mastra/app/api/chat/route.ts`
**Changes**: Create Mastra API integration following established pattern

```typescript
import { mastra } from "@/mastra";

export async function POST(req: Request) {
  const { messages, threadId } = await req.json();

  const agent = mastra.getAgent("chefAgent");
  const result = await agent.stream(messages, { threadId });

  return result.toDataStreamResponse();
}
```

##### 4. Mastra Configuration Files
**File**: `examples/with-mastra/mastra/index.ts`
**Changes**: Create Mastra configuration with multiple agents

```typescript
import { Mastra } from "@mastra/core";
import { chefAgent } from "./agents/chefAgent";
import { weatherAgent } from "./agents/weatherAgent";

export const mastra = new Mastra({
  agents: { chefAgent, weatherAgent },
  memory: {
    storage: new LibSQLStore(),
  },
});
```

##### 5. Agent Definitions
**File**: `examples/with-mastra/mastra/agents/chefAgent.ts`
**Changes**: Create example agent with tools and memory

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { weatherTool } from "../tools/weatherTool";

export const chefAgent = new Agent({
  name: "chef-agent",
  instructions: "You are Michel, a practical and experienced home chef...",
  model: openai("gpt-4o-mini"),
  tools: { weatherTool },
  memory: true,
});
```

##### 6. Component Examples
**File**: `examples/with-mastra/components/assistant-ui/agent-selector.tsx`
**Changes**: Create Mastra-specific components for agent selection

```typescript
// Mastra-specific component for switching between agents
export function AgentSelector() {
  // Implementation for agent selection UI
}
```

##### 7. Project Configuration Files
**Files**: `examples/with-mastra/package.json`, `examples/with-mastra/README.md`
**Changes**: Create complete project setup following established patterns

```json
{
  "dependencies": {
    "@assistant-ui/react": "workspace:^",
    "@assistant-ui/react-mastra": "workspace:^",
    "@mastra/core": "^latest",
    "@mastra/memory": "^latest",
    "@mastra/tools": "^latest"
  }
}
```

#### Dependencies:
- Core Mastra integration package from Phase 1-3
- Existing example patterns from `examples/with-langgraph/`
- shadcn/ui components for UI elements
- Next.js app structure for API routes

#### Implementation Notes:
- Create two examples: basic and advanced
- Demonstrate all major Mastra features (agents, memory, workflows, tools)
- Include comprehensive README with setup instructions
- Follow established styling and component patterns

---

### Sub-Phase 4.3: Documentation Updates Implementation

#### Overview
Update existing documentation to reference the new dedicated package and provide comprehensive integration guides.

#### Changes Required:

##### 1. Update Overview Documentation
**File**: `apps/docs/content/docs/runtimes/mastra/overview.mdx`
**Changes**: Update to reference new `@assistant-ui/react-mastra` package

```mdx
// Update import examples from generic to dedicated integration
import { useMastraRuntime } from "@assistant-ui/react-mastra";

const runtime = useMastraRuntime({
  agentId: "chef-agent",
  memory: true,
});
```

##### 2. Update Full-Stack Integration Guide
**File**: `apps/docs/content/docs/runtimes/mastra/full-stack-integration.mdx`
**Changes**: Update setup instructions to use new package structure

```mdx
// Update installation steps
## Installation

<Steps>
<Step>
### Install dependencies
```bash npm2yarn
npm install @assistant-ui/react-mastra @mastra/core @mastra/memory
```
</Step>
<Step>
### Create runtime provider
// Updated code examples using new package
</Step>
</Steps>
```

##### 3. Update Separate Server Integration Guide
**File**: `apps/docs/content/docs/runtimes/mastra/separate-server-integration.mdx`
**Changes**: Update to use dedicated runtime hook

```mdx
// Update from useDataStreamRuntime to useMastraRuntime
import { useMastraRuntime } from "@assistant-ui/react-mastra";

const runtime = useMastraRuntime({
  agentId: "chef-agent",
  apiUrl: "http://localhost:4111/api/agents/chefAgent/stream",
});
```

##### 4. Create API Reference Documentation
**File**: `apps/docs/content/docs/api-reference/integrations/mastra.mdx`
**Changes**: Create comprehensive API documentation

```mdx
# Mastra Integration

## API Reference

### useMastraRuntime
Creates a runtime instance for Mastra agent integration.

```tsx
import { useMastraRuntime } from "@assistant-ui/react-mastra";

const runtime = useMastraRuntime({
  agentId: string,
  memory?: boolean,
  workflows?: string[],
  // ... other options
});
```

<ParametersTable
  parameters={[
    {
      name: "agentId",
      type: "string",
      description: "The ID of the Mastra agent to use",
    },
    {
      name: "memory",
      type: "boolean",
      description: "Enable memory persistence for conversations",
    },
    // ... more parameters
  ]}
/>
```

##### 5. Create Migration Guide
**File**: `apps/docs/content/docs/runtimes/mastra/migration-guide.mdx`
**Changes**: Create guide for migrating from generic to dedicated integration

```mdx
# Migration Guide: Generic to Dedicated Mastra Integration

## Overview
Guide for migrating from generic `useDataStreamRuntime` to dedicated `@assistant-ui/react-mastra` integration.

## Migration Steps

<Steps>
<Step>
### Install the dedicated package
```bash npm2yarn
npm install @assistant-ui/react-mastra
```
</Step>
<Step>
### Update your runtime hook
// Before
import { useDataStreamRuntime } from "@assistant-ui/react-data-stream";
const runtime = useDataStreamRuntime({
  api: "http://localhost:4111/api/agents/chefAgent/stream",
});

// After
import { useMastraRuntime } from "@assistant-ui/react-mastra";
const runtime = useMastraRuntime({
  agentId: "chef-agent",
});
</Step>
</Steps>
```

##### 6. Update Integration Lists
**File**: `apps/docs/content/docs/api-reference/integrations/meta.json`
**Changes**: Add Mastra to supported integrations

```json
{
  "title": "Integrations",
  "pages": [
    "vercel-ai-sdk",
    "langgraph",
    "mastra", // Add this
    "assistant-cloud",
    "data-stream"
  ]
}
```

#### Dependencies:
- Existing documentation structure and patterns
- New Mastra package implementation
- API documentation patterns from other integrations
- MDX component library for rich documentation

#### Implementation Notes:
- Maintain consistency with existing documentation patterns
- Include comprehensive code examples
- Provide clear migration paths from generic integration
- Update cross-references and navigation

---

### Sub-Phase 4.4: Template and Scaffolding Implementation

#### Overview
Create Mastra project template and scaffolding support for rapid project creation.

#### Changes Required:

##### 1. Create Mastra Starter Template
**Repository**: `https://github.com/assistant-ui/assistant-ui-starter-mastra`
**Changes**: Create complete project template following existing patterns

```typescript
// Template structure similar to other starter templates
assistant-ui-starter-mastra/
├── app/
│   ├── api/
│   │   └── chat/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── mastra/
│   ├── agents/
│   └── index.ts
├── .env.local.example
├── package.json
└── README.md
```

##### 2. Update Init Command
**File**: `packages/cli/src/commands/init.ts`
**Changes**: Add Mastra option to init command

```typescript
// Add Mastra detection and setup option
if (options.framework === "mastra") {
  // Handle Mastra-specific initialization
  // Create mastra/ directory structure
  // Generate example agents
  // Set up configuration files
}
```

##### 3. Create Template Generator
**File**: `packages/cli/src/templates/mastra-template.ts`
**Changes**: Create template generation logic

```typescript
export function generateMastraTemplate(options: TemplateOptions) {
  // Generate mastra/ directory structure
  // Create example agent configurations
  // Set up API routes
  // Generate environment variables template
}
```

#### Dependencies:
- Existing template structure from other starters
- CLI scaffolding infrastructure
- Mastra configuration patterns
- Example applications from Sub-Phase 4.2

#### Implementation Notes:
- Template should be production-ready and customizable
- Include multiple example agents showing different capabilities
- Provide clear documentation and setup instructions
- Support both development and production configurations

---

## Success Criteria

### Automated Verification:
- [ ] CLI integration compiles successfully: `make -C packages/cli build`
- [ ] CLI commands pass type checking: `make -C packages/cli typecheck`
- [ ] Example applications build successfully: `make -C examples/with-mastra build`
- [ ] Example applications pass linting: `make -C examples/with-mastra lint`
- [ ] Documentation builds successfully: `make -C apps/docs build`
- [ ] All TypeScript types check: `npm run typecheck`
- [ ] No package manager conflicts: `npm ls @assistant-ui/react-mastra`

### Manual Verification:
- [ ] CLI detects Mastra packages correctly: `npx assistant-ui add` suggests Mastra integration
- [ ] CLI installation works: `npx assistant-ui add mastra` successfully installs and configures
- [ ] Create command works: `npx assistant-ui create --template=mastra` creates working project
- [ ] Basic example runs: `cd examples/with-mastra && npm run dev` starts development server
- [ ] Advanced example works: All Mastra features (agents, memory, workflows) function correctly
- [ ] Documentation renders correctly: All MDX files compile and display properly
- [ ] Migration guide works: Steps in migration guide produce working integration
- [ ] API examples work: Code snippets in documentation produce expected results

## Testing Strategy

### Unit Tests:
- CLI integration functions: package detection, installation, configuration
- Template generation functions: file creation, content generation
- Documentation examples: code snippet validation

### Integration Tests:
- End-to-end CLI workflow: detection → installation → configuration
- Example application functionality: agent communication, tool execution
- Documentation build and rendering: MDX compilation, link validation

### Manual Testing Steps:
1. **CLI Integration Testing**:
   - Test package detection with existing Mastra projects
   - Test installation in fresh projects
   - Test error handling for edge cases
   - Test configuration file generation

2. **Example Application Testing**:
   - Test basic example setup and functionality
   - Test advanced features (memory, workflows, tools)
   - Test error handling and recovery
   - Test performance under load

3. **Documentation Testing**:
   - Test documentation builds and renders
   - Test code examples compile and run
   - Test migration guide steps
   - Test cross-references and navigation

## Performance Considerations

- CLI operations should complete within 30 seconds for package detection
- Example applications should start within 10 seconds on local development
- Documentation build should complete within 2 minutes
- Template generation should complete within 5 seconds

## Migration Notes

### From Generic Integration:
Users currently using `useDataStreamRuntime` with Mastra endpoints will need to:
1. Install `@assistant-ui/react-mastra` package
2. Replace runtime hook with `useMastraRuntime`
3. Update configuration options
4. Test existing functionality

### CLI Migration:
Existing CLI installations will automatically detect Mastra and offer integration option without breaking existing functionality.

## Risk Mitigation

### Technical Risks:
- **CLI Integration Complexity**: Mitigate by following established patterns exactly
- **Template Maintenance**: Mitigate by creating reusable template generation logic
- **Documentation Synchronization**: Mitigate by using automated validation tools

### Dependency Risks:
- **Mastra Version Compatibility**: Mitigate by supporting version ranges and providing clear error messages
- **Breaking Changes**: Mitigate by maintaining backward compatibility where possible

### User Experience Risks:
- **Complex Setup**: Mitigate by providing comprehensive examples and documentation
- **Migration Difficulty**: Mitigate by providing clear migration guide and CLI assistance

## Dependencies and Prerequisites

### Must be completed before this phase starts:
- **Phase 1**: Foundation package infrastructure completed
- **Phase 2**: Message processing system implemented
- **Phase 3**: Advanced feature integration completed
- **Core Package**: `@assistant-ui/react-mastra` package exists and is functional
- **Runtime Hooks**: `useMastraRuntime` and related hooks implemented
- **Type Definitions**: All Mastra types and interfaces defined

### External dependencies:
- **Mastra Packages**: `@mastra/core`, `@mastra/memory`, `@mastra/tools` (latest versions)
- **Documentation Tools**: MDX, Fumadocs UI components
- **CLI Infrastructure**: Commander.js, cross-spawn, jscodeshift
- **Build Tools**: Next.js, TypeScript, Tailwind CSS

### Tools and environments needed:
- Node.js 18+ development environment
- pnpm package manager
- Git for template repository management
- Text editor with TypeScript support

### Knowledge and documentation requirements:
- Understanding of Mastra's agent system and configuration
- Familiarity with assistant-ui CLI patterns and architecture
- Knowledge of MDX documentation format and components
- Understanding of Next.js app structure and API routes

---

## References

- **Original overview**: `notes/plans/mastra_integration_overview.md`
- **Research documents**: `notes/research/mastra_integration_*.md`
- **CLI patterns**: `packages/cli/src/lib/install-ai-sdk-lib.ts:40-92`
- **Example patterns**: `examples/with-langgraph/app/MyRuntimeProvider.tsx:13-38`
- **Documentation patterns**: `apps/docs/content/docs/runtimes/mastra/overview.mdx`
- **Integration patterns**: `packages/react-ai-sdk/`, `packages/react-langgraph/`