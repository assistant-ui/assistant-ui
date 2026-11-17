"use client";

import {
  AuiIf,
  ComposerPrimitive,
  unstable_useSlashCommandAdapter,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  CornerDownLeftIcon,
  MicIcon,
  SquareIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ComposerVoice } from "@/components/assistant-ui/elements/composer";
import { ComposerTriggerPopover } from "@/components/assistant-ui/elements/composer-trigger-popover.aui";
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
import { cn } from "@/lib/utils";

const iconButton = "text-muted-foreground size-8 shrink-0 [&_svg]:size-4";

function useModelOptions() {
  const keys = useApiKeys();
  const serverProviders = useServerProviders();

  return useMemo(() => {
    const options: ModelOption[] = MODELS.map((model) => {
      const available =
        !!keys[model.provider] || !!serverProviders?.includes(model.provider);
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

function ModelPicker() {
  const { options, firstAvailable, known } = useModelOptions();
  const [chosen, setChosen] = useState<string>();
  const chosenIsAvailable = options.some(
    (option) => option.id === chosen && !option.disabled,
  );
  const model = chosenIsAvailable ? chosen : firstAvailable;

  if (!model) {
    return known ? (
      <p className="text-muted-foreground px-2 text-xs">
        Add a model key with the key button.
      </p>
    ) : null;
  }
  return (
    <ModelSelector
      models={options}
      value={model}
      onValueChange={setChosen}
      variant="ghost"
      size="sm"
      className="text-muted-foreground min-w-0"
    />
  );
}

function ComposerField() {
  const { chatFocusRequest, chatFocusHandled } = useWorkspace();
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (chatFocusRequest === chatFocusHandled.current) return;
    chatFocusHandled.current = chatFocusRequest;
    input.current?.focus();
  }, [chatFocusRequest, chatFocusHandled]);

  return (
    <ComposerPrimitive.Input
      ref={input}
      rows={1}
      placeholder="Ask, or type / for suggestions"
      aria-label="Message the assistant"
      enterKeyHint="send"
      unstable_focusOnRunStart={false}
      unstable_focusOnScrollToBottom={false}
      unstable_focusOnThreadSwitched={false}
      className="placeholder:text-muted-foreground/70 max-h-40 min-h-6 w-full resize-none bg-transparent text-sm leading-6 outline-none"
    />
  );
}

function SendButton() {
  return (
    <>
      <AuiIf condition={(s) => !s.composer.canCancel}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            side="top"
            variant="default"
            className="size-8 shrink-0 rounded-full [&_svg]:size-4"
          >
            <ArrowUpIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.composer.canCancel}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            size="icon"
            className="size-8 shrink-0 rounded-full"
            aria-label="Stop"
          >
            <SquareIcon className="size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </>
  );
}

/** The waveform and timer shown in place of the model picker while listening. */
function DictationWave() {
  const recording = useAuiState(
    (s) => s.composer.dictation?.status.type !== "ended",
  );
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ComposerVoice
      recording={recording}
      seconds={seconds}
      className="min-h-8 ps-2"
    />
  );
}

/**
 * Starts and stops voice input. The words land in the composer as they are
 * recognized. Nothing renders where the browser cannot recognize speech.
 */
function DictationControl() {
  return (
    <AuiIf condition={(s) => s.thread.capabilities.dictation}>
      <AuiIf condition={(s) => s.composer.dictation == null}>
        <ComposerPrimitive.Dictate asChild>
          <TooltipIconButton
            tooltip="Dictate"
            side="top"
            className={iconButton}
          >
            <MicIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Dictate>
      </AuiIf>
      <AuiIf condition={(s) => s.composer.dictation != null}>
        <ComposerPrimitive.StopDictation asChild>
          <TooltipIconButton
            tooltip="Stop dictation"
            side="top"
            className={cn(
              iconButton,
              "text-destructive hover:text-destructive",
            )}
          >
            <SquareIcon className="size-3! animate-pulse fill-current motion-reduce:animate-none" />
          </TooltipIconButton>
        </ComposerPrimitive.StopDictation>
      </AuiIf>
    </AuiIf>
  );
}

/**
 * The thread's suggestions, offered as slash commands: typing `/` in the
 * composer lists them, and choosing one sends its prompt.
 */
function SuggestionCommands() {
  const aui = useAui();
  const suggestions = useAuiState((s) => s.suggestions.suggestions);

  const commands = useMemo(
    () =>
      suggestions.map((suggestion, index) => ({
        id: `suggestion-${index}`,
        label: `${suggestion.title} ${suggestion.label}`.trim(),
        execute: () => {
          const composer = aui.thread.composer();
          const { quote } = composer.getState();
          aui.thread.append({
            role: "user",
            content: [{ type: "text", text: suggestion.prompt }],
            ...(quote && { metadata: { custom: { quote } } }),
          });
          if (quote) composer.setQuote(undefined);
        },
      })),
    [aui, suggestions],
  );
  const slash = unstable_useSlashCommandAdapter({
    commands,
    removeOnExecute: true,
    fallbackIcon: CornerDownLeftIcon,
  });

  return (
    <ComposerTriggerPopover
      char="/"
      {...slash}
      emptyItemsLabel="No matching suggestion"
      className="ring-foreground/10 inset-x-0 w-auto rounded-[10px] border-0 shadow-lg ring-1"
    />
  );
}

export function ChatComposer() {
  return (
    <ComposerPrimitive.TriggerPopoverRoot>
      <ComposerPrimitive.Root className="bg-background ring-foreground/10 focus-within:ring-foreground/25 dark:bg-input/30 relative flex flex-col rounded-2xl shadow-xs ring-1 transition-shadow">
        <ComposerQuotePreview className="mx-2 mt-2" />
        <div className="px-3.5 pt-3 pb-1">
          <ComposerField />
        </div>
        <div className="flex min-h-11 items-center gap-0.5 p-1.5">
          <AuiIf condition={(s) => s.composer.dictation == null}>
            <ModelPicker />
          </AuiIf>
          <AuiIf condition={(s) => s.composer.dictation != null}>
            <DictationWave />
          </AuiIf>
          <div className="ms-auto flex shrink-0 items-center gap-0.5">
            <DictationControl />
            <SendButton />
          </div>
        </div>
        <SuggestionCommands />
      </ComposerPrimitive.Root>
    </ComposerPrimitive.TriggerPopoverRoot>
  );
}
