---
date: 2026-01-16T12:00:00-08:00
researcher: Claude
git_commit: fdc21be0fca082e1ef06fa1e0897a6b0e1c82ceb
branch: main
repository: assistant-ui
topic: "Extending assistant-ui to support Claude Agent SDK (agent-ui)"
tags: [research, codebase, claude-agent-sdk, runtime, streaming, integration]
status: complete
last_updated: 2026-01-16
last_updated_by: Claude
---

# Research: Extending assistant-ui to Support Claude Agent SDK ("agent-ui")

**Date**: 2026-01-16T12:00:00-08:00
**Researcher**: Claude
**Git Commit**: fdc21be0fca082e1ef06fa1e0897a6b0e1c82ceb
**Branch**: main
**Repository**: assistant-ui

## Research Question

How would assistant-ui extend to support the Claude Agent SDK? What would an "agent-ui" integration look like, given that assistant-ui is mainly designed around the classic "responses" API format?

## Summary

The Claude Agent SDK represents a significant evolution from traditional chat APIs. While assistant-ui's current architecture (designed for AI SDK/LangGraph "responses" patterns) shares conceptual overlap with the Agent SDK, key differences exist in streaming format, tool handling, session management, and the agentic execution model. An "agent-ui" integration is feasible by creating a new runtime adapter (`@assistant-ui/react-agent-sdk`) following the existing external store runtime pattern, but would benefit from first-class support for agent-specific concepts like subagents, permission handling, session state, and rich tool UIs for built-in tools.

## Detailed Findings

### 1. Current assistant-ui Architecture

#### Runtime Hierarchy
- **AssistantRuntime** → **ThreadListRuntime** → **ThreadRuntime** → **MessageRuntime**
- Core implementations in `packages/react/src/legacy-runtime/runtime-cores/`
- Two main patterns: `LocalRuntime` (in-browser chat) and `ExternalStoreRuntime` (external message stores)

#### Message Types (assistant-ui)
```typescript
// packages/react/src/types/AssistantTypes.ts
type ThreadMessage = BaseThreadMessage &
  (ThreadSystemMessage | ThreadUserMessage | ThreadAssistantMessage);

type MessageStatus =
  | { type: "running" }
  | { type: "requires-action"; reason: "tool-calls" | "interrupt" }
  | { type: "complete"; reason: "stop" | "unknown" }
  | { type: "incomplete"; reason: "cancelled" | "tool-calls" | "length" | ... };
```

#### Content Parts (assistant-ui)
```typescript
// packages/react/src/types/MessagePartTypes.ts
type ThreadAssistantMessagePart =
  | TextMessagePart        // { type: "text", text: string }
  | ReasoningMessagePart   // { type: "reasoning", text: string }
  | ToolCallMessagePart    // { type: "tool-call", toolCallId, toolName, args, result?, ... }
  | SourceMessagePart      // { type: "source", sourceType: "url", ... }
  | FileMessagePart        // { type: "file", data, mimeType }
  | ImageMessagePart       // { type: "image", image: string }
  | DataMessagePart;       // { type: "data", name, data }
```

#### Streaming Protocol (assistant-stream)
- `AssistantStreamChunk` with path-based addressing for nested parts
- Chunk types: `part-start`, `part-finish`, `text-delta`, `result`, `step-start`, `step-finish`, `message-finish`
- Two transport formats: DataStream (AI SDK compatible) and AssistantTransport (native SSE)

### 2. Claude Agent SDK Architecture

#### Message Types (Agent SDK)
```typescript
type SDKMessage =
  | SDKAssistantMessage      // Claude's complete responses
  | SDKUserMessage           // User input messages
  | SDKResultMessage         // Final result with success/error, costs, usage
  | SDKSystemMessage         // Session initialization info
  | SDKPartialAssistantMessage  // Streaming events (when includePartialMessages: true)
  | SDKCompactBoundaryMessage;  // Conversation compaction markers
```

#### SDKAssistantMessage Structure
```typescript
type SDKAssistantMessage = {
  type: 'assistant';
  uuid: UUID;
  session_id: string;
  message: APIAssistantMessage;  // From Anthropic SDK - contains content[]
  parent_tool_use_id: string | null;  // For subagent hierarchies
}
```

#### Content Blocks (Anthropic API format)
```typescript
// In message.content[]
{ type: 'text', text: string }
{ type: 'tool_use', id: string, name: string, input: object }
{ type: 'tool_result', tool_use_id: string, content: string, is_error?: boolean }
{ type: 'thinking', thinking: string, signature: string }  // Extended thinking
```

#### Streaming Format
- With `includePartialMessages: true`: yields `SDKPartialAssistantMessage` with `RawMessageStreamEvent`
- Event types: `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`
- Tool input streams as `input_json_delta` with partial JSON strings

### 3. Key Architectural Differences

| Aspect | assistant-ui | Claude Agent SDK |
|--------|-------------|------------------|
| **Message format** | `ThreadMessage` with parts array | `APIMessage` with content blocks |
| **Streaming** | `AssistantStreamChunk` with path addressing | `RawMessageStreamEvent` from Anthropic SDK |
| **Tool handling** | `tool-call` part with `result` field | Separate `tool_use` and `tool_result` blocks |
| **Session concept** | Thread IDs (optional) | `session_id` on every message, persistent |
| **Subagents** | Not native | `parent_tool_use_id` hierarchy |
| **Permissions** | Not native | Hooks system, permission modes |
| **Execution model** | Single message response | Agentic loop with multiple turns |
| **Result metadata** | Basic status | Rich: `total_cost_usd`, `usage`, `num_turns`, `duration_ms` |
| **Compaction** | Not native | `SDKCompactBoundaryMessage` markers |

### 4. Mapping Strategy

#### Message Conversion

```typescript
// Agent SDK → assistant-ui
function convertAgentSDKMessage(msg: SDKAssistantMessage): ThreadAssistantMessage {
  return {
    id: msg.uuid,
    role: 'assistant',
    createdAt: new Date(),
    content: msg.message.content.flatMap(block => {
      if (block.type === 'text') {
        return [{ type: 'text', text: block.text }];
      }
      if (block.type === 'tool_use') {
        return [{
          type: 'tool-call',
          toolCallId: block.id,
          toolName: block.name,
          args: block.input,
          argsText: JSON.stringify(block.input),
        }];
      }
      if (block.type === 'thinking') {
        return [{ type: 'reasoning', text: block.thinking }];
      }
      return [];
    }),
    status: determineStatus(msg),
    metadata: {
      unstable_annotations: [],
      unstable_data: [],
      unstable_state: {},
      steps: [],
      custom: {
        session_id: msg.session_id,
        parent_tool_use_id: msg.parent_tool_use_id,
      },
    },
  };
}
```

#### Tool Result Handling

The Agent SDK's tool results come as separate messages in the stream, while assistant-ui expects them as part of the tool-call. Need to accumulate:

```typescript
// Track pending tool calls and merge results
const pendingToolCalls = new Map<string, ToolCallMessagePart>();

function handleToolResult(toolUseId: string, result: any, isError: boolean) {
  const toolCall = pendingToolCalls.get(toolUseId);
  if (toolCall) {
    toolCall.result = result;
    toolCall.isError = isError;
    pendingToolCalls.delete(toolUseId);
  }
}
```

### 5. Proposed Integration Architecture

#### Package: `@assistant-ui/react-agent-sdk`

```
packages/react-agent-sdk/
├── src/
│   ├── index.ts
│   ├── useAgentRuntime.ts          # Main hook
│   ├── useAgentMessages.ts         # Message accumulation
│   ├── AgentMessageConverter.ts    # SDK → assistant-ui conversion
│   ├── AgentStreamProcessor.ts     # Handle streaming events
│   ├── types.ts                    # Agent SDK type re-exports
│   ├── tools/                      # Built-in tool UIs
│   │   ├── BashToolUI.tsx
│   │   ├── ReadToolUI.tsx
│   │   ├── EditToolUI.tsx
│   │   ├── WriteToolUI.tsx
│   │   ├── GrepToolUI.tsx
│   │   ├── GlobToolUI.tsx
│   │   └── TaskToolUI.tsx          # Subagent visualization
│   └── components/
│       ├── AgentSessionInfo.tsx    # Display session metadata
│       ├── AgentCostDisplay.tsx    # Show usage/costs
│       └── PermissionPrompt.tsx    # Handle permission requests
```

#### Main Hook: `useAgentRuntime`

```typescript
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { useExternalStoreRuntime } from "@assistant-ui/react";

export function useAgentRuntime(options: AgentRuntimeOptions): AssistantRuntime {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const queryRef = useRef<Query | null>(null);

  // Message accumulator for streaming
  const accumulator = useMemo(() => new AgentMessageAccumulator(), []);

  const sendMessage = useCallback(async (message: AppendMessage) => {
    setIsRunning(true);

    const generator = query({
      prompt: messageToPrompt(message),
      options: {
        allowedTools: options.allowedTools,
        permissionMode: options.permissionMode,
        includePartialMessages: true,  // Enable streaming
        hooks: options.hooks,
      },
    });

    queryRef.current = generator;

    try {
      for await (const msg of generator) {
        const converted = accumulator.processMessage(msg);
        if (converted) {
          setMessages(prev => accumulator.getMessages());
        }

        if (msg.type === 'system' && msg.subtype === 'init') {
          setSessionInfo(extractSessionInfo(msg));
        }

        if (msg.type === 'result') {
          options.onResult?.(msg);
        }
      }
    } finally {
      setIsRunning(false);
      queryRef.current = null;
    }
  }, [options, accumulator]);

  return useExternalStoreRuntime({
    isRunning,
    messages,
    onNew: sendMessage,
    onCancel: () => queryRef.current?.interrupt(),
    // Tool results handled via hooks, not onAddToolResult
  });
}
```

#### Stream Processing

```typescript
class AgentMessageAccumulator {
  private messages: Map<string, ThreadMessage> = new Map();
  private partialContent: Map<string, string> = new Map();
  private toolCalls: Map<string, ToolCallMessagePart> = new Map();

  processMessage(msg: SDKMessage): boolean {
    switch (msg.type) {
      case 'assistant':
        return this.handleCompleteMessage(msg);

      case 'stream_event':
        return this.handleStreamEvent(msg);

      case 'result':
        return this.handleResult(msg);

      default:
        return false;
    }
  }

  private handleStreamEvent(msg: SDKPartialAssistantMessage): boolean {
    const event = msg.event;

    switch (event.type) {
      case 'content_block_start':
        if (event.content_block.type === 'text') {
          this.partialContent.set(`${msg.uuid}-${event.index}`, '');
        } else if (event.content_block.type === 'tool_use') {
          this.toolCalls.set(event.content_block.id, {
            type: 'tool-call',
            toolCallId: event.content_block.id,
            toolName: event.content_block.name,
            args: {},
            argsText: '',
          });
        }
        break;

      case 'content_block_delta':
        if (event.delta.type === 'text_delta') {
          const key = `${msg.uuid}-${event.index}`;
          this.partialContent.set(
            key,
            (this.partialContent.get(key) || '') + event.delta.text
          );
        } else if (event.delta.type === 'input_json_delta') {
          // Accumulate partial JSON for tool input
          const toolCall = this.getCurrentToolCall(event.index);
          if (toolCall) {
            toolCall.argsText += event.delta.partial_json;
          }
        }
        break;

      case 'content_block_stop':
        // Finalize the content block
        break;
    }

    return this.updateCurrentMessage(msg.uuid);
  }

  getMessages(): ThreadMessage[] {
    return Array.from(this.messages.values());
  }
}
```

### 6. Agent-Specific UI Components

#### Built-in Tool UIs

The Agent SDK has built-in tools that would benefit from custom UIs:

```typescript
// packages/react-agent-sdk/src/tools/BashToolUI.tsx
export const BashToolUI = makeAssistantToolUI<BashInput, string>({
  toolName: 'Bash',
  render: ({ args, result, status }) => (
    <div className="aui-bash-tool">
      <div className="aui-bash-command">
        <TerminalIcon />
        <code>{args.command}</code>
        {args.run_in_background && <Badge>Background</Badge>}
      </div>
      {status.type === 'running' && <Spinner />}
      {result && (
        <pre className="aui-bash-output">
          <AnsiRenderer>{result}</AnsiRenderer>
        </pre>
      )}
    </div>
  ),
});

// packages/react-agent-sdk/src/tools/EditToolUI.tsx
export const EditToolUI = makeAssistantToolUI<FileEditInput, string>({
  toolName: 'Edit',
  render: ({ args, result, status }) => (
    <div className="aui-edit-tool">
      <div className="aui-file-path">{args.file_path}</div>
      <DiffViewer
        oldValue={args.old_string}
        newValue={args.new_string}
        splitView={false}
      />
      {result && <div className="aui-edit-result">{result}</div>}
    </div>
  ),
});

// packages/react-agent-sdk/src/tools/TaskToolUI.tsx (Subagent)
export const TaskToolUI = makeAssistantToolUI<TaskInput, string>({
  toolName: 'Task',
  render: ({ args, result, status }) => (
    <div className="aui-task-tool">
      <div className="aui-subagent-header">
        <AgentIcon />
        <span>Subagent: {args.subagent_type}</span>
      </div>
      <div className="aui-subagent-prompt">{args.prompt}</div>
      {status.type === 'running' && (
        <div className="aui-subagent-progress">
          <Spinner /> Working...
        </div>
      )}
      {result && (
        <Collapsible>
          <CollapsibleTrigger>View Result</CollapsibleTrigger>
          <CollapsibleContent>
            <Markdown>{result}</Markdown>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  ),
});
```

#### Session Info Component

```typescript
// packages/react-agent-sdk/src/components/AgentSessionInfo.tsx
export function AgentSessionInfo() {
  const sessionInfo = useAgentSessionInfo();

  if (!sessionInfo) return null;

  return (
    <div className="aui-session-info">
      <div className="aui-session-model">{sessionInfo.model}</div>
      <div className="aui-session-tools">
        {sessionInfo.tools.length} tools available
      </div>
      {sessionInfo.mcp_servers.length > 0 && (
        <div className="aui-mcp-servers">
          MCP: {sessionInfo.mcp_servers.map(s => s.name).join(', ')}
        </div>
      )}
    </div>
  );
}
```

#### Cost/Usage Display

```typescript
// packages/react-agent-sdk/src/components/AgentCostDisplay.tsx
export function AgentCostDisplay() {
  const result = useAgentResult();

  if (!result || result.subtype !== 'success') return null;

  return (
    <div className="aui-cost-display">
      <div className="aui-cost">${result.total_cost_usd.toFixed(4)}</div>
      <div className="aui-usage">
        {result.usage.input_tokens} in / {result.usage.output_tokens} out
      </div>
      <div className="aui-turns">{result.num_turns} turns</div>
      <div className="aui-duration">{(result.duration_ms / 1000).toFixed(1)}s</div>
    </div>
  );
}
```

### 7. Permission Handling

The Agent SDK has a sophisticated permission system that assistant-ui doesn't natively support:

```typescript
// Permission hook integration
export function useAgentRuntime(options: AgentRuntimeOptions) {
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null);

  const hooks: HooksConfig = {
    PreToolUse: [{
      matcher: '*',
      hooks: [async (input, toolUseId) => {
        if (options.onPermissionRequest) {
          const decision = await options.onPermissionRequest({
            toolName: input.tool_name,
            toolInput: input.tool_input,
          });
          return {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: decision,
            },
          };
        }
        return {};
      }],
    }],
  };

  // ... rest of implementation
}

// Usage with custom permission UI
function MyChat() {
  const [permissionDialog, setPermissionDialog] = useState<PermissionRequest | null>(null);

  const runtime = useAgentRuntime({
    onPermissionRequest: async (request) => {
      return new Promise((resolve) => {
        setPermissionDialog({
          ...request,
          onAllow: () => { resolve('allow'); setPermissionDialog(null); },
          onDeny: () => { resolve('deny'); setPermissionDialog(null); },
        });
      });
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
      {permissionDialog && <PermissionDialog {...permissionDialog} />}
    </AssistantRuntimeProvider>
  );
}
```

### 8. Subagent Visualization

One unique aspect of the Agent SDK is the subagent hierarchy via `parent_tool_use_id`. This could be visualized:

```typescript
// Track subagent relationships
interface SubagentNode {
  toolUseId: string;
  toolName: string;
  prompt: string;
  messages: ThreadMessage[];
  children: SubagentNode[];
}

function buildSubagentTree(messages: SDKMessage[]): SubagentNode[] {
  const roots: SubagentNode[] = [];
  const nodeMap = new Map<string, SubagentNode>();

  for (const msg of messages) {
    if (msg.type === 'assistant' && msg.parent_tool_use_id) {
      // This message belongs to a subagent
      const parentNode = nodeMap.get(msg.parent_tool_use_id);
      if (parentNode) {
        parentNode.messages.push(convertAgentSDKMessage(msg));
      }
    }
    // ... build tree structure
  }

  return roots;
}
```

### 9. Implementation Phases

#### Phase 1: Basic Integration
- Create `@assistant-ui/react-agent-sdk` package
- Implement `useAgentRuntime` hook with `ExternalStoreRuntime`
- Basic message conversion (SDKAssistantMessage → ThreadMessage)
- Handle `SDKResultMessage` for completion status

#### Phase 2: Streaming Support
- Process `SDKPartialAssistantMessage` events
- Accumulate partial text and tool inputs
- Real-time UI updates during agent execution

#### Phase 3: Built-in Tool UIs
- Create custom UIs for Bash, Read, Write, Edit, Grep, Glob
- Task/subagent visualization
- File diff viewers

#### Phase 4: Permission System
- Hook integration for PreToolUse/PostToolUse
- Permission prompt UI components
- Permission mode configuration

#### Phase 5: Advanced Features
- Subagent hierarchy visualization
- Session persistence and resume
- Cost/usage tracking UI
- Compact boundary handling

## Code References

### assistant-ui Core
- `packages/react/src/legacy-runtime/runtime-cores/core/ThreadRuntimeCore.tsx:78-134` - Core thread interface
- `packages/react/src/types/AssistantTypes.ts:73-95` - MessageStatus type
- `packages/react/src/types/MessagePartTypes.ts:52-67` - ToolCallMessagePart
- `packages/react/src/legacy-runtime/runtime-cores/external-store/useExternalStoreRuntime.tsx:12-29` - External store pattern
- `packages/react/src/model-context/useAssistantToolUI.tsx:12-20` - Tool UI registration

### Integration Examples
- `packages/react-ai-sdk/src/ui/use-chat/useAISDKRuntime.tsx:53-234` - AI SDK runtime (reference pattern)
- `packages/react-langgraph/src/useLangGraphRuntime.ts:334-365` - LangGraph runtime (reference pattern)
- `packages/react-ai-sdk/src/ui/utils/convertMessage.ts:174-242` - Message conversion example

### Streaming
- `packages/assistant-stream/src/core/AssistantStreamChunk.ts:1-101` - Stream chunk types
- `packages/assistant-stream/src/core/accumulators/assistant-message-accumulator.ts:370-472` - Message accumulation

## Architecture Insights

1. **ExternalStoreRuntime is the right pattern** - Both AI SDK and LangGraph integrations use this, and it provides the flexibility needed for the Agent SDK's different message format.

2. **Message accumulation is key** - The Agent SDK's streaming events need to be accumulated into complete messages, similar to LangGraph's `appendLangChainChunk`.

3. **Tool results work differently** - Agent SDK handles tool execution internally; assistant-ui's `onAddToolResult` may not be needed, but `requires-action` status for human tools could map to the SDK's interrupt concept.

4. **Session state is first-class** - Unlike current integrations, the Agent SDK has explicit session management that should be exposed to the UI.

5. **Subagents are unique** - The `parent_tool_use_id` hierarchy is a new concept that would benefit from dedicated visualization.

## Open Questions

1. **Bi-directional streaming**: The Agent SDK supports streaming input via async generators. Should assistant-ui support sending messages mid-stream?

2. **Session persistence**: How should session state be persisted? The Agent SDK has its own session concept that may conflict with assistant-ui's thread persistence.

3. **Permission UI patterns**: What's the best UX for permission prompts? Modal dialogs? Inline in the chat?

4. **Subagent depth**: How deep should subagent visualization go? Collapse by default?

5. **MCP server status**: Should MCP server connection status be shown in the UI?

6. **Cost alerts**: Should there be budget warnings/limits in the UI?

## Related Research

- Claude Agent SDK official docs: https://docs.anthropic.com/en/docs/agent-sdk/overview
- GitHub: https://github.com/anthropics/claude-agent-sdk-typescript
- npm: @anthropic-ai/claude-agent-sdk
