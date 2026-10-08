"use client";

import {
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  TrashIcon,
} from "lucide-react";
import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ThreadRenameInput } from "./thread-rename-input";
import { cn } from "@/lib/utils";
import { SidebarNavigationContext } from "./sidebar-context";
import { menuContentClass, menuItemClass } from "./styles";

function ThreadListItem(): ReactNode {
  const { onNavigate } = useContext(SidebarNavigationContext);
  const [isRenaming, setIsRenaming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (isRenaming || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    triggerRef.current?.focus();
  }, [isRenaming]);

  return (
    <ThreadListItemPrimitive.Root className="group data-active:bg-foreground/[0.06] hover:bg-foreground/[0.04] has-data-[state=open]:bg-foreground/[0.04] rounded-control relative flex min-h-8 shrink-0 items-center transition-colors">
      {isRenaming ? (
        <ThreadListItemRename
          onDone={(restoreFocus) => {
            restoreFocusRef.current = restoreFocus;
            setIsRenaming(false);
          }}
        />
      ) : (
        <ThreadListItemPrimitive.Trigger
          ref={triggerRef}
          onClick={onNavigate}
          className="text-muted-foreground group-data-active:text-foreground hover:text-foreground flex h-8 min-w-0 flex-1 items-center px-2 text-left text-[13px] transition-colors outline-none group-hover:pe-8 group-has-focus-visible:pe-8 group-has-data-[state=open]:pe-8 group-data-active:pe-8"
        >
          <span className="min-w-0 truncate">
            <ThreadListItemPrimitive.Title fallback="New chat" />
          </span>
        </ThreadListItemPrimitive.Trigger>
      )}
      {!isRenaming ? (
        <ThreadListItemMenu onRename={() => setIsRenaming(true)} />
      ) : null}
    </ThreadListItemPrimitive.Root>
  );
}

export const threadListItemComponents = { ThreadListItem };

function ThreadListItemRename({
  onDone,
}: {
  onDone: (restoreFocus: boolean) => void;
}): ReactNode {
  const aui = useAui();
  const title = useAuiState((s) => s.threadListItem.title) ?? "";
  return (
    <ThreadRenameInput
      title={title}
      onRename={(next) => aui.threadListItem.rename(next)}
      onDone={onDone}
    />
  );
}

function ThreadListItemMenu({ onRename }: { onRename: () => void }): ReactNode {
  const aui = useAui();
  const archived = useAuiState((s) => s.threadListItem.status === "archived");
  const pinned = useAuiState((s) => s.threadListItem.custom?.pinned === "true");

  // Cloud thread metadata only stores string values.
  const togglePinned = () => {
    const { pinned: _pinned, ...custom } =
      aui.threadListItem.getState().custom ?? {};
    aui.threadListItem.updateCustom(
      pinned ? custom : { ...custom, pinned: "true" },
    );
  };

  return (
    <ThreadListItemMorePrimitive.Root sharedFocusGroup>
      <ThreadListItemMorePrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Thread actions"
          className="text-muted-foreground hover:text-foreground absolute end-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-sm opacity-0 transition-colors group-hover:opacity-100 group-has-focus-visible:opacity-100 group-data-active:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontalIcon className="size-3.5" />
        </button>
      </ThreadListItemMorePrimitive.Trigger>
      <ThreadListItemMorePrimitive.Content
        side="right"
        align="start"
        sideOffset={6}
        className={menuContentClass}
      >
        {archived ? (
          <ThreadListItemPrimitive.Unarchive asChild>
            <ThreadListItemMorePrimitive.Item className={menuItemClass}>
              <ArchiveRestoreIcon className="size-3.5" />
              Unarchive
            </ThreadListItemMorePrimitive.Item>
          </ThreadListItemPrimitive.Unarchive>
        ) : (
          <>
            <ThreadListItemMorePrimitive.Item
              className={menuItemClass}
              onSelect={onRename}
            >
              <PencilIcon className="size-3.5" />
              Rename
            </ThreadListItemMorePrimitive.Item>
            <ThreadListItemMorePrimitive.Item
              className={menuItemClass}
              onSelect={togglePinned}
            >
              {pinned ? (
                <PinOffIcon className="size-3.5" />
              ) : (
                <PinIcon className="size-3.5" />
              )}
              {pinned ? "Unpin" : "Pin"}
            </ThreadListItemMorePrimitive.Item>
            <ThreadListItemPrimitive.Archive asChild>
              <ThreadListItemMorePrimitive.Item className={menuItemClass}>
                <ArchiveIcon className="size-3.5" />
                Archive
              </ThreadListItemMorePrimitive.Item>
            </ThreadListItemPrimitive.Archive>
          </>
        )}
        <ThreadListItemPrimitive.Delete asChild>
          <ThreadListItemMorePrimitive.Item
            className={cn(
              menuItemClass,
              "text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive",
            )}
          >
            <TrashIcon className="size-3.5" />
            Delete
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Delete>
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
}
