# Agent-UI MVP Plan

**Goal:** Scaled-down v1 demo with Anthropic Agents SDK feature parity.

**Timeline:** Single sprint  
**Target:** Working demo that showcases supervision UX (not chat UX)

---

## Scope: What We're Building

### Core Package: `@assistant-ui/react-agent`

A single new package containing:
1. **Anthropic Agents SDK integration** (runtime + streaming)
2. **3 core primitives** (Task, Agent, Approval)
3. **Minimal demo app**

### What We're NOT Building (for MVP)
- ❌ 8 supporting primitives (TaskTree, AgentFeed, etc.)
- ❌ Built-in tool widgets (Bash, Edit, etc.)
- ❌ WorkspacePrimitive
- ❌ Full action groups (just Lifecycle actions)
- ❌ Docs site updates

---

## Phase 1: SDK Integration (~2 hours)

### 1.1 Create package structure
```
packages/react-agent/
├── src/
│   ├── index.ts
│   ├── sdk/
│   │   ├── AnthropicAgentClient.ts    # Wrapper for @anthropic-ai/claude-agent-sdk
│   │   ├── StreamProcessor.ts          # Process SDK messages → state
│   │   └── converters.ts               # SDK message → our types
│   ├── runtime/
│   │   ├── types.ts                    # TaskState, AgentState, ApprovalState
│   │   ├── WorkspaceRuntime.ts         # Top-level runtime
│   │   ├── TaskRuntime.ts              # Task state + actions
│   │   ├── AgentRuntime.ts             # Agent state + actions  
│   │   └── ApprovalRuntime.ts          # Approval state + actions
│   ├── hooks/
│   │   ├── useAgentWorkspace.ts        # Main entry hook
│   │   ├── useTaskState.ts
│   │   ├── useAgentState.ts
│   │   └── useApprovalState.ts
│   └── primitives/
│       ├── TaskPrimitive.tsx
│       ├── AgentPrimitive.tsx
│       └── ApprovalPrimitive.tsx
├── package.json
└── tsconfig.json
```

### 1.2 SDK wrapper (AnthropicAgentClient.ts)
```typescript
import { AgentClient } from '@anthropic-ai/claude-agent-sdk';

export class AnthropicAgentClient {
  private client: AgentClient;

  constructor(config: { apiKey: string }) {
    this.client = new AgentClient(config);
  }

  async createTask(prompt: string): Promise<TaskHandle> {
    return this.client.run({ prompt });
  }

  async *streamEvents(taskId: string): AsyncGenerator<SDKEvent> {
    // Stream events from SDK
  }

  async approveToolUse(toolUseId: string, decision: 'allow' | 'deny'): Promise<void> {
    // Handle approval
  }
}
```

### 1.3 Core types (types.ts)
```typescript
export interface TaskState {
  id: string;
  title: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  cost: number;
  agents: AgentState[];
  pendingApprovals: ApprovalState[];
}

export interface AgentState {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  cost: number;
  events: AgentEvent[];
  parentAgentId: string | null;
  childAgentIds: string[];
}

export interface ApprovalState {
  id: string;
  toolName: string;
  toolInput: unknown;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  agentId: string;
}

export interface AgentEvent {
  id: string;
  type: 'tool_call' | 'reasoning' | 'message';
  timestamp: Date;
  content: unknown;
}
```

---

## Phase 2: Runtime Layer (~2 hours)

### 2.1 WorkspaceRuntime
```typescript
export class WorkspaceRuntime {
  private tasks: Map<string, TaskRuntime> = new Map();
  private listeners: Set<() => void> = new Set();
  
  constructor(private client: AnthropicAgentClient) {}

  async createTask(prompt: string): Promise<TaskRuntime> {
    const handle = await this.client.createTask(prompt);
    const task = new TaskRuntime(handle, this.client);
    this.tasks.set(task.id, task);
    this.notify();
    return task;
  }

  getTasks(): TaskRuntime[] {
    return Array.from(this.tasks.values());
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }
}
```

### 2.2 TaskRuntime
```typescript
export class TaskRuntime {
  private state: TaskState;
  private listeners: Set<() => void> = new Set();

  constructor(handle: TaskHandle, private client: AnthropicAgentClient) {
    this.state = {
      id: handle.id,
      title: handle.prompt.slice(0, 50),
      status: 'running',
      cost: 0,
      agents: [],
      pendingApprovals: [],
    };
    this.startStreaming();
  }

  private async startStreaming() {
    for await (const event of this.client.streamEvents(this.state.id)) {
      this.processEvent(event);
    }
  }

  private processEvent(event: SDKEvent) {
    // Update state based on event type
    // Handle agent spawns, tool calls, approvals, etc.
    this.notify();
  }

  getState(): TaskState { return this.state; }
  
  cancel() { /* ... */ }
  
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
```

### 2.3 ApprovalRuntime
```typescript
export class ApprovalRuntime {
  constructor(
    private state: ApprovalState,
    private client: AnthropicAgentClient,
    private onResolve: () => void,
  ) {}

  async approve() {
    await this.client.approveToolUse(this.state.id, 'allow');
    this.state.status = 'approved';
    this.onResolve();
  }

  async deny() {
    await this.client.approveToolUse(this.state.id, 'deny');
    this.state.status = 'denied';
    this.onResolve();
  }

  getState(): ApprovalState { return this.state; }
}
```

---

## Phase 3: Hooks (~1 hour)

### 3.1 useAgentWorkspace
```typescript
const WorkspaceContext = createContext<WorkspaceRuntime | null>(null);

export function AgentWorkspaceProvider({ 
  apiKey, 
  children 
}: { 
  apiKey: string; 
  children: ReactNode;
}) {
  const runtime = useMemo(() => {
    const client = new AnthropicAgentClient({ apiKey });
    return new WorkspaceRuntime(client);
  }, [apiKey]);

  return (
    <WorkspaceContext.Provider value={runtime}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useAgentWorkspace() {
  const runtime = useContext(WorkspaceContext);
  if (!runtime) throw new Error('Missing AgentWorkspaceProvider');
  return runtime;
}
```

### 3.2 useTaskState
```typescript
export function useTaskState<T>(
  taskId: string,
  selector: (state: TaskState) => T
): T {
  const workspace = useAgentWorkspace();
  const task = workspace.getTaskById(taskId);
  
  return useSyncExternalStore(
    (cb) => task.subscribe(cb),
    () => selector(task.getState()),
  );
}
```

---

## Phase 4: Primitives (~2 hours)

### 4.1 TaskPrimitive
```typescript
export namespace TaskPrimitive {
  export const Root = ({ taskId, children }: { taskId: string; children: ReactNode }) => {
    return (
      <TaskContext.Provider value={taskId}>
        {children}
      </TaskContext.Provider>
    );
  };

  export const Title = () => {
    const title = useTaskState(useTaskId(), s => s.title);
    return <span>{title}</span>;
  };

  export const Status = () => {
    const status = useTaskState(useTaskId(), s => s.status);
    const icons = { queued: '⏳', running: '🔄', completed: '✅', failed: '❌' };
    return <span>{icons[status]} {status}</span>;
  };

  export const Cost = () => {
    const cost = useTaskState(useTaskId(), s => s.cost);
    return <span>${cost.toFixed(4)}</span>;
  };

  export const Cancel = () => {
    const task = useTask();
    const status = useTaskState(useTaskId(), s => s.status);
    if (status !== 'running') return null;
    return <button onClick={() => task.cancel()}>Cancel</button>;
  };
}
```

### 4.2 AgentPrimitive
```typescript
export namespace AgentPrimitive {
  export const Root = ({ agentId, children }: { agentId: string; children: ReactNode }) => (
    <AgentContext.Provider value={agentId}>{children}</AgentContext.Provider>
  );

  export const Name = () => {
    const name = useAgentState(useAgentId(), s => s.name);
    return <span>{name}</span>;
  };

  export const Status = () => {
    const status = useAgentState(useAgentId(), s => s.status);
    return <span>{status}</span>;
  };

  export const Events = ({ children }: { children: (events: AgentEvent[]) => ReactNode }) => {
    const events = useAgentState(useAgentId(), s => s.events);
    return <>{children(events)}</>;
  };
}
```

### 4.3 ApprovalPrimitive
```typescript
export namespace ApprovalPrimitive {
  export const Root = ({ approvalId, children }: { approvalId: string; children: ReactNode }) => (
    <ApprovalContext.Provider value={approvalId}>{children}</ApprovalContext.Provider>
  );

  export const ToolName = () => {
    const name = useApprovalState(useApprovalId(), s => s.toolName);
    return <span>{name}</span>;
  };

  export const Reason = () => {
    const reason = useApprovalState(useApprovalId(), s => s.reason);
    return <span>{reason}</span>;
  };

  export const Approve = () => {
    const approval = useApproval();
    return <button onClick={() => approval.approve()}>Allow</button>;
  };

  export const Deny = () => {
    const approval = useApproval();
    return <button onClick={() => approval.deny()}>Deny</button>;
  };
}
```

---

## Phase 5: Demo App (~1 hour)

### 5.1 Create example
```
examples/agent-dashboard-mvp/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── TaskCard.tsx
│   ├── AgentActivity.tsx
│   └── ApprovalQueue.tsx
├── .env.local.example
└── package.json
```

### 5.2 Main page
```typescript
'use client';

import { AgentWorkspaceProvider, useAgentWorkspace } from '@assistant-ui/react-agent';
import { TaskPrimitive, ApprovalPrimitive } from '@assistant-ui/react-agent';

function Dashboard() {
  const workspace = useAgentWorkspace();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async () => {
    await workspace.createTask(prompt);
    setPrompt('');
  };

  return (
    <div className="p-4">
      <h1>Agent Dashboard</h1>
      
      {/* Task launcher */}
      <div className="mb-4">
        <input 
          value={prompt} 
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe your task..."
        />
        <button onClick={handleSubmit}>Launch Task</button>
      </div>

      {/* Task list */}
      <div className="space-y-4">
        {workspace.getTasks().map(task => (
          <TaskPrimitive.Root key={task.id} taskId={task.id}>
            <div className="border p-4 rounded">
              <TaskPrimitive.Title />
              <TaskPrimitive.Status />
              <TaskPrimitive.Cost />
              <TaskPrimitive.Cancel />
              
              {/* Pending approvals */}
              {task.getState().pendingApprovals.map(a => (
                <ApprovalPrimitive.Root key={a.id} approvalId={a.id}>
                  <div className="bg-yellow-100 p-2 mt-2">
                    <ApprovalPrimitive.ToolName />
                    <ApprovalPrimitive.Reason />
                    <ApprovalPrimitive.Approve />
                    <ApprovalPrimitive.Deny />
                  </div>
                </ApprovalPrimitive.Root>
              ))}
            </div>
          </TaskPrimitive.Root>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AgentWorkspaceProvider apiKey={process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY!}>
      <Dashboard />
    </AgentWorkspaceProvider>
  );
}
```

---

## Success Criteria

### Functional
- [ ] Can create a new task with a prompt
- [ ] Tasks show real-time status updates
- [ ] Cost tracking updates in real-time
- [ ] Pending approvals appear when agent needs permission
- [ ] Can approve/deny tool executions
- [ ] Can cancel running tasks

### Technical
- [ ] `pnpm build` passes for the package
- [ ] TypeScript compiles with no errors
- [ ] Demo app runs with `pnpm dev`

### UX
- [ ] Feels like "supervision" not "chat"
- [ ] Can see what agents are doing in real-time
- [ ] Clear approval flow

---

## Execution Order

1. Create package skeleton (`packages/react-agent/`)
2. Implement types and SDK client
3. Implement runtimes (Workspace → Task → Agent → Approval)
4. Implement hooks
5. Implement primitives
6. Create demo app
7. Test end-to-end with real API key

---

## Notes

- **Anthropic Agents SDK**: If not publicly available, mock the SDK interface and implement when it ships
- **Streaming**: Start with polling if streaming is complex; upgrade later
- **Styling**: Use minimal inline styles for demo; no CSS framework needed
- **Testing**: Manual testing only for MVP; add unit tests post-MVP
