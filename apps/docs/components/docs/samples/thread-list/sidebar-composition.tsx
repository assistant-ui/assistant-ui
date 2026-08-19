"use client";

import { useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ExternalStoreThreadData,
  type ThreadMessage,
} from "@assistant-ui/react";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function ThreadListSidebarDemo() {
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

  const createThread = () => {
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
        onSwitchToNewThread: createThread,
        onRename: (id, title) =>
          setThreads((current) =>
            current.map((thread) =>
              thread.id === id ? { ...thread, title } : thread,
            ),
          ),
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
          if (activeId === id) {
            if (remaining[0]) setActiveId(remaining[0].id);
            else createThread();
          }
        },
        onUnarchive: (id) => {
          const selected = archived.find((thread) => thread.id === id);
          setArchived((current) =>
            current.filter((thread) => thread.id !== id),
          );
          if (selected) {
            setThreads((current) => [
              { ...selected, status: "regular" as const },
              ...current,
            ]);
          }
        },
        onDelete: (id) => {
          const remaining = threads.filter((thread) => thread.id !== id);
          setThreads(remaining);
          setArchived((current) =>
            current.filter((thread) => thread.id !== id),
          );
          if (activeId === id) {
            if (remaining[0]) setActiveId(remaining[0].id);
            else createThread();
          }
        },
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <ThreadListSidebar collapsible="none" />
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
}

export function ThreadListSidebarSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <div className="relative h-120 overflow-hidden rounded-xl [&_[data-slot='sidebar-wrapper']]:!h-full [&_[data-slot='sidebar-wrapper']]:!min-h-full [&_a]:!no-underline">
        <ThreadListSidebarDemo />
      </div>
    </SampleFrame>
  );
}
