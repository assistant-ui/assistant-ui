"use client";

import type { ComponentProps } from "react";
import { PinIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export interface SearchableThread {
  id: string;
  title: string;
  group: string;
  preview: string;
  pinned?: boolean;
}

export function ThreadSearch({
  threads,
  query,
  activeId,
  onQueryChange,
  onSelect,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "threads" | "query" | "activeId" | "onQueryChange" | "onSelect"
> & {
  threads: readonly SearchableThread[];
  query: string;
  activeId: string;
  onQueryChange?: (query: string) => void;
  onSelect?: (id: string) => void;
}) {
  const matches = threads.filter((thread) =>
    `${thread.title} ${thread.preview}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const pinned = matches.filter((thread) => thread.pinned);
  const groups = [
    ...new Set(matches.filter((t) => !t.pinned).map((t) => t.group)),
  ];

  const ordered = [
    ...pinned,
    ...groups.flatMap((group) =>
      matches.filter((thread) => !thread.pinned && thread.group === group),
    ),
  ];

  const move = (delta: number) => {
    if (ordered.length === 0) return;
    const at = ordered.findIndex((thread) => thread.id === activeId);
    // activeId can be filtered out by the query; start from the edge the key implies
    const from = at === -1 ? (delta > 0 ? -1 : 0) : at;
    const next = ordered[(from + delta + ordered.length) % ordered.length];
    if (next) onSelect?.(next.id);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    }
  };

  const row = (thread: SearchableThread) => (
    <button
      key={thread.id}
      type="button"
      onClick={() => onSelect?.(thread.id)}
      className={cn(
        "flex flex-col gap-0.5 rounded-xl px-2 py-1 text-start transition-colors",
        thread.id === activeId
          ? "bg-foreground/[0.05]"
          : "hover:bg-foreground/[0.03]",
      )}
    >
      <span className="flex items-center gap-1.5">
        {thread.pinned && (
          <PinIcon className="text-foreground/30 size-2.5 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate text-[13px]">
          {thread.title}
        </span>
      </span>
      <span className="text-foreground/35 truncate text-xs">
        {thread.preview}
      </span>
    </button>
  );

  return (
    <div
      data-slot="thread-search"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-1.5 rounded-2xl p-3",
        className,
      )}

      {...props}
    >
      <div
        className={cn(
          field,
          "flex items-center gap-2 rounded-xl px-2.5 py-1.5",
        )}
      >
        <SearchIcon className="text-foreground/30 size-3.5 shrink-0" />
        <input
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search threads"
          aria-label="Search threads"
          className="text-foreground/85 placeholder:text-foreground/30 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        />
      </div>

      {pinned.length > 0 && (
        <div className="flex flex-col">
          <span className={cn(mono, "text-foreground/25 px-2 pb-1")}>
            pinned
          </span>
          {pinned.map(row)}
        </div>
      )}

      {groups.map((group) => (
        <div key={group} className="flex flex-col">
          <span className={cn(mono, "text-foreground/25 px-2 pb-1")}>
            {group}
          </span>
          {matches
            .filter((thread) => !thread.pinned && thread.group === group)
            .map(row)}
        </div>
      ))}

      {matches.length === 0 && (
        <span className="text-foreground/30 px-2 py-4 text-center text-xs">
          No thread matches “{query}”
        </span>
      )}
    </div>
  );
}
