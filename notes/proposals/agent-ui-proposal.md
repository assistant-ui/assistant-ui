# Proposal: agent-ui — Primitives for Agent Orchestration

**Date**: February 2026
**Status**: Draft Proposal (v0.4.0)
**Author**: Research spike by Claude

---

## TL;DR

assistant-ui's primitives are designed for **chat** (threads, messages, composers). The rise of agentic applications — where users manage multiple AI agents doing work — calls for a new set of primitives designed for **work orchestration**.

This proposal outlines "agent-ui": a companion primitive set for building apps like CodeLayer, where the mental model shifts from "I'm having a conversation" to "I'm supervising workers."

**Key insight**: PR #3015's `RemoteToolUI` + iframe pattern is shared infrastructure that both chat-ui and agent-ui can build on.

---

## The Problem

### What assistant-ui does well (chat)

```
User: "Fix the auth bug"
Assistant: "I found the issue on line 42. Here's the fix: ..."
User: "Can you also add tests?"
Assistant: "Sure, here are the tests: ..."
```

This is a **conversation**. Turn-based. Request → Response.

### What's emerging (agent orchestration)

```
User: "Fix the auth bug"
                          ┌─────────────────────────────────┐
Agent starts working...   │ 🔍 Searching codebase...        │
                          │ 📄 Reading src/auth.ts          │
                          │ 💭 Found timing vulnerability   │
                          │ ✏️  Editing src/auth.ts         │ ← needs approval
                          │ 🧪 Running tests...             │
                          │ ✅ All tests pass               │
                          └─────────────────────────────────┘
```

This is **supervision**. You're watching an agent work, approving actions, monitoring costs.

The Claude Agent SDK, OpenAI's Assistants API, and tools like CodeLayer are built around this model. assistant-ui doesn't have primitives for it.

---

## Design Goals

1. **Support task decomposition** — Break complex work into subtasks with agent hierarchies
2. **Enable human-in-the-loop** — First-class approval flows for tool executions
3. **Visualize agent activity** — Real-time feeds of what agents are doing
4. **Track costs and context** — Surface token usage, costs, and context limits
5. **Maintain Radix-style composability** — Primitives that compose like existing assistant-ui components

---

## Current Primitives (Chat-Oriented)

```
ThreadPrimitive          → A conversation
├── .Viewport            → Scrollable messages
├── .Messages            → List of messages
└── .ScrollToBottom

MessagePrimitive         → A single message
├── .Content             → Message body
├── .Parts               → Text, tools, images
└── .If                  → Conditional render

ComposerPrimitive        → Write a message
├── .Input               → Text field
├── .Send                → Submit
└── .Attachments

ActionBarPrimitive       → Actions on messages
├── .Edit / .Copy / .Reload
└── .Feedback
```

**Mental model**: Conversation. Messages. Turns.

---

## Design Principles

### Task vs Agent: The Core Distinction

**Task** = user intent — the *what*. Persists across retries, has subtasks, tracks overall progress.
**Agent** = execution instance — the *who/how*. Does the work, may spawn child agents, has its own lifecycle.

```
Task: "Fix the auth bug"           One task can spawn multiple agents
│
└── Lead Agent (orchestrator)      Agents form hierarchies
    ├── Worker Agent: Analyzer
    ├── Worker Agent: Fixer
    └── Worker Agent: Tester
```

This follows the **orchestrator-worker pattern** emerging in production systems (Anthropic's multi-agent research, Microsoft's agent patterns, CrewAI, LangGraph).

### Properties vs Actions

Every primitive follows a clear separation:

- **Properties** = state/data you display (nouns) — what IS
- **Actions** = operations you perform (verbs) — what you DO

### Flat Action Structure (like assistant-ui)

Actions use **flat naming** at the primitive level, matching assistant-ui's conventions:

```tsx
// Flat - matches assistant-ui patterns
<TaskPrimitive.Cancel />
<AgentPrimitive.Pause />
<ApprovalPrimitive.Approve />
<ApprovalPrimitive.ApproveSession />  // variant as separate component

// NOT deeply nested
<TaskPrimitive.Actions.Lifecycle.Cancel />  // ❌ too verbose
```

This matches how assistant-ui structures `ActionBarPrimitive.Edit`, `ActionBarPrimitive.Copy` — not `ActionBarPrimitive.Actions.Edit`.

### Direct Runtime Access

Hooks provide direct access to runtimes, not wrapped in a ClientApi layer:

```typescript
// Direct access - simpler mental model
const task = useTask();
task.cancel();

const agent = useAgent();
agent.pause();

// NOT wrapped
const taskApi = useTaskApi();
taskApi.task().cancel();  // ❌ unnecessary indirection
```

### Implementation Pattern (from assistant-ui)

Actions follow the existing assistant-ui pattern with null = disabled:

```typescript
// 1. Hook returns callback OR null (null = disabled)
const useTaskCancel = () => {
  const task = useTask();
  const status = useTaskState((s) => s.status);

  if (status !== 'running' && status !== 'queued') return null;

  return useCallback(() => {
    task.cancel();
  }, [task]);
};

// 2. Factory creates the button primitive
export const TaskCancel = createActionButton(
  "TaskPrimitive.Cancel",
  useTaskCancel,
);
```

### Events as Plain Objects

Events are typed plain objects, not wrapped in runtimes:

```typescript
// Plain objects - simpler, events are immutable once created
interface AgentEvent {
  id: string;
  type: AgentEventType;
  timestamp: Date;
  content: unknown;
  agentId: string;
}

// NOT wrapped in runtimes
interface AgentEventRuntime {  // ❌ unnecessary
  subscribe(): void;
  getState(): AgentEventState;
}
```

Events don't need subscription — you subscribe to the agent's event *list*, not individual events.

### SDK-Realistic State

State fields model only what the Claude Agent SDK actually provides:

```typescript
// ✅ SDK provides these
interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  cost: number;
  events: AgentEvent[];
  parentAgentId: string | null;
  childAgentIds: string[];
  model: string;
  contextUsage?: { used: number; limit: number };
}

// ❌ SDK does NOT provide these (they're prompt-level, not protocol-level)
interface AgentState {
  objective: string;    // not in SDK
  boundaries: string;   // not in SDK
  outputFormat: string; // not in SDK
}
```

If the SDK doesn't provide it, we don't model it as state.

---

## Claude Agent SDK Integration

The Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) is the primary integration target. Understanding its structure informed the primitive design.

### Message Mapping

| Agent SDK | agent-ui Primitive |
|-----------|-------------------|
| `SDKAssistantMessage` | `AgentEventPrimitive` |
| `SDKPartialAssistantMessage` | Streaming into `ToolExecutionPrimitive.Output` |
| `SDKResultMessage` | `AgentPrimitive.Status` + cost/usage |
| `SDKSystemMessage` (init) | `AgentPrimitive` metadata |
| `parent_tool_use_id` | `AgentPrimitive.ParentAgent` hierarchy |
| Task tool invocation | `AgentEventPrimitive` with `.SpawnedAgent` |

### Built-in Tool UIs

| Tool | Widget Features |
|------|-----------------|
| **Bash** | Terminal with ANSI colors, streaming output |
| **Read** | Syntax-highlighted code, line numbers |
| **Edit** | Diff view, Monaco editor |
| **Write** | File preview, syntax highlighting |
| **Grep** | Search results with context, clickable paths |
| **Glob** | File tree visualization |
| **Task** | Nested agent activity (subagent) |
| **WebSearch** | Search result cards |

### Permission Hooks → ApprovalPrimitive

```typescript
// Agent SDK hook
hooks: {
  PreToolUse: [{
    matcher: '*',
    hooks: [async (input) => {
      // Surface to ApprovalPrimitive
      const decision = await showApprovalPrompt(input);
      return { permissionDecision: decision };
    }]
  }]
}
```

---

## Proposed Primitives (Work-Oriented)

This section details the three core primitives. For the complete specification of all 11 primitives, see **Appendix A**.

### TaskPrimitive

The primary unit representing user intent — a goal to be accomplished. Tasks own agents.

```
TaskPrimitive
├── .Root                → Provider, takes taskId
│
│   ─── Properties (SDK-provided) ────────────────────────────
├── .Title               → "Fix authentication bug"
├── .Status              → queued | running | completed | failed
├── .Cost                → Aggregate cost across all agents
├── .CreatedAt           → When task was created
├── .CompletedAt         → When task finished (if completed)
│
│   ─── Render Props ─────────────────────────────────────────
├── .Agents              → {(agents) => ...} - list of agent IDs
├── .Approvals           → {(approvals) => ...} - pending approval IDs
│
│   ─── Conditionals ─────────────────────────────────────────
├── .If                  → Conditional render by status
│
│   ─── Actions (flat) ───────────────────────────────────────
├── .Cancel              → Cancel task and all agents
└── .Retry               → Restart task (future)
```

**State shape:**

```typescript
interface TaskState {
  id: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed";
  cost: number;
  agents: AgentState[];
  pendingApprovals: ApprovalState[];
  createdAt: Date;
  completedAt?: Date;
}
```

**Usage:**

```tsx
<TaskPrimitive.Root taskId={taskId}>
  <TaskPrimitive.Title />
  <TaskPrimitive.Status showIcon />
  <TaskPrimitive.Cost precision={4} />

  <TaskPrimitive.If status="running">
    <TaskPrimitive.Cancel>Stop</TaskPrimitive.Cancel>
  </TaskPrimitive.If>

  <TaskPrimitive.Agents>
    {(agents) => agents.map(a => (
      <AgentPrimitive.Root key={a.id} agentId={a.id}>
        ...
      </AgentPrimitive.Root>
    ))}
  </TaskPrimitive.Agents>
</TaskPrimitive.Root>
```

#### Visual: Task-Centric View

```
┌────────────────────────────────────────────────────────────────┐
│ Task: Fix authentication bug                                   │
│ Status: 🔄 Executing  Progress: 2/4 subtasks  Cost: $0.04     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Decomposition                    Agent Activity               │
│  ─────────────                    ──────────────               │
│  ├── ✅ Analyze codebase          │ Lead Agent                 │
│  │   └── Agent: Lead              │ ┌─────────────────────────┐│
│  │       Cost: $0.01              │ │ Spawned 3 workers       ││
│  │                                │ │ Waiting for results...  ││
│  ├── 🔄 Fix vulnerability         │ └─────────────────────────┘│
│  │   └── Agent: Fixer             │                            │
│  │       Cost: $0.02              │ Fixer Agent                │
│  │                                │ ┌─────────────────────────┐│
│  ├── 🔄 Add tests                 │ │ ✏️ Editing auth.ts      ││
│  │   └── Agent: Tester            │ │ 💭 Adding timing check  ││
│  │       Cost: $0.01              │ └─────────────────────────┘│
│  │                                │                            │
│  └── ⏳ Review changes            │ Tester Agent               │
│      └── Agent: (pending)         │ ┌─────────────────────────┐│
│                                   │ │ 📄 Reading test files   ││
│                                   │ └─────────────────────────┘│
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ ⚠️ 1 Approval Pending                                          │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Fixer wants to run: npm test --coverage                    │ │
│ │                        [Allow] [Deny] [Always Allow]       │ │
│ └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### AgentPrimitive

An execution instance that does work. Agents belong to tasks and form hierarchies.

#### Subagent Clarification

**Yes, subagents use the same `AgentPrimitive`** with a parent reference. When an orchestrator spawns a worker via the `Task` tool, the worker is a full `AgentPrimitive` whose parent points to the orchestrator:

```
AgentPrimitive (Lead)           ← parentAgentId = null
├── AgentPrimitive (Worker 1)   ← parentAgentId = Lead
├── AgentPrimitive (Worker 2)   ← parentAgentId = Lead
│   └── AgentPrimitive (Sub)    ← parentAgentId = Worker 2
└── AgentPrimitive (Worker 3)   ← parentAgentId = Lead
```

The Claude Agent SDK's `parent_tool_use_id` maps directly to `parentAgentId`. The UI can render this as nested accordions, a tree view, or separate tabs — that's a presentation choice.

```
AgentPrimitive
├── .Root                → Provider, takes agentId
│
│   ─── Properties (SDK-provided) ────────────────────────────
├── .Name                → Agent name/identifier
├── .Status              → running | paused | completed | failed
├── .Cost                → $0.0234
├── .Model               → claude-sonnet-4 (if available from SDK)
│
│   ─── Render Props ─────────────────────────────────────────
├── .Events              → {(events) => ...} - list of AgentEvent objects
├── .Children            → {(childIds) => ...} - child agent IDs
│
│   ─── Conditionals ─────────────────────────────────────────
├── .If                  → Conditional render by status
│
│   ─── Actions (flat) ───────────────────────────────────────
├── .Pause               → Pause execution (if SDK supports)
├── .Resume              → Resume paused agent
└── .Cancel              → Cancel agent
```

**State shape:**

```typescript
interface AgentState {
  id: string;
  name: string;
  status: "running" | "paused" | "completed" | "failed";
  cost: number;
  events: AgentEvent[];
  parentAgentId: string | null;
  childAgentIds: string[];
  taskId: string;
  model?: string;
}
```

**Usage:**

```tsx
<AgentPrimitive.Root agentId={agentId}>
  <AgentPrimitive.Name />
  <AgentPrimitive.Status showIcon />
  <AgentPrimitive.Cost />

  <AgentPrimitive.Events>
    {(events) => events.map(e => (
      <EventCard key={e.id} event={e} />
    ))}
  </AgentPrimitive.Events>

  <AgentPrimitive.Children>
    {(childIds) => childIds.map(id => (
      <AgentPrimitive.Root key={id} agentId={id}>
        {/* recursive */}
      </AgentPrimitive.Root>
    ))}
  </AgentPrimitive.Children>
</AgentPrimitive.Root>
```

### ApprovalPrimitive

Permission request — the core primitive for human-in-the-loop.

```
ApprovalPrimitive
├── .Root                → Provider, takes approvalId
│
│   ─── Properties (SDK-provided) ────────────────────────────
├── .ToolName            → "Bash", "Edit", etc.
├── .ToolInput           → The arguments (supports format="json"|"raw")
├── .Reason              → Context/description
├── .Status              → pending | approved | denied
│
│   ─── Conditionals ─────────────────────────────────────────
├── .If                  → Conditional render by status
│
│   ─── Actions (flat, with variants) ────────────────────────
├── .Approve             → Allow this one (default)
├── .ApproveSession      → Allow for this session
├── .ApproveAlways       → Always allow this tool
├── .ApproveTimed        → Allow for N minutes (takes duration prop)
│
├── .Deny                → Deny this one
└── .DenyWithReason      → Deny with feedback (takes reason prop)
```

**State shape:**

```typescript
interface ApprovalState {
  id: string;
  toolName: string;
  toolInput: unknown;
  reason: string;
  status: "pending" | "approved" | "denied";
  agentId: string;
  taskId: string;
  createdAt: Date;
}
```

**Usage:**

```tsx
<ApprovalPrimitive.Root approvalId={approvalId}>
  <div className="approval-card">
    <ApprovalPrimitive.ToolName />
    <ApprovalPrimitive.ToolInput format="json" />

    <ApprovalPrimitive.If status="pending">
      <div className="actions">
        <ApprovalPrimitive.Approve>Allow</ApprovalPrimitive.Approve>
        <ApprovalPrimitive.ApproveSession>Allow for session</ApprovalPrimitive.ApproveSession>
        <ApprovalPrimitive.Deny>Deny</ApprovalPrimitive.Deny>
      </div>
    </ApprovalPrimitive.If>

    <ApprovalPrimitive.If status={["approved", "denied"]}>
      <ApprovalPrimitive.Status showIcon />
    </ApprovalPrimitive.If>
  </div>
</ApprovalPrimitive.Root>
```

**Why flat action variants?**

The original proposal had nested actions like `.Actions.Approve.Once`. This is verbose and doesn't match assistant-ui conventions. Instead, we use flat variants:

```tsx
// ✅ Flat variants - consistent with assistant-ui
<ApprovalPrimitive.Approve />
<ApprovalPrimitive.ApproveSession />
<ApprovalPrimitive.ApproveAlways />

// ❌ Nested - too verbose
<ApprovalPrimitive.Actions.Approve.Once />
<ApprovalPrimitive.Actions.Approve.Session />
```

Each variant is a separate component that encapsulates the approval mode logic.

### Supporting Primitives (Summary)

The following primitives complete the agent-ui system. Full specifications are in **Appendix A**.

| Primitive | Purpose |
|-----------|---------|
| `TaskTreePrimitive` | Hierarchical visualization of task/agent relationships |
| `ToolExecutionPrimitive` | Rich tool UIs with streaming output |
| `ApprovalQueuePrimitive` | Workspace-level approval aggregation |
| `PermissionModePrimitive` | Configure approval granularity |
| `TaskLauncherPrimitive` | "New task" form with model/directory selection |
| `WorkspacePrimitive` | Top-level container with search, bulk ops, views |

**Note:** `AgentFeedPrimitive` and `AgentEventPrimitive` from earlier versions have been removed. Their functionality is covered by:
- `AgentPrimitive.Events` — render prop for event list
- `ToolExecutionPrimitive` — for rich tool UIs within events
- Plain `AgentEvent` objects — no need for event-level primitives

---

## Primitive Summary

| Primitive | Properties | Actions (flat) |
|-----------|------------|----------------|
| `TaskPrimitive` | 5 + 2 render props | Cancel, Retry |
| `AgentPrimitive` | 4 + 2 render props | Pause, Resume, Cancel |
| `ApprovalPrimitive` | 4 | Approve, ApproveSession, ApproveAlways, ApproveTimed, Deny, DenyWithReason |
| `TaskTreePrimitive` | 4 | ExpandAll, CollapseAll, FocusAgent |
| `ToolExecutionPrimitive` | 6 | Expand, Collapse, CopyInput, CopyOutput |
| `ApprovalQueuePrimitive` | 3 | ApproveAll, DenyAll, ClearResolved |
| `PermissionModePrimitive` | 2 | SetAskAll, SetAutoReads, SetAutoAll |
| `TaskLauncherPrimitive` | 5 | Submit, SaveDraft |
| `WorkspacePrimitive` | 4 | TableView, DetailView, SplitView |

**Total: 9 primitives** (reduced from 11 by removing AgentFeedPrimitive and AgentEventPrimitive)

---

## Primitive Relationships

How the primitives compose together:

```
WorkspacePrimitive
│
├── TaskLauncherPrimitive              User creates new task
│
├── TaskPrimitive[]                    List of tasks
│   │
│   ├── TaskTreePrimitive              Shows task's agent hierarchy
│   │   └── AgentPrimitive[]           Tree nodes are agents
│   │
│   └── AgentPrimitive (Lead)          Each task has agents
│       │
│       ├── .Events render prop        Agent's activity stream
│       │   └── AgentEvent[]           Plain event objects
│       │       └── ToolExecutionPrimitive   (for tool_call events)
│       │
│       └── .Children render prop      Spawned children
│           └── AgentPrimitive[]       Recursive hierarchy
│
├── ApprovalQueuePrimitive             Aggregates across all agents
│   └── ApprovalPrimitive[]            Individual permission requests
│
└── PermissionModePrimitive            Global permission settings
```

**Key simplification:** Events are plain objects accessed via `AgentPrimitive.Events` render prop. Only tool executions get a dedicated primitive (`ToolExecutionPrimitive`) for rich UI rendering.

### Composition Example: Orchestrator-Worker

When a lead agent spawns workers, here's how the primitives interact:

```tsx
function TaskDetail({ taskId }: { taskId: string }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  return (
    <TaskPrimitive.Root taskId={taskId}>
      {/* Header */}
      <TaskPrimitive.Title />
      <TaskPrimitive.Status showIcon />
      <TaskPrimitive.Cost />

      {/* Split view: tree + active agent feed */}
      <div className="flex">
        {/* Left: Agent hierarchy */}
        <TaskTreePrimitive.Root onSelectAgent={setSelectedAgentId}>
          <TaskTreePrimitive.Tree />
        </TaskTreePrimitive.Root>

        {/* Right: Selected agent's activity */}
        {selectedAgentId && (
          <AgentPrimitive.Root agentId={selectedAgentId}>
            <AgentPrimitive.Name />
            <AgentPrimitive.Status showIcon />
            <AgentPrimitive.Cost />

            {/* Events via render prop - simple and flexible */}
            <AgentPrimitive.Events>
              {(events) => (
                <div className="event-feed">
                  {events.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </AgentPrimitive.Events>

            {/* Child agents via render prop */}
            <AgentPrimitive.Children>
              {(childIds) => childIds.length > 0 && (
                <div className="child-agents">
                  <h4>Spawned agents</h4>
                  {childIds.map(id => (
                    <button key={id} onClick={() => setSelectedAgentId(id)}>
                      View child agent
                    </button>
                  ))}
                </div>
              )}
            </AgentPrimitive.Children>
          </AgentPrimitive.Root>
        )}
      </div>

      {/* Approval banner */}
      <TaskPrimitive.Approvals>
        {(approvals) => approvals.map(a => (
          <ApprovalPrimitive.Root key={a.id} approvalId={a.id}>
            <ApprovalPrimitive.ToolName />
            <ApprovalPrimitive.ToolInput format="json" />
            <ApprovalPrimitive.Approve>Allow</ApprovalPrimitive.Approve>
            <ApprovalPrimitive.ApproveSession>Allow for session</ApprovalPrimitive.ApproveSession>
            <ApprovalPrimitive.Deny>Deny</ApprovalPrimitive.Deny>
          </ApprovalPrimitive.Root>
        ))}
      </TaskPrimitive.Approvals>
    </TaskPrimitive.Root>
  );
}

// Simple event card - no primitive needed for basic rendering
function EventCard({ event }: { event: AgentEvent }) {
  if (event.type === 'tool_call') {
    return (
      <ToolExecutionPrimitive.Root event={event}>
        <ToolExecutionPrimitive.Name />
        <ToolExecutionPrimitive.Input />
        <ToolExecutionPrimitive.Output />
      </ToolExecutionPrimitive.Root>
    );
  }

  if (event.type === 'reasoning') {
    return <div className="reasoning">{event.content.text}</div>;
  }

  return <div className="event">{event.type}</div>;
}
```

**Key differences from v0.3:**
1. No `AgentFeedPrimitive` or `AgentEventPrimitive` — just render props
2. Events are plain objects, rendered by simple components
3. Only `ToolExecutionPrimitive` has a dedicated primitive (for rich UI)
4. Flat action names: `.Approve`, `.ApproveSession`, not `.Actions.Approve.Once`

---

## Orchestration Patterns

The Task/Agent model supports emerging multi-agent orchestration patterns.

### Orchestrator-Worker (Recommended)

```
Task: "Research semiconductor shortage"
│
└── Lead Agent (orchestrator)
    ├── Worker: Supply chain research     ← parallel
    ├── Worker: Financial impact          ← parallel
    ├── Worker: Geographic factors        ← parallel
    └── Worker: Future projections        ← parallel

    → Lead synthesizes all results
```

Best for: Complex research, multi-faceted analysis. Achieves up to 90% time reduction via parallelization.

### Sequential Pipeline

```
Task: "Build user authentication"
│
└── Lead Agent
    └── Worker: Schema design
        └── Worker: Backend implementation
            └── Worker: Frontend forms
                └── Worker: Integration tests
```

Best for: Tasks with clear dependencies where each step builds on the previous.

### Dynamic Decomposition

```
Task: "Fix performance issues"
│
└── Lead Agent: Profiler
    │   Discovers: "Database queries slow"
    │
    └── Dynamically spawns:
        ├── Worker: Query optimizer
        └── Worker: Index analyzer
            │   Discovers: "Missing index"
            │
            └── Dynamically spawns:
                └── Worker: Migration writer
```

Best for: Exploratory tasks where the full scope isn't known upfront.

### Handoff Chain

```
Task: "Handle support request"
│
└── Triage Agent → Technical Agent → Billing Agent → Human
    (only one active at a time, handoff based on context)
```

Best for: Customer support, routing, escalation flows.

---

## How It Builds on PR #3015

PR #3015 introduces `@assistant-ui/tool-ui-server` with:

- **RemoteToolUI** — Render tool UIs in sandboxed iframes
- **Message bridge** — Parent ↔ iframe communication
- **OpenAI Apps SDK protocol** — `window.openai` for widget state

### What PR #3015 Provides

`RemoteToolUI` solves the "rich tool output" problem: how do you render a syntax-highlighted diff, a terminal with ANSI colors, or an interactive map inside a chat/agent UI? The answer is sandboxed iframes with a message bridge.

**agent-ui leverages this for `ToolExecutionPrimitive.RemoteUI`**:

```tsx
// ToolExecutionPrimitive uses RemoteToolUI under the hood
<ToolExecutionPrimitive.Root>
  <ToolExecutionPrimitive.Name />      {/* "Bash" */}
  <ToolExecutionPrimitive.RemoteUI />  {/* ← iframe via PR #3015 */}
  <ToolExecutionPrimitive.Duration />
</ToolExecutionPrimitive.Root>
```

agent-ui **sits alongside** PR #3015, not wrapping it. The primitives consume the iframe infrastructure:
- `ToolExecutionPrimitive` → uses `RemoteToolUI` for rich tool widgets
- Built-in widgets (Bash terminal, Edit diff view) → are iframe apps served by `tool-ui-server`
- The message bridge → enables streaming output into the iframe

This is **shared infrastructure**. Both chat-ui and agent-ui use it:

```
                    ┌─────────────────────────────┐
                    │  @assistant-ui/tool-ui-server │
                    │                             │
                    │  RemoteToolUI + iframe      │
                    │  Message bridge protocol    │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │ @assistant-ui/  │  │ @assistant-ui/  │  │ @assistant-ui/  │
    │ react-ai-sdk    │  │ react-langgraph │  │ react-agent-sdk │
    │                 │  │                 │  │                 │
    │ Chat responses  │  │ Agent graphs    │  │ Agent dashboard │
    └─────────────────┘  └─────────────────┘  └─────────────────┘
```

For agent-ui, we'd add:

1. **Built-in tool widgets** for Agent SDK tools (Bash, Edit, Read, Grep, etc.)
2. **Streaming support** in RemoteToolUI for long-running tools
3. **Subagent visualization** — Task tool renders nested agent activity

---

## Runtime Architecture

### Current (Chat)

```
AssistantRuntime
└── ThreadRuntime
    └── MessageRuntime
        └── ContentPartRuntime
```

### Proposed (Agents) — Simplified

```
WorkspaceRuntime
│
├── TaskRuntime[]                    ← Map<taskId, TaskRuntime>
│   ├── TaskState                    ← Plain object with agents[], pendingApprovals[]
│   ├── AgentRuntime[]               ← Map<agentId, AgentRuntime>
│   │   └── AgentState               ← Plain object with events[]
│   ├── ApprovalRuntime[]            ← Map<approvalId, ApprovalRuntime>
│   │   └── ApprovalState            ← Plain object
│   └── subscribe()
│
└── subscribe()
```

**Key simplifications from v0.3:**
- No `AgentFeedRuntime`, `AgentEventRuntime`, `ToolExecutionRuntime` — events are plain objects
- No `TaskStateRuntime`, `AgentStateRuntime` — state is just typed objects
- No `ResourceMonitorRuntime` — cost tracking lives on Task/Agent state
- Flat structure: Workspace → Task → Agent/Approval

### Direct Runtime Access (not ClientApi)

```typescript
// Runtimes are accessed directly via hooks
interface TaskRuntime {
  // State
  getState(): TaskState;
  subscribe(callback: () => void): () => void;

  // Actions
  cancel(): Promise<void>;
  retry(): Promise<void>;

  // Child runtimes
  getAgent(agentId: string): AgentRuntime | undefined;
  getApproval(approvalId: string): ApprovalRuntime | undefined;
}

interface AgentRuntime {
  // State
  getState(): AgentState;
  subscribe(callback: () => void): () => void;

  // Actions (if SDK supports)
  pause(): void;
  resume(): void;
  cancel(): void;
}

interface ApprovalRuntime {
  // State
  getState(): ApprovalState;
  subscribe(callback: () => void): () => void;

  // Actions
  approve(mode?: 'once' | 'session' | 'always'): Promise<void>;
  deny(reason?: string): Promise<void>;
}

// Direct access via hooks - no ClientApi wrapper
const task = useTask();
task.cancel();

const agent = useAgent();
agent.pause();

const approval = useApproval();
approval.approve('session');
```

### Hooks

```typescript
// Workspace level
const workspace = useWorkspace();
const tasks = useWorkspaceTasks();  // subscribes to task list

// Task level (inside TaskPrimitive.Root)
const task = useTask();
const status = useTaskState(s => s.status);
const cost = useTaskState(s => s.cost);

// Agent level (inside AgentPrimitive.Root)
const agent = useAgent();
const events = useAgentState(s => s.events);
const status = useAgentState(s => s.status);

// Approval level (inside ApprovalPrimitive.Root)
const approval = useApproval();
const toolName = useApprovalState(s => s.toolName);
```

---

## Package Structure

Following assistant-ui conventions (one package per integration), everything lives in a single package:

```
packages/
├── react/                      # Existing - chat primitives
├── tool-ui-server/             # PR #3015 - shared iframe infra (future)
│
└── react-agent/                # NEW - Agent SDK integration + primitives
    ├── src/
    │   ├── runtime/            # State management
    │   │   ├── types.ts
    │   │   ├── WorkspaceRuntime.ts
    │   │   ├── TaskRuntime.ts
    │   │   ├── AgentRuntime.ts
    │   │   ├── ApprovalRuntime.ts
    │   │   └── PermissionStore.ts    # Approval persistence
    │   │
    │   ├── sdk/                # SDK clients
    │   │   ├── HttpAgentClient.ts
    │   │   ├── AnthropicAgentClient.ts
    │   │   └── converters.ts
    │   │
    │   ├── hooks/              # React hooks
    │   │   ├── useAgentWorkspace.tsx
    │   │   ├── useTaskState.tsx
    │   │   ├── useAgentState.tsx
    │   │   ├── useApprovalState.tsx
    │   │   └── usePermissionMode.tsx
    │   │
    │   ├── primitives/         # UI primitives
    │   │   ├── task/
    │   │   │   ├── TaskPrimitive.tsx
    │   │   │   ├── TaskTreePrimitive.tsx
    │   │   │   └── TaskLauncherPrimitive.tsx
    │   │   ├── agent/
    │   │   │   └── AgentPrimitive.tsx
    │   │   ├── tools/
    │   │   │   └── ToolExecutionPrimitive.tsx
    │   │   ├── approval/
    │   │   │   ├── ApprovalPrimitive.tsx
    │   │   │   ├── ApprovalQueuePrimitive.tsx
    │   │   │   └── PermissionModePrimitive.tsx
    │   │   └── workspace/
    │   │       └── WorkspacePrimitive.tsx
    │   │
    │   ├── actions/            # Action button factory
    │   │   └── createActionButton.tsx
    │   │
    │   └── index.ts
    │
    └── package.json
```

**Rationale:** Matches `@assistant-ui/react-ai-sdk` pattern — one package per integration, not split by layer. Simpler for users (one install) and the runtime/primitives are tightly coupled anyway.

---

## Validation: CodeLayer

CodeLayer (open-source IDE built on Claude Code) validates this proposal's core architecture.

### Direct Mappings

| CodeLayer | agent-ui Proposal |
|-----------|-------------------|
| `Session` | `TaskPrimitive` + `AgentPrimitive` (combined) |
| `SessionTable` | `WorkspacePrimitive.Tasks` |
| `SessionDetail` | `TaskPrimitive` + `AgentFeedPrimitive` |
| `ConversationStream` | `AgentFeedPrimitive` |
| `ConversationEvent` | `AgentEventPrimitive` |
| `Approval` | `ApprovalPrimitive` |
| `BashToolCallContent` etc. | `ToolExecutionPrimitive` + widgets |
| `parentToolUseId` | `AgentPrimitive.ParentAgent` |

### Features Incorporated from CodeLayer

| CodeLayer Feature | Incorporated As |
|-------------------|-----------------|
| Draft sessions | `TaskLauncherPrimitive.Actions.Draft.*` |
| Session forking | `AgentPrimitive.Actions.Branching.Fork` |
| Bulk operations | `WorkspacePrimitive.Actions.Bulk.*` |
| Session search | `WorkspacePrimitive.Search.*` |
| Archive/restore | `TaskPrimitive.Actions.Organization.Archive` |
| View modes | `WorkspacePrimitive.Actions.View.*` |
| Denial reasons | `ApprovalPrimitive.Actions.Reject.WithReason` |
| Auto-accept modes | `PermissionModePrimitive.Actions.SetMode.*` |
| Timed bypass | `PermissionModePrimitive.Actions.TimedBypass.*` |
| Context tracking | `AgentPrimitive.ContextUsage` |

---

## Design Decisions: MVP vs Proposal

This section documents decisions made after building an MVP and comparing patterns.

### Kept from MVP (simpler is better)

| Decision | Rationale |
|----------|-----------|
| **Flat actions** (`.Cancel` not `.Actions.Lifecycle.Cancel`) | Matches assistant-ui conventions, less verbose, better IDE autocomplete |
| **Direct runtime access** (`useTask()` not `useTaskApi().task()`) | No value from extra indirection, simpler mental model |
| **Events as plain objects** | Events are immutable once created, no need for subscription |
| **Render props for collections** | `AgentPrimitive.Events` is simpler than a dedicated `AgentFeedPrimitive` |
| **SDK-realistic state only** | Don't model fields (objective, boundaries) that SDK doesn't provide |

### Kept from Proposal (needed for real use)

| Decision | Rationale |
|----------|-----------|
| **Multiple approval modes** (Once, Session, Always, Timed) | Essential for real-world approval UX |
| **Dedicated complex primitives** (TaskTree, ApprovalQueue) | These need real logic, not just render props |
| **Action disabled pattern** (null return) | Clean pattern for conditional action availability |
| **Richer status values** | "running" alone isn't enough granularity |

### Removed (over-engineered)

| Removed | Why |
|---------|-----|
| `AgentFeedPrimitive` | Just a viewport + list, render prop is enough |
| `AgentEventPrimitive` | Events are simple objects, no primitive needed |
| `AgentEventRuntime`, `ToolExecutionRuntime` | Events don't need subscription |
| ClientApi wrapper | Extra indirection with no benefit |
| Fields like `objective`, `boundaries`, `outputFormat` | SDK doesn't provide these |

---

## Open Questions

1. **Naming**: "agent-ui" vs "workspace-ui" vs "orchestration-ui"?

2. **Coexistence**: Should chat and agent primitives live in separate packages or unified? Apps like CodeLayer likely want both.

3. **Streaming depth**: How granular should streaming be? Per-character for Bash output? Per-line?

4. **Subagent visualization**: Nested accordions? Separate tabs? Tree view?

5. **RemoteToolUI integration**: When/how to use PR #3015's iframe pattern for rich tool outputs?

6. **Persistence**: Agent sessions can be long-running. How to handle reconnection, history?

---

## Next Steps

1. **Prototype TaskTreePrimitive** — Visualize the task/agent hierarchy

2. **Prototype AgentFeedPrimitive** — The activity feed is the core visualization

3. **Extend PR #3015** — Add streaming support to RemoteToolUI for Bash/long-running tools

4. **Build `@assistant-ui/react-agent-sdk`** — Basic runtime integration with Claude Agent SDK

5. **Dogfood** — Build a simple "agent dashboard" example app using the primitives

---

## Summary

| | assistant-ui (chat) | agent-ui (work) |
|-|---------------------|-----------------|
| **Mental model** | Conversation | Supervision |
| **Primary unit** | Message | Task |
| **Execution unit** | — | Agent |
| **User action** | Send message | Launch task, Approve/Deny |
| **Time model** | Turn-based | Continuous |
| **Visibility** | Final responses | Live activity stream |
| **Hierarchy** | BranchPicker | Task → Lead Agent → Worker Agents |
| **New concepts** | — | Task decomposition, Agent hierarchy, Approvals, Costs, Context limits |

The agent-ui primitives complement (not replace) assistant-ui's chat primitives. They share the tool UI infrastructure from PR #3015 but serve different interaction patterns.

As AI shifts from "chat assistants" to "AI workers," having primitives for both paradigms positions assistant-ui for the next wave of applications.

---
---

# Appendices

---

## Appendix A: Full Primitive Specifications

### TaskTreePrimitive

Hierarchical visualization of agent relationships within a task.

```
TaskTreePrimitive
├── .Root                → Provider, takes taskId
│
│   ─── Properties ───────────────────────────────────────────
├── .Tree                → The agent hierarchy
├── .SelectedAgent       → Currently selected agent ID
│
│   ─── Actions (flat) ───────────────────────────────────────
├── .ExpandAll           → Expand all nodes
├── .CollapseAll         → Collapse all nodes
└── .SelectAgent         → Select specific agent (takes agentId)
```

**Usage:**

```tsx
<TaskTreePrimitive.Root taskId={taskId} onSelectAgent={setSelectedAgentId}>
  <TaskTreePrimitive.Tree />
  <TaskTreePrimitive.ExpandAll>Expand All</TaskTreePrimitive.ExpandAll>
</TaskTreePrimitive.Root>
```

### ToolExecutionPrimitive

A tool being run — for rich tool UIs within event streams.

```
ToolExecutionPrimitive
├── .Root                → Provider, takes event (tool_call event)
│
│   ─── Properties ───────────────────────────────────────────
├── .Name                → "Bash", "Edit", "Read"
├── .Input               → Arguments (supports format="json"|"raw")
├── .Output              → Result (supports streaming)
├── .Status              → pending | running | completed | error
├── .Duration            → How long the tool ran
│
│   ─── Actions (flat) ───────────────────────────────────────
├── .Expand              → Expand output
├── .Collapse            → Collapse output
├── .CopyInput           → Copy tool arguments
└── .CopyOutput          → Copy tool result
```

**Usage:**

```tsx
<ToolExecutionPrimitive.Root event={toolCallEvent}>
  <ToolExecutionPrimitive.Name />
  <ToolExecutionPrimitive.Input format="json" />
  <ToolExecutionPrimitive.Output />
  <ToolExecutionPrimitive.CopyOutput>Copy</ToolExecutionPrimitive.CopyOutput>
</ToolExecutionPrimitive.Root>
```

### ApprovalQueuePrimitive

All pending approvals across agents — workspace-level aggregation.

```
ApprovalQueuePrimitive
├── .Root                → Provider, optionally takes filter
│
│   ─── Properties ───────────────────────────────────────────
├── .Count               → Badge count
├── .Items               → {(approvals) => ...} render prop
│
│   ─── Actions (flat) ───────────────────────────────────────
├── .ApproveAll          → Approve all pending
├── .DenyAll             → Deny all pending
└── .ClearResolved       → Remove resolved items
```

**Usage:**

```tsx
<ApprovalQueuePrimitive.Root filter={{ taskId }}>
  <ApprovalQueuePrimitive.Count /> pending
  <ApprovalQueuePrimitive.Items>
    {(approvals) => approvals.map(a => (
      <ApprovalPrimitive.Root key={a.id} approvalId={a.id}>
        ...
      </ApprovalPrimitive.Root>
    ))}
  </ApprovalQueuePrimitive.Items>
  <ApprovalQueuePrimitive.ApproveAll>Approve All</ApprovalQueuePrimitive.ApproveAll>
</ApprovalQueuePrimitive.Root>
```

### PermissionModePrimitive

Configure approval granularity — settings for approval behavior.

```
PermissionModePrimitive
├── .Root                → Provider
│
│   ─── Properties ───────────────────────────────────────────
├── .CurrentMode         → Current mode display
│
│   ─── Actions (flat) ───────────────────────────────────────
├── .SetAskAll           → Ask for everything
├── .SetAutoReads        → Auto-approve read-only tools
├── .SetAutoAll          → Auto-approve everything
└── .SetPerTool          → Custom per-tool config (takes config prop)
```

### TaskLauncherPrimitive

Start new work — the "new task" form.

```
TaskLauncherPrimitive
├── .Root                → Provider
│
│   ─── Properties ───────────────────────────────────────────
├── .Input               → Task description textarea
├── .ModelSelector       → Which model (if configurable)
│
│   ─── Actions (flat) ───────────────────────────────────────
├── .Submit              → Launch task immediately
└── .SaveDraft           → Save as draft (future)
```

**Usage:**

```tsx
<TaskLauncherPrimitive.Root onSubmit={handleCreateTask}>
  <TaskLauncherPrimitive.Input placeholder="Describe your task..." />
  <TaskLauncherPrimitive.Submit>Launch</TaskLauncherPrimitive.Submit>
</TaskLauncherPrimitive.Root>
```

### WorkspacePrimitive

Overview of all tasks — the top-level container.

```
WorkspacePrimitive
├── .Root                → Provider
│
│   ─── Properties ───────────────────────────────────────────
├── .Tasks               → {(tasks) => ...} render prop for task list
├── .TotalCost           → Aggregate cost across all tasks
│
│   ─── Actions (flat) ───────────────────────────────────────
├── .TableView           → Switch to table layout
├── .SplitView           → Switch to list + detail
└── .DetailView          → Switch to single task detail
```

**Usage:**

```tsx
<WorkspacePrimitive.Root>
  <TaskLauncherPrimitive.Root>...</TaskLauncherPrimitive.Root>

  <WorkspacePrimitive.Tasks>
    {(tasks) => tasks.map(t => (
      <TaskPrimitive.Root key={t.id} taskId={t.id}>
        <TaskPrimitive.Title />
        <TaskPrimitive.Status />
      </TaskPrimitive.Root>
    ))}
  </WorkspacePrimitive.Tasks>
</WorkspacePrimitive.Root>
```

---

## Appendix B: Design Decision — Why Not Extend react-ag-ui?

assistant-ui already has `@assistant-ui/react-ag-ui` — an integration with the AG-UI protocol (CopilotKit's agent protocol). Should we extend it for agent-ui?

**No.** AG-UI is CopilotKit's protocol, designed for their ecosystem. Claude Agent SDK is Anthropic's protocol with different:
- Message formats (`SDKAssistantMessage` vs AG-UI events)
- Streaming semantics (`RawMessageStreamEvent` vs `TEXT_MESSAGE_CHUNK`)
- Native concepts (permissions/hooks, `parent_tool_use_id` hierarchy, session management)

Trying to shoehorn Claude Agent SDK into react-ag-ui would create leaky abstractions.

**What's worth reusing (as patterns, not code):**

| Pattern | Reuse? | Notes |
|---------|--------|-------|
| `RunAggregator` approach | ✅ | Event accumulation into content parts works well |
| Custom `*ThreadRuntimeCore` class | ✅ | Cleaner than inline hook logic |
| `notifyUpdate` version pattern | ✅ | Clean React update triggering |
| `useExternalStoreRuntime` as foundation | ✅ | This is the right base |
| AG-UI event types | ❌ | Claude SDK has its own |
| AG-UI subscriber pattern | ❌ | Claude SDK uses async generators |

**Recommendation:** Build `@assistant-ui/react-agent-sdk` fresh, copying architectural patterns but not code. Keep react-ag-ui separate — it serves CopilotKit users.

```
react-ag-ui     → AG-UI protocol users (CopilotKit)
react-agent-sdk → Claude Agent SDK users (the target)
```

Both can feed into agent-ui's supervision primitives if someone wants that layer.

---

## Appendix C: Changelog

### v0.4.0 (February 2026) — MVP Learnings Integration

**Major simplifications based on MVP implementation learnings:**

1. **Flat action structure** — Actions are now flat like assistant-ui (`.Cancel`, `.Approve`) not nested (`.Actions.Lifecycle.Cancel`)
2. **Direct runtime access** — `useTask()` returns runtime directly, no ClientApi wrapper
3. **Events as plain objects** — No `AgentEventRuntime` or `AgentFeedRuntime`, events are typed objects
4. **Removed 2 primitives** — `AgentFeedPrimitive` and `AgentEventPrimitive` replaced by render props on `AgentPrimitive`
5. **SDK-realistic state** — Removed aspirational fields (objective, boundaries, outputFormat) that SDK doesn't provide
6. **Simplified runtime hierarchy** — Flat structure without intermediate runtime layers

**Breaking changes from v0.3:**

| v0.3 | v0.4 |
|------|------|
| `<TaskPrimitive.Actions.Lifecycle.Cancel />` | `<TaskPrimitive.Cancel />` |
| `<ApprovalPrimitive.Actions.Approve.Once />` | `<ApprovalPrimitive.Approve />` |
| `<ApprovalPrimitive.Actions.Approve.Session />` | `<ApprovalPrimitive.ApproveSession />` |
| `useTaskApi().task().cancel()` | `useTask().cancel()` |
| `AgentFeedPrimitive.Events` | `AgentPrimitive.Events` (render prop) |
| `AgentEventPrimitive.Root` | Plain `EventCard` component |
| 11 primitives | 9 primitives |

**Rationale:** The MVP proved these simpler patterns work well in practice and match assistant-ui conventions better.

### v0.3.1 (January 2026)
- **Clarified subagent handling**: Added explicit section explaining AgentPrimitive applies to subagents with `.ParentAgent` reference
- **Expanded PR #3015 relationship**: Added section explaining what RemoteToolUI provides and how agent-ui leverages it
- **Added primitive relationship diagram**: Visual showing how all 11 primitives compose together
- **Added composition example**: Complete code example showing Task + Agent + Approval for orchestrator-worker pattern
- **Added Swarms research**: New Appendix E comparing to Claude Code's upcoming Swarms feature (Agent, Team, Teammate, Inbox concepts)

### v0.3.0 (January 2026)
- **Restructured document** based on editorial feedback
- Added "Design Goals" section after "The Problem"
- Moved "Claude Agent SDK Integration" earlier (after Design Principles)
- Moved visual mockup inline with TaskPrimitive specification
- Extracted supporting primitives to Appendix A (kept 3 core primitives inline)
- Moved react-ag-ui decision to Appendix B
- Added transition text between sections
- Moved Changelog and References to appendices

### v0.2.2 (January 2026)
- Added "Existing Agent Integration: react-ag-ui" subsection
- Documented decision to build `@assistant-ui/react-agent-sdk` fresh rather than extending react-ag-ui
- Identified reusable patterns (RunAggregator, custom RuntimeCore, notifyUpdate) vs protocol-specific code

### v0.2.1 (January 2026)
- **Decided**: Task = user intent, Agent = execution instance (one task → multiple agents)
- Elevated `TaskPrimitive` to primary unit with decomposition, strategy, progress, subtasks
- Added `AgentPrimitive` hierarchy: `.Role`, `.Task`, `.ParentAgent`, `.ChildAgents`, `.Objective`, `.Boundaries`
- Added `TaskTreePrimitive` for hierarchical visualization
- Added `.SpawnedAgent` to `AgentEventPrimitive` for agent spawn events
- Added `.Task` and `.Agent` references to `ApprovalPrimitive`
- Added `.ByTask` filter to `ApprovalQueuePrimitive`
- Added `.TreeView` to `WorkspacePrimitive.Actions.View`
- Added Orchestration Patterns section (orchestrator-worker, sequential, dynamic, handoff)
- Added Task-centric visual mockup
- Updated runtime architecture with Task as primary
- Added `TaskClientApi` with agent management methods
- Removed "Task vs Agent" from open questions (decided)

### v0.2.0 (January 2026)
- Separated Properties vs Actions with clear principle
- Moved all actions (Fork, Interrupt, Allow, Deny, etc.) into `.Actions`
- Added full nesting for action groups (Lifecycle, Branching, Organization, Export, Debug, Config)
- Removed `.Progress` from AgentPrimitive (now on TaskPrimitive where it makes sense)
- Added `.Status` and `.Collapsed` to AgentEventPrimitive
- Added Search and Selection to WorkspacePrimitive
- Added Draft support to TaskLauncherPrimitive
- Added View modes (Table, Detail, Split, Board) to WorkspacePrimitive
- Added Bulk operations to WorkspacePrimitive
- Added implementation pattern documentation (from assistant-ui analysis)
- Added CodeLayer validation section
- Added Client API pattern documentation

---

## Appendix D: References

- [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Microsoft: AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [Claude Docs: Subagents in the SDK](https://platform.claude.com/docs/en/agent-sdk/subagents)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [CrewAI](https://www.crewai.com/)
- [LangGraph](https://github.com/langchain-ai/langgraph)
- [Claude Code Swarms Analysis](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea) — Community analysis of upcoming Claude Code multi-agent features

## Appendix E: Claude Code Swarms Alignment

The upcoming "Swarms" feature in Claude Code has similar primitives:

| Swarms Concept | agent-ui Equivalent | Notes |
|----------------|---------------------|-------|
| **Agent** | `AgentPrimitive` | Direct mapping |
| **Task** | `TaskPrimitive` | Similar: subject, description, status, owner, dependencies |
| **Subagent** | `AgentPrimitive` with `.ParentAgent` | Short-lived, returns results |
| **Teammate** | `AgentPrimitive` with `.Role = "teammate"` | Persistent, inbox-based communication |
| **Team** | `WorkspacePrimitive` or new `TeamPrimitive` | Named group with shared task list |
| **Inbox** | Not yet modeled | Async agent-to-agent messaging |

**Key differences:**
- Swarms distinguishes **subagents** (synchronous, short-lived) from **teammates** (persistent, inbox-based)
- Swarms has explicit **Inbox** for async agent-to-agent communication
- Swarms has **Team** as a named persistent group

**Potential additions to agent-ui:**
- `AgentPrimitive.Inbox` — for teammate messaging
- `TeamPrimitive` — for persistent named groups (beyond single task)
- Distinguish subagent vs teammate in `.Role` or `.Lifecycle`

The core Task/Agent model aligns well. The inbox/team concepts could be added if needed for persistent multi-agent workspaces.

---

*Feedback welcome. This is a starting point for discussion.*