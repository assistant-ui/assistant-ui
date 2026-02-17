"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { SampleFrame } from "./sample-frame";

const threads = [
  { id: "1", title: "Help me write a blog post", active: false },
  { id: "2", title: "Explain React Server Components", active: true },
  { id: "3", title: "Debug my TypeScript error", active: false },
];

export function ThreadListPrimitiveSample() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <SampleFrame className="flex h-auto items-start justify-center bg-background p-8">
      <div className="w-full max-w-xs">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:bg-muted data-active:bg-muted"
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseMenu();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, onCloseMenu]);

  return (
    <div
      data-active={thread.active ? "true" : undefined}
      className="group relative flex h-9 items-center gap-2 rounded-lg transition-colors hover:bg-muted data-active:bg-muted"
    >
      <button
        type="button"
        className="flex h-full min-w-0 flex-1 items-center truncate px-3 text-start text-sm"
      >
        {thread.title}
      </button>
      <div className="relative mr-2" ref={menuRef}>
        <button
          type="button"
          onClick={onToggleMenu}
          data-state={menuOpen ? "open" : undefined}
          className={`flex size-7 items-center justify-center rounded-md transition-opacity hover:bg-accent ${
            menuOpen
              ? "bg-accent opacity-100"
              : "opacity-0 group-hover:opacity-100 group-data-active:opacity-100"
          }`}
        >
          <MoreHorizontalIcon className="size-4 text-muted-foreground" />
        </button>
        {menuOpen && (
          <div className="absolute top-full right-0 z-50 mt-1 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-sm shadow-md">
            <button
              type="button"
              onClick={onCloseMenu}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
            >
              <ArchiveIcon className="size-4" />
              Archive
            </button>
            <button
              type="button"
              onClick={onCloseMenu}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-destructive hover:bg-destructive/10"
            >
              <TrashIcon className="size-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
