"use client";

import {
  AuiIf,
  ComposerPrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiEvent,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SquareIcon,
  SquarePenIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  ModelSelector,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector.aui";
import { ComposerQuotePreview } from "@/components/assistant-ui/elements/quote.aui";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/workspace-context";
import { useApiKeys, useServerProviders } from "@/lib/api-keys";
import { findProvider, MODELS } from "@/lib/models";
import { ChatMessage } from "./messages";

function useModelOptions() {
  const keys = useApiKeys();
  const serverProviders = useServerProviders();

  return useMemo(() => {
    const options: ModelOption[] = MODELS.map((model) => {
      const available =
        !!keys[model.provider] ||
        serverProviders === undefined ||
        serverProviders.includes(model.provider);
      return {
        id: model.id,
        name: model.name,
        ...(!available && {
          disabled: true,
          description: `No ${findProvider(model.provider).name} key yet`,
        }),
      };
    });
    return {
      options,
      firstAvailable: options.find((option) => !option.disabled)?.id,
      known: serverProviders !== undefined,
    };
  }, [keys, serverProviders]);
}

function Composer() {
  const { options, firstAvailable, known } = useModelOptions();
  const [chosen, setChosen] = useState<string>();
  const chosenIsAvailable = options.some(
    (option) => option.id === chosen && !option.disabled,
  );
  const model = chosenIsAvailable ? chosen : firstAvailable;

  return (
    <ComposerPrimitive.Root className="flex flex-col">
      <ComposerQuotePreview />
      <ComposerPrimitive.Input
        rows={1}
        placeholder="Ask for a change to this document"
        aria-label="Message the assistant"
        enterKeyHint="send"
        unstable_focusOnRunStart={false}
        unstable_focusOnScrollToBottom={false}
        unstable_focusOnThreadSwitched={false}
        className="placeholder:text-muted-foreground/70 max-h-40 min-h-10 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm leading-6 outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        {model ? (
          <ModelSelector
            models={options}
            value={model}
            onValueChange={setChosen}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          />
        ) : (
          <p className="text-muted-foreground px-2 text-xs">
            {known
              ? "No model key is set. Add one with the key button at the top."
              : ""}
          </p>
        )}
        <AuiIf condition={(s) => !s.composer.canCancel}>
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip="Send"
              side="top"
              variant="default"
              className="size-7 rounded-full [&_svg]:size-4"
            >
              <ArrowUpIcon />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.composer.canCancel}>
          <ComposerPrimitive.Cancel asChild>
            <Button
              size="icon"
              className="size-7 rounded-full"
              aria-label="Stop"
            >
              <SquareIcon className="size-3 fill-current" />
            </Button>
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </ComposerPrimitive.Root>
  );
}

function Suggestions() {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-3">
      <ThreadPrimitive.Suggestions>
        {() => (
          <SuggestionPrimitive.Trigger send asChild>
            <Button variant="outline" size="sm" className="gap-1 font-normal">
              <SuggestionPrimitive.Title />
              <SuggestionPrimitive.Description />
            </Button>
          </SuggestionPrimitive.Trigger>
        )}
      </ThreadPrimitive.Suggestions>
    </div>
  );
}

export function ChatDock() {
  const aui = useAui();
  const { chatOpen, setChatOpen } = useWorkspace();
  const messageCount = useAuiState((s) => s.thread.messages.length);
  const isRunning = useAuiState((s) => s.thread.isRunning);

  useAuiEvent("thread.runStart", () => setChatOpen(true));

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4">
      <ThreadPrimitive.Root className="bg-background ring-foreground/10 pointer-events-auto flex w-full max-w-2xl flex-col rounded-2xl shadow-lg ring-1">
        {messageCount > 0 && (
          <div className="border-foreground/10 flex items-center justify-between border-b py-1 ps-2 pe-1.5">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={chatOpen}
              onClick={() => setChatOpen(!chatOpen)}
              className="text-muted-foreground font-normal"
            >
              {chatOpen ? <ChevronDownIcon /> : <ChevronUpIcon />}
              {chatOpen ? "Hide chat" : `Show chat (${messageCount})`}
            </Button>
            <TooltipIconButton
              tooltip="New chat"
              side="top"
              disabled={isRunning}
              onClick={() => aui.threads.switchToNewThread()}
              className="text-muted-foreground size-7 [&_svg]:size-4"
            >
              <SquarePenIcon />
            </TooltipIconButton>
          </div>
        )}
        {chatOpen && messageCount > 0 && (
          <ThreadPrimitive.Viewport className="flex max-h-[38vh] flex-col gap-4 overflow-y-auto px-4 py-3">
            <ThreadPrimitive.Messages>
              {() => <ChatMessage />}
            </ThreadPrimitive.Messages>
          </ThreadPrimitive.Viewport>
        )}
        <AuiIf condition={(s) => s.thread.isEmpty && s.composer.isEmpty}>
          <Suggestions />
        </AuiIf>
        <Composer />
      </ThreadPrimitive.Root>
    </div>
  );
}
