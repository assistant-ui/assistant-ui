"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";

function ThreadList() {
  return (
    <ThreadListPrimitive.Root className="flex flex-col gap-1 overflow-y-auto">
      <ThreadListPrimitive.New className="hover:bg-muted flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
        New thread
      </ThreadListPrimitive.New>
      <ThreadListPrimitive.Items>
        {() => (
          <ThreadListItemPrimitive.Root className="hover:bg-muted data-active:bg-muted flex h-9 items-center rounded-lg">
            <ThreadListItemPrimitive.Trigger className="flex-1 truncate px-3 text-start text-sm">
              <ThreadListItemPrimitive.Title fallback="New thread" />
            </ThreadListItemPrimitive.Trigger>
          </ThreadListItemPrimitive.Root>
        )}
      </ThreadListPrimitive.Items>
    </ThreadListPrimitive.Root>
  );
}

export default function Home() {
  return (
    <main className="grid h-dvh grid-cols-[220px_1fr] grid-rows-[minmax(0,1fr)] gap-4 p-4">
      <ThreadList />
      <Thread />
    </main>
  );
}
