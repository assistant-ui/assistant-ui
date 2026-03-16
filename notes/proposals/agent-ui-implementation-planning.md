# Agent-UI Implementation Plan Strategy

**Date**: January 2026
**Status**: Planning Strategy
**Related**:
- `/notes/proposals/agent-ui-proposal.md` - Full agent-ui feature specification
- `/notes/research/agent-ui-proposal-codebase-implementationanalysis.md` - Codebase architecture analysis

---

## Overview

The agent-ui proposal outlines a comprehensive set of 11 primitives for building agent orchestration interfaces, representing a shift from conversation-based UX (chat) to work supervision UX. This implementation is broken into **5 separate implementation plans**, each building on the previous.

### Why 5 Separate Plans?

1. **Incremental delivery** - Each phase produces working, testable code
2. **Clear dependencies** - Later phases depend on earlier phases completing
3. **Manageable scope** - Each plan is focused and actionable
4. **Validation points** - Can test and iterate after each phase
5. **Risk mitigation** - Issues caught early in smaller phases

## Testing Strategy

We have access to an API key for testing. Use this approach:

**Phase 1-2**: Unit tests only (mock SDK, no network calls)
- Test runtime interfaces, bindings, state derivations independently
- No Claude Agent SDK connection yet

**Phase 3**: Integration tests with simulated data
- Mock runtime states provide data to primitives
- Test rendering, state updates, action validation
- No real SDK connection yet

**Phase 4**: Integration tests with mock SDK
- Mock Claude Agent SDK streams
- Test stream processing, message conversion
- Tool widgets tested with simulated output

**Phase 5**: Full integration with real Claude Agent SDK
- Use real API key for end-to-end tests
- Test actual agent spawning, tool execution, approvals
- Example app runs against real backend

---

# PHASE 1: Infrastructure Foundation

## Goal
Create the runtime architecture and tool UI infrastructure that all other phases depend on.

## Scope

### Extend AssistantFrame for streaming support
- Add streaming protocol messages for long-running tools
- Implement rate-limited updates for performance (e.g., 30fps max for UI)
- Create streaming utilities for tool output buffering

### Create base runtime interfaces and cores
- `WorkspaceRuntimeCore` interface (core business logic)
- `TaskRuntimeCore` interface
- `AgentRuntimeCore` interface
- `AgentEventRuntimeCore` interface

Each RuntimeCore defines:
- Readonly state properties (id, title, status, etc.)
- Action methods (cancel, retry, pause, etc.)
- Navigation methods (getSubtaskByIndex, getParentAgent, etc.)

### Implement type-safe binding patterns
Following existing patterns from `packages/react/src/legacy-runtime/runtime/`:
- `SubscribableWithState<Core, Path>` wrapper for all runtime types
- `ShallowMemoizeSubject` for computed state derivations
- `NestedSubscriptionSubject` for nested state hierarchies
- Path types: `WorkspaceRuntimePath`, `TaskRuntimePath`, `AgentRuntimePath`

### Create context providers and hooks utilities
- `WorkspaceProvider` context following patterns in `packages/react/src/context/`
- Runtime hook utilities (from `context/react/utils/`)
- Type-safe state subscription utilities for React

## Dependencies
- None (groundwork phase)

## Deliverables
- Streaming-enabled AssistantFrame infrastructure
- All core runtime interfaces defined
- Binding helper utilities (SubscribableWithState, ShallowMemoizeSubject)
- Context provider scaffold

## Success Criteria
- Can create a `WorkspaceRuntimeCore` stub that compiles
- Can use `SubscribableWithState` to wrap a simple state object
- Can subscribe to state changes via callback

## What We're NOT Doing
- No runtime implementations (that's Phase 2)
- No primitives (that's Phase 3)
- No Claude Agent SDK integration (that's Phase 5)

## Key Implementation Notes
- Follow existing patterns in `packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts:295-534`
- Use `package.json` structure from `packages/react-ai-sdk/` as reference
- Place code in: `packages/react-agent-sdk/src/runtime-cores/` and `packages/react-agent-sdk/src/runtime/`

---

# PHASE 2: Core Runtime Implementation

## Goal
Implement the working runtime hierarchy that provides state and actions to primitives.

## Scope

### Implement runtime classes
- `WorkspaceRuntimeImpl` - Manages multiple tasks, approval queue, resources
- `TaskRuntimeImpl` - Manages task state, agents, subtasks, artifacts
- `AgentRuntimeImpl` - Manages agent state, events, cost tracking
- `AgentEventRuntimeImpl` - Manages single event state and tool execution

Each RuntimeImpl:
- Wraps a RuntimeCore with SubscribableWithState binding
- Implements getState() for current state
- Implements subscribe(callback) for reactivity
- Provides navigation methods (getSubtaskByIndex, getParentAgent, etc.)

### Implement path-based navigation
- `getSubtaskByIndex(idx: number): TaskRuntime | undefined`
- `getSubtaskById(taskId: string): TaskRuntime | undefined`
- `getParentAgent(): AgentRuntime | null`
- `getChildAgents(): AgentRuntime[]`
- `getTask(): TaskRuntime`

### Create runtime state objects
- `TaskState` interface with all 14 properties
- `AgentState` interface with all 15 properties
- `AgentEventState` interface with all 7 properties
- `WorkspaceState` interface for top-level state

### Build stream processor skeleton
- Define `AgentStreamProcessor` class
- Create message conversion interfaces (SDKMessage → RuntimeState)
- Implement state update hooks (wire protocol specifics in Phase 5)

## Dependencies
- Phase 1 complete (runtime interfaces, binding utilities)

## Deliverables
- Fully functional runtime hierarchy
- State objects reflecting all primitive properties
- Navigation methods returning correct runtime instances
- Stream processor structure (partial)

## Success Criteria
- Can create a workspace runtime tracking multiple task runtimes
- Task runtime tracks agent hierarchy (parent/child relationships)
- Can navigate workspace → task → agent → event
- State updates trigger subscriber callbacks

## What We're NOT Doing
- No primitives (that's Phase 3)
- No Claude Agent SDK connection (that's Phase 5)
- Stream processor is scaffold only (full implementation in Phase 5)

## Key Implementation Notes
- Look at `packages/react/src/legacy-runtime/runtime/ThreadRuntime.ts` for binding patterns
- Use `ShallowMemoizeSubject` for state derivations (cost, progress calculations)
- Place code in: `packages/react-agent-sdk/src/runtime/`

---

# PHASE 3: Core Primitives

## Goal
The 3 essential primitives for basic supervision UX.

## Scope

### TaskPrimitive (14 properties + 4 lifecycle actions)

**Properties**:
- `.Root`, `.Title`, `.Status`, `.Strategy`, `.Progress`
- `.LeadAgent`, `.WorkerAgents`, `.AgentTree`
- `.Subtasks`, `.Dependencies`, `.Artifacts`
- `.Cost`, `.Duration`, `.CreatedAt`, `.CompletedAt`

**Actions (Lifecycle)**:
- `.Actions.Lifecycle.Cancel`, `.Retry`, `.RetrySubtask`, `.Prioritize`

### AgentPrimitive (15 properties + 5 lifecycle actions)

**Properties**:
- `.Root`, `.Status`, `.Role`, `.Name`, `.Objective`, `.Boundaries`, `.OutputFormat`
- `.Task`, `.ParentAgent`, `.ChildAgents`
- `.Model`, `.Cost`, `.Duration`, `.ContextUsage`
- `.CreatedAt`, `.LastActivityAt`, `.Error`

**Actions (Lifecycle)**:
- `.Actions.Lifecycle.Pause`, `.Resume`, `.Interrupt`, `.Cancel`, `.Retry`

### ApprovalPrimitive (9 properties + 7 actions)

**Properties**:
- `.Root`, `.Request`, `.ToolName`, `.ToolInput`, `.Context`
- `.Status`, `.Agent`, `.Task`, `.Details`

**Actions**:
- `.Actions.Approve.Once`, `.Session`, `.Always`, `.Timed`
- `.Actions.Reject.Once`, `.WithReason`
- `.Actions.Defer.Skip`

### Implement Properties vs Actions pattern
- All action components use `.Actions` namespace
- Full nesting: `TaskPrimitive.Actions.Lifecycle.Cancel`
- Hook returns callback OR null (null = disabled)
- Factory pattern for action button creation

## Dependencies
- Phase 2 complete (runtime classes providing state)
- All navigation methods functional

## Deliverables
- 3 core primitives with full property and action components
- Context hooks: `useTaskState()`, `useAgentState()`, `useApprovalState()`
- API hooks: `useTaskApi()`, `useAgentApi()`, `useApprovalApi()`
- Action validation hooks for all actions

## Success Criteria
- Render task showing title, status, progress
- Render agent showing status, cost, context usage
- Render approval with approve/reject/deny buttons
- Actions disabled when appropriate (e.g., can't cancel completed task)
- Properties update in real-time as runtime state changes

## What We're NOT Doing
- No supporting primitives (that's Phase 4)
- No tool UI widgets (that's Phase 4)
- No remaining action groups (that's Phase 4)

## Key Implementation Notes
- Follow Radix style from `packages/react/src/primitives/`
- Properties in `packages/react-agent-primitives/src/task/`, `src/agent/`, `src/approval/`
- Use forwardRef pattern with namespace exports
- Implement action validation hooks in `src/hooks/`

---

# PHASE 4: Supporting Primitives

## Goal
The remaining 8 primitives for complete UX.

## Scope

### Visualization Primitives

**TaskTreePrimitive** (4 properties + navigation actions)
- Properties: `.Root`, `.Tree`, `.ExpandedNodes`, `.FocusedNode`, `.ViewMode`
- Actions: `.Actions.View.*`, `.Actions.Navigation.*`

**AgentFeedPrimitive** (3 properties, no actions)
- Properties: `.Root`, `.Events`, `.CurrentActivity`, `.Viewport`

**AgentEventPrimitive** (7 properties + replay actions)
- Properties: `.Root`, `.Timestamp`, `.Type`, `.Status`, `.ToolExecution`, `.Reasoning`, `.SpawnedAgent`, `.Collapsed`
- Actions: `.Actions.View.*`, `.Actions.Copy.*`, `.Actions.Replay.ReExecute`

### Tool UI Primitives

**ToolExecutionPrimitive** (6 properties + execution actions)
- Properties: `.Root`, `.Name`, `.Input`, `.Output`, `.Status`, `.Duration`, `.RemoteUI`
- Actions: `.Actions.View.*`, `.Actions.Copy.*`, `.Actions.Execution.Retry`, `.Cancel`
- Built-in widgets: `BashToolUI`, `EditToolUI`, `ReadToolUI`, `GrepToolUI`

### Approval Management Primitives

**ApprovalQueuePrimitive** (3 properties + bulk/filter actions)
- Properties: `.Root`, `.Count`, `.Items`, `.Viewport`
- Actions: `.Actions.Bulk.*`, `.Actions.Filter.*`

**PermissionModePrimitive** (2 properties + mode actions)
- Properties: `.Root`, `.Current`, `.PerToolConfig`
- Actions: `.Actions.SetMode.*`, `.Actions.TimedBypass.*`, `.Actions.PerTool.*`

### Task Management Primitives

**TaskLauncherPrimitive** (7 properties + launch/draft actions)
- Properties: `.Root`, `.Input`, `.AgentSelector`, `.ModelSelector`, `.DirectorySelector`, `.Attachments`, `.PermissionConfig`, `.BudgetConfig`
- Actions: `.Actions.Launch.Submit`, `.Queue`, `.Actions.Draft.*`

**WorkspacePrimitive** (4 properties + search/selection/bulk actions)
- Properties: `.Root`, `.Tasks`, `.Agents`, `.Notifications`, `.Resources`
- Search/Selection sub-properties
- Actions: `.Actions.View.*`, `.Actions.Bulk.*`, `.Actions.Sort.*`, `.Actions.Filter.*`

### Complete Remaining Action Groups

**TaskPrimitive**:
- `.Actions.Agents.*` (SpawnWorker, ReassignSubtask, CancelAgent)
- `.Actions.Organization.*` (Archive, Delete, Rename, Tag)
- `.Actions.Export.*` (CopyId, ExportJson, Share)

**AgentPrimitive**:
- `.Actions.Branching.*` (Fork, Checkpoint, Rollback)
- `.Actions.Organization.*` (Rename, Pin, Tag)
- `.Actions.Export.*` (CopyId, CopyTranscript, ExportJson, Share)
- `.Actions.Debug.*` (ViewRaw, ViewState, ViewLogs, ViewCost, InspectContext)
- `.Actions.Config.*` (ChangeModel, AdjustPermissions, SetBudget, SetTimeout)

## Dependencies
- Phase 3 complete (core primitives establishing pattern)
- Task, Agent, Approval states fully functional

## Deliverables
- 8 supporting primitives with full properties and actions
- Context hooks for all new primitives
- Tool UI widgets for built-in Claude Agent SDK tools
- Full action coverage across all primitives

## Success Criteria
- Render hierarchical task/agent tree view
- Render agent activity feed with events
- Render bash tool output with streaming
- Render approval queue with bulk actions
- Render workspace overview with search/filter
- All actions have proper disabled states
- Full Properties vs Actions pattern consistently applied

## What We're NOT Doing
- No Claude Agent SDK integration (that's Phase 5)
- No example application (that's Phase 5)

## Key Implementation Notes
- Tool widgets in `packages/react-agent-primitives/src/tools/built-in/`
- Each widget should support streaming output from Phase 1 infrastructure
- Test tool widgets with simulated data before Phase 5

---

# PHASE 5: Integration & Examples

## Goal
End-to-end working system with Claude Agent SDK integration and example application.

## Scope

### Complete @assistant-ui/react-agent-sdk

**Claude Agent SDK Integration**:
- Instantiate Anthropic Agent SDK client
- Connect SDK streams to runtime state updates
- Handle permission hooks → approval system
- Use real API key for testing

**useAgentRuntime() Hook**:
- Accept `AgentRuntimeConfig` (apiKey, baseUrl, model, workspaceId)
- Create `WorkspaceRuntimeCore` from SDK client
- Create full runtime hierarchy
- Return configured `WorkspaceRuntime`

**Message Converters**:
- `SDKAssistantMessage` → `AgentEventState`
- `SDKPartialAssistantMessage` → streaming updates to `ToolExecutionPrimitive.Output`
- `SDKResultMessage` → `AgentPrimitive.Status` + cost/usage
- `parent_tool_use_id` → `AgentPrimitive.ParentAgent` hierarchy
- Task tool invocation → `AgentEventPrimitive` with `.SpawnedAgent`

**Stream Processor**:
- Parse Claude SDK message stream events
- Update runtime state in real-time
- Handle streaming tool output
- Manage rate-limited UI updates (30fps from Phase 1)

### Create Example Application: "Agent Dashboard"

**Features**:
- Workspace overview showing all tasks
- Task detail view with agent tree and activity feeds
- Real-time approval queue with approve/deny buttons
- Cost tracking across tasks and agents
- Task launcher form to create new tasks

**What it Demonstrates**:
- All 11 primitives working together
- Approval flow (allow/deny/always allow)
- Agent spawning hierarchy (lead + workers)
- Tool execution with streaming output
- Cost and context usage tracking

### Documentation
- Update docs site with Agent UI overview
- Document all 11 primitives
- Document useAgentRuntime() hook
- Add example app walkthrough

### Testing
- Unit tests for runtime classes (already done)
- Integration tests for stream processing
- Component tests for primitives
- E2E tests for approval flow (with real API key)

## Dependencies
- Phase 4 complete (all primitives implemented)
- AssistantFrame streaming support from Phase 1

## Deliverables
- Fully functional `@assistant-ui/react-agent-sdk` package
- Working "Agent Dashboard" example app
- Complete documentation
- Test coverage for core functionality

## Success Criteria
- Run example app with real Claude Agent SDK connection
- Create a task and watch agents work in real-time
- Approve/deny tool executions
- See cost tracking updates
- All documentation up to date
- All tests pass

## Key Implementation Notes
- Use real API key for end-to-end testing
- Example app in `examples/agent-dashboard/`
- Message converters in `packages/react-agent-sdk/src/converters/`
- Stream processor fully implemented (scaffold from Phase 2)

---

# How to Create Implementation Plans

Each phase above contains enough context to create a detailed implementation plan. Use the `/create_plan` command with this document as reference.

## Usage

To create an implementation plan for a specific phase:

```
slash create_plan notes/proposals/agent-ui-implementation-planning.md for phase 1
```

Replace `phase 1` with the relevant phase number (1-5).

## What /create_plan Will Do

When invoked with this document and a phase, `/create_plan will:

1. Read the full context (proposal, research, this planning doc)
2. Focus on the specified phase's scope and requirements
3. Create a detailed plan with:
   - Overview and goals
   - Current state analysis
   - Desired end state
   - Step-by-step implementation phases (sub-phases)
   - Success criteria (automated + manual)
   - Testing strategy
4. Save the plan to `notes/plans/[phase-name]-implementation.md`

## Example Flow

```bash
# Create Phase 1 plan
slash create_plan notes/proposals/agent-ui-implementation-planning.md for phase 1
# Creates: notes/plans/infrastructure-foundation-implementation.md

# Implement Phase 1
# (work through the plan, mark items complete)

# Create Phase 2 plan
slash create_plan notes/proposals/agent-ui-implementation-planning.md for phase 2
# Creates: notes/plans/core-runtime-implementation.md

# And so on...
```

---

# Open Questions to Resolve Before Starting

1. **Claude Agent SDK Availability**: Is the Claude Agent SDK publicly available? If not, we may need to mock it or use a different backend initially.

2. **Streaming Granularity**: Per-character vs per-line streaming for tool output? This affects AssistantFrame extension design.

3. **Tool-UI-Server Package**: Should we build `@assistant-ui/tool-ui-server` first (as PR #3015 implies), or can we proceed with extending AssistantFrame directly?

4. **Package Structure**: Should agent primitives be in `packages/react-agent-primitives/` or integrated into `packages/react/src/primitives/`? The codebase analysis suggests a separate package is reasonable.

5. **Test Approach**: How should we test the agent primitives without a real Claude Agent SDK connection initially? Mock SDK or wait until Phase 5?

---

*This document outlines the planning strategy. Actual implementation plans will be created for each phase as work progresses.*