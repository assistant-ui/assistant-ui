"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { ArrowUpIcon, CopyIcon, RefreshCwIcon, SquareIcon } from "lucide-react";

export function Thread() {
  return (
    <ThreadPrimitive.Root className="bg-background flex h-full flex-col">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 pt-6">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <p className="text-muted-foreground m-auto text-sm">
              Ask anything.
            </p>
          </AuiIf>
          <ThreadPrimitive.Messages>
            {() => <Message />}
          </ThreadPrimitive.Messages>
          <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto pb-4">
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function Message() {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="bg-muted max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-6 wrap-break-word">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-1.5">
      <div className="text-sm leading-6 wrap-break-word">
        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        className="text-muted-foreground -ms-1.5 flex gap-0.5"
      >
        <ActionBarPrimitive.Copy aria-label="Copy" className={iconButton}>
          <CopyIcon className="size-3.5" />
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload aria-label="Retry" className={iconButton}>
          <RefreshCwIcon className="size-3.5" />
        </ActionBarPrimitive.Reload>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function MarkdownText() {
  return (
    <MarkdownTextPrimitive className="[&_code]:bg-foreground/[0.06] [&_code]:rounded-sm [&_code]:px-1 [&_code]:font-mono [&_code]:text-[13px] [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:ps-5 [&_p+p]:mt-3" />
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="border-foreground/10 focus-within:border-foreground/25 bg-background flex items-end gap-2 rounded-2xl border p-2 transition-colors">
      <ComposerPrimitive.Input
        rows={1}
        placeholder="Message"
        aria-label="Message"
        className="placeholder:text-muted-foreground max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none"
      />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send aria-label="Send" className={roundButton}>
          <ArrowUpIcon className="size-4" />
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel aria-label="Stop" className={roundButton}>
          <SquareIcon className="size-3 fill-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
}

const iconButton =
  "hover:text-foreground hover:bg-foreground/5 flex size-7 items-center justify-center rounded-md transition-colors";

const roundButton =
  "bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-30";
