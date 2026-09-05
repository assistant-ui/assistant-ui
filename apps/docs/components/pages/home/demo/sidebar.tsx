"use client";

import { ThreadListPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
  ThreadListSearch,
  useThreadListGroups,
} from "@/components/assistant-ui/elements/thread-list.aui";
import { typeEyebrow } from "@/components/shared/type";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SidebarAccount } from "./account";
import { SidebarNavigationContext } from "./sidebar-context";
import { threadListItemComponents } from "./thread-list-item";

const sidebarLabelClass = cn(typeEyebrow, "mt-5 mb-1 px-2");

const SIDEBAR_SKELETON_WIDTHS = [
  "w-full",
  "w-4/5",
  "w-11/12",
  "w-3/5",
  "w-4/5",
];

export function Sidebar({
  onNavigate,
}: {
  onNavigate?: (() => void) | undefined;
}): ReactNode {
  const navigation = useMemo(() => ({ onNavigate }), [onNavigate]);
  const [search, setSearch] = useState("");
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);

  return (
    <SidebarNavigationContext.Provider value={navigation}>
      <ThreadListPrimitive.Root className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0">
          <ThreadListPrimitive.New asChild>
            <button
              type="button"
              onClick={onNavigate}
              title="New thread (⌘⇧O)"
              aria-keyshortcuts="Meta+Shift+O"
              className="border-foreground/10 bg-background hover:border-foreground/25 rounded-control flex h-8 w-full shrink-0 items-center gap-2 border px-2.5 text-[13px] transition-colors"
            >
              <PlusIcon className="size-3.5" />
              New thread
            </button>
          </ThreadListPrimitive.New>
          {hasThreads ? (
            <ThreadListSearch
              value={search}
              onValueChange={setSearch}
              className="border-foreground/10 bg-background h-8 text-[13px]"
            />
          ) : null}
        </div>
        <div className="-mx-3 min-h-0 flex-1 overflow-y-auto px-3">
          <ThreadList search={search} />
        </div>
        <SidebarAccount />
      </ThreadListPrimitive.Root>
    </SidebarNavigationContext.Provider>
  );
}

function ThreadList({ search }: { search: string }): ReactNode {
  const aui = useAui();
  const isLoading = useAuiState((s) => s.threads.isLoading);
  const hasLoadError = useAuiState((s) => s.threads.loadError !== undefined);
  const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
  const hasArchived = useAuiState(
    (s) => s.threads.archivedThreadIds.length > 0,
  );
  if (!isLoading && !hasLoadError && !hasThreads && !hasArchived) return null;

  const showLoadError =
    !isLoading && hasLoadError && !hasThreads && !hasArchived;

  return (
    <>
      {isLoading && !hasThreads ? (
        <div
          role="status"
          aria-label="Loading threads"
          className="mt-5 flex flex-col gap-0.5"
        >
          {SIDEBAR_SKELETON_WIDTHS.map((width, index) => (
            <div key={index} className="flex h-8 items-center px-2">
              <Skeleton className={cn("h-3.5", width)} />
            </div>
          ))}
        </div>
      ) : showLoadError ? (
        <div
          role="alert"
          className="mt-1 flex h-8 shrink-0 items-center justify-between px-2 text-[13px]"
        >
          <span className="text-muted-foreground">
            Threads could not be loaded
          </span>
          <button
            type="button"
            onClick={() => void aui.threads.reload()}
            className="text-muted-foreground hover:text-foreground rounded-control -me-2 h-8 px-2 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <ThreadGroups search={search} />
      )}
      <ThreadListPrimitive.LoadMore asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground rounded-control mt-1 flex h-8 shrink-0 items-center px-2 text-[13px] transition-colors disabled:hidden"
        >
          Load more
        </button>
      </ThreadListPrimitive.LoadMore>
      {hasArchived ? <ArchivedThreads /> : null}
    </>
  );
}

function ThreadGroups({ search }: { search: string }): ReactNode {
  const { threadIds, filteredIndices, groups } = useThreadListGroups(search);
  const threadItems = useAuiState((s) => s.threads.threadItems);

  const { pinned, sections } = useMemo(() => {
    const pinnedSet = new Set(
      threadItems
        .filter((item) => item.custom?.pinned === "true")
        .map((item) => item.id),
    );
    const isPinned = (index: number) => pinnedSet.has(threadIds[index]!);
    const pinned = (
      groups ? groups.flatMap((group) => group.indices) : filteredIndices
    ).filter(isPinned);
    const sections = (
      groups ?? [{ label: "Threads", indices: filteredIndices }]
    )
      .map((group) => ({
        label: group.label,
        indices: group.indices.filter((index) => !isPinned(index)),
      }))
      .filter((group) => group.indices.length > 0);
    return { pinned, sections };
  }, [filteredIndices, groups, threadIds, threadItems]);

  if (search.trim() && filteredIndices.length === 0) {
    return (
      <p className="text-muted-foreground mt-5 px-2 text-[13px]">
        No threads found
      </p>
    );
  }

  return (
    <>
      {pinned.length > 0 ? (
        <ThreadSection label="Pinned" indices={pinned} threadIds={threadIds} />
      ) : null}
      {sections.map((section) => (
        <ThreadSection
          key={section.label}
          label={section.label}
          indices={section.indices}
          threadIds={threadIds}
        />
      ))}
    </>
  );
}

function ThreadSection({
  label,
  indices,
  threadIds,
}: {
  label: string;
  indices: readonly number[];
  threadIds: readonly string[];
}): ReactNode {
  return (
    <Fragment>
      <p className={sidebarLabelClass}>{label}</p>
      <div className="flex flex-col gap-0.5">
        {indices.map((index) => (
          <ThreadListPrimitive.ItemByIndex
            key={threadIds[index]}
            index={index}
            components={threadListItemComponents}
          />
        ))}
      </div>
    </Fragment>
  );
}

function ArchivedThreads(): ReactNode {
  const [open, setOpen] = useState(false);
  const count = useAuiState((s) => s.threads.archivedThreadIds.length);

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={cn(
          sidebarLabelClass,
          "hover:text-foreground mt-0 flex w-full items-center gap-1 transition-colors",
        )}
      >
        <ChevronDownIcon
          className={cn("size-3 transition-transform", !open && "-rotate-90")}
        />
        Archived ({count})
      </button>
      {open ? (
        <div className="flex flex-col gap-0.5">
          <ThreadListPrimitive.Items
            archived
            components={threadListItemComponents}
          />
        </div>
      ) : null}
    </div>
  );
}
