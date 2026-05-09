"use client";

import { type FC, type PropsWithChildren, useState } from "react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
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
        <ThreadPrimitive.Messages>
          {({ message }) => {
            if (message.role === "user") return <UserMessage />;
            return <AssistantMessage />;
          }}
        </ThreadPrimitive.Messages>

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
          <MessagePrimitive.Parts>
            {({ part }) => {
              if (part.type === "text") return <Text {...part} />;
              return null;
            }}
          </MessagePrimitive.Parts>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-(--thread-max-width) py-3">
      <div className="flex flex-col gap-2 px-2 leading-relaxed">
        <MessagePrimitive.GroupedParts
          groupBy={(part) => {
            if (part.type === "reasoning")
              return ["group-chainOfThought", "group-reasoning"];
            if (part.type === "tool-call")
              return ["group-chainOfThought", "group-tool"];
            return null;
          }}
        >
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <ChainOfThoughtGroup>{children}</ChainOfThoughtGroup>;
              case "group-reasoning":
                return <PartLayout label="Thinking">{children}</PartLayout>;
              case "group-tool":
                return (
                  <PartLayout label="Taking action">{children}</PartLayout>
                );
              case "text":
                return <MarkdownText />;
              case "reasoning":
                return <Reasoning {...part} />;
              case "tool-call":
                return <ToolCall {...part} />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
      </div>
    </MessagePrimitive.Root>
  );
};

const ChainOfThoughtGroup: FC<PropsWithChildren> = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-2 rounded-lg border">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 font-medium text-sm hover:bg-muted/50"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDownIcon className="size-4 shrink-0" />
        ) : (
          <ChevronRightIcon className="size-4 shrink-0" />
        )}
        Thinking
      </button>
      {open && children}
    </div>
  );
};

const PartLayout: FC<PropsWithChildren<{ label: string }>> = ({
  children,
  label,
}) => {
  const [open, setOpen] = useState(true);

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

const ToolCall: FC<{ toolName: string; status: { type: string } }> = ({
  toolName,
  status,
}) => {
  return (
    <div className="px-4 py-2 text-sm">
      {status.type === "running"
        ? `Running ${toolName}...`
        : status.type === "complete"
          ? `${toolName} completed`
          : status.type === "incomplete"
            ? `${toolName} failed`
            : `${toolName} requires action`}
    </div>
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
