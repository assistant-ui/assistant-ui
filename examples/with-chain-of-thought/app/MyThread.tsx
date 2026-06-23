"use client";

import { type FC, type PropsWithChildren } from "react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { Sources } from "@/components/assistant-ui/sources";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/reasoning";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/tool-group";
import {
  ComposerPrimitive,
  groupPartByType,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useThread,
} from "@assistant-ui/react";
import { ArrowDownIcon, ArrowUpIcon, SquareIcon } from "lucide-react";

export const MyThread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="bg-background flex h-full flex-col"
      style={{ ["--thread-max-width" as string]: "44rem" }}
    >
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-scroll scroll-smooth px-4 pt-8">
        <ThreadPrimitive.Empty>
          <ThreadWelcome />
        </ThreadPrimitive.Empty>

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

const ThreadWelcome: FC = () => {
  return (
    <div className="mx-auto flex w-full max-w-(--thread-max-width) grow flex-col justify-center gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          What should we think through?
        </h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <ThreadPrimitive.Suggestions>
          {() => <ThreadSuggestionItem />}
        </ThreadPrimitive.Suggestions>
      </div>
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <SuggestionPrimitive.Trigger send asChild>
      <Button
        type="button"
        variant="ghost"
        className="bg-background hover:bg-muted h-auto w-full flex-col items-start justify-start gap-1 rounded-2xl border px-4 py-3 text-start text-sm sm:w-[calc(50%-0.25rem)]"
      >
        <SuggestionPrimitive.Title className="font-medium" />
        <SuggestionPrimitive.Description className="text-muted-foreground empty:hidden" />
      </Button>
    </SuggestionPrimitive.Trigger>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-(--thread-max-width) py-3">
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl px-4 py-2">
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
          groupBy={groupPartByType({
            reasoning: ["group-chainOfThought", "group-reasoning"],
            "tool-call": ["group-chainOfThought", "group-tool"],
            "standalone-tool-call": [],
            source: ["group-sources"],
          })}
        >
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <div data-slot="aui_chain-of-thought">{children}</div>;
              case "group-tool":
                return (
                  <ToolGroupRoot variant="ghost">
                    <ToolGroupTrigger
                      count={part.indices.length}
                      active={part.status.type === "running"}
                    />
                    <ToolGroupContent>{children}</ToolGroupContent>
                  </ToolGroupRoot>
                );
              case "group-reasoning": {
                const running = part.status.type === "running";
                return (
                  <ReasoningRoot streaming={running}>
                    <ReasoningTrigger active={running} />
                    <ReasoningContent aria-busy={running}>
                      <ReasoningText>{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case "group-sources":
                return <SourcesLayout>{children}</SourcesLayout>;
              case "text":
                return <MarkdownText />;
              case "reasoning":
                return <Reasoning {...part} />;
              case "tool-call":
                return part.toolUI ?? <ToolFallback {...part} />;
              case "source":
                return <Sources {...part} />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
      </div>
    </MessagePrimitive.Root>
  );
};

const SourcesLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground mr-1 text-xs">Sources</span>
      {children}
    </div>
  );
};

const Composer: FC = () => {
  const isRunning = useThread((state) => state.isRunning);

  return (
    <ComposerPrimitive.Root className="border-input bg-background has-[textarea:focus-visible]:border-foreground/60 flex w-full flex-col rounded-2xl border px-1 pt-2 transition-colors outline-none">
      <ComposerPrimitive.Input
        placeholder="Send a message..."
        className="placeholder:text-muted-foreground mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none"
        rows={1}
        autoFocus
      />
      <div className="relative mx-2 mb-2 flex items-center justify-end">
        {!isRunning ? (
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
        ) : (
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
        )}
      </div>
    </ComposerPrimitive.Root>
  );
};
