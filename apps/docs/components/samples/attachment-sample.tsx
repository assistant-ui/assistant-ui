"use client";
import {
  ComposerAddAttachment,
  ComposerAttachments,
} from "../assistant-ui/attachment";
import { ComposerPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { SampleFrame } from "./sample-frame";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { FC } from "react";
import { ArrowDownIcon, ArrowUpIcon, Square } from "lucide-react";

export const AttachmentSample = () => {
  return (
    <SampleFrame
      sampleText="Sample Attachment"
      className="h-min [&_.aui-thread-viewport]:pt-5"
    >
      <Thread />
    </SampleFrame>
  );
};

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container bg-background flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "44rem",
      }}
    >
      <ThreadPrimitive.Viewport className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll px-4">
        <div className="aui-composer-wrapper bg-background sticky bottom-0 mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 overflow-visible rounded-t-3xl pb-4 md:pb-6">
          <ThreadScrollToBottom />
          <Composer />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root border-border bg-muted dark:border-muted-foreground/15 relative flex w-full flex-col rounded-3xl border px-1 pt-2 shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),0_2px_5px_0px_rgba(0,0,0,0.06)]">
      <ComposerAttachments />
      <ComposerPrimitive.Input
        placeholder="Send a message..."
        className="aui-composer-input placeholder:text-muted-foreground focus:outline-primary mb-1 max-h-32 min-h-16 w-full resize-none bg-transparent px-3.5 pb-3 pt-1.5 text-base outline-none"
        rows={1}
        autoFocus
        aria-label="Message input"
      />
      <ComposerAction />
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  return (
    <div className="aui-composer-action-wrapper relative mx-1 mb-2 mt-2 flex items-center justify-between">
      <ComposerAddAttachment />
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            type="submit"
            variant="default"
            size="icon"
            className="aui-composer-send size-[34px] rounded-full p-1"
            aria-label="Send message"
          >
            <ArrowUpIcon className="aui-composer-send-icon size-5" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-cancel border-muted-foreground/60 hover:bg-primary/75 dark:border-muted-foreground/90 size-[34px] rounded-full border"
            aria-label="Stop generating"
          >
            <Square className="aui-composer-cancel-icon size-3.5 fill-white dark:fill-black" />
          </Button>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </div>
  );
};
