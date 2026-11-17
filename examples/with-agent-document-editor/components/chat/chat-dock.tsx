"use client";

import {
  AuiIf,
  ComposerPrimitive,
  ThreadPrimitive,
  unstable_useSlashCommandAdapter,
  useAui,
  useAuiEvent,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  CornerDownLeftIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  PanelBottomCloseIcon,
  SquareIcon,
  SquarePenIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ComposerTriggerPopover } from "@/components/assistant-ui/elements/composer-trigger-popover.aui";
import {
  ModelSelector,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector.aui";
import { ComposerQuotePreview } from "@/components/assistant-ui/elements/quote.aui";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
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
import { useWorkspace } from "@/components/workspace-context";
import { useApiKeys, useServerProviders } from "@/lib/api-keys";
import { findProvider, MODELS } from "@/lib/models";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./messages";

const dockPosition =
  "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4";

const floatingSurface =
  "bg-background ring-foreground/10 dark:bg-popover pointer-events-auto shadow-lg ring-1";

const iconButton = "text-muted-foreground size-8 shrink-0 [&_svg]:size-4";

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

function ModelPicker({ className }: { className?: string }) {
  const { options, firstAvailable, known } = useModelOptions();
  const [chosen, setChosen] = useState<string>();
  const chosenIsAvailable = options.some(
    (option) => option.id === chosen && !option.disabled,
  );
  const model = chosenIsAvailable ? chosen : firstAvailable;

  if (!model) {
    return known ? (
      <p className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}>
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
      className={cn("text-muted-foreground", className)}
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
      placeholder="Ask for a change, or type / for suggestions"
      aria-label="Message the assistant"
      enterKeyHint="send"
      unstable_focusOnRunStart={false}
      unstable_focusOnScrollToBottom={false}
      unstable_focusOnThreadSwitched={false}
      className="placeholder:text-muted-foreground/70 max-h-40 min-h-8 w-full resize-none bg-transparent py-1 text-sm leading-6 outline-none"
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
      className="ring-foreground/10 start-2 w-80 rounded-[10px] border-0 shadow-lg ring-1"
    />
  );
}

/** New chat, and the chats from earlier in this visit. */
function ChatsMenu() {
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
            side="top"
            className={iconButton}
          />
        }
      >
        <MessagesSquareIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-64">
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

function ChatMessages() {
  const hasMessages = useAuiState((s) => s.thread.messages.length > 0);
  if (!hasMessages) return null;

  return (
    <ThreadPrimitive.Viewport
      className={cn(
        floatingSurface,
        "flex max-h-[38vh] flex-col gap-4 overflow-y-auto rounded-2xl px-4 py-3",
      )}
    >
      <ThreadPrimitive.Messages>
        {() => <ChatMessage />}
      </ThreadPrimitive.Messages>
    </ThreadPrimitive.Viewport>
  );
}

const titleOf = (text: string) =>
  text.length > 60 ? `${text.slice(0, 57).trimEnd()}...` : text;

export function ChatDock() {
  const aui = useAui();
  const { chatOpen, setChatOpen, openChat } = useWorkspace();
  const messageCount = useAuiState((s) => s.thread.messages.length);

  useAuiEvent("thread.runStart", () => setChatOpen(true));

  // The chats live in memory and nothing names them, so a chat takes its
  // title from its first message once that message has been answered.
  useAuiEvent("thread.runEnd", () => {
    const chat = aui.threads.item("main");
    if (chat.getState().title) return;
    const first = aui.thread
      .getState()
      .messages.find((message) => message.role === "user");
    const text = first?.content.find((part) => part.type === "text")?.text;
    if (text) chat.rename(titleOf(text));
  });

  if (!chatOpen) {
    return (
      <div className={dockPosition}>
        <Button
          variant="outline"
          onClick={openChat}
          className={cn(
            floatingSurface,
            "hover:bg-muted rounded-full px-3.5 font-normal",
          )}
        >
          <MessageSquareIcon data-icon="inline-start" />
          Show chat
          {messageCount > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {messageCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={dockPosition}>
      <ThreadPrimitive.Root className="flex w-full max-w-2xl flex-col gap-2">
        <ChatMessages />
        <ComposerPrimitive.TriggerPopoverRoot>
          <ComposerPrimitive.Root
            className={cn(
              floatingSurface,
              "relative flex flex-col rounded-[22px]",
            )}
          >
            <ComposerQuotePreview className="mx-2 mt-2" />
            <div className="flex items-end gap-0.5 py-1.5 ps-4 pe-1.5">
              <ComposerField />
              <ModelPicker className="hidden shrink-0 sm:flex" />
              <ChatsMenu />
              <TooltipIconButton
                tooltip="Hide chat"
                side="top"
                onClick={() => setChatOpen(false)}
                className={iconButton}
              >
                <PanelBottomCloseIcon />
              </TooltipIconButton>
              <SendButton />
            </div>
            <SuggestionCommands />
          </ComposerPrimitive.Root>
        </ComposerPrimitive.TriggerPopoverRoot>
      </ThreadPrimitive.Root>
    </div>
  );
}
