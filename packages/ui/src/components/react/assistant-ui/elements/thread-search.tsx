"use client";

import { useEffect, useId, type ComponentProps } from "react";
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
  onActiveChange,
  onSelect,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "threads"
  | "query"
  | "activeId"
  | "onQueryChange"
  | "onActiveChange"
  | "onSelect"
> & {
  threads: readonly SearchableThread[];
  query: string;
  activeId: string;
  onQueryChange?: (query: string) => void;
  onActiveChange?: (id: string) => void;
  onSelect?: (id: string) => void;
}) {
  const listId = useId();
  const optionId = (id: string) => `${listId}-${id}`;
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
    if (next && onActiveChange) onActiveChange(next.id);
  };

  useEffect(() => {
    document
      .getElementById(optionId(activeId))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeId, listId]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const active = ordered.find((thread) => thread.id === activeId);
      if (active && onSelect) onSelect(active.id);
    }
  };

  const row = (thread: SearchableThread) => {
    const className = cn(
      "flex flex-col gap-0.5 rounded-xl px-2 py-1 text-start transition-colors",
      thread.id === activeId
        ? "bg-foreground/[0.05]"
        : onSelect
          ? "hover:bg-foreground/[0.03]"
          : undefined,
    );
    const content = (
      <>
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
      </>
    );

    return onSelect ? (
      <button
        key={thread.id}
        id={optionId(thread.id)}
        type="button"
        role="option"
        tabIndex={-1}
        aria-selected={thread.id === activeId}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onSelect(thread.id)}
        className={className}
      >
        {content}
      </button>
    ) : (
      <div
        key={thread.id}
        id={optionId(thread.id)}
        role="option"
        aria-selected={thread.id === activeId}
        className={className}
      >
        {content}
      </div>
    );
  };

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
          role="combobox"
          aria-expanded={ordered.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            ordered.some((thread) => thread.id === activeId)
              ? optionId(activeId)
              : undefined
          }
          className="text-foreground/85 placeholder:text-foreground/30 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        />
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label="Threads"
        className="flex flex-col gap-1.5"
      >
        {pinned.length > 0 && (
          <div role="group" aria-label="Pinned" className="flex flex-col">
            <span
              aria-hidden
              className={cn(mono, "text-foreground/25 px-2 pb-1")}
            >
              pinned
            </span>
            {pinned.map(row)}
          </div>
        )}

        {groups.map((group) => (
          <div
            key={group}
            role="group"
            aria-label={group}
            className="flex flex-col"
          >
            <span
              aria-hidden
              className={cn(mono, "text-foreground/25 px-2 pb-1")}
            >
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
    </div>
  );
}
