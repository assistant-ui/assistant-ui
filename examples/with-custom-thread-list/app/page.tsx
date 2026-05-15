"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AuiProvider,
  Suggestions,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
} from "@assistant-ui/react";

function ThreadList() {
  return (
    <ThreadListPrimitive.Root className="flex flex-col gap-1 overflow-y-auto">
      <ThreadListPrimitive.New className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm hover:bg-muted">
        New Thread
      </ThreadListPrimitive.New>
      <ThreadListPrimitive.Items>
        {() => (
          <ThreadListItemPrimitive.Root className="flex h-9 items-center rounded-lg hover:bg-muted data-active:bg-muted">
            <ThreadListItemPrimitive.Trigger className="flex-1 truncate px-3 text-start text-sm">
              <ThreadListItemPrimitive.Title fallback="New Chat" />
            </ThreadListItemPrimitive.Trigger>
          </ThreadListItemPrimitive.Root>
        )}
      </ThreadListPrimitive.Items>
      <ThreadListPrimitive.LoadMore className="mt-1 h-9 rounded-lg border px-3 text-sm hover:bg-muted disabled:opacity-50">
        Load more
      </ThreadListPrimitive.LoadMore>
    </ThreadListPrimitive.Root>
  );
}

function ThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Start a new topic",
        label: "in this conversation",
        prompt: "Let's discuss something interesting. Suggest a topic!",
      },
      {
        title: "Help me brainstorm",
        label: "some project ideas",
        prompt: "Help me brainstorm ideas for a weekend side project.",
      },
    ]),
  });
  return (
    <AuiProvider value={aui}>
      <Thread />
    </AuiProvider>
  );
}

export default function Home() {
  return (
    <main className="grid h-dvh grid-cols-[200px_1fr] grid-rows-[minmax(0,1fr)] gap-4 p-4">
      <ThreadList />
      <ThreadWithSuggestions />
    </main>
  );
}
