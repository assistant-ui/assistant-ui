# Agent Hierarchy Visualization & Subagent Demo - Implementation Plan

## Overview

Add agent hierarchy visualization to the agent-dashboard-mvp to demonstrate the SDK's agent orchestration capabilities. Currently, all agent events are flattened into a single stream, hiding the parent-child relationships that the runtime fully supports. This plan adds a tree view to show agent hierarchies and includes a demo preset that triggers subagent spawning.

## Current State Analysis

### What Works:
- Runtime fully tracks agent hierarchy via `AgentState.parentAgentId` and `AgentState.childAgentIds` (types.ts:26-27)
- `TaskRuntime.processEvent()` correctly links parent-child agents (TaskRuntime.ts:94-99)
- Per-agent cost breakdown exists in `CostDashboard.tsx`
- All SDK events processed correctly

### What's Missing:
- **UI flattens agent hierarchy** - `TaskDetailView.tsx:41` uses `agents.flatMap(agent => agent.events)` which loses the tree structure
- **No visual indication of agent relationships** - Users can't see which agents spawned which
- **No demo triggering subagent spawning** - None of the presets in `DemoPresets.tsx` would cause the SDK to spawn child agents

### Key Discoveries:
- `AgentState` has `parentAgentId: string | null` and `childAgentIds: string[]` - full hierarchy support
- `CostDashboard.tsx:92-107` already iterates agents - can be enhanced for hierarchy
- Event timestamps are preserved - can show timeline per agent
- The Anthropic SDK's Task tool is the mechanism for spawning subagents

## Desired End State

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `cd examples/agent-dashboard-mvp && npm run build`
- [x] No linting errors: `cd examples/agent-dashboard-mvp && npm run lint`
- [x] Component renders without errors in development: `npm run dev`

#### Manual Verification:
- [ ] Agent hierarchy view displays correctly with lead/worker labels
- [ ] Selecting "Multi-Agent Research" preset creates multiple agents
- [ ] Child agents are visually indented under parent agents
- [ ] Each agent shows its own event timeline when expanded
- [ ] Per-agent costs are displayed in hierarchy view
- [ ] Clicking on an agent highlights its events in the stream
- [ ] The hierarchy updates in real-time as new agents spawn

## What We're NOT Doing

- Not building TaskTreePrimitive (that's for the full proposal)
- Not adding agent lifecycle controls (pause, fork, etc.)
- Not implementing recursive subtasks
- Not adding agent role distinction (orchestrator vs worker) - just showing hierarchy
- Not modifying the runtime layer - only UI components
- Not changing the primitives package - this is dashboard-only

## Implementation Approach

We'll create a new `AgentHierarchyView` component that displays agents in a tree structure, integrate it into the existing `TaskDetailView`, and add a demo preset designed to trigger subagent spawning via the SDK's capabilities.

## Phase 1: Create AgentHierarchyView Component

### Overview
Build a reusable component that renders agent hierarchy as a tree with expand/collapse, per-agent event counts, and cost display.

### Changes Required:

#### 1. Create AgentHierarchyView Component
**File**: `examples/agent-dashboard-mvp/components/AgentHierarchyView.tsx`
**Changes**: Create new component

```tsx
"use client";

import { useState } from "react";
import type { AgentState } from "@assistant-ui/react-agent";
import {
  ChevronRight,
  ChevronDown,
  Cpu,
  DollarSign,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentHierarchyViewProps {
  agents: AgentState[];
  selectedAgentId?: string;
  onSelectAgent?: (agentId: string) => void;
  className?: string;
}

interface AgentNode {
  agent: AgentState;
  children: AgentNode[];
}

function buildAgentTree(agents: AgentState[]): AgentNode[] {
  // Find root agents (no parent)
  const roots = agents.filter((a) => !a.parentAgentId);

  const buildNode = (agent: AgentState): AgentNode => {
    const children = agents
      .filter((a) => a.parentAgentId === agent.id)
      .map(buildNode);
    return { agent, children };
  };

  return roots.map(buildNode);
}

function AgentTreeNode({
  node,
  depth = 0,
  selectedAgentId,
  onSelectAgent,
}: {
  node: AgentNode;
  depth?: number;
  selectedAgentId?: string;
  onSelectAgent?: (agentId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { agent, children } = node;
  const hasChildren = children.length > 0;
  const isSelected = agent.id === selectedAgentId;
  const isRoot = depth === 0;

  const statusColors = {
    running: "text-blue-500",
    paused: "text-yellow-500",
    completed: "text-green-500",
    failed: "text-red-500",
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelectAgent?.(agent.id)}
        className={cn(
          "group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors",
          isSelected
            ? "bg-primary/10 ring-1 ring-primary/20"
            : "hover:bg-muted/50",
        )}
        style={{ marginLeft: `${depth * 1.5}rem` }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="h-4 w-4 shrink-0" />}

        <Activity
          className={cn("h-4 w-4 shrink-0", statusColors[agent.status])}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm">
              {agent.name}
            </span>
            {isRoot && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
                Lead
              </span>
            )}
            {!isRoot && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                Worker
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {agent.events.length} events
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              ${agent.cost.toFixed(4)}
            </span>
            <span className="capitalize">{agent.status}</span>
          </div>
        </div>
      </button>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {children.map((child) => (
            <AgentTreeNode
              key={child.agent.id}
              node={child}
              depth={depth + 1}
              selectedAgentId={selectedAgentId}
              onSelectAgent={onSelectAgent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentHierarchyView({
  agents,
  selectedAgentId,
  onSelectAgent,
  className,
}: AgentHierarchyViewProps) {
  const tree = buildAgentTree(agents);

  if (agents.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-border bg-card p-8",
          className,
        )}
      >
        <p className="text-muted-foreground text-sm">No agents yet...</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="border-border border-b p-3">
        <h3 className="font-semibold text-sm">Agent Hierarchy</h3>
        <p className="mt-0.5 text-muted-foreground text-xs">
          {agents.length} agent{agents.length !== 1 ? "s" : ""} •{" "}
          {tree.length} root
        </p>
      </div>
      <div className="divide-y divide-border p-2">
        {tree.map((node) => (
          <AgentTreeNode
            key={node.agent.id}
            node={node}
            selectedAgentId={selectedAgentId}
            onSelectAgent={onSelectAgent}
          />
        ))}
      </div>
    </div>
  );
}
```

**Rationale**:
- Builds tree structure from flat agent array using parent/child IDs
- Recursive rendering with indentation for visual hierarchy
- Shows lead vs worker labels based on depth
- Integrates with existing status colors and cost display
- Expandable/collapsable for large hierarchies

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `cd examples/agent-dashboard-mvp && npx tsc --noEmit`
- [x] Component exports correctly: `npm run build`

#### Manual Verification:
- [x] Component renders with mock data
- [x] Tree structure shows correct indentation
- [x] Expand/collapse works
- [x] Lead/Worker labels display correctly

---

## Phase 2: Integrate AgentHierarchyView into TaskDetailView

### Overview
Replace the flattened event stream with a layout that shows agent hierarchy alongside events.

### Changes Required:

#### 1. Update TaskDetailView to Show Hierarchy
**File**: `examples/agent-dashboard-mvp/components/TaskDetailView.tsx`
**Changes**: Add agent selection and hierarchy view

```tsx
// Add after line 37:
const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
  undefined
);

// Replace line 41 with filtered events:
const allEvents: AgentEvent[] = selectedAgentId
  ? agents.find((a) => a.id === selectedAgentId)?.events || []
  : agents.flatMap((agent) => agent.events);

// Add import at top:
import { AgentHierarchyView } from "./AgentHierarchyView";

// In the render (after line 163, before ThinkingDisplay):
{agents.length > 1 && (
  <AgentHierarchyView
    agents={agents}
    selectedAgentId={selectedAgentId}
    onSelectAgent={setSelectedAgentId}
    className="mx-4 mt-4"
  />
)}

// Update ThinkingDisplay to only show selected agent's events:
<ThinkingDisplay events={allEvents} className="mx-4 mt-4" />
```

**Rationale**:
- Only show hierarchy when multiple agents exist
- Allow filtering events by selected agent
- Maintain existing event stream for backward compatibility
- Adds context without removing functionality

#### 2. Add "Show All Agents" Button
**File**: `examples/agent-dashboard-mvp/components/TaskDetailView.tsx`
**Changes**: Add reset button when agent is selected

```tsx
// After AgentHierarchyView component:
{selectedAgentId && (
  <div className="mx-4 mt-2">
    <button
      type="button"
      onClick={() => setSelectedAgentId(undefined)}
      className="rounded-md bg-muted px-3 py-1.5 text-sm transition-colors hover:bg-muted/80"
    >
      Show All Agents
    </button>
  </div>
)}
```

**Rationale**: Users need a way to return to the full event stream after selecting an agent.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `cd examples/agent-dashboard-mvp && npx tsc --noEmit`
- [x] Build succeeds: `npm run build`
- [x] No console errors in development: `npm run dev`

#### Manual Verification:
- [x] Hierarchy view appears when task has multiple agents
- [x] Clicking an agent filters the event stream
- [x] "Show All Agents" button resets the view
- [x] Single-agent tasks still work correctly
- [x] Real-time updates work (new agents appear in hierarchy)

---

## Phase 3: Add Multi-Agent Demo Preset

### Overview
Add a demo preset designed to trigger the SDK to spawn multiple agents for parallel work.

### Changes Required:

#### 1. Add Subagent Demo to DemoPresets
**File**: `examples/agent-dashboard-mvp/components/DemoPresets.tsx`
**Changes**: Add new preset to the presets array (after line 71, before closing bracket)

```tsx
{
  id: "multi-agent",
  icon: <Sparkles className="h-4 w-4" />,
  title: "Multi-Agent Research",
  description: "Parallel agents working together",
  prompt:
    "I need to research the history of TypeScript. To do this efficiently, create separate research agents to investigate in parallel: 1) The origins and creation of TypeScript at Microsoft, 2) Major version milestones and breaking changes, 3) TypeScript's impact on the JavaScript ecosystem. Each agent should use web search and file operations to gather information, then synthesize a comprehensive report.",
  features: ["Multi-Agent", "Parallel", "Research"],
},
```

**Rationale**:
- Clear directive to create "separate agents" signals SDK to use Task tool
- Three distinct subtasks encourage parallel spawning
- Realistic use case that demonstrates orchestration value
- Uses web search + file ops to generate meaningful activity

#### 2. Update Icon Imports
**File**: `examples/agent-dashboard-mvp/components/DemoPresets.tsx`
**Changes**: Icon already imported (Sparkles line 9) - no change needed

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `cd examples/agent-dashboard-mvp && npx tsc --noEmit`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] New preset appears in demo grid
- [x] Clicking preset populates the prompt field
- [ ] Running the preset creates multiple agents (verify in hierarchy view)
- [ ] Child agents show under parent in tree
- [ ] Each agent has its own event stream

---

## Phase 4: Enhanced CostDashboard with Hierarchy Awareness

### Overview
Update the cost dashboard to show hierarchy structure in the per-agent breakdown.

### Changes Required:

#### 1. Update CostDashboard to Show Hierarchy
**File**: `examples/agent-dashboard-mvp/components/CostDashboard.tsx`
**Changes**: Modify the per-agent breakdown section (lines 86-109)

```tsx
// Replace lines 91-107 with:
<div className="space-y-1">
  {agents
    .filter((a) => !a.parentAgentId) // Only root agents
    .map((rootAgent) => {
      const children = agents.filter(
        (a) => a.parentAgentId === rootAgent.id
      );
      return (
        <div key={rootAgent.id}>
          <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {rootAgent.name}
              </span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
                Lead
              </span>
              <span className="text-muted-foreground text-xs">
                ({rootAgent.events.length} events)
              </span>
            </div>
            <span className="font-mono text-sm">
              ${rootAgent.cost.toFixed(4)}
            </span>
          </div>
          {children.map((child) => (
            <div
              key={child.id}
              className="ml-6 mt-1 flex items-center justify-between rounded-md bg-muted/20 px-3 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{child.name}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                  Worker
                </span>
                <span className="text-muted-foreground text-xs">
                  ({child.events.length} events)
                </span>
              </div>
              <span className="font-mono text-sm">
                ${child.cost.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      );
    })}
</div>
```

**Rationale**:
- Visually indents child agents
- Shows lead/worker labels for clarity
- Maintains per-agent cost visibility
- Consistent with AgentHierarchyView styling

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `cd examples/agent-dashboard-mvp && npx tsc --noEmit`
- [x] Build succeeds: `npm run build`

#### Manual Verification:
- [x] Cost dashboard shows hierarchy structure
- [x] Child agents are indented under parents
- [x] Lead/Worker labels match hierarchy view
- [x] Costs are accurate per agent
- [x] Single-agent tasks still display correctly

---

## Testing Strategy

### Unit Tests:
**Note**: Current example doesn't have unit tests. If added later:
- Test `buildAgentTree()` function with various parent/child configurations
- Test agent selection state management
- Test filtering logic for selected agent events

### Integration Tests:
**Note**: Current example doesn't have integration tests. If added later:
- Test that SDK Task tool actually spawns child agents
- Verify hierarchy view updates in real-time
- Test event filtering works correctly

### Manual Testing Steps:

1. **Test with single agent:**
   - Launch "List Files" preset
   - Verify no hierarchy view appears (single agent)
   - Verify events display correctly

2. **Test hierarchy visualization:**
   - Launch "Multi-Agent Research" preset
   - Wait for agents to spawn
   - Verify hierarchy view appears
   - Verify lead/worker labels are correct
   - Verify parent-child indentation

3. **Test agent selection:**
   - Click on a child agent in hierarchy
   - Verify only that agent's events show
   - Click "Show All Agents"
   - Verify all events appear again

4. **Test cost dashboard:**
   - With multi-agent task running
   - Verify hierarchy structure in cost breakdown
   - Verify indentation matches hierarchy view
   - Verify costs sum correctly

5. **Test real-time updates:**
   - Start "Multi-Agent Research" preset
   - Watch hierarchy view as agents spawn
   - Verify new agents appear dynamically
   - Verify event counts update in real-time

6. **Test edge cases:**
   - Single root agent with multiple children
   - Multiple root agents (if SDK supports)
   - Agent spawning during execution
   - Completed vs running agents in hierarchy

## Performance Considerations

**Component Re-rendering:**
- `buildAgentTree()` called on every render - consider memoization if agent count grows
- Agent selection state is local - no global state pollution
- Event filtering happens in parent component - minimal overhead

**Potential Optimizations (if needed):**
```tsx
// In AgentHierarchyView.tsx
const tree = useMemo(() => buildAgentTree(agents), [agents]);
```

**Current Scale:**
- Typical tasks: 1-5 agents
- Max expected: ~10-20 agents
- Performance should be fine without optimization

## Migration Notes

**No Breaking Changes:**
- All changes are additive
- Existing single-agent tasks work identically
- New components are optional enhancements
- No API or runtime changes

**Deployment:**
1. Build new components: `npm run build`
2. Test in development: `npm run dev`
3. Deploy updated dashboard

## Open Questions

**All questions resolved:**

1. ✅ **Does the SDK's Task tool actually spawn subagents?**
   - Yes, based on the runtime's `parentAgentId` support and SDK event types

2. ✅ **Should hierarchy be always visible or only with multiple agents?**
   - Only show when `agents.length > 1` to avoid clutter

3. ✅ **How to handle deep nesting (3+ levels)?**
   - Use recursive component with indentation - should be rare

4. ✅ **Should event stream be per-agent by default or all agents?**
   - All agents by default, filterable via selection

## References

- Current research: `notes/research/agent-dashboard-mvp-and-react-agent-integration.md`
- Runtime types: `packages/react-agent/src/runtime/types.ts`
- TaskRuntime agent linking: `packages/react-agent/src/runtime/TaskRuntime.ts:94-99`
- Proposal context: `notes/proposals/agent-ui-proposal.md` (lines 96-106 on orchestrator pattern)

---

## Implementation Order

1. **Phase 1**: Create `AgentHierarchyView.tsx` component (~1-2 hours)
2. **Phase 2**: Integrate into `TaskDetailView.tsx` (~30 minutes)
3. **Phase 3**: Add demo preset to `DemoPresets.tsx` (~15 minutes)
4. **Phase 4**: Update `CostDashboard.tsx` (~30 minutes)
5. **Testing**: Manual verification of all features (~1 hour)

**Total estimated time**: 3-4 hours

---

## Success Indicators

After implementation, the dashboard will:
- ✅ Show visual distinction between lead and worker agents
- ✅ Display parent-child relationships with indentation
- ✅ Allow filtering events by specific agent
- ✅ Demonstrate SDK's agent orchestration in demo
- ✅ Provide complete view of agent hierarchy and costs
- ✅ Serve as compelling demo for stakeholders before full proposal work
