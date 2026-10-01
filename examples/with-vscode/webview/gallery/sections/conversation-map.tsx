import {
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  ConversationMap,
  type ConversationMapEntry,
} from "@assistant-ui/ui/components/assistant-ui/elements/conversation-map.tsx";
import { ConversationMapAui } from "@assistant-ui/ui/components/assistant-ui/elements/conversation-map.aui.tsx";
import { cn } from "@/lib/utils";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";

const TURNS: [string, string][] = [
  [
    "Can you check the extension build?",
    "It is the unpacked build from the working tree, not the marketplace release.",
  ],
  [
    "What state does the ready dot report?",
    "It reports “Chat ready” once the webview has mounted the runtime.",
  ],
  [
    "Ready to replace it with v0.3.5?",
    "Not yet: reloading now would drop the open chat.",
  ],
  [
    "Confirm before you install.",
    "Confirmed. The staging workflow has started; the rollout is next.",
  ],
  [
    "Did the reload keep the session?",
    "It did, and the previous transcript was restored from storage.",
  ],
  [
    "Anything left before I close this out?",
    "Only the archive step. The unpacked build is live.",
  ],
];

const ENTRIES: ConversationMapEntry[] = TURNS.map(([title, preview], i) => ({
  id: `t${i + 1}`,
  title,
  preview,
}));

const MESSAGES: ThreadMessageLike[] = TURNS.flatMap(([user, assistant]) => [
  { role: "user" as const, content: user },
  { role: "assistant" as const, content: assistant },
]);

function StandaloneMap() {
  return (
    <div className="flex h-48 gap-4">
      <ConversationMap
        entries={ENTRIES}
        activeId="t3"
        visibleIds={["t3", "t4"]}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        {ENTRIES.map((entry) => (
          <span key={entry.id} className="truncate text-[13px]">
            {entry.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function Message() {
  const isUser = useAuiState((s) => s.message.role === "user");
  return (
    <MessagePrimitive.Root
      className={cn(
        "text-[13px] leading-relaxed",
        isUser ? "font-medium" : "text-foreground/60",
      )}
    >
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

export default defineSections([
  {
    id: "conversation-map",
    title: "Conversation map (standalone)",
    category: "chat",
    notes: "conversation-map.tsx: turn 3 active, turns 3 and 4 in view.",
    render: () => <StandaloneMap />,
  },
  {
    id: "conversation-map-aui",
    title: "Conversation map (runtime)",
    category: "chat",
    notes:
      "conversation-map.aui.tsx inside a thread viewport of six turns; the map tracks the turns in view. It is absolutely positioned at the viewport edge, so the messages keep a left gutter for it.",
    render: () => (
      <SeededRuntime messages={MESSAGES}>
        <ThreadPrimitive.Root className="flex h-80 flex-col">
          <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-auto">
            <ConversationMapAui />
            <div className="mx-auto flex w-full max-w-md flex-col gap-5 py-6 ps-10 pe-6">
              <ThreadPrimitive.Messages>
                {() => <Message />}
              </ThreadPrimitive.Messages>
            </div>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </SeededRuntime>
    ),
  },
]);
