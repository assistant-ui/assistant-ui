"use client";

import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import { MessageSquare, Plus } from "lucide-react";

export function ThreadList() {
  return (
    <ThreadListPrimitive.Root className="flex flex-col gap-1">
      <ThreadListNew />
      <ThreadListPrimitive.Items components={{ ThreadListItem }} />
    </ThreadListPrimitive.Root>
  );
}

export function ThreadListNew() {
  return (
    <ThreadListPrimitive.New className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--muted)]">
      <Plus className="size-4" />
      New Chat
    </ThreadListPrimitive.New>
  );
}

function ThreadListItem() {
  return (
    <ThreadListItemPrimitive.Root className="rounded-lg data-[active]:bg-[var(--muted)]">
      <ThreadListItemPrimitive.Trigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm">
        <MessageSquare className="size-4 shrink-0 text-[var(--muted-foreground)]" />
        <ThreadListItemPrimitive.Title fallback="New Chat" />
      </ThreadListItemPrimitive.Trigger>
    </ThreadListItemPrimitive.Root>
  );
}
