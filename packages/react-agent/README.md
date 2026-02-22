# @assistant-ui/react-agent

React primitives and runtime hooks for building supervised agent UIs with `assistant-ui`.

It provides:
- task/agent/approval state hooks
- approval and permission-mode controls
- task/workspace primitives for composable UI
- SDK clients and runtime classes for HTTP/SSE-driven agent execution

## Installation

```bash
npm install @assistant-ui/react-agent
# or
pnpm add @assistant-ui/react-agent
```

## Quick Start

```tsx
import {
  AgentWorkspaceProvider,
  WorkspacePrimitive,
  TaskLauncherPrimitive,
  TaskPrimitive,
} from "@assistant-ui/react-agent";

export function AgentUI() {
  return (
    <AgentWorkspaceProvider apiKey="YOUR_API_KEY" baseUrl="/api/agent">
      <TaskLauncherPrimitive.Root>
        <TaskLauncherPrimitive.Input />
        <TaskLauncherPrimitive.Submit />
      </TaskLauncherPrimitive.Root>

      <WorkspacePrimitive.Root>
        <WorkspacePrimitive.Tasks>
          {(tasks) => (
            <ul>
              {tasks.map((task) => (
                <li key={task.id}>
                  <TaskPrimitive.Root taskId={task.id}>
                    <TaskPrimitive.Title /> - <TaskPrimitive.Status />
                  </TaskPrimitive.Root>
                </li>
              ))}
            </ul>
          )}
        </WorkspacePrimitive.Tasks>
      </WorkspacePrimitive.Root>
    </AgentWorkspaceProvider>
  );
}
```

## Key Exports

- Runtime: `WorkspaceRuntime`, `TaskRuntime`, `AgentRuntime`, `ApprovalRuntime`, `LocalStoragePermissionStore`
- SDK (default import path): `HttpAgentClient`
- SDK (server import path): `AnthropicAgentClient` from `@assistant-ui/react-agent/server`
- Hooks: `useAgentWorkspace`, `useWorkspaceTasks`, `useTaskState`, `useAgentState`, `useApprovalState`, `usePermissionMode`
- Primitives: `WorkspacePrimitive`, `TaskPrimitive`, `AgentPrimitive`, `ApprovalPrimitive`, `TaskTreePrimitive`, `TaskLauncherPrimitive`, `ApprovalQueuePrimitive`, `ToolExecutionPrimitive`, `PermissionModePrimitive`
