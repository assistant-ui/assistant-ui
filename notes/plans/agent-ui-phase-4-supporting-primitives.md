# Phase 4: Supporting Primitives Implementation Plan

**Date**: January 2026
**Status**: Work in Progress
**Parent**: [`/notes/proposals/agent-ui-implementation-plan.md`](agent-ui-implementation-plan.md)

---

## Overview

Phase 4 implements the remaining 8 agent-ui primitives that complete the supervision UX: visualization primitives (TaskTree, AgentFeed, AgentEvent), tool UI primitives (ToolExecution + built-in widgets), approval management primitives (ApprovalQueue, PermissionMode), and task management primitives (TaskLauncher, Workspace).

This phase builds directly on Phase 3's core primitives and Phase 1's streaming infrastructure.

---

## Current State Analysis

### What Exists (from earlier phases)
- **Phase 1**: Runtime interfaces, binding patterns, AssistantFrame streaming infrastructure (rate limiter, message types)
- **Phase 2**: RuntimeImpl classes (Workspace, Task, Agent, AgentEvent), state objects, stream processor skeleton
- **Phase 3**: Core primitives (Task, Agent, Approval) with Properties vs Actions pattern established

### What's Missing
- 8 supporting primitives with ~70 total property/action components
- Built-in tool widgets (Bash, Edit, Read, Grep) with streaming support
- Hierarchical visualization (task tree, agent feeds)
- Approval management (queue, bulk operations, permission modes)
- Task management (launcher form, workspace overview)

### Key Architectural Constraints
1. **Follow Radix primitive patterns** from `packages/react/src/primitives/` (namespace exports, forwardRef, TypeScript types)
2. **Use AssistantFrame streaming** from Phase 1 for tool output (rate-limited at 30fps)
3. **Maintain Properties vs Actions separation** — all actions in `.Actions` namespace
4. **Test with mock data** — no real SDK connection until Phase 5
5. **Single package**: All primitives live in `packages/react-agent-primitives/`

---

## Desired End State

After completing Phase 4, the following will be fully functional:

### Visualization Primitives
- TaskTreePrimitive renders hierarchical task/agent relationships with expand/collapse
- AgentFeedPrimitive shows real-time activity stream with auto-scrolling
- AgentEventPrimitive displays individual events (tool calls, reasoning, errors)

### Tool UI Primitives
- ToolExecutionPrimitive provides rich tool UIs with streaming support
- Built-in widgets (Bash, Edit, Read, Grep) render formatted output via AssistantFrame
- Tool output streams in real-time (simulated with mock data until Phase 5)

### Approval Management Primitives
- ApprovalQueuePrimitive aggregates pending approvals with bulk actions
- PermissionModePrimitive configures auto-approval settings per tool

### Task Management Primitives
- TaskLauncherPrimitive provides "new task" form with all required inputs
- WorkspacePrimitive shows overview with search/filter/sort/bulk operations

### Verification Criteria
- All 8 primitives compile with TypeScript strict mode
- Components render correctly with mock data
- Actions validate properly (disable when appropriate)
- Tool widgets support streaming updates (rate-limited)
- Bulk operations work on selected items
- Search/filter/sort functions update UI correctly

---

## Implementation Phases

Phase 4 is split into 4 sequential sub-phases for manageability:

| Sub-Phase | Primitives | Focus |
|-----------|-----------|-------|
| 4.1 | TaskTreePrimitive, AgentFeedPrimitive, AgentEventPrimitive | Visualization |
| 4.2 | ToolExecutionPrimitive + built-in widgets | Tool UI |
| 4.3 | ApprovalQueuePrimitive, PermissionModePrimitive | Approval management |
| 4.4 | TaskLauncherPrimitive, WorkspacePrimitive | Task management + remaining action groups |

Each sub-phase builds on the previous and can be tested independently.

---

## PHASE 4.1: Visualization Primitives

### Overview
Build the hierarchy and activity visualization primitives that show agents working in real-time.

### Changes Required

#### 1. TaskTreePrimitive
**Files**: `packages/react-agent-primitives/src/task/TaskTreePrimitive.tsx`, `index.ts`

**Properties** (4):
- `.Root` - Container component
- `.Tree` - The full hierarchy (tasks + agents)
- `.ExpandedNodes` - Which nodes are expanded (managed state)
- `.FocusedNode` - Currently selected task/agent (managed state)
- `.ViewMode` - tree | timeline | graph enum

**Actions** (11):
- `.Actions.View.ExpandAll` - Expand all nodes
- `.Actions.View.CollapseAll` - Collapse all nodes
- `.Actions.View.FocusOnAgent` - Focus on specific agent
- `.Actions.View.FocusOnSubtask` - Focus on specific subtask
- `.Actions.Navigation.ZoomToSubtask` - Drill into subtask
- `.Actions.Navigation.ZoomOut` - Go up one level
- `.Actions.Navigation.ZoomToRoot` - Go to top level

**Implementation pattern**:
```typescript
// TaskTreePrimitive.tsx
export namespace TaskTreePrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const TaskTreePrimitiveRoot = forwardRef<TaskTreePrimitiveRoot.Element, TaskTreePrimitiveRoot.Props>(
  (props, ref) => {
    // State for expanded/focused nodes
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [focusedNode, setFocusedNode] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'tree' | 'timeline' | 'graph'>('tree');

    return (
      <TaskTreePrimitiveContext.Provider value={{ expandedNodes, focusedNode, viewMode, setExpandedNodes, setFocusedNode, setViewMode }}>
        <Primitive.div {...props} ref={ref} />
      </TaskTreePrimitiveContext.Provider>
    );
  }
);

// Tree property component
export const TaskTreePrimitiveTree = forwardRef<HTMLDivElement, { children: ReactNode }>((props, ref) => {
  const { expandedNodes, focusedNode, viewMode } = useTaskTreePrimitiveContext();

  return (
    <Primitive.div ref={ref} {...props}>
      {props.children}
    </Primitive.div>
  );
});

// Action: ExpandAll
const useTaskTreeExpandAll = () => {
  const { expandedNodes, setExpandedNodes } = useTaskTreePrimitiveContext();
  const allNodes = useTaskState((state) => state.agentTree.flat());

  const callback = useCallback(() => {
    const allNodeIds = allNodes.map(node => node.id);
    setExpandedNodes(new Set(allNodeIds));
  }, [allNodes, setExpandedNodes]);

  return callback;
};

export const TaskTreePrimitiveActionsViewExpandAll = createActionButton(
  'TaskTreePrimitive.Actions.View.ExpandAll',
  useTaskTreeExpandAll,
);

// Similar for other View and Navigation actions
```

**Context and hooks**:
```typescript
// useTaskTreeState.ts
export function useTaskTreeState<T>(selector: (state: TaskTreeState) => T): T {
  const treeState = useTaskTreePrimitiveContext();
  return useSyncExternalStore(
    (callback) => subscription(callback), // Listen to context updates
    () => selector({
      expandedNodes: treeState.expandedNodes,
      focusedNode: treeState.focusedNode,
      viewMode: treeState.viewMode,
    }),
  );
}

// useTaskTreeApi.ts
export function useTaskTreeApi(): TaskTreeApi {
  return {
    expandAll: useTaskTreeExpandAll(),
    collapseAll: useTaskTreeCollapseAll(),
    focusOnAgent: useTaskTreeFocusOnAgent(),
    zoomToSubtask: useTaskTreeZoomToSubtask(),
    // ... other API methods
  };
}
```

#### 2. AgentFeedPrimitive
**Files**: `packages/react-agent-primitives/src/agent/AgentFeedPrimitive.tsx`, `index.ts`

**Properties** (3):
- `.Root` - Container component
- `.Events` - List of past AgentEventPrimitive components
- `.CurrentActivity` - What's happening now (singleton component)
- `.Viewport` - Auto-scrolling container

**Actions**: None (read-only feed)

**Implementation pattern**:
```typescript
// AgentFeedPrimitive.tsx
export const AgentFeedPrimitiveRoot = forwardRef<...>((props, ref) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  const events = useAgentState((state) => state.events);
  useLayoutEffect(() => {
    if (autoScroll && viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  return (
    <AgentFeedPrimitiveContext.Provider value={{ autoScroll, setAutoScroll, viewportRef }}>
      <Primitive.div {...props} ref={ref} />
    </AgentFeedPrimitiveContext.Provider>
  );
});

export const AgentFeedPrimitiveEvents = forwardRef<...>((props, ref) => {
  const events = useAgentState((state) => state.events);
  return (
    <div ref={ref} {...props}>
      {events.map(event => (
        <AgentEventPrimitive.Root key={event.id} eventId={event.id}>
          {/* Render event content */}
        </AgentEventPrimitive.Root>
      ))}
    </div>
  );
});

export const AgentFeedPrimitiveViewport = forwardRef<...>((props, ref) => {
  const { viewportRef } = useAgentFeedPrimitiveContext();
  const composedRef = useComposedRefs(ref, viewportRef);

  return <div className="overflow-y-auto" ref={composedRef} {...props} />;
});
```

#### 3. AgentEventPrimitive
**Files**: `packages/react-agent-primitives/src/agent/AgentEventPrimitive.tsx`, `index.ts`

**Properties** (7):
- `.Root` - Container component
- `.Timestamp` - When this event occurred
- `.Type` - tool-call | reasoning | error | message | spawn-agent enum
- `.Status` - pending | running | completed | failed
- `.ToolExecution` - Slot for ToolExecutionPrimitive
- `.Reasoning` - Thinking/planning text
- `.SpawnedAgent` - Reference to child agent (if Type is spawn-agent)
- `.Collapsed` - Whether event is collapsed (managed state)

**Actions** (7):
- `.Actions.View.Expand` - Expand collapsed event
- `.Actions.View.Collapse` - Collapse event
- `.Actions.View.ViewRaw` - View raw JSON
- `.Actions.Copy.CopyOutput` - Copy tool output
- `.Actions.Copy.CopyInput` - Copy tool input
- `.Actions.Replay.ReExecute` - Re-run this specific event

**Implementation pattern** (similar to TaskPrimitive from Phase 3):
```typescript
// AgentEventPrimitive.tsx
export const AgentEventPrimitiveRoot = forwardRef<...>((props, ref) => {
  const [collapsed, setCollapsed] = useState(false);
  const eventId = props.eventId; // Passed as prop

  return (
    <AgentEventPrimitiveContext.Provider value={{ eventId, collapsed, setCollapsed }}>
      <Primitive.div {...props} ref={ref} />
    </AgentEventPrimitiveContext.Provider>
  );
});

export const AgentEventPrimitiveTimestamp = forwardRef<...>((props, ref) => {
  const timestamp = useAgentEventState((state) => state.timestamp);
  return <time {...props} ref={ref}>{formatTimestamp(timestamp)}</time>;
});

export const AgentEventPrimitiveType = forwardRef<...>((props, ref) => {
  const type = useAgentEventState((state) => state.type);
  const icon = getTypeIcon(type);
  return <span {...props} ref={ref}>{icon} {type}</span>;
});

// Action: ReExecute
const useAgentEventReExecute = () => {
  const api = useAgentEventApi();
  const status = useAgentEventState((state) => state.status);

  const callback = useCallback(() => {
    api.reExecute();
  }, [api]);

  return status === 'failed' ? callback : null;
};

export const AgentEventPrimitiveActionsReplayReExecute = createActionButton(
  'AgentEventPrimitive.Actions.Replay.ReExecute',
  useAgentEventReExecute,
);
```

**Context and hooks**:
```typescript
// useAgentEventState.ts
export function useAgentEventState<T>(selector: (state: AgentEventState) => T): T {
  const runtime = useAgentEventRuntime();
  return useSyncExternalStore(
    (callback) => runtime.subscribe(callback),
    () => selector(runtime.getState()),
  );
}

// useAgentEventApi.ts
export function useAgentEventApi(): AgentEventApi {
  const runtime = useAgentEventRuntime();
  return {
    reExecute: () => runtime.reExecute(),
    copyInput: () => copyToClipboard(runtime.getState().input),
    copyOutput: () => copyToClipboard(runtime.getState().output),
  };
}
```

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-primitives` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- [ ] Component tests pass: `pnpm test packages/react-agent-primitives`
- [ ] State management tests (expanded/focused nodes) pass
- [ ] Auto-scroll tests for AgentFeed pass

#### Manual Verification:
- [ ] Render task tree showing hierarchical task/agent relationships
- [ ] Expand/collapse nodes update visual tree correctly
- [ ] Zoom to subtask focuses on selected node
- [ ] Agent feed shows events with timestamps
- [ ] Auto-scroll works when new events arrive
- [ ] Collapse/expand events in feed works
- [ ] Copy input/output buttons work
- [ ] Re-execute button appears only on failed events

### What We're NOT Doing
- Real SDK event streaming (simulated with mock data until Phase 5)
- Graph view mode for TaskTree (defer to later phase)
- Timeline view visualizations (defer to later phase)
- Sub-agent nesting depth styling (basic rendering only)

---

## PHASE 4.2: Tool UI Primitives

### Overview
Build ToolExecutionPrimitive and the 4 built-in tool widgets that render tool output with streaming support.

### Changes Required

#### 1. ToolExecutionPrimitive
**Files**: `packages/react-agent-primitives/src/tools/ToolExecutionPrimitive.tsx`, `index.ts`

**Properties** (6):
- `.Root` - Container component
- `.Name` - "Bash", "Edit", "Read"
- `.Input` - Arguments passed to tool
- `.Output` - Result (supports streaming)
- `.Status` - pending | running | completed | error
- `.Duration` - How long the tool ran
- `.RemoteUI` - Rich iframe widget (from Phase 1)

**Actions** (10):
- `.Actions.View.Expand` - Expand output
- `.Actions.View.Collapse` - Collapse output
- `.Actions.View.ViewRaw` - View raw input/output
- `.Actions.View.ViewFormatted` - View formatted output
- `.Actions.Copy.CopyInput` - Copy tool arguments
- `.Actions.Copy.CopyOutput` - Copy tool result
- `.Actions.Copy.CopyAll` - Copy both
- `.Actions.Execution.Retry` - Re-run this tool
- `.Actions.Execution.Cancel` - Cancel running tool

**Implementation pattern**:
```typescript
// ToolExecutionPrimitive.tsx
export namespace ToolExecutionPrimitiveRoot {
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    toolName: string;
    toolInput: any;
    // ToolOutputState interface defined in types
  };
}

export const ToolExecutionPrimitiveRoot = forwardRef<ToolExecutionPrimitiveRoot.Element, ToolExecutionPrimitiveRoot.Props>(
  ({ toolName, toolInput, children, ...props }, ref) => {
    const [expanded, setExpanded] = useState(false);
    const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
    const [output, setOutput] = useState('');

    // Subscribe to streaming updates (mock for now, real in Phase 5)
    useEffect(() => {
      const subscription = subscribeToToolOutputs(toolInput.id, (chunk) => {
        setOutput(prev => prev + chunk);
      });
      return () => subscription.unsubscribe();
    }, [toolInput.id]);

    return (
      <ToolExecutionPrimitiveContext.Provider value={{
        toolName,
        toolInput,
        output,
        expanded,
        viewMode,
        setExpanded,
        setViewMode,
      }}>
        <Primitive.div {...props} ref={ref}>
          {children}
        </Primitive.div>
      </ToolExecutionPrimitiveContext.Provider>
    );
  }
);

export const ToolExecutionPrimitiveName = forwardRef<...>((props, ref) => {
  const { toolName } = useToolExecutionPrimitiveContext();
  return <span {...props} ref={ref}>{toolName}</span>;
});

export const ToolExecutionPrimitiveOutput = forwardRef<...>((props, ref) => {
  const { output, viewMode, toolName } = useToolExecutionPrimitiveContext();

  if (viewMode === 'formatted') {
    // Use built-in widget
    const Widget = getToolWidget(toolName);
    return <Widget output={output} />;
  }

  return <pre {...props} ref={ref}>{output}</pre>;
});

// Action: Cancel
const useToolExecutionCancel = () => {
  const { toolInput } = useToolExecutionPrimitiveContext();
  const status = useToolState((state) => state.status);

  const callback = useCallback(() => {
    cancelTool(toolInput.id);
  }, [toolInput.id]);

  return status === 'running' ? callback : null;
};

export const ToolExecutionPrimitiveActionsExecutionCancel = createActionButton(
  'ToolExecutionPrimitive.Actions.Execution.Cancel',
  useToolExecutionCancel,
);
```

**Streaming integration with AssistantFrame** (from Phase 1):
```typescript
// streaming.ts - Rate-limited streaming utilities
import { rateLimiter } from '@assistant-ui/react-agent-sdk/src/streaming/rateLimiter';

// Rate limit to 30fps as per Phase 1 specification
const TOOL_UI_UPDATE_LIMIT = 33; // ~33ms = 30fps

export function subscribeToToolOutputs(
  toolId: string,
  onUpdate: (chunk: string) => void,
): Unsubscribe {
  // Mock streaming (real implementation in Phase 5)
  const chunks = mockToolOutputs[toolId] || [];
  let index = 0;

  return rateLimiter.schedule(() => {
    if (index < chunks.length) {
      onUpdate(chunks[index++]);
    }
  }, TOOL_UI_UPDATE_LIMIT);
}

// Use AssistantFrame for remote widgets
export function renderInAssistantFrame(
  toolName: string,
  content: any,
): ReactElement {
  return (
    <AssistantFrameRemoteUI
      channel={`tool-${toolName}`}
      content={content}
    />
  );
}
```

#### 2. Built-in Tool Widgets
**Location**: `packages/react-agent-primitives/src/tools/built-in/`

**BashWidget.tsx** - Terminal with ANSI colors and streaming:
```typescript
export interface BashWidgetProps {
  output: string;
  streaming?: boolean;
}

export const BashWidget: React.FC<BashWidgetProps> = ({ output, streaming }) => {
  return (
    <div className="bg-black text-green-500 font-mono p-4 rounded">
      <pre className="whitespace-pre-wrap">
        {renderAnsiOutput(output)}
      </pre>
      {streaming && <span className="animate-pulse">_</span>}
    </div>
  );
};

// Parse ANSI escape codes for colors
function renderAnsiOutput(output: string): ReactNode {
  // Basic ANSI color rendering
  return ansiToReact(output);
}
```

**EditWidget.tsx** - Diff view with syntax highlighting:
```typescript
export interface EditWidgetProps {
  input: { filePath: string; oldContent: string; newContent: string };
  output: string;
}

export const EditWidget: React.FC<EditWidgetProps> = ({ input, output }) => {
  const diff = computeDiff(input.oldContent, input.newContent);

  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500 mb-2">{input.filePath}</div>
      <div className="font-mono text-sm">
        {diff.map((line, i) => (
          <div key={i} className={line.type === 'added' ? 'bg-green-100' : line.type === 'removed' ? 'bg-red-100' : ''}>
            {line.content}
          </div>
        ))}
      </div>
    </div>
  );
};
```

**ReadWidget.tsx** - Code with syntax highlighting:
```typescript
export interface ReadWidgetProps {
  input: { filePath: string };
  output: string;
}

export const ReadWidget: React.FC<ReadWidgetProps> = ({ input, output }) => {
  const language = detectLanguage(input.filePath);

  return (
    <div className="border rounded overflow-hidden">
      <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600">
        {input.filePath}
      </div>
      <SyntaxHighlighter language={language} className="!m-0">
        {output}
      </SyntaxHighlighter>
    </div>
  );
};
```

**GrepWidget.tsx** - Search results with contexts:
```typescript
export interface GrepWidgetProps {
  input: { pattern: string; paths: string[] };
  output: GrepResult[];
}

export const GrepWidget: React.FC<GrepWidgetProps> = ({ input, output }) => {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">Pattern: {input.pattern}</div>
      {output.map((result, i) => (
        <div key={i} className="border rounded p-3">
          <div className="text-sm font-medium text-blue-600">{result.file}</div>
          {result.matches.map((match, j) => (
            <div key={j} className="font-mono text-sm mt-1">
              <span className="text-gray-500">{match.line}:</span>
              {match.preview}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

**Widget registry**:
```typescript
// toolWidgetRegistry.ts
export interface ToolWidget {
  component: React.ComponentType<any>;
  supportsStreaming: boolean;
}

export const toolWidgets: Record<string, ToolWidget> = {
  Bash: { component: BashWidget, supportsStreaming: true },
  Edit: { component: EditWidget, supportsStreaming: false },
  Read: { component: ReadWidget, supportsStreaming: true },
  Grep: { component: GrepWidget, supportsStreaming: false },
};

export function getToolWidget(toolName: string): React.ComponentType<any> {
  return toolWidgets[toolName]?.component || DefaultToolWidget;
}
```

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-primitives` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- [ ] Component tests pass: `pnpm test packages/react-agent-primitives`
- [ ] Streaming rate limiter tests pass (30fps limit enforced)
- [ ] Widget rendering tests with mock data pass

#### Manual Verification:
- [ ] Bash widget renders with ANSI colors and simulated streaming
- [ ] Edit widget shows diff with added/removed lines highlighted
- [ ] Read widget displays code with syntax highlighting
- [ ] Grep widget shows search results with file paths and context
- [ ] Expand/collapse output works
- [ ] Copy input/output buttons work
- [ ] View raw/formatted toggle works
- [ ] Cancel button appears for running tools
- [ ] Stream updates at ~30fps (not overwhelming React)

### What We're NOT Doing
- Monaco editor integration for EditWidget (diff view only, per Phase 1 scope)
- Real-time syntax highlighting while typing (rendering only, per Phase 1 scope)
- Custom tool widget system (only 4 built-ins in this phase)
- Real tool execution (mock data only until Phase 5)

---

## PHASE 4.3: Approval Management Primitives

### Overview
Build primitives for managing approvals at scale: ApprovalQueuePrimitive shows pending approvals with bulk actions, and PermissionModePrimitive configures auto-approval settings.

### Changes Required

#### 1. ApprovalQueuePrimitive
**Files**: `packages/react-agent-primitives/src/approval/ApprovalQueuePrimitive.tsx`, `index.ts`

**Properties** (3):
- `.Root` - Container component
- `.Count` - Badge count
- `.Items` - List of ApprovalPrimitive components
- `.Viewport` - Scrollable container

**Actions** (7):
- `.Actions.Bulk.ApproveAll` - Approve all pending
- `.Actions.Bulk.DenyAll` - Deny all pending
- `.Actions.Bulk.ClearResolved` - Remove resolved items
- `.Actions.Filter.ByTool` - Filter by tool type
- `.Actions.Filter.ByAgent` - Filter by agent
- `.Actions.Filter.ByTask` - Filter by task
- `.Actions.Filter.ByStatus` - Filter by status

**Implementation pattern**:
```typescript
// ApprovalQueuePrimitive.tsx
export const ApprovalQueuePrimitiveRoot = forwardRef<...>((props, ref) => {
  const [filters, setFilters] = useState<QueueFilters>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  return (
    <ApprovalQueuePrimitiveContext.Provider value={{
      filters,
      selectedItems,
      setFilters,
      setSelectedItems,
    }}>
      <Primitive.div {...props} ref={ref} />
    </ApprovalQueuePrimitiveContext.Provider>
  );
});

export const ApprovalQueuePrimitiveCount = forwardRef<...>((props, ref) => {
  const pendingCount = useApprovalQueueState((state) =>
    state.items.filter(item => item.status === 'pending').length
  );

  const display = pendingCount === 0 ? undefined : pendingCount.toString();

  return (
    <Badge {...props} ref={ref}>
      {display}
    </Badge>
  );
});

export const ApprovalQueuePrimitiveItems = forwardRef<...>((props, ref) => {
  const { filters, selectedItems } = useApprovalQueuePrimitiveContext();
  const allItems = useApprovalQueueState((state) => state.items);

  // Apply filters
  const filteredItems = useMemo(() =>
    allItems.filter(item => matchesFilters(item, filters)),
    [allItems, filters]
  );

  return (
    <div ref={ref} {...props}>
      {filteredItems.map(item => (
        <ApprovalPrimitive.Root key={item.id} approvalId={item.id}>
          <ApprovalQueuePrimitiveItemCheckbox
            checked={selectedItems.has(item.id)}
            onChange={(checked) => {
              setSelectedItems(prev => {
                const next = new Set(prev);
                checked ? next.add(item.id) : next.delete(item.id);
                return next;
              });
            }}
          />
          {/* Render approval content */}
        </ApprovalPrimitive.Root>
      ))}
      {filteredItems.length === 0 && <EmptyMessage />}
    </div>
  );
});

// Action: BulkApproveAll
const useApprovalQueueBulkApproveAll = () => {
  const api = useApprovalQueueApi();
  const { selectedItems } = useApprovalQueuePrimitiveContext();

  const callback = useCallback(() => {
    selectedItems.forEach(approvalId => {
      api.approve(approvalId);
    });
    setSelectedItems(new Set());
  }, [api, selectedItems]);

  // Disable if nothing selected
  return selectedItems.size > 0 ? callback : null;
};

export const ApprovalQueuePrimitiveActionsBulkApproveAll = createActionButton(
  'ApprovalQueuePrimitive.Actions.Bulk.ApproveAll',
  useApprovalQueueBulkApproveAll,
);

// Action: FilterByTool
const useApprovalQueueFilterByTool = () => {
  const { filters, setFilters } = useApprovalQueuePrimitiveContext();
  const [toolFilter, setToolFilter] = useState<string | null>(null);

  const callback = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      toolName: toolFilter,
    }));
  }, [toolFilter, setFilters]);

  return callback;
};

// Filter UI component (with dropdown)
export const ApprovalQueuePrimitiveActionsFilterByTool = forwardRef<...>((props, ref) => {
  const tools = useApprovalQueueState((state) =>
    Array.from(new Set(state.items.map(item => item.toolName)))
  );

  return (
    <FilterDropdown
      options={tools}
      selected={props.selected}
      onSelect={props.onSelect}
      ref={ref}
      {...props}
    />
  );
});
```

**Context and hooks**:
```typescript
// useApprovalQueueState.ts
export interface QueueFilters {
  toolName?: string;
  agentId?: string;
  taskId?: string;
  status?: 'pending' | 'approved' | 'denied';
}

export interface ApprovalQueueState {
  items: ApprovalRuntime[];
  totalCount: number;
}

export function useApprovalQueueState<T>(selector: (state: ApprovalQueueState) => T): T {
  const runtime = useApprovalQueueRuntime();
  return useSyncExternalStore(
    (callback) => runtime.subscribe(callback),
    () => selector(runtime.getState()),
  );
}

// useApprovalQueueApi.ts
export function useApprovalQueueApi(): ApprovalQueueApi {
  const runtime = useApprovalQueueRuntime();
  return {
    approveAll: () => runtime.approveAll(),
    denyAll: () => runtime.denyAll(),
    clearResolved: () => runtime.clearResolved(),
    setFilter: (filter: QueueFilters) => runtime.setFilter(filter),
  };
}
```

#### 2. PermissionModePrimitive
**Files**: `packages/react-agent-primitives/src/approval/PermissionModePrimitive.tsx`, `index.ts`

**Properties** (2):
- `.Root` - Container component
- `.Current` - Current mode display
- `.PerToolConfig` - Per-tool settings display

**Actions** (10):
- `.Actions.SetMode.AskAll` - Ask for everything
- `.Actions.SetMode.AutoReads` - Auto-approve read-only
- `.Actions.SetMode.AutoAll` - Auto-approve everything
- `.Actions.SetMode.Custom` - Custom per-tool config
- `.Actions.TimedBypass.Enable` - Start timed bypass
- `.Actions.TimedBypass.Disable` - End timed bypass
- `.Actions.TimedBypass.Extend` - Add more time
- `.Actions.PerTool.SetAllow` - Always allow specific tool
- `.Actions.PerTool.SetAsk` - Always ask for specific tool
- `.Actions.PerTool.SetDeny` - Always deny specific tool

**Implementation pattern**:
```typescript
// PermissionModePrimitive.tsx
export const PermissionModePrimitiveRoot = forwardRef<...>((props, ref) => {
  const [mode, setMode] = useState<'ask-all' | 'auto-reads' | 'auto-all' | 'custom'>('ask-all');
  const [timedBypass, setTimedBypass] = useState<TimedBypass | null>(null);
  const [perToolConfig, setPerToolConfig] = useState<Record<string, 'allow' | 'ask' | 'deny'>>({});

  return (
    <PermissionModePrimitiveContext.Provider value={{
      mode,
      timedBypass,
      perToolConfig,
      setMode,
      setTimedBypass,
      setPerToolConfig,
    }}>
      <Primitive.div {...props} ref={ref} />
    </PermissionModePrimitiveContext.Provider>
  );
});

export const PermissionModePrimitiveCurrent = forwardRef<...>((props, ref) => {
  const { mode, timedBypass } = usePermissionModePrimitiveContext();

  const display = useMemo(() => {
    if (timedBypass && timedBypass.active) {
      return `Timed bypass: ${timedBypass.remaining}s`;
    }
    switch (mode) {
      case 'ask-all': return 'Ask for all tool uses';
      case 'auto-reads': return 'Auto-approve read-only';
      case 'auto-all': return 'Auto-approve everything';
      case 'custom': return 'Custom per-tool';
      default: return 'Unknown';
    }
  }, [mode, timedBypass]);

  return <span {...props} ref={ref}>{display}</span>;
});

export const PermissionModePrimitivePerToolConfig = forwardRef<...>((props, ref) => {
  const { perToolConfig, setPerToolConfig } = usePermissionModePrimitiveContext();
  const availableTools = usePermissionModeState((state) => state.availableTools);

  return (
    <div ref={ref} {...props}>
      {availableTools.map(tool => (
        <ToolPermissionRow
          key={tool.name}
          toolName={tool.name}
          permission={perToolConfig[tool.name] || 'ask'}
          onChange={(permission) => {
            setPerToolConfig(prev => ({
              ...prev,
              [tool.name]: permission,
            }));
          }}
        />
      ))}
    </div>
  );
});

// Action: SetMode.AutoReads
const usePermissionModeSetAutoReads = () => {
  const { setMode } = usePermissionModePrimitiveContext();

  const callback = useCallback(() => {
    setMode('auto-reads');
  }, [setMode]);

  return callback;
};

export const PermissionModePrimitiveActionsSetModeAutoReads = createActionButton(
  'PermissionModePrimitive.Actions.SetMode.AutoReads',
  usePermissionModeSetAutoReads,
);

// Action: TimedBypass.Enable
const usePermissionModeTimedBypassEnable = () => {
  const { setTimedBypass } = usePermissionModePrimitiveContext();
  const bypassDuration = 300; // 5 minutes

  const callback = useCallback(() => {
    const bypass: TimedBypass = {
      active: true,
      remaining: bypassDuration,
      startTime: Date.now(),
    };
    setTimedBypass(bypass);

    // Start countdown
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - bypass.startTime) / 1000);
      const remaining = Math.max(0, bypassDuration - elapsed);

      setTimedBypass(prev => prev ? { ...prev, remaining } : null);

      if (remaining === 0) {
        clearInterval(interval);
        setTimedBypass(prev => prev ? { ...prev, active: false } : null);
      }
    }, 1000);

    // Cleanup on unmount (in real implementation, would use timer ref)
  }, [setTimedBypass]);

  return callback;
};

export const PermissionModePrimitiveActionsTimedBypassEnable = createActionButton(
  'PermissionModePrimitive.Actions.TimedBypass.Enable',
  usePermissionModeTimedBypassEnable,
);
```

**Context and hooks**:
```typescript
// usePermissionModeState.ts
export interface TimedBypass {
  active: boolean;
  remaining: number; // seconds
  startTime: number;
}

export interface PermissionModeState {
  mode: 'ask-all' | 'auto-reads' | 'auto-all' | 'custom';
  timedBypass: TimedBypass | null;
  perToolConfig: Record<string, 'allow' | 'ask' | 'deny'>;
}

export function usePermissionModeState<T>(selector: (state: PermissionModeState) => T): T {
  const { mode, timedBypass, perToolConfig } = usePermissionModePrimitiveContext();
  return useSyncExternalStore(
    (callback) => { /* Subscribe to context */ },
    () => selector({ mode, timedBypass, perToolConfig }),
  );
}

// usePermissionModeApi.ts
export function usePermissionModeApi(): PermissionModeApi {
  const runtime = usePermissionModeRuntime();
  return {
    setMode: (mode) => runtime.setMode(mode),
    enableTimedBypass: (duration) => runtime.enableTimedBypass(duration),
    disableTimedBypass: () => runtime.disableTimedBypass(),
    setToolPermission: (toolName, permission) => runtime.setToolPermission(toolName, permission),
  };
}
```

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-primitives` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- [ ] Component tests pass: `pnpm test packages/react-agent-primitives`
- [ ] Bulk operation tests pass (approve all, deny all, clear resolved)
- [ ] Filter tests pass (by tool, agent, task, status)
- [ ] Permission mode tests pass (ask-all, auto-reads, auto-all, custom)
- [ ] Timed bypass countdown tests pass

#### Manual Verification:
- [ ] Approval queue shows pending items with badges
- [ ] Checkboxes select/deselect items
- [ ] Bulk approve/deny works on selected items
- [ ] Filters hide/show items correctly
- [ ] Clear resolved removes completed approvals
- [ ] Permission mode switches between ask-all/auto-reads/auto-all/custom
- [ ] Timed bypass shows countdown and disables after time expires
- [ ] Per-tool config allows setting allow/ask/deny per tool
- [ ] UI updates in real-time as approvals are added/removed

### What We're NOT Doing
- Real-time approval synchronization with SDK (mock only until Phase 5)
- Permission presets/templates (custom config only in this phase)
- Approval history/audit log (defer to later phase)
- Notification system for pending approvals (defer to later phase)

---

## PHASE 4.4: Task Management Primitives + Remaining Action Groups

### Overview
Build WorkspacePrimitive and TaskLauncherPrimitive for task management, and complete the remaining action groups for TaskPrimitive and AgentPrimitive established in Phase 3.

### Changes Required

#### 1. TaskLauncherPrimitive
**Files**: `packages/react-agent-primitives/src/task/TaskLauncherPrimitive.tsx`, `index.ts`

**Properties** (7):
- `.Root` - Container component
- `.Input` - Task description textarea
- `.AgentSelector` - Which agent type for lead
- `.ModelSelector` - Which model
- `.DirectorySelector` - Working directory
- `.Attachments` - Context files
- `.PermissionConfig` - Initial permission settings
- `.BudgetConfig` - Cost/time limits

**Actions** (5):
- `.Actions.Launch.Submit` - Launch immediately
- `.Actions.Launch.Queue` - Add to queue
- `.Actions.Draft.Save` - Save as draft
- `.Actions.Draft.Discard` - Delete draft
- `.Actions.Draft.LoadTemplate` - Load from template

**Implementation pattern**:
```typescript
// TaskLauncherPrimitive.tsx
export interface TaskLauncherState {
  description: string;
  agentType: string;
  model: string;
  directory: string;
  attachments: string[];
  permissionMode: 'ask-all' | 'auto-reads' | 'auto-all';
  maxCost: number;
  maxDuration: number;
}

export const TaskLauncherPrimitiveRoot = forwardRef<...>((props, ref) => {
  const [state, setState] = useState<TaskLauncherState>({
    description: '',
    agentType: 'orchestrator',
    model: 'claude-3-5-sonnet-20241022',
    directory: process.cwd(),
    attachments: [],
    permissionMode: 'ask-all',
    maxCost: 10.0,
    maxDuration: 3600, // 1 hour
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <TaskLauncherPrimitiveContext.Provider value={{
      state,
      setState,
      isSubmitting,
      setIsSubmitting,
    }}>
      <Primitive.form
        {...props}
        ref={ref}
        onSubmit={handleSubmit}
      />
    </TaskLauncherPrimitiveContext.Provider>
  );
});

function handleSubmit(e: FormEvent) {
  e.preventDefault();
  // Submit logic handled by launch actions
}

export const TaskLauncherPrimitiveInput = forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  const { state, setState } = useTaskLauncherPrimitiveContext();

  return (
    <textarea
      ref={ref}
      value={state.description}
      onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
      placeholder="Describe what you want the agent to do..."
      {...props}
    />
  );
});

export const TaskLauncherPrimitiveAgentSelector = forwardRef<HTMLSelectElement, SelectProps>((props, ref) => {
  const { state, setState } = useTaskLauncherPrimitiveContext();
  const availableAgents = useTaskLauncherState((state) => state.availableAgents);

  return (
    <select
      ref={ref}
      value={state.agentType}
      onChange={(e) => setState(prev => ({ ...prev, agentType: e.target.value }))}
      {...props}
    >
      {availableAgents.map(agent => (
        <option key={agent.id} value={agent.id}>{agent.name}</option>
      ))}
    </select>
  );
});

export const TaskLauncherPrimitiveModelSelector = forwardRef<HTMLSelectElement, SelectProps>((props, ref) => {
  const { state, setState } = useTaskLauncherPrimitiveContext();
  const availableModels = useTaskLauncherState((state) => state.availableModels);

  return (
    <select
      ref={ref}
      value={state.model}
      onChange={(e) => setState(prev => ({ ...prev, model: e.target.value }))}
      {...props}
    >
      {availableModels.map(model => (
        <option key={model.id} value={model.id}>{model.name}</option>
      ))}
    </select>
  );
});

// Action: Launch.Submit
const useTaskLauncherLaunchSubmit = () => {
  const { state, setIsSubmitting } = useTaskLauncherPrimitiveContext();
  const workspaceRuntime = useWorkspaceRuntime();

  const callback = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await workspaceRuntime.createTask({
        description: state.description,
        agentType: state.agentType,
        model: state.model,
        directory: state.directory,
        attachments: state.attachments,
        permissionMode: state.permissionMode,
        maxCost: state.maxCost,
        maxDuration: state.maxDuration,
      });
      // Reset form after successful launch
      // (In real implementation, would call setState to reset)
    } finally {
      setIsSubmitting(false);
    }
  }, [state, workspaceRuntime, setIsSubmitting]);

  // Disable while submitting
  return isSubmitting ? null : callback;
};

export const TaskLauncherPrimitiveActionsLaunchSubmit = createActionButton(
  'TaskLauncherPrimitive.Actions.Launch.Submit',
  useTaskLauncherLaunchSubmit,
);

// Action: Draft.Save
const useTaskLauncherDraftSave = () => {
  const { state } = useTaskLauncherPrimitiveContext();

  const callback = useCallback(() => {
    const draftId = generateId();
    localStorage.setItem(`task-draft-${draftId}`, JSON.stringify(state));
    // Show success message
  }, [state]);

  return callback;
};

export const TaskLauncherPrimitiveActionsDraftSave = createActionButton(
  'TaskLauncherPrimitive.Actions.Draft.Save',
  useTaskLauncherDraftSave,
);
```

**Context and hooks**:
```typescript
// useTaskLauncherState.ts
export interface TaskLauncherState {
  description: string;
  agentType: string;
  model: string;
  directory: string;
  attachments: string[];
  permissionMode: 'ask-all' | 'auto-reads' | 'auto-all';
  maxCost: number;
  maxDuration: number;
  availableAgents: AgentConfig[];
  availableModels: ModelConfig[];
}

export function useTaskLauncherState<T>(selector: (state: TaskLauncherState) => T): T {
  const { state } = useTaskLauncherPrimitiveContext();
  return useSyncExternalStore(
    (callback) => { /* Subscribe to form updates */ },
    () => selector(state),
  );
}

// useTaskLauncherApi.ts
export function useTaskLauncherApi(): TaskLauncherApi {
  const runtime = useWorkspaceRuntime();
  return {
    launch: (config: CreateTaskConfig) => runtime.createTask(config),
    saveDraft: (draft: TaskDraft) => saveTaskDraft(draft),
    loadDraft: (draftId: string) => loadTaskDraft(draftId),
    discardDraft: (draftId: string) => deleteTaskDraft(draftId),
  };
}
```

#### 2. WorkspacePrimitive
**Files**: `packages/react-agent-primitives/src/workspace/WorkspacePrimitive.tsx`, `index.ts`

**Properties** (4):
- `.Root` - Container component
- `.Tasks` - Task list/board (primary view)
- `.Agents` - All active agents across tasks
- `.Notifications` - Alerts (approvals, errors, completions)
- `.Resources` - Aggregate costs, rate limits

**Sub-properties (Search)**:
- `.Search.Input` - Search box
- `.Search.Results` - Filtered results
- `.Search.Filters` - Filter chips/toggles

**Sub-properties (Selection)**:
- `.Selection.Selected` - Currently selected items
- `.Selection.Count` - Selection count
- `.Selection.Checkbox` - Individual item checkbox

**Actions** (12):
- `.Actions.View.TableView` - List/table layout
- `.Actions.View.DetailView` - Single task detail
- `.Actions.View.SplitView` - List + detail
- `.Actions.View.BoardView` - Kanban-style board
- `.Actions.View.TreeView` - Hierarchical task/agent view
- `.Actions.Bulk.Archive` - Archive selected
- `.Actions.Bulk.SetPermissions` - Set permissions for selected
- `.Actions.Bulk.SetModel` - Set model for selected
- `.Actions.Bulk.Export` - Export selected
- `.Actions.Sort.ByDate` - Sort by date
- `.Actions.Sort.ByCost` - Sort by cost
- `.Actions.Sort.ByStatus` - Sort by status
- `.Actions.Filter.ByStatus` - Filter by status
- `.Actions.Filter.ByAgent` - Filter by agent type
- `.Actions.Filter.ByDateRange` - Filter by date range
- `.Actions.Filter.ShowArchived` - Toggle archived visibility

**Implementation pattern**:
```typescript
// WorkspacePrimitive.tsx
export interface WorkspaceViewMode =
  | 'table'
  | 'detail'
  | 'split'
  | 'board'
  | 'tree';

export const WorkspacePrimitiveRoot = forwardRef<...>((props, ref) => {
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'status' | 'name'>('date');
  const [filterByStatus, setFilterByStatus] = useState<TaskStatus | 'all'>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  return (
    <WorkspacePrimitiveContext.Provider value={{
      viewMode,
      searchQuery,
      sortBy,
      filterByStatus,
      selectedItems,
      setViewMode,
      setSearchQuery,
      setSortBy,
      setFilterByStatus,
      setSelectedItems,
    }}>
      <Primitive.div {...props} ref={ref} />
    </WorkspacePrimitiveContext.Provider>
  );
});

export const WorkspacePrimitiveTasks = forwardRef<...>(({ children }, ref) => {
  const { searchQuery, sortBy, filterByStatus } = useWorkspacePrimitiveContext();
  const allTasks = useWorkspaceState((state) => state.tasks);

  // Apply search, sort, and filters
  const filteredTasks = useMemo(() => {
    let tasks = allTasks;

    // Search
    if (searchQuery) {
      tasks = tasks.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter
    if (filterByStatus !== 'all') {
      tasks = tasks.filter(task => task.status === filterByStatus);
    }

    // Sort
    tasks = [...tasks].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'cost':
          return b.cost - a.cost;
        case 'status':
          return a.status.localeCompare(b.status);
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return tasks;
  }, [allTasks, searchQuery, sortBy, filterByStatus]);

  return (
    <div ref={ref}>
      {children instanceof Function
        ? children(filteredTasks)
        : filteredTasks.map(task => <div key={task.id}>{children}</div>)
      }
    </div>
  );
});

// Search sub-properties
export const WorkspacePrimitiveSearchInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { searchQuery, setSearchQuery } = useWorkspacePrimitiveContext();

  return (
    <input
      ref={ref}
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search tasks..."
      {...props}
    />
  );
});

// Selection sub-properties
export const WorkspacePrimitiveSelectionCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(({ taskId, ...props }, ref) => {
  const { selectedItems, setSelectedItems } = useWorkspacePrimitiveContext();

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={selectedItems.has(taskId)}
      onChange={(e) => {
        setSelectedItems(prev => {
          const next = new Set(prev);
          e.target.checked ? next.add(taskId) : next.delete(taskId);
          return next;
        });
      }}
      {...props}
    />
  );
});

// Action: View.TableView
const useWorkspaceViewTableView = () => {
  const { setViewMode } = useWorkspacePrimitiveContext();

  const callback = useCallback(() => {
    setViewMode('table');
  }, [setViewMode]);

  return callback;
};

export const WorkspacePrimitiveActionsViewTableView = createActionButton(
  'WorkspacePrimitive.Actions.View.TableView',
  useWorkspaceViewTableView,
);

// Action: Bulk.SetModel
const useWorkspaceBulkSetModel = () => {
  const { selectedItems } = useWorkspacePrimitiveContext();
  const api = useWorkspaceApi();

  const callback = useCallback((model: string) => {
    selectedItems.forEach(taskId => {
      api.setTaskModel(taskId, model);
    });
  }, [api, selectedItems]);

  return selectedItems.size > 0 ? (model: string) => callback(model) : null;
};

export const WorkspacePrimitiveActionsBulkSetModel = ({ children, ...props }: { children?: (setModel: (model: string) => void) => ReactNode }) => {
  const setModel = useWorkspaceBulkSetModel();

  if (!setModel) return null;

  return (
    <button onClick={() => {/* Show model selector popup */}} {...props}>
      {children ? children(setModel) : 'Set Model'}
    </button>
  );
};
```

**Context and hooks**:
```typescript
// useWorkspaceState.ts
export interface WorkspaceState {
  tasks: TaskRuntime[];
  agents: AgentRuntime[];
  approvals: ApprovalRuntime[];
  notifications: Notification[];
  resources: ResourceMonitor;
}

export function useWorkspaceState<T>(selector: (state: WorkspaceState) => T): T {
  const runtime = useWorkspaceRuntime();
  return useSyncExternalStore(
    (callback) => runtime.subscribe(callback),
    () => selector(runtime.getState()),
  );
}

// useWorkspaceApi.ts
export function useWorkspaceApi(): WorkspaceApi {
  const runtime = useWorkspaceRuntime();
  return {
    createTask: (config) => runtime.createTask(config),
    archiveTask: (taskId) => runtime.archiveTask(taskId),
    setTaskModel: (taskId, model) => runtime.setTaskModel(taskId, model),
    setTaskPermissions: (taskId, permissions) => runtime.setTaskPermissions(taskId, permissions),
    exportTasks: (taskIds) => runtime.exportTasks(taskIds),
  };
}
```

#### 3. Complete Remaining Action Groups

**TaskPrimitive** - Add remaining action groups (in `packages/react-agent-primitives/src/task/TaskPrimitive.tsx`):

```typescript
// Add after Lifecycle action group (from Phase 3)

// Agents action group
export namespace TaskPrimitiveActions {
  // Lifecycle already exists

  // NEW: Agents action group
  export class Agents {
    static SpawnWorker = TaskPrimitiveActionsAgentsSpawnWorker;
    static ReassignSubtask = TaskPrimitiveActionsAgentsReassignSubtask;
    static CancelAgent = TaskPrimitiveActionsAgentsCancelAgent;
  }
  export const Agents = new Agents();

  // NEW: Organization action group
  export class Organization {
    static Archive = TaskPrimitiveActionsOrganizationArchive;
    static Delete = TaskPrimitiveActionsOrganizationDelete;
    static Rename = TaskPrimitiveActionsOrganizationRename;
    static Tag = TaskPrimitiveActionsOrganizationTag;
  }
  export const Organization = new Organization();

  // NEW: Export action group
  export class Export {
    static CopyId = TaskPrimitiveActionsExportCopyId;
    static ExportJson = TaskPrimitiveActionsExportJson;
    static Share = TaskPrimitiveActionsExportShare;
  }
  export const Export = new Export();
}

// Implement action hooks
const useTaskActionsAgentsSpawnWorker = () => {
  const api = useTaskApi();

  const callback = useCallback((options: SpawnWorkerOptions) => {
    return api.spawnWorker(options);
  }, [api]);

  return callback;
};

export const TaskPrimitiveActionsAgentsSpawnWorker = createActionButton(
  'TaskPrimitive.Actions.Agents.SpawnWorker',
  useTaskActionsAgentsSpawnWorker,
);

const useTaskActionsOrganizationArchive = () => {
  const api = useTaskApi();
  const status = useTaskState((state) => state.status);

  const callback = useCallback(() => {
    api.archive();
  }, [api]);

  return status === 'completed' || status === 'failed' ? callback : null;
};

export const TaskPrimitiveActionsOrganizationArchive = createActionButton(
  'TaskPrimitive.Actions.Organization.Archive',
  useTaskActionsOrganizationArchive,
);

// Similar for other actions...
```

**AgentPrimitive** - Add remaining action groups (in `packages/react-agent-primitives/src/agent/AgentPrimitive.tsx`):

```typescript
// Add after Lifecycle action group (from Phase 3)

export namespace AgentPrimitiveActions {
  // Lifecycle already exists

  // NEW: Branching action group
  export class Branching {
    static Fork = AgentPrimitiveActionsBranchingFork;
    static Checkpoint = AgentPrimitiveActionsBranchingCheckpoint;
    static Rollback = AgentPrimitiveActionsBranchingRollback;
  }
  export const Branching = new Branching();

  // NEW: Organization action group
  export class Organization {
    static Rename = AgentPrimitiveActionsOrganizationRename;
    static Pin = AgentPrimitiveActionsOrganizationPin;
    static Tag = AgentPrimitiveActionsOrganizationTag;
  }
  export const Organization = new Organization();

  // NEW: Export action group
  export class Export {
    static CopyId = AgentPrimitiveActionsExportCopyId;
    static CopyTranscript = AgentPrimitiveActionsExportCopyTranscript;
    static ExportJson = AgentPrimitiveActionsExportExportJson;
    static Share = AgentPrimitiveActionsExportShare;
  }
  export const Export = new Export();

  // NEW: Debug action group
  export class Debug {
    static ViewRaw = AgentPrimitiveActionsDebugViewRaw;
    static ViewState = AgentPrimitiveActionsDebugViewState;
    static ViewLogs = AgentPrimitiveActionsDebugViewLogs;
    static ViewCost = AgentPrimitiveActionsDebugViewCost;
    static InspectContext = AgentPrimitiveActionsDebugInspectContext;
  }
  export const Debug = new Debug();

  // NEW: Config action group
  export class Config {
    static ChangeModel = AgentPrimitiveActionsConfigChangeModel;
    static AdjustPermissions = AgentPrimitiveActionsConfigAdjustPermissions;
    static SetBudget = AgentPrimitiveActionsConfigSetBudget;
    static SetTimeout = AgentPrimitiveActionsConfigSetTimeout;
  }
  export const Config = new Config();
}

// Implement action hooks
const useAgentActionsBranchingFork = () => {
  const api = useAgentApi();

  const callback = useCallback((options?: ForkOptions) => {
    return api.fork(options);
  }, [api]);

  return callback;
};

export const AgentPrimitiveActionsBranchingFork = createActionButton(
  'AgentPrimitive.Actions.Branching.Fork',
  useAgentActionsBranchingFork,
);

// Similar for other actions...
```

### Success Criteria

#### Automated Verification:
- [ ] `pnpm turbo build --filter=@assistant-ui/react-agent-primitives` compiles
- [ ] `pnpm tsc --noEmit --project packages/react-agent-primitives/tsconfig.json` passes
- [ ] Component tests pass: `pnpm test packages/react-agent-primitives`
- [ ] Action validation tests pass (disabled states, callbacks fire)
- [ ] Search/sort/filter tests pass
- [ ] Bulk operation tests pass

#### Manual Verification:
- [ ] Render task launcher form with all inputs
- [ ] Submit creates new task and resets form
- [ ] Save/discard/load draft works
- [ ] Workspace overview shows task list
- [ ] Search filters tasks by title/description
- [ ] Sort by date/cost/status/order works
- [ ] Filter by status/agent type works
- [ ] View mode switches between table/detail/split/board/tree
- [ ] Bulk operations work on selected items
- [ ] Selection checkboxes add/remove from selection
- [ ] New action groups for TaskPrimitive work (Agents, Organization, Export)
- [ ] New action groups for AgentPrimitive work (Branching, Organization, Export, Debug, Config)
- [ ] Actions disable when appropriate (e.g., can't cancel completed task)

### What We're NOT Doing
- Real task creation (mock only until Phase 5 includes SDK integration)
- Board view drag-and-drop (board view structure only, no interactions)
- Tree view interactive visualization (tree view structure only, no full tree rendering)
- Batch task export (structure only, actual export in Phase 5)
- Permission templates (simple per-task config only in this phase)
- Task templates beyond basic draft save/load

---

## Testing Strategy

### Unit Tests

**Visualization primitives**:
- TaskTreePrimitive: expand/collapse state, view mode switching, zoom navigation
- AgentFeedPrimitive: auto-scroll behavior, viewport rendering
- AgentEventPrimitive: collapse/expand, type/status display, action availability

**Tool UI primitives**:
- ToolExecutionPrimitive: streaming updates, expand/collapse, view mode toggling
- Built-in widgets: ANSI rendering for Bash, diff highlighting for Edit, syntax highlighting for Read, result grouping for Grep

**Approval management primitives**:
- ApprovalQueuePrimitive: bulk operations, filtering, selection management
- PermissionModePrimitive: mode switching, timed bypass countdown, per-tool config

**Task management primitives**:
- TaskLauncherPrimitive: form validation, submit flow, draft save/load
- WorkspacePrimitive: search, sort, filter, bulk operations, view mode switching
- Action groups: disabled states, callback execution, parameter passing

### Integration Tests

**End-to-end scenarios**:
1. Create task → launches → shows in workspace → expand details → navigate to subtask
2. Agent makes tool call → appears in feed → approval queue shows pending → approve → tool output streams
3. Apply filters and sorts → workspace updates → select items → bulk operation executes
4. Permission mode changes → new approvals reflect mode → timed bypass expires → revert to previous mode

**Cross-primitive interaction**:
- TaskPrimitive actions spawn agents → AgentEventPrimitive shows events → ToolExecutionPrimitive renders output
- ApprovalPrimitive approvals → ApprovalQueuePrimitive updates count → PermissionModePrimitive affects future approvals
- WorkspacePrimitive selection → TaskPrimitive/AgentPrimitive actions operate on selected items

### Manual Testing Steps

**Phase 4.1**:
1. Render task tree with at least 3 levels of nesting
2. Expand/collapse all nodes individually and via bulk actions
3. Click zoom to subtask → verify focused node updates
4. Zoom out multiple times → return to root
5. Scroll to bottom of agent feed → verify auto-scrolls with new events
6. Collapse an event → click expand → verify appears
7. Copy input/output → paste elsewhere → verify content matches
8. Click re-execute on failed event → verify callback fires

**Phase 4.2**:
1. Render ToolExecutionPrimitive with Bash widget
2. Simulate streaming output in chunks → verify updates at ~30fps
3. Toggle view formatted/raw → verify UI switches
4. Expand/collapse output → verify size changes
5. Test Edit widget with sample diff → verify added/removed lines highlighted
6. Test Read widget with sample code → verify syntax highlighting
7. Test Grep widget with search results → verify file paths and context display
8. Cancel running tool → verify status updates

**Phase 4.3**:
1. Render approval queue with 5+ pending approvals
2. Select 3 items → click bulk approve → verify all approved
3. Filter by tool type → verify only matching items shown
4. Filter by status → verify items filter correctly
5. Click clear resolved → verify resolved items removed
6. Switch permission mode from ask-all to auto-reads
7. Enable timed bypass → watch countdown → verify disables after time expires
8. Set per-tool config → verify different tools have different permissions

**Phase 4.4**:
1. Fill task launcher form with all fields
2. Click submit → verify task appears in workspace
3. Click save draft → verify persists → reload → load draft → verify fields populated
4. Search workspace by task title → verify results filter
5. Sort by cost → verify ordering changes
6. Filter by status → verify only matching tasks shown
7. Switch view mode from table to detail → verify layout changes
8. Select 4 tasks → click bulk set model → verify all updated
9. Test new TaskPrimitive actions (spawn worker, archive, rename)
10. Test new AgentPrimitive actions (fork, checkpoint, view debug info)

---

## Performance Considerations

### Streaming Updates
- **Rate limiting**: All tool output streaming uses 33ms throttle (30fps) from Phase 1 rate limiter
- **Debatching**: Multiple chunks within throttle window batch into single React update
- **Cleanup**: Proper unsubscribe on component unmount to prevent memory leaks

### Virtualization
- **TaskTreePrimitive**: Large hierarchies (100+ nodes) may need virtualization for expand/collapse
- **AgentFeedPrimitive**: Long event feeds (1000+ events) may need virtual scrolling for viewport
- **WorkspacePrimitive**: Large task lists (100+ tasks) may need virtual list rendering

**Later phase optimization**: Consider adding virtualization primitives or using external libraries if performance issues arise with large datasets.

### Memoization
- **Selector functions**: All `useXState` hooks should memoize selector results to prevent unnecessary re-renders
- **Derived state**: Things like filtered/sorted tasks should use `useMemo` to avoid re-computing on every render
- **Callback functions**: All action callbacks should use `useCallback` to preserve reference stability

### Bundle Size
- **Code splitting**: Consider code splitting tool widgets if they add significant bundle size
- **Tree shaking**: Ensure unused action groups are tree-shakable (exported as separate modules)

---

## Migration Notes

### New Package Structure
All Phase 4 primitives live in `packages/react-agent-primitives/`:

```
packages/react-agent-primitives/
├── src/
│   ├── task/
│   │   ├── TaskPrimitive.tsx (existing from Phase 3)
│   │   ├── TaskTreePrimitive.tsx (NEW)
│   │   ├── TaskLauncherPrimitive.tsx (NEW)
│   │   └── index.ts
│   ├── agent/
│   │   ├── AgentPrimitive.tsx (existing from Phase 3)
│   │   ├── AgentFeedPrimitive.tsx (NEW)
│   │   ├── AgentEventPrimitive.tsx (NEW)
│   │   └── index.ts
│   ├── tools/
│   │   ├── ToolExecutionPrimitive.tsx (NEW)
│   │   ├── built-in/
│   │   │   ├── BashWidget.tsx (NEW)
│   │   │   ├── EditWidget.tsx (NEW)
│   │   │   ├── ReadWidget.tsx (NEW)
│   │   │   └── GrepWidget.tsx (NEW)
│   │   └── index.ts
│   ├── approval/
│   │   ├── ApprovalPrimitive.tsx (existing from Phase 3)
│   │   ├── ApprovalQueuePrimitive.tsx (NEW)
│   │   ├── PermissionModePrimitive.tsx (NEW)
│   │   └── index.ts
│   ├── workspace/
│   │   ├── WorkspacePrimitive.tsx (NEW)
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useTaskTreeState.ts (NEW)
│   │   ├── useAgentEventState.ts (NEW)
│   │   ├── useToolExecutionState.ts (NEW)
│   │   ├── useApprovalQueueState.ts (NEW)
│   │   ├── usePermissionModeState.ts (NEW)
│   │   ├── useTaskLauncherState.ts (NEW)
│   │   ├── useWorkspaceState.ts (NEW)
│   │   └── index.ts
│   └── index.ts (main package exports)
├── package.json
└── tsconfig.json
```

### Breaking Changes (None)
Phase 4 is additive only — no breaking changes to Phase 1-3 APIs.

### Deprecations (None)
No deprecated APIs in this phase.

---

## References

### Prerequisite Documents
- Parent implementation plan: `/notes/proposals/agent-ui-implementation-plan.md` (Phase 4 scope)
- Full feature specification: `/notes/proposals/agent-ui-proposal.md` (Appendix A for primitive specs)
- Codebase architecture analysis: `/notes/research/agent-ui-proposal-codebase-implementationanalysis.md`

### Existing Codebase Patterns
- Primitive structure: `packages/react/src/primitives/` (ThreadPrimitive, MessagePrimitive, etc.)
- AssistantFrame streaming: `packages/react/src/model-context/frame/` (message bridge, rate limiter)
- Runtime access patterns: `packages/react/src/legacy-runtime/` (useThreadRuntime, subscribe/getState)

### Similar Implementations to Follow
- ThreadPrimitiveRoot with context providers
- MessagePrimitiveRoot with runtime integration
- ComposerPrimitiveRoot with form handling patterns
- ActionBarPrimitive for action validation and disabled states

### External Libraries (if needed)
- Diff computation for EditWidget: `diff` or `fast-diff`
- ANSI to React for BashWidget: `ansi-to-react` or `react-termynal`
- Syntax highlighting for ReadWidget: `react-syntax-highlighter` (already in codebase for chat-ui)
- Code diffing: `react-diff-viewer` (optional, can implement custom)

---

## Next Steps After Phase 4

After completing Phase 4, the implementation will have:
1. ✅ All 5 runtime classes and their state objects (Phase 2)
2. ✅ 11 primitives with all properties and actions (Phase 3 + 4)
3. ✅ 4 built-in tool widgets with streaming support (Phase 4)
4. ✅ Complete visualization, approval, and task management primitives (Phase 4)

Phase 5 will integrate with the Claude Agent SDK to:
- Implement real stream processing with actual SDK messages
- Replace mock data with real tool execution
- Connect permission hooks to approval system
- Create example application demonstrating full end-to-end flow
- Write documentation for all primitives and hooks

---

**End of Phase 4 Implementation Plan**