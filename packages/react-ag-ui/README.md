# `@assistant-ui/react-ag-ui`

[AG-UI protocol](https://github.com/ag-ui-protocol/ag-ui) integration for `@assistant-ui/react`. Wraps an `@ag-ui/client` agent in an assistant-ui runtime so any AG-UI-compatible backend (CopilotKit, custom Python/Go/TS agents) can drive the standard assistant-ui components.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-ag-ui @ag-ui/client
```

## Usage

```tsx
"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { HttpAgent } from "@ag-ui/client";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";

export function Provider({ children }: { children: React.ReactNode }) {
  const agent = useMemo(
    () => new HttpAgent({ url: process.env.NEXT_PUBLIC_AGUI_AGENT_URL! }),
    [],
  );
  const runtime = useAgUiRuntime({ agent });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

## Subagents

An AG-UI backend that runs subagents (the agents-as-tools pattern) emits `SUBAGENT_STARTED` / `SUBAGENT_FINISHED` / `SUBAGENT_ERROR` plus a `subagentRunId` on the events each subagent produces. This adapter groups that activity into one nested assistant message per subagent run and attaches it to the spawning tool call as `ToolCallMessagePart.messages`, joined on `SUBAGENT_STARTED.parentToolCallId`. `PartPrimitive.Messages` renders it without extra wiring, and the subagent's name, description, result, and error code ride on that message's `agui` metadata.

A subagent that names no reachable spawning call (`parentToolCallId` is optional, may name a call this run never saw, or two runs may name each other) has nowhere to nest, so its output renders in the parent thread instead of being dropped. This matches the downgrade the protocol's own pre-subagent compatibility middleware performs.

A subagent's frontend-executed tool calls work the same way the root agent's do: a call nested on `ToolCallMessagePart.messages` is reachable by `getPendingToolCalls()`, resolves through `addToolResult`, and its result rides the resume as a `tool` record on the spawning assistant record, the same flattened wire shape these calls had before subagent attribution.

Approval gates cover nested calls too: a gate that names a subagent-scoped call projects onto the nested part, the frontend tool stays unexecuted while the gate is open, decisions recorded through `respondToToolApproval` land on the nested part, and an undecided gate's result is never exported to the backend.

Two limitations are worth knowing before you rely on this:

- **Nested structure does not survive a reload.** Thread restore reads the flattened wire shape, so a restored subagent tool call comes back as a root-level part rather than nested under its spawning call. Results and decisions are preserved; only the nesting is not.

- **Nested human-in-the-loop is not wired up.** A `SUBAGENT_FINISHED` with a `suspended` outcome marks the nested message `requires-action`, and its `interruptIds` are preserved on the message metadata, but there is no resume path that answers them yet.

## See also

- `@assistant-ui/react-a2a` for the A2A v1.0 protocol.
- `@assistant-ui/react-langgraph` for LangGraph SDK agents.

Full API reference, multi-thread setup, and interrupt handling at [assistant-ui.com/docs/runtimes/ag-ui](https://www.assistant-ui.com/docs/runtimes/ag-ui). See [`examples/with-ag-ui`](https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-ag-ui) for a complete app.
