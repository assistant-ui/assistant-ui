"use client";

import { useState } from "react";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/dropdown-menu";
import { SampleFrame } from "./sample-frame";

const threads = [
  { id: "1", title: "Help me write a blog post", active: false },
  { id: "2", title: "Explain React Server Components", active: true },
  { id: "3", title: "Debug my TypeScript error", active: false },
];

export function ThreadListPrimitiveSample() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <SampleFrame className="bg-background flex h-auto items-start justify-center p-8">
      <div className="w-full max-w-xs">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="border-border hover:bg-muted data-active:bg-muted flex h-9 items-center gap-2 rounded-lg border px-3 text-sm"
          >
            <PlusIcon className="size-4" />
            New Thread
          </button>
          {threads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              menuOpen={openMenuId === thread.id}
              onToggleMenu={() =>
                setOpenMenuId(openMenuId === thread.id ? null : thread.id)
              }
              onCloseMenu={() => setOpenMenuId(null)}
            />
          ))}
        </div>
      </div>
    </SampleFrame>
  );
}

function ThreadItem({
  thread,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
}: {
  thread: { id: string; title: string; active: boolean };
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
}) {
  return (
    <div
      data-active={thread.active ? "true" : undefined}
      className="group hover:bg-muted data-active:bg-muted relative flex h-9 items-center gap-2 rounded-lg transition-colors"
    >
      <button
        type="button"
        className="flex h-full min-w-0 flex-1 items-center truncate px-3 text-start text-sm"
      >
        {thread.title}
      </button>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          if (open) onToggleMenu();
          else onCloseMenu();
        }}
      >
        <DropdownMenuTrigger
          className={
            menuOpen
              ? "bg-accent mr-2 flex size-7 opacity-100"
              : "mr-2 flex size-7 opacity-0 group-hover:opacity-100 group-data-active:opacity-100"
          }
        >
          <MoreHorizontalIcon className="text-muted-foreground size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-32 rounded-md p-1" sideOffset={4}>
          <DropdownMenuItem
            icon={<ArchiveIcon className="size-4" />}
            onSelect={onCloseMenu}
            className="gap-2 rounded-sm px-2 py-1.5"
          >
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<TrashIcon className="size-4" />}
            onSelect={onCloseMenu}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2 rounded-sm px-2 py-1.5"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
