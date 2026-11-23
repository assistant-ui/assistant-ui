"use client";

import {
  AuiIf,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { Icon, IconButton, icons, menuRowClass, radius, text } from "./ui";

const highlight =
  "hover:bg-accent data-active:bg-accent transition-colors motion-reduce:transition-none";

/**
 * The chats of this visit, newest first: open one, start one, delete one.
 * `onPick` runs just before a chat is opened or started, so a popover can
 * close and the chat being left can be put in order.
 */
export function ThreadList({ onPick }: { onPick: () => void }) {
  const newChat = useRef<HTMLButtonElement>(null);

  return (
    <ThreadListPrimitive.Root className="flex max-h-72 w-64 max-w-[calc(100vw-2rem)] flex-col gap-px overflow-y-auto overscroll-contain p-1">
      <ThreadListPrimitive.New
        ref={newChat}
        onClick={onPick}
        className={cn(
          menuRowClass,
          highlight,
          "focus-visible:bg-accent cursor-pointer",
        )}
      >
        <Icon {...icons.add} />
        New chat
      </ThreadListPrimitive.New>
      <AuiIf condition={(s) => s.threads.threadIds.length === 0}>
        <p className={cn("text-muted-foreground px-2 py-1.5", text.bodySm)}>
          Chats from this visit are listed here.
        </p>
      </AuiIf>
      <ThreadListPrimitive.Items>
        {() => (
          <ThreadListItemPrimitive.Root
            className={cn(
              radius.sm,
              highlight,
              "group has-[:focus-visible]:bg-accent relative flex shrink-0 items-center",
            )}
          >
            <ThreadListItemPrimitive.Trigger
              onClick={onPick}
              className={cn(menuRowClass, "min-w-0 flex-1 cursor-pointer pe-8")}
            >
              <span className="truncate">
                <ThreadListItemPrimitive.Title fallback="New chat" />
              </span>
            </ThreadListItemPrimitive.Trigger>
            <DeleteChat newChat={newChat} />
          </ThreadListItemPrimitive.Root>
        )}
      </ThreadListPrimitive.Items>
    </ThreadListPrimitive.Root>
  );
}

function DeleteChat({
  newChat,
}: {
  newChat: RefObject<HTMLButtonElement | null>;
}) {
  const title = useAuiState((s) => s.threadListItem.title) || "New chat";

  return (
    /* The row goes with its chat, so focus moves on before it does. */
    <ThreadListItemPrimitive.Delete
      asChild
      onClick={() => newChat.current?.focus()}
    >
      <IconButton
        label={`Delete “${title}”`}
        icon={icons.delete}
        side="top"
        className="hover:text-destructive absolute end-0.5 size-6 opacity-0 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 pointer-coarse:size-8 pointer-coarse:opacity-100"
      />
    </ThreadListItemPrimitive.Delete>
  );
}
