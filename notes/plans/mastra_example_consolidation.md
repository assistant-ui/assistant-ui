# Mastra Example Consolidation - Consistency with Standard Examples

## Overview

Refactor the `with-mastra` example to follow the standard single-page pattern used by all other assistant-ui examples (with-ai-sdk, with-langgraph, with-cloud). Currently, `with-mastra` is the only example with multiple pages and lacks navigation, making it inconsistent with the established patterns. This plan consolidates the three separate pages into one comprehensive demonstration page and integrates all five newly created Mastra-specific components.

## Current State Analysis

### Issues with Current Implementation:

1. **Multiple Pages (Non-Standard)**:
   - `app/page.tsx` - Basic chat only
   - `app/advanced/page.tsx` - AgentSelector + chat
   - `app/workflows/page.tsx` - ThreadList + chat
   - **Problem**: All other examples use single page; no navigation between pages

2. **Runtime Provider Location**:
   - Currently in `app/MyRuntimeProvider.tsx`, used directly in pages
   - **Problem**: Standard pattern puts provider in `layout.tsx` (see with-langgraph, with-cloud)

3. **Unused Components**:
   - ✅ AgentSelector - Only used in `/advanced`
   - ✅ ThreadList - Only used in `/workflows` (basic version)
   - ❌ MemoryStatus - Not used anywhere
   - ❌ ToolResults - Not used anywhere
   - ❌ WorkflowControls - Not used anywhere

4. **Inconsistent with Examples**:
   - **with-ai-sdk-v5**: Single page, runtime + thread
   - **with-langgraph**: Single page, ThreadList sidebar + Thread, custom tools inline
   - **with-cloud**: Single page, ThreadList sidebar + Thread
   - **with-mastra**: Three pages, no navigation, provider not in layout

### Key Discoveries:

- All examples follow single-page pattern (examples/*/app/page.tsx)
- Runtime providers go in layout.tsx for complex setups (examples/with-langgraph/app/layout.tsx:8-15)
- ThreadList + Thread two-column layout is standard for persistence demos (examples/with-cloud/app/page.tsx:11-15)
- Custom components are shown inline in the main page (examples/with-langgraph/components/tools/)

## Desired End State

A single-page example that:
- ✅ Follows the standard pattern used by all other examples
- ✅ Showcases all 5 Mastra components in one cohesive interface
- ✅ Has runtime provider in layout.tsx
- ✅ Demonstrates agent switching, memory, tools, and workflows
- ✅ Uses two-column layout with sidebars (like with-langgraph pattern)

### Layout Structure:

```
┌──────────────────────────────────────────────────────┐
│  Left Sidebar (256px)     │  Main Chat Area          │
│  ┌─────────────────────┐  │  ┌────────────────────┐  │
│  │  AgentSelector      │  │  │  Thread Component  │  │
│  │  (Chef/Weather)     │  │  │  - Messages        │  │
│  └─────────────────────┘  │  │  - Enhanced Tools  │  │
│  ┌─────────────────────┐  │  │    (ToolResults)   │  │
│  │  MemoryStatus       │  │  │  - Composer        │  │
│  │  - Message count    │  │  └────────────────────┘  │
│  │  - Thread ID        │  │                          │
│  └─────────────────────┘  │                          │
│  ┌─────────────────────┐  │                          │
│  │  WorkflowControls   │  │                          │
│  │  (Mock demo)        │  │                          │
│  └─────────────────────┘  │                          │
└──────────────────────────────────────────────────────┘
```

### Success Verification:

```bash
# Automated checks
cd examples/with-mastra
pnpm run build              # Should compile successfully
pnpm run lint               # Should pass linting
pnpm run typecheck          # Should pass type checking

# Manual checks
pnpm run dev
# Visit http://localhost:3000
# - Should see agent selector, memory status, and workflow controls in left sidebar
# - Should be able to switch between chef and weather agents
# - Should see memory status update as messages are added
# - Tool calls should use enhanced ToolResults component
# - Workflow controls should show mock workflow state
```

## What We're NOT Doing

- ❌ Not adding real workflow execution (mock data only)
- ❌ Not adding navigation between pages (consolidating to one page)
- ❌ Not keeping the `/advanced` and `/workflows` pages
- ❌ Not adding new features beyond component integration
- ❌ Not modifying the core @assistant-ui/react-mastra package

## Implementation Approach

Follow the established pattern from with-langgraph and with-cloud examples:
1. Move runtime provider to layout.tsx (like with-langgraph)
2. Create single comprehensive page.tsx (like all examples)
3. Use grid layout for sidebars (like with-cloud)
4. Integrate all components into main page
5. Remove unused pages

## Phase 1: Restructure Application Layout

### Overview
Move runtime provider to layout and set up the standard single-page structure.

### Changes Required:

#### 1. Update Root Layout
**File**: `examples/with-mastra/app/layout.tsx`
**Changes**: Wrap children with MyRuntimeProvider (following with-langgraph pattern)

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

export const metadata: Metadata = {
  title: "Mastra Example - assistant-ui",
  description: "AI chat application powered by Mastra and assistant-ui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-dvh">
        <MyRuntimeProvider>{children}</MyRuntimeProvider>
      </body>
    </html>
  );
}
```

#### 2. Simplify MyRuntimeProvider
**File**: `examples/with-mastra/app/MyRuntimeProvider.tsx`
**Changes**: Remove AssistantRuntimeProvider wrapper (now that layout handles children)

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";
import { createContext, useContext, useState } from "react";

interface AgentContextType {
  selectedAgent: string;
  setSelectedAgent: (agent: string) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgentContext must be used within MyRuntimeProvider");
  }
  return context;
};

export function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
  const [selectedAgent, setSelectedAgent] = useState("chefAgent");

  const runtime = useMastraRuntime({
    api: "/api/chat",
    agentId: selectedAgent,
    memory: {
      storage: "libsql",
      userId: "default-user",
    },
    onError: (error) => {
      console.error("Mastra error:", error);
    },
    eventHandlers: {
      onMetadata: (metadata) => {
        console.log("Mastra metadata:", metadata);
      },
      onError: (error) => {
        console.error("Mastra error:", error);
      },
      onInterrupt: (interrupt) => {
        console.log("Mastra interrupt:", interrupt);
      },
      onToolCall: (toolCall) => {
        console.log("Tool call:", toolCall);
      },
      onToolResult: (toolResult) => {
        console.log("Tool result:", toolResult);
      },
    },
  });

  return (
    <AgentContext.Provider value={{ selectedAgent, setSelectedAgent }}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </AgentContext.Provider>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd examples/with-mastra && pnpm run build`
- [ ] Types check: `cd examples/with-mastra && pnpm run typecheck`
- [ ] Linting passes: `cd examples/with-mastra && pnpm run lint`
- [ ] No runtime errors when starting dev server: `pnpm run dev`

#### Manual Verification:
- [ ] App still renders at http://localhost:3000
- [ ] No console errors in browser
- [ ] Runtime provider is working (chat functionality intact)

---

## Phase 2: Create Consolidated Main Page

### Overview
Replace the basic page.tsx with a comprehensive single-page demo that integrates all 5 components, following the with-langgraph pattern for layout.

### Changes Required:

#### 1. Create Comprehensive Main Page
**File**: `examples/with-mastra/app/page.tsx`
**Changes**: Replace entire file with new integrated layout

```tsx
"use client";

import { useState } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { AgentSelector } from "@/components/assistant-ui/agent-selector";
import { MemoryStatus } from "@/components/assistant-ui/memory-status";
import { WorkflowControls } from "@/components/assistant-ui/workflow-controls";
import { useAgentContext } from "./MyRuntimeProvider";
import { ChefHat, Cloud } from "lucide-react";

export default function Home() {
  const { selectedAgent, setSelectedAgent } = useAgentContext();

  const agents = [
    {
      id: "chefAgent",
      name: "Chef Agent",
      icon: ChefHat,
      description: "Cooking and recipe assistance",
    },
    {
      id: "weatherAgent",
      name: "Weather Agent",
      icon: Cloud,
      description: "Weather information and forecasts",
    },
  ];

  // Mock workflow state for demonstration
  const [workflowStatus, setWorkflowStatus] = useState<
    "idle" | "running" | "paused" | "completed" | "error"
  >("idle");
  const [workflowProgress, setWorkflowProgress] = useState(0);

  const handleWorkflowStart = () => {
    setWorkflowStatus("running");
    // Simulate progress
    const interval = setInterval(() => {
      setWorkflowProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setWorkflowStatus("completed");
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleWorkflowReset = () => {
    setWorkflowStatus("idle");
    setWorkflowProgress(0);
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Agent Control & Status */}
      <div className="w-64 border-r border-border bg-muted/30 p-4 space-y-4 overflow-y-auto">
        {/* Agent Selection */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Agent Selection
          </h2>
          <AgentSelector
            agents={agents}
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
            className="w-full border-0 bg-transparent p-0"
          />
        </div>

        {/* Memory Status */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Memory System
          </h2>
          <MemoryStatus showStats={true} />
        </div>

        {/* Workflow Controls (Mock) */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Workflow Demo
          </h2>
          <WorkflowControls
            workflowId="demo-workflow"
            status={workflowStatus}
            progress={workflowProgress}
            showSteps={true}
            allowPause={false}
            steps={[
              { id: "1", name: "Initialize", status: workflowProgress > 0 ? "completed" : "pending" },
              { id: "2", name: "Process", status: workflowProgress > 50 ? "completed" : workflowProgress > 0 ? "running" : "pending" },
              { id: "3", name: "Finalize", status: workflowProgress === 100 ? "completed" : "pending" },
            ]}
            onStart={handleWorkflowStart}
            onReset={handleWorkflowReset}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 bg-background">
          <h1 className="text-xl font-semibold">
            {agents.find((a) => a.id === selectedAgent)?.name || "Mastra Agent"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {agents.find((a) => a.id === selectedAgent)?.description}
          </p>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      </div>
    </div>
  );
}
```

#### 2. Update Thread Component to Use ToolResults
**File**: `examples/with-mastra/components/assistant-ui/thread.tsx`
**Changes**: Import and use ToolResults component instead of ToolFallback

Find and update the AssistantMessage component:

```tsx
// At the top, add import:
import { ToolResults } from "./tool-results";

// In AssistantMessage component, update MessagePrimitive.Parts:
<MessagePrimitive.Parts
  components={{
    Text: MarkdownText,
    tools: {
      Fallback: (props) => (
        <ToolResults
          toolCall={{
            name: props.toolName || "Unknown Tool",
            args: props.args,
            state: props.status?.type === "running" ? "running" :
                   props.status?.type === "complete" ? "success" : "error",
          }}
          result={props.result}
          isExpanded={false}
        />
      ),
    },
  }}
/>
```

### Success Criteria:

#### Automated Verification:
- [ ] Build passes: `cd examples/with-mastra && pnpm run build`
- [ ] No TypeScript errors: `pnpm run typecheck`
- [ ] Linting passes: `pnpm run lint`
- [ ] Page compiles successfully in dev mode

#### Manual Verification:
- [ ] Visit http://localhost:3000 and see the integrated layout
- [ ] Left sidebar shows: AgentSelector, MemoryStatus, WorkflowControls
- [ ] Can switch between Chef Agent and Weather Agent
- [ ] Memory status updates as messages are added
- [ ] Workflow controls show mock progress when started
- [ ] Chat interface works with selected agent
- [ ] Tool calls display with enhanced ToolResults component
- [ ] Layout is responsive and components are visible

---

## Phase 3: Remove Deprecated Pages

### Overview
Remove the `/advanced` and `/workflows` pages since all functionality is now in the main page, following the standard single-page pattern.

### Changes Required:

#### 1. Delete Advanced Page
**File**: `examples/with-mastra/app/advanced/page.tsx`
**Changes**: Delete entire file and directory

```bash
rm -rf examples/with-mastra/app/advanced/
```

#### 2. Delete Workflows Page
**File**: `examples/with-mastra/app/workflows/page.tsx`
**Changes**: Delete entire file and directory

```bash
rm -rf examples/with-mastra/app/workflows/
```

### Success Criteria:

#### Automated Verification:
- [ ] Build still passes: `cd examples/with-mastra && pnpm run build`
- [ ] No broken imports or references to deleted files
- [ ] Dev server starts without errors

#### Manual Verification:
- [ ] Main page (/) still works correctly
- [ ] No 404 errors for /advanced or /workflows
- [ ] All functionality previously in separate pages is accessible from main page

---

## Phase 4: Update Documentation

### Overview
Update the README to reflect the new single-page structure and explain all integrated components.

### Changes Required:

#### 1. Update README
**File**: `examples/with-mastra/README.md`
**Changes**: Update the project structure and features sections

Replace the "Project Structure" section:

```markdown
## Project Structure

\`\`\`
examples/with-mastra/
├── app/
│   ├── api/chat/              # Mastra API route
│   ├── api/memory/            # Memory management endpoints
│   ├── globals.css            # Tailwind styles
│   ├── layout.tsx             # Root layout with MyRuntimeProvider
│   ├── MyRuntimeProvider.tsx  # Mastra runtime configuration
│   └── page.tsx               # Main demo page with all components
├── components/
│   ├── assistant-ui/
│   │   ├── agent-selector.tsx    # Switch between agents
│   │   ├── memory-status.tsx     # Memory system status
│   │   ├── tool-results.tsx      # Enhanced tool display
│   │   ├── workflow-controls.tsx # Workflow management
│   │   ├── thread-list.tsx       # Thread history
│   │   ├── thread.tsx            # Main chat interface
│   │   ├── markdown-text.tsx     # Markdown rendering
│   │   └── tooltip-icon-button.tsx
│   └── ui/                       # Reusable UI components
├── lib/
│   └── utils.ts                  # Utility functions
├── mastra/
│   ├── agents/                   # Mastra agent definitions
│   ├── index.ts                  # Mastra configuration
│   ├── memory.ts                 # Memory configuration
│   └── tools/                    # Custom tools
└── package.json
\`\`\`
```

Add a "Components Showcase" section before "Customization":

```markdown
## Components Showcase

The example demonstrates all Mastra-specific components in a single integrated interface:

### Agent Selector
Switch between different Mastra agents (Chef Agent and Weather Agent) in real-time. The runtime automatically updates when you select a different agent.

### Memory Status
Displays the current state of Mastra's memory system:
- Active/inactive status indicator
- Message count in current thread
- Thread ID display
- Real-time updates as conversation progresses

### Tool Results
Enhanced tool call display with:
- Expandable/collapsible sections
- Color-coded status (running, success, error)
- Formatted arguments and results
- Error message display

### Workflow Controls
Demonstrates workflow management with:
- Start/pause/stop controls
- Progress tracking with percentage
- Step-by-step visualization
- Status indicators

Note: Workflow functionality uses mock data for demonstration purposes.

### Layout
The interface uses a two-column layout:
- **Left Sidebar**: Agent selector, memory status, and workflow controls
- **Main Area**: Chat thread with enhanced tool results
```

Update the "Getting Started" instructions:

```markdown
## Getting Started

1. **Install dependencies**:
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Set up environment variables**:
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`

   Add your OpenAI API key to \`.env.local\`:
   \`\`\`
   OPENAI_API_KEY=your_openai_api_key_here
   \`\`\`

3. **Run the development server**:
   \`\`\`bash
   pnpm dev
   \`\`\`

4. **Open [http://localhost:3000](http://localhost:3000)**

You'll see a comprehensive interface showcasing:
- Agent switching between Chef and Weather agents
- Real-time memory status
- Enhanced tool call displays
- Mock workflow controls
```

### Success Criteria:

#### Automated Verification:
- [ ] README.md exists and is valid markdown
- [ ] No broken links in README
- [ ] File paths in README match actual structure

#### Manual Verification:
- [ ] README accurately describes the single-page structure
- [ ] All components are documented
- [ ] Getting started instructions are clear
- [ ] Project structure matches the codebase

---

## Testing Strategy

### Unit Tests
No new unit tests required - components already have their own test coverage.

### Integration Tests
No automated integration tests - this is a visual demonstration example.

### Manual Testing Steps

1. **Start the application**:
   ```bash
   cd examples/with-mastra
   pnpm run dev
   ```

2. **Verify Layout**:
   - [ ] Left sidebar appears with all three component sections
   - [ ] Main chat area is visible and responsive
   - [ ] Components are properly styled and aligned

3. **Test Agent Switching**:
   - [ ] Click on Weather Agent in sidebar
   - [ ] Header updates to show "Weather Agent"
   - [ ] Send a message about weather
   - [ ] Verify response is from weather agent
   - [ ] Switch back to Chef Agent
   - [ ] Send a message about cooking
   - [ ] Verify response is from chef agent

4. **Test Memory Status**:
   - [ ] Initial state shows "Empty" or "Active"
   - [ ] Send a message
   - [ ] Memory status updates to show message count
   - [ ] Thread ID is displayed

5. **Test Tool Results**:
   - [ ] Ask chef agent about weather (triggers weatherTool)
   - [ ] Tool call appears with enhanced ToolResults component
   - [ ] Click to expand/collapse tool details
   - [ ] Verify arguments and results are displayed
   - [ ] Status indicator shows correct state (running/success/error)

6. **Test Workflow Controls**:
   - [ ] Click "Start" button in workflow controls
   - [ ] Progress bar animates from 0% to 100%
   - [ ] Steps update (Initialize → Process → Finalize)
   - [ ] Status changes: idle → running → completed
   - [ ] Click "Reset" button
   - [ ] Workflow returns to idle state

7. **Test Responsiveness**:
   - [ ] Resize browser window
   - [ ] Sidebar remains visible
   - [ ] Chat area adjusts width appropriately
   - [ ] No layout breakage at various widths

8. **Test Build**:
   ```bash
   pnpm run build
   ```
   - [ ] Build completes successfully
   - [ ] No TypeScript errors
   - [ ] No linting errors

---

## Performance Considerations

- Sidebar components are lightweight and render independently
- Agent switching triggers runtime re-initialization (expected behavior)
- Memory status updates are based on runtime state (no polling)
- Workflow controls use local state (no backend calls)
- ToolResults use React.useState for expand/collapse (efficient)

No performance optimizations needed for this demonstration example.

---

## Migration Notes

### For Existing Users

If you have the old multi-page structure:

1. **Backup any customizations** in `/advanced` or `/workflows` pages
2. **Pull the latest changes** which will remove those directories
3. **All functionality is now in the main page** at `/`
4. **Runtime provider moved to layout** - no changes needed to your runtime config

### Breaking Changes

- ❌ `/advanced` page removed - functionality merged into main page
- ❌ `/workflows` page removed - workflow controls now in sidebar
- ⚠️  MyRuntimeProvider now wraps entire app in layout.tsx
- ⚠️  AgentContext available throughout app (not just in pages)

### Migration Path

**Before:**
```tsx
// app/advanced/page.tsx
const [selectedAgent, setSelectedAgent] = useState("chefAgent");
```

**After:**
```tsx
// app/page.tsx or any component
import { useAgentContext } from "@/app/MyRuntimeProvider";
const { selectedAgent, setSelectedAgent } = useAgentContext();
```

---

## References

- Original Phase 4 plan: `notes/plans/mastra_phase4_developer_experience.md`
- Pattern research: All examples in `examples/` directory
- Standard pattern: `examples/with-langgraph/app/page.tsx`
- Runtime provider pattern: `examples/with-langgraph/app/layout.tsx`
- Two-column layout: `examples/with-cloud/app/page.tsx`
- Component implementations: `examples/with-mastra/components/assistant-ui/`
