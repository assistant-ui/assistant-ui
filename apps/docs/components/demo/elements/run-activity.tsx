"use client";

import { useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useExternalStoreRuntime,
  useScrollLock,
  type MessageStatus,
  type RespondToToolApprovalOptions,
  type TextMessagePart,
  type ThreadMessageLike,
  type ToolCallMessagePart,
} from "@assistant-ui/react";
import {
  RunActivity,
  type RunActivityStatus,
} from "@/components/assistant-ui/elements/run-activity";
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui";
import {
  formatElapsed,
  useTaskElapsed,
} from "@/components/assistant-ui/utils/task";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

export type ActivityRun = {
  id: string;
  status: MessageStatus;
  timing: { startedAt: number; completedAt?: number };
  parts: readonly {
    id: string;
    kind: "commentary" | "tool" | "answer" | "attention";
    label: string;
    part: TextMessagePart | ToolCallMessagePart;
  }[];
};

export function convertRun(run: ActivityRun): ThreadMessageLike {
  return {
    id: run.id,
    role: "assistant",
    status: run.status,
    content: run.parts.map((entry) => entry.part),
    metadata: { custom: { activityRun: run } },
  };
}

export function activityStatus(status: MessageStatus): RunActivityStatus {
  if (status.type !== "incomplete") return status.type;
  if (status.reason === "cancelled" || status.reason === "error") {
    return status.reason;
  }
  return "incomplete";
}

const LABELS: Record<RunActivityStatus, string> = {
  running: "Working",
  "requires-action": "Needs your input",
  complete: "Worked for",
  cancelled: "Stopped after",
  incomplete: "Incomplete",
  error: "Failed after",
};

function RunDuration({ run }: { run: ActivityRun }) {
  const elapsed = useTaskElapsed(run.timing, run.status.type === "running");
  return elapsed === undefined ? null : <>{formatElapsed(elapsed)}</>;
}

const PART_COMPONENTS = {
  Text: ({ text }: { text: string }) => <p>{text}</p>,
  tools: { Fallback: ToolFallback },
};

function needsAttention(entry: ActivityRun["parts"][number]) {
  if (entry.kind === "attention") return true;
  if (entry.part.type !== "tool-call") return false;
  const { approval, interrupt, result, isError } = entry.part;
  return Boolean(
    isError ||
    (approval && approval.approved === undefined && !approval.resolution) ||
    (interrupt && result === undefined),
  );
}

export function ActivityRunMessage() {
  const run = useAuiState(
    (s) => s.message.metadata.custom.activityRun as ActivityRun,
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lockScroll = useScrollLock(rootRef, 200);
  const status = activityStatus(run.status);
  const parts = run.parts.map((entry, index) => ({
    ...entry,
    attention: needsAttention(entry),
    content: (
      <MessagePrimitive.PartByIndex
        key={entry.id}
        index={index}
        components={PART_COMPONENTS}
      />
    ),
  }));

  return (
    <MessagePrimitive.Root ref={rootRef}>
      <RunActivity
        status={status}
        statusLabel={LABELS[status]}
        durationLabel={<RunDuration run={run} />}
        entries={parts.flatMap((entry) =>
          !entry.attention &&
          (entry.kind === "commentary" || entry.kind === "tool")
            ? [{ ...entry, kind: entry.kind }]
            : [],
        )}
        open={open}
        onOpenChange={(nextOpen) => {
          lockScroll();
          setOpen(nextOpen);
        }}
        attention={parts
          .filter((entry) => entry.attention)
          .map((entry) => entry.content)}
      >
        {parts
          .filter((entry) => entry.kind === "answer" && !entry.attention)
          .map((entry) => entry.content)}
      </RunActivity>
    </MessagePrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root>
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

export function ActivityRunExample({
  run,
  onRespondToToolApproval,
}: {
  run: ActivityRun;
  onRespondToToolApproval?: (options: RespondToToolApprovalOptions) => void;
}) {
  const runtime = useExternalStoreRuntime<ActivityRun>({
    messages: [run],
    isRunning: run.status.type === "running",
    convertMessage: convertRun,
    onNew: async () => {},
    onRespondToToolApproval,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root>
        <ThreadPrimitive.Viewport className="max-h-96 overflow-y-auto">
          <ThreadPrimitive.Messages
            components={{ AssistantMessage: ActivityRunMessage, UserMessage }}
          />
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

const PARTS: ActivityRun["parts"] = [
  {
    id: "commentary-1",
    kind: "commentary",
    label: "Inspecting the files",
    part: { type: "text", text: "I’ll inspect the files." },
  },
  {
    id: "read-1",
    kind: "tool",
    label: "Reading thread.tsx",
    part: {
      type: "tool-call",
      toolCallId: "read-1",
      toolName: "read_file",
      args: { path: "thread.tsx" },
      argsText: '{"path":"thread.tsx"}',
      result: "Read thread.tsx",
    },
  },
  {
    id: "commentary-2",
    kind: "commentary",
    label: "Checking the fix",
    part: { type: "text", text: "I found the issue; checking the fix." },
  },
  {
    id: "test-1",
    kind: "tool",
    label: "Running the tests",
    part: {
      type: "tool-call",
      toolCallId: "test-1",
      toolName: "run_command",
      args: { command: "pnpm test" },
      argsText: '{"command":"pnpm test"}',
      result: "All tests passed.",
    },
  },
  {
    id: "answer-1",
    kind: "answer",
    label: "",
    part: { type: "text", text: "The fix is ready. The tests pass." },
  },
];

const PHASES = [1200, 1200, 1200, 1200, 0] as const;

export function RunActivityDemo() {
  const { phase } = useStoryPhases(PHASES);
  const [startedAt] = useState(() => Date.now());
  const complete = phase === PHASES.length - 1;
  const run: ActivityRun = {
    id: "demo-run",
    status: complete
      ? { type: "complete", reason: "stop" }
      : { type: "running" },
    timing: complete
      ? { startedAt, completedAt: startedAt + 4800 }
      : { startedAt },
    parts: PARTS.slice(0, phase + 1),
  };

  return <ActivityRunExample run={run} />;
}
