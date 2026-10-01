import { useState } from "react";
import {
  ToolGroup,
  type GroupedTool,
} from "@assistant-ui/ui/components/assistant-ui/elements/tool-group.tsx";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@assistant-ui/ui/components/assistant-ui/elements/tool-group.aui.tsx";
import {
  ToolFallbackArgs,
  ToolFallbackContent,
  ToolFallbackResult,
  ToolFallbackRoot,
  ToolFallbackTrigger,
} from "@assistant-ui/ui/components/assistant-ui/elements/tool-fallback.aui.tsx";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { defineSections } from "../types";
import { SeededRuntime, SeededThread } from "../runtime";
import { State, States, noop } from "./_states";

const TOOLS: readonly GroupedTool[] = [
  {
    id: "a",
    name: "read_file",
    target: "packages/core/src/convertMessages.ts",
    state: "done",
    durationMs: 42,
  },
  {
    id: "b",
    name: "grep",
    target: "useDraft",
    state: "done",
    durationMs: 61,
  },
  {
    id: "c",
    name: "read_file",
    target: "packages/core/src/queue/message-queue-with-a-long-path.ts",
    state: "failed",
    durationMs: 12,
  },
  {
    id: "d",
    name: "read_file",
    target: "packages/ui/src/composer.tsx",
    state: "running",
  },
];

const DONE: readonly GroupedTool[] = TOOLS.map((tool) => ({
  ...tool,
  state: "done",
  durationMs: tool.durationMs ?? 55,
}));

function InteractiveToolGroup() {
  const [open, setOpen] = useState(true);
  return (
    <ToolGroup
      label="Read 4 files in parallel"
      tools={TOOLS}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

function FallbackCall({
  name,
  args,
  result,
  running,
}: {
  name: string;
  args: object;
  result?: object;
  running?: boolean;
}) {
  return (
    <ToolFallbackRoot>
      <ToolFallbackTrigger
        toolName={name}
        status={running ? { type: "running" } : { type: "complete" }}
      />
      <ToolFallbackContent>
        <ToolFallbackArgs argsText={JSON.stringify(args, null, 2)} />
        {result && <ToolFallbackResult result={result} />}
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
}

function AuiGroup({
  variant,
  active,
}: {
  variant: "outline" | "ghost" | "muted";
  active?: boolean;
}) {
  return (
    <ToolGroupRoot variant={variant} defaultOpen>
      <ToolGroupTrigger count={3} active={active ?? false} />
      <ToolGroupContent>
        <FallbackCall
          name="read_file"
          args={{ path: "src/fixtures/route.ts" }}
          result={{ lines: 84 }}
        />
        <FallbackCall
          name="grep"
          args={{ pattern: "vscodeFetch" }}
          result={{ matches: 6 }}
        />
        <FallbackCall
          name="run_command"
          args={{ command: "pnpm vitest run" }}
          {...(active ? { running: true } : { result: { exitCode: 0 } })}
        />
      </ToolGroupContent>
    </ToolGroupRoot>
  );
}

const GROUPED_MESSAGES: ThreadMessageLike[] = [
  { role: "user", content: "Where is the fetch bridge wired up?" },
  {
    role: "assistant",
    content: [
      { type: "text", text: "Reading the webview entry and the host." },
      {
        type: "tool-call",
        toolCallId: "read-1",
        toolName: "read_file",
        args: { path: "webview/main.tsx" },
        result: { lines: 179 },
      },
      {
        type: "tool-call",
        toolCallId: "read-2",
        toolName: "read_file",
        args: { path: "src/webviews.ts" },
        result: { lines: 212 },
      },
      {
        type: "tool-call",
        toolCallId: "grep-1",
        toolName: "grep",
        args: { pattern: "serveWebviewHost" },
        result: "ENOENT: the workspace index is missing",
        isError: true,
      },
      {
        type: "text",
        text: "`serveWebviewHost` answers the webview's `vscodeFetch` requests in `src/webviews.ts`.",
      },
    ],
  },
];

export default defineSections([
  {
    id: "tool-group",
    title: "Tool group (standalone)",
    category: "agents",
    notes: "Parallel calls: done, failed and running rows; the header toggles.",
    render: () => <InteractiveToolGroup />,
  },
  {
    id: "tool-group-states",
    title: "Tool group states",
    category: "agents",
    notes: "All calls done (closed and open).",
    render: () => (
      <States>
        <State label="done, closed">
          <ToolGroup label="Read 4 files" tools={DONE} open={false} />
        </State>
        <State label="done, open">
          <ToolGroup
            label="Read 4 files"
            tools={DONE}
            open
            onOpenChange={noop}
          />
        </State>
      </States>
    ),
  },
  {
    id: "tool-group-aui",
    title: "Tool group (runtime parts)",
    category: "agents",
    notes:
      "tool-group.aui.tsx in its outline, ghost and muted variants around tool fallbacks; the last one is still running.",
    render: () => (
      <SeededRuntime>
        <States>
          <State label="outline">
            <AuiGroup variant="outline" />
          </State>
          <State label="ghost">
            <AuiGroup variant="ghost" />
          </State>
          <State label="muted, running">
            <AuiGroup variant="muted" active />
          </State>
        </States>
      </SeededRuntime>
    ),
  },
  {
    id: "tool-group-aui-thread",
    title: "Tool group in a thread",
    category: "agents",
    notes:
      "The kit Thread groups consecutive tool calls without a registered UI (one failed) into a ghost tool group.",
    render: () => <SeededThread messages={GROUPED_MESSAGES} />,
  },
]);
