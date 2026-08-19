"use client";

import { useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ExternalStoreThreadData,
  type ThreadMessage,
} from "@assistant-ui/react";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function EmptyThreadList() {
  const [threads, setThreads] = useState<ExternalStoreThreadData<"regular">[]>(
    [],
  );
  const [archived, setArchived] = useState<
    ExternalStoreThreadData<"archived">[]
  >([]);
  const [activeId, setActiveId] = useState("new");
  const nextId = useRef(1);

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
        onArchive: (id) => {
          const selected = threads.find((thread) => thread.id === id);
          const remaining = threads.filter((thread) => thread.id !== id);
          setThreads(remaining);
          if (selected) {
            setArchived((current) => [
              { ...selected, status: "archived" as const },
              ...current,
            ]);
          }
          if (activeId === id) setActiveId(remaining[0]?.id ?? "new");
        },
        onDelete: (id) => {
          const remaining = threads.filter((thread) => thread.id !== id);
          setThreads(remaining);
          if (activeId === id) setActiveId(remaining[0]?.id ?? "new");
        },
        onRename: (id, title) => {
          setThreads((current) =>
            current.map((thread) =>
              thread.id === id ? { ...thread, title } : thread,
            ),
          );
        },
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadList />
    </AssistantRuntimeProvider>
  );
}

export function ThreadListNewSample() {
  return (
    <SampleFrame className="bg-background h-auto min-h-64 p-6">
      <div className="mx-auto w-full max-w-sm">
        <EmptyThreadList />
      </div>
    </SampleFrame>
  );
}
