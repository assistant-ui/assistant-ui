"use client";

import { useRef, useState } from "react";
import { ArchiveRestoreIcon } from "lucide-react";
import {
  AssistantRuntimeProvider,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useExternalStoreRuntime,
  type ExternalStoreThreadData,
  type ThreadMessage,
} from "@assistant-ui/react";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function ArchivableThreadList() {
  const [threads, setThreads] = useState<ExternalStoreThreadData<"regular">[]>([
    { id: "launch-plan", status: "regular", title: "Plan the product launch" },
    { id: "api-review", status: "regular", title: "Review the API design" },
    { id: "release-notes", status: "regular", title: "Draft release notes" },
  ]);
  const [archived, setArchived] = useState<
    ExternalStoreThreadData<"archived">[]
  >([]);
  const [activeId, setActiveId] = useState("launch-plan");
  const nextId = useRef(1);

  const activateNext = (remaining: ExternalStoreThreadData<"regular">[]) => {
    const next = remaining[0];
    if (next) {
      setActiveId(next.id);
      return;
    }
    const id = `new-thread-${nextId.current++}`;
    setThreads((current) => [{ id, status: "regular" }, ...current]);
    setActiveId(id);
  };

  const runtime = useExternalStoreRuntime<ThreadMessage>({
    messages: [],
    onNew: async () => {},
    adapters: {
      threadList: {
        threadId: activeId,
        threads,
        archivedThreads: archived,
        onSwitchToThread: setActiveId,
        onSwitchToNewThread: () => {
          const id = `new-thread-${nextId.current++}`;
          setThreads((current) => [{ id, status: "regular" }, ...current]);
          setActiveId(id);
        },
        onRename: (id, title) => {
          setThreads((current) =>
            current.map((thread) =>
              thread.id === id ? { ...thread, title } : thread,
            ),
          );
        },
        onArchive: (id) => {
          const selected = threads.find((thread) => thread.id === id);
          if (!selected) return;
          const remaining = threads.filter((thread) => thread.id !== id);
          setThreads(remaining);
          setArchived((current) => [
            { ...selected, status: "archived" as const },
            ...current,
          ]);
          if (activeId === id) activateNext(remaining);
        },
        onUnarchive: (id) => {
          const selected = archived.find((thread) => thread.id === id);
          if (!selected) return;
          setArchived((current) =>
            current.filter((thread) => thread.id !== id),
          );
          setThreads((current) => [
            { ...selected, status: "regular" as const },
            ...current,
          ]);
        },
        onDelete: (id) => {
          const remaining = threads.filter((thread) => thread.id !== id);
          setThreads(remaining);
          if (activeId === id) activateNext(remaining);
        },
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadList />
      {archived.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          <p className="text-muted-foreground px-2.5 text-xs font-medium">
            Archived
          </p>
          <ThreadListPrimitive.Root className="flex flex-col gap-0.5">
            <ThreadListPrimitive.Items archived>
              {() => (
                <ThreadListItemPrimitive.Root className="hover:bg-muted flex items-center gap-2 rounded-lg px-2.5 py-2">
                  <span className="text-muted-foreground flex-1 truncate text-sm">
                    <ThreadListItemPrimitive.Title fallback="New Chat" />
                  </span>
                  <ThreadListItemPrimitive.Unarchive className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-xs">
                    <ArchiveRestoreIcon className="size-3.5" />
                    Restore
                  </ThreadListItemPrimitive.Unarchive>
                </ThreadListItemPrimitive.Root>
              )}
            </ThreadListPrimitive.Items>
          </ThreadListPrimitive.Root>
        </div>
      )}
    </AssistantRuntimeProvider>
  );
}

export function ThreadListArchiveSample() {
  return (
    <SampleFrame className="bg-background h-auto min-h-96 p-6">
      <div className="mx-auto w-full max-w-sm">
        <ArchivableThreadList />
      </div>
    </SampleFrame>
  );
}
