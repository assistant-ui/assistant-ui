"use client";

import {
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { ConversationMapAui } from "@/components/assistant-ui/elements/conversation-map.aui";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { cn } from "@/lib/utils";

const TURNS: [string, string][] = [
  [
    "Can you check which Athena build Chrome is running?",
    "Chrome currently has the unpacked Athena extension loaded from Support/Athena in Chrome/unpacked. It matches the working tree, not the store release.",
  ],
  [
    "What is the exact state the ready dot reports?",
    "The exact state is “Chat ready.” I'll use that label to find both implementations and verify whether Olympus currently treats the ready dot as the same signal.",
  ],
  [
    "Ready to replace it with v0.3.5 and reload?",
    "Not yet. Reloading now would drop the open Athena chat, and permissions and extension IDs still have to line up before the swap is safe.",
  ],
  [
    "Confirm that I should install and reload v0.3.5.",
    "Confirmed. PR #33109 is merged into staging and the staging release workflow has started; once the rollout finishes I'll repeat the run end to end.",
  ],
  [
    "Did the reload keep the session?",
    "It did. The unpacked build is live, the ready dot turned green, and the previous transcript was restored from storage.",
  ],
  [
    "Anything left before I close this out?",
    "Only the archive step. Once the previous build is archived the swap is complete and nothing else is pending.",
  ],
];

const MESSAGES: ThreadMessageLike[] = TURNS.flatMap(([user, assistant]) => [
  { role: "user" as const, content: user },
  { role: "assistant" as const, content: assistant },
]);

function SampleMessage() {
  const isUser = useAuiState((s) => s.message.role === "user");

  return (
    <MessagePrimitive.Root
      className={cn(
        "text-[13px] leading-relaxed",
        isUser ? "text-foreground/90 font-medium" : "text-foreground/60",
      )}
    >
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

export function ConversationMapThread() {
  return (
    <SampleRuntimeProvider messages={MESSAGES}>
      <ThreadPrimitive.Root className="flex h-full flex-col">
        <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-scroll">
          <ConversationMapAui className="max-sm:hidden" />
          <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-6 py-10">
            <ThreadPrimitive.Messages>
              {() => <SampleMessage />}
            </ThreadPrimitive.Messages>
          </div>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </SampleRuntimeProvider>
  );
}

export function ConversationMapSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <ConversationMapThread />
    </SampleFrame>
  );
}
