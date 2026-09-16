import {
  CopyIcon,
  FileIcon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react-native";
import { type ComponentType, useEffect, useState } from "react";
import { View } from "react-native";

import {
  AgentStatus,
  type AgentState,
} from "@/components/assistant-ui/elements/agent-status";
import {
  ApprovalCard,
  type ApprovalState,
} from "@/components/assistant-ui/elements/approval-card";
import {
  ConversationMap,
  type ConversationMapEntry,
} from "@/components/assistant-ui/elements/conversation-map";
import { ErrorState } from "@/components/assistant-ui/elements/error-state";
import { File } from "@/components/assistant-ui/elements/file";
import { Image } from "@/components/assistant-ui/elements/image";
import { IconButton } from "@/components/assistant-ui/elements/icon-button";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { MessageQueue } from "@/components/assistant-ui/elements/message-queue";
import { StoppedRun } from "@/components/assistant-ui/elements/stopped-run";
import {
  ToolTimeline,
  type TimelineStat,
  type TimelineStep,
} from "@/components/assistant-ui/elements/tool-timeline";
import { TypingIndicator } from "@/components/assistant-ui/elements/typing-indicator";
import { Icon } from "@/components/ui/icon";

import { usePhases } from "./use-phases";

export type ShowcaseSlug =
  | "icon-button"
  | "typing-indicator"
  | "error-state"
  | "stopped-run"
  | "approval-card"
  | "agent-status"
  | "tool-timeline"
  | "markdown-text"
  | "message-queue"
  | "file"
  | "image"
  | "conversation-map";

const ERROR_STATE_PHASES = [2800, 1600] as const;
const APPROVAL_CARD_PHASES = [3000, 1800, 2600] as const;
const AGENT_STATUS_PHASES = [3000, 2200, 2600] as const;
const TOOL_TIMELINE_PHASES = [900, 900, 900, 4000] as const;
const CONVERSATION_MAP_PHASES = [1800, 1800, 1800, 1800, 1800] as const;
const CONVERSATION_MAP_ENTRIES: readonly ConversationMapEntry[] = [
  {
    id: "t1",
    title: "Chat ready",
    preview: "The dot turns green once the socket connects.",
  },
  {
    id: "t2",
    title: "Why is the reply cut off",
    preview: "The stream ended early; reload continues from the last token.",
  },
  {
    id: "t3",
    title: "Reload it",
    preview: "Reloaded, and the answer now ends on a full sentence.",
  },
  {
    id: "t4",
    title: "Add the summary at the top",
    preview: "Moved the summary above the steps.",
  },
  { id: "t5", title: "Thanks" },
];
const CONVERSATION_MAP_STEPS: readonly {
  window: readonly string[];
  active: string;
}[] = [
  { window: ["t1", "t2"], active: "t1" },
  { window: ["t2", "t3"], active: "t2" },
  { window: ["t3", "t4"], active: "t3" },
  { window: ["t4", "t5"], active: "t4" },
  { window: ["t4", "t5"], active: "t5" },
];
const STOPPED_RUN_WORDS =
  "The approval card can sit inside the tool call it guards, so the".split(" ");
const APPROVAL_STATES: readonly ApprovalState[] = [
  "request",
  "running",
  "done",
];
const AGENT_STATUSES: readonly { state: AgentState; label: string }[] = [
  { state: "working", label: "Reading files" },
  { state: "waiting", label: "Waiting for approval" },
  { state: "done", label: "Done" },
];
const TOOL_TIMELINE_STEPS: readonly TimelineStep[] = [
  { verb: "Searched", chip: "src/**", icon: SearchIcon },
  { verb: "Read", chip: "thread.tsx", icon: FileIcon },
  { verb: "Edited", chip: "composer.tsx", icon: PencilIcon },
];
const TOOL_TIMELINE_STATS: TimelineStat[] = [
  { file: "composer.tsx", added: 12, removed: 3 },
];
const SAMPLE = `## Streaming markdown

This paragraph includes **bold text** and \`inline code\`.

- First item
- Second item

\`\`\`ts
const answer = 42;
\`\`\``;

function IconButtonDemo() {
  return (
    <View className="w-full max-w-sm">
      <View className="flex-row gap-1">
        <IconButton label="Copy" onPress={() => {}}>
          <Icon as={CopyIcon} className="text-muted-foreground size-4" />
        </IconButton>
        <IconButton label="Refresh" onPress={() => {}}>
          <Icon as={RefreshCwIcon} className="text-muted-foreground size-4" />
        </IconButton>
        <IconButton label="Edit" onPress={() => {}}>
          <Icon as={PencilIcon} className="text-muted-foreground size-4" />
        </IconButton>
      </View>
    </View>
  );
}

function TypingIndicatorDemo() {
  return (
    <View className="w-full max-w-sm">
      <TypingIndicator announce={false} />
    </View>
  );
}

function ErrorStateDemo() {
  const phase = usePhases(ERROR_STATE_PHASES);

  return (
    <View className="w-full max-w-sm">
      <ErrorState
        title="Connection lost"
        detail="The stream ended before the reply finished."
        retrying={phase === 1}
        onRetry={() => {}}
      />
    </View>
  );
}

const QUEUED_MESSAGES = [
  { id: "q1", text: "Also check the staging deploy" },
  { id: "q2", text: "Then summarize what changed" },
];

function MessageQueueDemo() {
  const [queued, setQueued] = useState(QUEUED_MESSAGES);

  return (
    <View className="w-full max-w-sm">
      <MessageQueue
        running="Refactoring the auth middleware"
        queued={queued}
        onCancel={(id) =>
          setQueued((items) => items.filter((item) => item.id !== id))
        }
      />
    </View>
  );
}

function StoppedRunDemo() {
  return (
    <View className="w-full max-w-sm">
      <StoppedRun
        words={STOPPED_RUN_WORDS}
        reason="stopped by you"
        onContinue={() => {}}
        onDiscard={() => {}}
      />
    </View>
  );
}

function ApprovalCardDemo() {
  const phase = usePhases(APPROVAL_CARD_PHASES);

  return (
    <View className="w-full max-w-sm">
      <ApprovalCard
        state={APPROVAL_STATES[phase]}
        command="rm -rf node_modules && pnpm install"
        title="Run shell command"
        subtitle="in ~/project"
        onAllowOnce={() => {}}
        onAlwaysAllow={() => {}}
        onDeny={() => {}}
      />
    </View>
  );
}

function AgentStatusDemo() {
  const phase = usePhases(AGENT_STATUS_PHASES);
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState(now);
  const [previousPhase, setPreviousPhase] = useState(phase);
  if (phase !== previousPhase) {
    setPreviousPhase(phase);
    if (phase === 0) setStartedAt(Date.now());
  }
  const status = AGENT_STATUSES[phase];
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsed = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View className="w-full max-w-sm">
      {status.state === "done" ? (
        <AgentStatus state={status.state} label={status.label} />
      ) : (
        <AgentStatus
          state={status.state}
          label={status.label}
          elapsed={elapsed}
        />
      )}
    </View>
  );
}

function ToolTimelineDemo() {
  const phase = usePhases(TOOL_TIMELINE_PHASES);
  const [open, setOpen] = useState(true);

  return (
    <View className="w-full max-w-sm">
      <ToolTimeline
        steps={TOOL_TIMELINE_STEPS}
        visibleSteps={Math.min(phase + 1, TOOL_TIMELINE_STEPS.length)}
        streaming={phase !== 3}
        open={open}
        onOpenChange={setOpen}
        restingLabel="Worked for 12s"
        activeLabel="Working"
        stats={TOOL_TIMELINE_STATS}
      />
    </View>
  );
}

function ConversationMapDemo() {
  const phase = usePhases(CONVERSATION_MAP_PHASES);
  const step = CONVERSATION_MAP_STEPS[phase]!;

  return (
    <View className="h-72 w-full max-w-sm items-end">
      <ConversationMap
        entries={CONVERSATION_MAP_ENTRIES}
        activeId={step.active}
        visibleIds={step.window}
        onSelect={() => {}}
        side="left"
      />
    </View>
  );
}

function MarkdownTextDemo() {
  return (
    <View className="w-full max-w-sm">
      <MarkdownText type="text" status={{ type: "complete" }} text={SAMPLE} />
    </View>
  );
}

function FileDemo() {
  return (
    <View className="w-full max-w-sm">
      <File
        type="file"
        status={{ type: "complete" }}
        filename="native-elements.pdf"
        mimeType="application/pdf"
        data="https://www.assistant-ui.com/native-elements.pdf"
      />
    </View>
  );
}

function ImageDemo() {
  return (
    <View className="w-full max-w-sm">
      <Image
        type="image"
        status={{ type: "complete" }}
        filename="native-elements.png"
        image="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80"
      />
    </View>
  );
}

export const SHOWCASE_ELEMENTS: readonly {
  slug: ShowcaseSlug;
  title: string;
  Demo: ComponentType;
}[] = [
  { slug: "icon-button", title: "Icon button", Demo: IconButtonDemo },
  {
    slug: "typing-indicator",
    title: "Typing indicator",
    Demo: TypingIndicatorDemo,
  },
  { slug: "error-state", title: "Error state", Demo: ErrorStateDemo },
  { slug: "stopped-run", title: "Stopped run", Demo: StoppedRunDemo },
  {
    slug: "approval-card",
    title: "Approval card",
    Demo: ApprovalCardDemo,
  },
  { slug: "agent-status", title: "Agent status", Demo: AgentStatusDemo },
  { slug: "tool-timeline", title: "Tool timeline", Demo: ToolTimelineDemo },
  { slug: "markdown-text", title: "Markdown text", Demo: MarkdownTextDemo },
  { slug: "message-queue", title: "Message queue", Demo: MessageQueueDemo },
  { slug: "file", title: "File", Demo: FileDemo },
  { slug: "image", title: "Image", Demo: ImageDemo },
  {
    slug: "conversation-map",
    title: "Conversation map",
    Demo: ConversationMapDemo,
  },
];
