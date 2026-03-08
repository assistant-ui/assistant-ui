"use client";

import { type FC, type PropsWithChildren, useState } from "react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import {
  AuiIf,
  ChainOfThoughtPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SquareIcon,
} from "lucide-react";

export const MyThread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-col bg-background"
      style={{ ["--thread-max-width" as string]: "44rem" }}
    >
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-scroll scroll-smooth px-4 pt-8">
        <ThreadPrimitive.Messages
          components={{ UserMessage, AssistantMessage }}
        />

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 pb-4">
          <ThreadPrimitive.ScrollToBottom asChild>
            <TooltipIconButton
              tooltip="Scroll to bottom"
              variant="outline"
              className="absolute -top-12 self-center rounded-full p-4 disabled:invisible"
            >
              <ArrowDownIcon />
            </TooltipIconButton>
          </ThreadPrimitive.ScrollToBottom>
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const Text: FC<{ text: string }> = ({ text }) => {
  return <p>{text}</p>;
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-(--thread-max-width) py-3">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground">
          <MessagePrimitive.Parts components={{ Text }} />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-(--thread-max-width) py-3">
      <div className="flex flex-col gap-2 px-2 leading-relaxed">
        {/*
          The ChainOfThought component is passed to MessagePrimitive.Parts.
          When set, consecutive reasoning + tool-call parts are grouped together
          and rendered through this component instead of individually.
        */}
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            ChainOfThought,
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
};

/**
 * ChainOfThought component — rendered by MessagePrimitive.Parts when it
 * encounters consecutive reasoning + tool-call parts.
 *
 * Uses ChainOfThoughtPrimitive.Root, AccordionTrigger, and Parts to create
 * a collapsible accordion that groups all "thinking" steps together.
 */
const ChainOfThought: FC = () => {
  return (
    <ChainOfThoughtPrimitive.Root className="my-2 rounded-lg border">
      <ChainOfThoughtPrimitive.AccordionTrigger className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 font-medium text-sm hover:bg-muted/50">
        <AuiIf condition={(s) => s.chainOfThought.collapsed}>
          <ChevronRightIcon className="size-4 shrink-0" />
        </AuiIf>
        <AuiIf condition={(s) => !s.chainOfThought.collapsed}>
          <ChevronDownIcon className="size-4 shrink-0" />
        </AuiIf>
        Thinking
      </ChainOfThoughtPrimitive.AccordionTrigger>
      <AuiIf condition={(s) => !s.chainOfThought.collapsed}>
        <ChainOfThoughtPrimitive.Parts
          components={{
            Reasoning,
            tools: { Fallback: ToolFallback },
            Layout: PartLayout,
          }}
        />
      </AuiIf>
    </ChainOfThoughtPrimitive.Root>
  );
};

const PartLayout: FC<PropsWithChildren> = ({ children }) => {
  const partType = useAuiState((s) => s.part.type);
  const [open, setOpen] = useState(true);

  const label = partType === "reasoning" ? "Thinking" : "Taking action";

  return (
    <div className="border-t">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-1.5 text-muted-foreground text-xs hover:bg-muted/50"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDownIcon className="size-3" />
        ) : (
          <ChevronRightIcon className="size-3" />
        )}
        {label}
      </button>
      {open && children}
    </div>
  );
};

const Reasoning: FC<{ text: string }> = ({ text }) => {
  return (
    <p className="whitespace-pre-wrap px-4 py-2 text-muted-foreground text-sm italic">
      {text}
    </p>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="flex w-full flex-col rounded-2xl border border-input bg-background px-1 pt-2 outline-none transition-shadow has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20">
      <ComposerPrimitive.Input
        placeholder="Send a message..."
        className="mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none placeholder:text-muted-foreground"
        rows={1}
        autoFocus
      />
      <div className="relative mx-2 mb-2 flex items-center justify-end">
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip="Send"
              side="bottom"
              variant="default"
              size="icon"
              className="size-8 rounded-full"
            >
              <ArrowUpIcon className="size-4" />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel asChild>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="size-8 rounded-full"
            >
              <SquareIcon className="size-3 fill-current" />
            </Button>
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </ComposerPrimitive.Root>
  );
};
