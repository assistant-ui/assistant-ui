"use client";

import {
  ConversationMap,
  type ConversationMapEntry,
} from "@/components/assistant-ui/elements/conversation-map";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";
import { cn } from "@/lib/utils";

const ENTRIES: ConversationMapEntry[] = [
  {
    id: "m1",
    role: "user",
    title: "Can you check the extension build?",
    preview: "It should be the unpacked one, not the store release.",
  },
  {
    id: "m2",
    role: "assistant",
    title: "Chat ready",
    preview:
      "The exact state is “Chat ready.” I'll use that label to find both implementations and verify whether the ready dot is wired to it.",
  },
  {
    id: "m3",
    role: "user",
    title: "Ready to replace it with v0.3.5",
    preview: "Reload it once permissions and extension IDs line up.",
  },
  {
    id: "m4",
    role: "assistant",
    title: "1. approved 2. approved 3. approved 4. approved",
    preview:
      "The staging release workflow has started; once the rollout finishes I'll repeat the run end to end.",
  },
  {
    id: "m5",
    role: "user",
    title: "Confirm before you install",
    preview: "Do not reload until the previous build is archived.",
  },
  {
    id: "m6",
    role: "assistant",
    title: "Installed and reloaded",
    preview: "The unpacked build is live and the ready dot turned green.",
  },
];

const PHASES = [900, 900, 900, 900, 0] as const;
const ACTIVE = ["m1", "m2", "m3", "m4", "m6"] as const;

export function ConversationMapDemo() {
  const { phase } = useStoryPhases(PHASES);
  const activeId = ACTIVE[phase] ?? ACTIVE[ACTIVE.length - 1]!;

  return (
    <div className="mx-auto flex h-full w-full max-w-sm gap-4">
      <ConversationMap entries={ENTRIES} activeId={activeId} />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
        {ENTRIES.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              "flex min-w-0 flex-col transition-opacity duration-300 motion-reduce:transition-none",
              entry.id === activeId ? "opacity-100" : "opacity-35",
            )}
          >
            <span className="text-foreground/90 truncate text-[13px] leading-snug font-medium">
              {entry.title}
            </span>
            <span className="text-foreground/45 truncate text-[13px] leading-snug">
              {entry.preview}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
