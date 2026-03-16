# CodeLayer Analysis: Validating agent-ui Primitives

**Date**: 2026-01-19
**Git Commit**: fdc21be0f
**Source**: https://github.com/humanlayer/humanlayer

---

## What is CodeLayer?

CodeLayer is an open-source IDE for orchestrating AI coding agents, built on Claude Code. It's described as "Superhuman for Claude Code" — keyboard-first workflows for managing multiple AI agents doing coding work.

Key characteristics:
- **Tauri desktop app** with React frontend
- **Go daemon** (`hld/`) managing Claude Code sessions
- **TypeScript SDK** (auto-generated from OpenAPI)
- **Multi-agent**: Run parallel Claude sessions with worktrees
- **Human-in-the-loop**: Approval flows for tool executions

---

## CodeLayer's Data Model

### Session (≈ our AgentPrimitive)

```typescript
interface Session {
  id: string;
  runId: string;
  claudeSessionId?: string;
  parentSessionId?: string;  // For forked sessions

  status: 'draft' | 'starting' | 'running' | 'completed' | 'failed' |
          'interrupting' | 'interrupted' | 'waiting_input' | 'discarded';

  query: string;             // Initial task
  summary?: string;          // AI-generated summary
  title?: string;            // User-editable title
  model?: string;
  workingDir?: string;
  additionalDirectories?: string[];

  // Cost/Usage
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  effectiveContextTokens?: number;
  contextLimit?: number;
  durationMs?: number;

  // Permissions
  autoAcceptEdits?: boolean;
  dangerouslySkipPermissions?: boolean;
  dangerouslySkipPermissionsExpiresAt?: Date;

  // Timestamps
  createdAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;

  // State
  archived?: boolean;
  editorState?: string;  // Draft editor state JSON
}
```

### ConversationEvent (≈ our AgentEventPrimitive)

```typescript
interface ConversationEvent {
  id: number;
  sessionId: string;
  claudeSessionId?: string;
  sequence: number;
  eventType: 'message' | 'tool_call' | 'tool_result' | 'system' | 'thinking';
  createdAt: Date;

  // Message events
  role?: 'user' | 'assistant' | 'system';
  content?: string;

  // Tool events
  toolId?: string;
  toolName?: string;
  toolInputJson?: string;
  parentToolUseId?: string;  // Subagent hierarchy!

  // Tool results
  toolResultForId?: string;
  toolResultContent?: string;
  isCompleted?: boolean;

  // Approval integration
  approvalStatus?: 'pending' | 'approved' | 'denied' | 'resolved';
  approvalId?: string;
}
```

### Approval (≈ our ApprovalPrimitive)

```typescript
interface Approval {
  id: string;
  runId: string;
  sessionId: string;
  status: 'pending' | 'approved' | 'denied' | 'resolved';
  createdAt: Date;
  respondedAt?: Date;
  toolName: string;
  toolInput: Record<string, any>;
  comment?: string;  // Denial reason
}
```

### Agent (predefined agent types)

```typescript
interface Agent {
  name: string;
  mentionText: string;  // @agent syntax
  source: 'local' | 'global';
  description?: string;
}
```

---

## CodeLayer's UI Components

### Component Hierarchy

```
humanlayer-wui/src/components/
├── internal/
│   ├── SessionTable.tsx              → Session list view
│   ├── SessionDetail/
│   │   ├── index.tsx                 → Main session view
│   │   ├── ActiveSession.tsx         → Running session UI
│   │   ├── ActionButtons.tsx         → Interrupt, archive, etc.
│   │   ├── ModelSelector.tsx
│   │   ├── DraftLauncherForm.tsx     → Draft editing
│   │   └── ForkViewModal.tsx         → Session forking
│   │
│   └── ConversationStream/
│       ├── ConversationStream.tsx    → Activity feed
│       ├── ConversationEventRow.tsx  → Single event
│       ├── TaskGroupEventRow.tsx     → Subagent grouping
│       └── EventContent/
│           ├── BashToolCallContent.tsx
│           ├── EditToolCallContent.tsx
│           ├── ReadToolCallContent.tsx
│           ├── WriteToolCallContent.tsx
│           ├── GrepToolCallContent.tsx
│           ├── GlobToolCallContent.tsx
│           ├── MCPToolCallContent.tsx
│           ├── ApprovalWrapper.tsx
│           ├── StatusBadge.tsx
│           └── DiffViewer/
│
├── SessionLauncher.tsx               → Full launcher modal
├── QuickLauncher.tsx                 → Quick task input
├── CommandPaletteMenu.tsx            → Command palette (⌘K)
└── HotkeyPanel.tsx                   → Keyboard shortcuts help
```

### Key Patterns

**1. Tool-Specific Content Renderers**

Each tool type has its own component:
```tsx
// BashToolCallContent.tsx
export function BashToolCallContent({
  toolInput,
  approvalStatus,
  toolResultContent,
  isFocused,
}) {
  return (
    <div>
      <span className="font-semibold">Bash</span>
      <CommandToken>{toolInput.command}</CommandToken>
      <StatusBadge status={approvalStatus} />
      {toolResultContent && <pre>{formatResult(toolResultContent)}</pre>}
    </div>
  );
}
```

**2. Approval Wrapper Pattern**

Approvals wrap tool content:
```tsx
<ApprovalWrapper
  event={event}
  approvalStatus={approvalStatus}
  onApprove={handleApprove}
  onDeny={handleDeny}
>
  <BashToolCallContent {...props} />
</ApprovalWrapper>
```

**3. Task Grouping for Subagents**

```tsx
// useTaskGrouping hook groups events by parentToolUseId
const { taskGroups, rootEvents, expandedTasks, toggleTaskGroup } = useTaskGrouping(events);
```

**4. Keyboard-First Interactions**

```tsx
// Extensive hotkey scopes
const HOTKEY_SCOPES = {
  SESSIONS: 'sessions',
  SESSIONS_ARCHIVED: 'sessions-archived',
  SESSION_DETAIL: 'session-detail',
  // ...
};

// Hotkeys in components
useHotkeys('a', () => onApprove(), { scopes: [HOTKEY_SCOPES.SESSION_DETAIL] });
useHotkeys('d', () => onStartDeny(), { scopes: [HOTKEY_SCOPES.SESSION_DETAIL] });
```

---

## Mapping to agent-ui Proposal

### Direct Mappings ✅

| CodeLayer | agent-ui Proposal |
|-----------|-------------------|
| `Session` | `AgentPrimitive` |
| `SessionTable` | `WorkspacePrimitive.Tasks` |
| `SessionDetail` | `AgentPrimitive` + `AgentFeedPrimitive` |
| `ConversationStream` | `AgentFeedPrimitive` |
| `ConversationEvent` | `AgentEventPrimitive` |
| `ConversationEventRow` | `AgentEventPrimitive` (rendered) |
| `Approval` | `ApprovalPrimitive` |
| `ApprovalWrapper` | `ApprovalPrimitive` (with children) |
| `SessionLauncher` | `TaskLauncherPrimitive` |
| `BashToolCallContent` etc. | `ToolExecutionPrimitive` + widgets |
| `TaskGroupEventRow` | Subagent visualization |
| `parentToolUseId` | `TaskPrimitive.Subtasks` |

### Gaps in Our Proposal ❌

| CodeLayer Feature | What It Does | Proposal Gap |
|-------------------|--------------|--------------|
| **Draft sessions** | `status: 'draft'`, `DraftLauncherForm` | No draft state |
| **Session forking** | `parentSessionId`, `ForkViewModal` | No fork primitive |
| **Bulk operations** | `bulkArchiveSessions`, `bulkSelect` | No bulk actions |
| **Hotkey system** | `useHotkeys`, scopes, `HotkeyPanel` | No keyboard primitives |
| **Session search** | Fuzzy search, `matchedSessions` | No search primitive |
| **View modes** | Table vs Detail vs Split | Implicit only |
| **Archive/restore** | `archived` flag, undo toasts | No archive primitive |
| **Denial reasons** | `comment` on Approval | Partial (no text input) |
| **Auto-accept modes** | `autoAcceptEdits`, timed bypass | No permission presets |
| **Context tracking** | `effectiveContextTokens` / `contextLimit` | Not mentioned |
| **Working directory** | `workingDir`, `additionalDirectories` | No workspace context |
| **Inline title edit** | Editable `title` field | Not a primitive |
| **Optimistic updates** | `pendingUpdates` Map | Implementation detail |

---

## Recommended Additions

### New Primitives

```
DraftPrimitive           → Unsent session preparation
├── .Root
├── .Query               → Rich text editor for task
├── .Config              → Model, directory, permissions
├── .Launch              → Convert to running session
└── .Discard             → Delete draft

SessionPrimitive (extend AgentPrimitive)
├── .Fork                → Create branch from checkpoint
├── .Archive             → Archive/restore toggle
├── .Title               → Inline editable title
├── .Summary             → AI-generated summary (readonly)
├── .WorkingDir          → Directory context display
└── .ContextUsage        → Token usage bar/indicator

ApprovalPrimitive (extend)
├── .DenyReason          → Text input for comment
├── .AutoAcceptToggle    → Per-session auto-accept
└── .TimedBypass         → "Allow all for 5 min"

WorkspacePrimitive (extend)
├── .Search              → Fuzzy search input
├── .ViewMode            → Table | Detail | Split toggle
├── .BulkSelect          → Multi-select for bulk ops
├── .BulkActions         → Archive, delete, permissions
└── .Hotkeys             → Keyboard shortcut layer
```

### Runtime Additions

```typescript
interface SessionRuntime extends AgentRuntime {
  // Forking
  fork(): Promise<SessionRuntime>;

  // Archiving
  archive(): Promise<void>;
  restore(): Promise<void>;

  // Drafts
  saveDraft(): Promise<void>;
  launchDraft(): Promise<void>;
  discardDraft(): Promise<void>;
}

interface WorkspaceRuntime {
  // Search
  search(query: string): Session[];

  // Bulk operations
  bulkArchive(sessionIds: string[]): Promise<void>;
  bulkSetPermissions(sessionIds: string[], config: PermissionConfig): Promise<void>;

  // Selection
  selectedSessions: Set<string>;
  toggleSelection(sessionId: string): void;
  selectRange(from: string, to: string): void;
}
```

---

## Is CodeLayer a Good Fit for agent-ui?

### Yes, for these reasons:

1. **Core alignment**: Session/ConversationEvent/Approval map directly to our primitives
2. **Tool UIs match**: They have per-tool content components, we propose the same
3. **Subagent support**: They use `parentToolUseId`, we have `TaskPrimitive.Subtasks`
4. **Approval flow**: Almost identical conceptually

### Gaps are addressable:

1. **Draft/Fork/Archive** — Add state management primitives
2. **Bulk ops** — Add to WorkspacePrimitive
3. **Hotkeys** — Could be a separate package or built into primitives
4. **Search** — Add to WorkspacePrimitive

### Migration path:

If CodeLayer wanted to adopt agent-ui:

1. Replace `ConversationStream` → `AgentFeedPrimitive`
2. Replace `ConversationEventRow` → `AgentEventPrimitive`
3. Replace tool content components → agent-ui tool widgets
4. Replace `ApprovalWrapper` → `ApprovalPrimitive`
5. Keep custom: Hotkey system, SessionTable (or use WorkspacePrimitive)

---

## Conclusion

**CodeLayer validates the agent-ui proposal's core architecture.**

The primitives we proposed align with what a production agent IDE actually needs. The gaps are primarily around power-user features (drafts, forking, bulk ops, hotkeys) that should be added to the proposal.

**Recommendation**: Add CodeLayer as a reference implementation in the proposal, and expand primitives to cover the identified gaps. This positions agent-ui as a framework that can support everything from simple agent dashboards to full IDEs like CodeLayer.
