"use client";

import {
  ConversationMap,
  type ConversationMapEntry,
} from "@/components/assistant-ui/elements/conversation-map";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";
import { cn } from "@/lib/utils";

const ENTRIES: ConversationMapEntry[] = [
  {
    id: "t1",
    title: "Can you check the extension build?",
    preview: "It should be the unpacked one, not the store release.",
  },
  {
    id: "t2",
    title: "What state does the ready dot report?",
    preview:
      "The exact state is “Chat ready.” I'll use that label to find both implementations.",
  },
  {
    id: "t3",
    title: "Ready to replace it with v0.3.5?",
    preview: "Reload it once permissions and extension IDs line up.",
  },
  {
    id: "t4",
    title: "Confirm before you install",
    preview: "The staging release workflow has started; the rollout is next.",
  },
  {
    id: "t5",
    title: "Did the reload keep the session?",
    preview: "It did, and the previous transcript was restored from storage.",
  },
  {
    id: "t6",
    title: "Anything left before I close this out?",
    preview: "Only the archive step. The unpacked build is live.",
  },
];

/** Each phase is a scroll position: the turn being read, inside the window on screen. */
const PHASES = [1000, 1000, 1000, 1000, 0] as const;
const ACTIVE = ["t1", "t2", "t3", "t5", "t6"] as const;
const WINDOWS: readonly (readonly string[])[] = [
  ["t1", "t2"],
  ["t2", "t3"],
  ["t3", "t4"],
  ["t4", "t5", "t6"],
  ["t5", "t6"],
];

export function ConversationMapDemo() {
  const { phase } = useStoryPhases(PHASES);
  const activeId = ACTIVE[phase] ?? ACTIVE[ACTIVE.length - 1]!;
  const visibleIds = WINDOWS[phase] ?? WINDOWS[WINDOWS.length - 1]!;

  return (
    <div className="mx-auto flex h-full w-full max-w-sm gap-4">
      <ConversationMap
        entries={ENTRIES}
        activeId={activeId}
        visibleIds={visibleIds}
      />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
        {ENTRIES.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              "flex min-w-0 flex-col transition-opacity duration-300 motion-reduce:transition-none",
              entry.id === activeId
                ? "opacity-100"
                : visibleIds.includes(entry.id)
                  ? "opacity-60"
                  : "opacity-25",
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
