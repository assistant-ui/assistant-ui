"use client";

import {
  AuiIf,
  ThreadPrimitive,
  useAui,
  useAuiEvent,
  useAuiState,
} from "@assistant-ui/react";
import { MessagesSquareIcon, SquarePenIcon } from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatComposer } from "./chat-composer";
import { ChatMessage } from "./messages";

/** New chat, and the chats from earlier in this visit. */
export function ChatsMenu() {
  const aui = useAui();
  const chats = useAuiState((s) => s.threads.threadItems);
  const current = useAuiState((s) => s.threads.mainThreadId);
  const isEmpty = useAuiState((s) => s.thread.isEmpty);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const recent = chats.filter((chat) => chat.status === "regular");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <TooltipIconButton
            tooltip="Chats"
            side="bottom"
            className="text-muted-foreground size-7 [&_svg]:size-4"
          />
        }
      >
        <MessagesSquareIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          disabled={isEmpty || isRunning}
          onClick={() => aui.threads.switchToNewThread()}
        >
          <SquarePenIcon />
          New chat
        </DropdownMenuItem>
        {recent.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={current}
              onValueChange={(id) => aui.threads.switchToThread(id as string)}
            >
              <DropdownMenuLabel>Chats</DropdownMenuLabel>
              {recent.map((chat) => (
                <DropdownMenuRadioItem
                  key={chat.id}
                  value={chat.id}
                  disabled={isRunning}
                >
                  <span className="truncate">
                    {chat.title || "Untitled chat"}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const titleOf = (text: string) =>
  text.length > 60 ? `${text.slice(0, 57).trimEnd()}...` : text;

/**
 * The chats live in memory and nothing names them, so a chat takes its title
 * from its first message once that message has been answered. This is mounted
 * with the page and not with the chat panel, which can be closed during a run.
 */
export function ChatTitles() {
  const aui = useAui();

  useAuiEvent("thread.runEnd", () => {
    const chat = aui.threads.item("main");
    if (chat.getState().title) return;
    const first = aui.thread
      .getState()
      .messages.find((message) => message.role === "user");
    const text = first?.content.find((part) => part.type === "text")?.text;
    if (text) chat.rename(titleOf(text));
  });

  return null;
}

export function ChatPanel() {
  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Ask the assistant to write, rewrite or review the document. Type /
            for suggestions, or highlight some text and choose Ask AI.
          </p>
        </AuiIf>
        <ThreadPrimitive.Messages>
          {() => <ChatMessage />}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>
      <div className="shrink-0 px-3 pb-3">
        <ChatComposer />
      </div>
    </ThreadPrimitive.Root>
  );
}
