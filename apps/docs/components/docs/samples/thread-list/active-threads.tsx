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

export function ActiveThreadList() {
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

export function ThreadListActiveSample() {
  return (
    <SampleFrame className="bg-background h-auto min-h-96 p-6">
      <div className="mx-auto w-full max-w-sm">
        <ActiveThreadList />
      </div>
    </SampleFrame>
  );
}
