"use client";

import { useState, type ReactNode } from "react";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import {
  AssistantRuntimeProvider,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useExternalStoreRuntime,
  type ExternalStoreThreadData,
  type ThreadMessage,
} from "@assistant-ui/react";
import { SampleFrame } from "./sample-frame";

const titles = [
  "Draft the Q3 product roadmap",
  "Fix TypeScript generic inference",
  "Rewrite the welcome email",
  "Optimize the analytics query",
  "Compare the pricing tiers",
];

const seededThreads: ExternalStoreThreadData<"regular">[] = titles.map(
  (title, i) => ({ id: `t-${i}`, status: "regular", title }),
);

export function ThreadListPrimitiveSample() {
  return (
    <SampleFrame className="bg-background h-96">
      <div className="relative flex h-full w-full items-center justify-center p-8">
        <LiveThreadList />
        <ControlLegend />
      </div>
    </SampleFrame>
  );
}

function ControlLegend() {
  return (
    <div className="border-border bg-background/80 absolute end-4 bottom-4 flex flex-col gap-1.5 rounded-lg border p-2.5 text-xs shadow-sm backdrop-blur-sm">
      <LegendRow glyphs={["Tab"]} label="change focus" />
      <LegendRow glyphs={["↑", "↓"]} label="cycle list" />
      <LegendRow glyphs={["←", "→"]} label="focus, open/close menu" />
    </div>
  );
}

function LegendRow({ glyphs, label }: { glyphs: string[]; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex gap-1">
        {glyphs.map((g) => (
          <Kbd key={g}>{g}</Kbd>
        ))}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function LiveThreadList() {
  const [threads, setThreads] =
    useState<ExternalStoreThreadData<"regular">[]>(seededThreads);
  const [archived, setArchived] = useState<
    ExternalStoreThreadData<"archived">[]
  >([]);
  const [activeId, setActiveId] = useState("new");
  const [newCount, setNewCount] = useState(0);

  const runtime = useExternalStoreRuntime<ThreadMessage>({
    messages: [],
    onNew: async () => {},
    adapters: {
      threadList: {
        threadId: activeId,
        threads,
        archivedThreads: archived,
        onSwitchToThread: (id) => setActiveId(id),
        onSwitchToNewThread: () => {
          const id = `t-new-${newCount}`;
          setNewCount((c) => c + 1);
          setThreads((prev) => [{ id, status: "regular" }, ...prev]);
          setActiveId(id);
        },
        onArchive: (id) => {
          const found = threads.find((t) => t.id === id);
          const next = threads.filter((t) => t.id !== id);
          setThreads(next);
          if (found)
            setArchived((prev) => [
              { ...found, status: "archived" as const },
              ...prev,
            ]);
          if (activeId === id) setActiveId(next[0]?.id ?? "new");
        },
        onDelete: (id) => {
          const next = threads.filter((t) => t.id !== id);
          setThreads(next);
          if (activeId === id) setActiveId(next[0]?.id ?? "new");
        },
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadListPrimitive.Root className="w-full max-w-xs">
        <ThreadListPrimitive.New className="border-border hover:bg-muted data-active:bg-muted mb-1 flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors">
          <PlusIcon className="size-4" />
          New Thread
        </ThreadListPrimitive.New>
        <div className="flex flex-col gap-1">
          <ThreadListPrimitive.Items>
            {() => <ThreadListItem />}
          </ThreadListPrimitive.Items>
        </div>
      </ThreadListPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

function ThreadListItem() {
  return (
    <ThreadListItemPrimitive.Root className="group hover:bg-muted focus-visible:bg-muted data-active:bg-muted has-focus-visible:bg-muted has-data-[state=open]:bg-muted relative flex h-9 items-center rounded-lg transition-colors focus-visible:outline-none">
      <ThreadListItemPrimitive.Trigger className="focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center truncate rounded-lg px-3 text-start text-sm outline-none group-hover:pe-9 group-has-focus-visible:pe-9 group-has-data-[state=open]:pe-9 group-data-active:pe-9 focus-visible:ring-2">
        <ThreadListItemPrimitive.Title fallback="New Chat" />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMore />
    </ThreadListItemPrimitive.Root>
  );
}

function ThreadListItemMore() {
  return (
    <ThreadListItemMorePrimitive.Root sharedFocusGroup>
      <ThreadListItemMorePrimitive.Trigger className="text-muted-foreground hover:bg-accent focus-visible:ring-ring/50 data-[state=open]:bg-accent absolute end-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md opacity-0 transition-opacity outline-none group-hover:opacity-100 group-has-focus-visible:opacity-100 group-data-active:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 data-[state=open]:opacity-100">
        <MoreHorizontalIcon className="size-4" />
        <span className="sr-only">More options</span>
      </ThreadListItemMorePrimitive.Trigger>
      <ThreadListItemMorePrimitive.Content
        side="right"
        align="start"
        sideOffset={6}
        className="bg-popover text-popover-foreground z-50 min-w-36 rounded-lg border p-1 shadow-md"
      >
        <ThreadListItemPrimitive.Archive asChild>
          <ThreadListItemMorePrimitive.Item className="hover:bg-accent focus:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none">
            <ArchiveIcon className="size-4" />
            Archive
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete asChild>
          <ThreadListItemMorePrimitive.Item className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none">
            <TrashIcon className="size-4" />
            Delete
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Delete>
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="border-border bg-muted inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-sans text-[11px]">
      {children}
    </kbd>
  );
}
