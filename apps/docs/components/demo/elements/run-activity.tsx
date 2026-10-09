"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useExternalStoreRuntime,
  useScrollLock,
  type AddToolResultOptions,
  type MessageStatus,
  type PartState,
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
  createdAt?: Date | undefined;
  status: MessageStatus;
  timing?: { startedAt: number; completedAt?: number } | undefined;
  parts: readonly {
    id: string;
    kind: "commentary" | "tool" | "answer" | "attention";
    label: string;
    part: TextMessagePart | ToolCallMessagePart;
  }[];
};

type ActivityPresentation = {
  timing: ActivityRun["timing"];
  entries: Record<string, Pick<ActivityRun["parts"][number], "kind" | "label">>;
};

export type ActivityMessage = ActivityRun | ThreadMessageLike;

export function convertActivityMessage(
  run: ActivityMessage,
): ThreadMessageLike {
  if ("role" in run) return run;
  return {
    id: run.id,
    createdAt: run.createdAt,
    role: "assistant",
    status: run.status,
    content: run.parts.map(({ id, part }) =>
      part.type === "text" ? { ...part, id } : part,
    ),
    metadata: {
      custom: {
        activityPresentation: {
          timing: run.timing,
          entries: Object.fromEntries(
            run.parts.map(({ id, kind, label, part }) => [
              part.type === "tool-call"
                ? `tool-call:${part.toolCallId}`
                : `text:${id}`,
              { kind, label },
            ]),
          ),
        } satisfies ActivityPresentation,
      },
    },
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
  complete: "Completed",
  cancelled: "Stopped",
  incomplete: "Incomplete",
  error: "Failed",
};

const TIMED_LABELS: Partial<Record<RunActivityStatus, string>> = {
  complete: "Worked for",
  cancelled: "Stopped after",
  error: "Failed after",
};

function RunDuration({ timing }: { timing: ActivityRun["timing"] }) {
  const running = useAuiState((s) => s.message.status?.type === "running");
  const elapsed = useTaskElapsed(timing, running);
  return elapsed === undefined ? null : <>{formatElapsed(elapsed)}</>;
}

const PART_COMPONENTS = {
  Text: ({ text }: { text: string }) => <p>{text}</p>,
  tools: { Fallback: ToolFallback },
};

function needsAttention(part: PartState) {
  return (
    part.type === "tool-call" &&
    Boolean(
      part.status.type === "requires-action" ||
      part.status.type === "incomplete" ||
      part.isError ||
      (part.approval && !part.approval.isAutomatic) ||
      part.interrupt,
    )
  );
}

export function ActivityRunMessage() {
  const presentation = useAuiState(
    (s) =>
      s.message.metadata.custom.activityPresentation as
        | ActivityPresentation
        | undefined,
  );
  if (!presentation) {
    return (
      <MessagePrimitive.Root>
        <MessagePrimitive.Parts components={PART_COMPONENTS} />
      </MessagePrimitive.Root>
    );
  }
  return <AnnotatedActivityRunMessage presentation={presentation} />;
}

function AnnotatedActivityRunMessage({
  presentation,
}: {
  presentation: ActivityPresentation;
}) {
  const messageParts = useAuiState((s) => s.message.parts);
  const messageStatus = useAuiState((s) => s.message.status);
  const [open, setOpen] = useState(false);
  const [attentionIds, setAttentionIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const lockScroll = useScrollLock(rootRef, 200);
  const status = activityStatus(messageStatus!);
  const hasDuration =
    status === "running" || presentation.timing?.completedAt !== undefined;
  const parts = messageParts.map((part, index) => {
    const partId =
      part.type === "tool-call"
        ? `tool-call:${part.toolCallId}`
        : part.type === "text" && part.id
          ? `text:${part.id}`
          : undefined;
    const entry = partId ? presentation.entries[partId] : undefined;
    const id = partId ?? `unclassified:${index}`;
    return {
      id,
      kind: entry?.kind ?? "attention",
      label: entry?.label ?? "Additional content",
      attention:
        attentionIds.has(id) ||
        !entry ||
        entry.kind === "attention" ||
        needsAttention(part),
      content: (
        <MessagePrimitive.PartByIndex
          key={id}
          index={index}
          components={PART_COMPONENTS}
        />
      ),
    };
  });
  const newlyVisibleIds = parts.filter(
    (part) => part.attention && !attentionIds.has(part.id),
  );
  if (newlyVisibleIds.length > 0) {
    // A settled decision stays in the same parent even if the adapter drops its request payload.
    setAttentionIds(
      new Set([...attentionIds, ...newlyVisibleIds.map((part) => part.id)]),
    );
  }

  return (
    <MessagePrimitive.Root ref={rootRef}>
      <RunActivity
        status={status}
        statusLabel={
          hasDuration
            ? (TIMED_LABELS[status] ?? LABELS[status])
            : LABELS[status]
        }
        durationLabel={
          hasDuration ? <RunDuration timing={presentation.timing} /> : undefined
        }
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
          .map((entry) => (
            <div key={entry.id} role="group" aria-label={entry.label}>
              {entry.content}
            </div>
          ))}
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
  onAddToolResult,
}: {
  run: ActivityRun;
  onRespondToToolApproval?: (options: RespondToToolApprovalOptions) => void;
  onAddToolResult?: (options: AddToolResultOptions) => void;
}) {
  const runtime = useExternalStoreRuntime<ActivityRun>({
    messages: [run],
    isRunning: run.status.type === "running",
    convertMessage: convertActivityMessage,
    onNew: async () => {},
    onRespondToToolApproval,
    onAddToolResult,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root>
        <ThreadPrimitive.Viewport className="max-h-96 overflow-y-auto p-1">
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
const DEMO_CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

export function RunActivityDemo() {
  const { phase, running } = useStoryPhases(PHASES);
  const [timing, setTiming] = useState<ActivityRun["timing"]>();
  useLayoutEffect(() => {
    // The clock is read after mount because a prerender may not read it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTiming((current) => {
      if (running) return current ?? { startedAt: Date.now() };
      if (current === undefined || current.completedAt !== undefined) {
        return current;
      }
      return { ...current, completedAt: Date.now() };
    });
  }, [running]);
  const complete = phase === PHASES.length - 1;
  const run: ActivityRun = {
    id: "demo-run",
    createdAt: DEMO_CREATED_AT,
    status: complete
      ? { type: "complete", reason: "stop" }
      : running
        ? { type: "running" }
        : { type: "incomplete", reason: "cancelled" },
    timing,
    parts: PARTS.slice(0, phase + 1),
  };

  return <ActivityRunExample run={run} />;
}
