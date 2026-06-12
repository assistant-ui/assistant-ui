"use client";

import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { ContextDisplay } from "@/components/assistant-ui/context-display";
import { ModelSelector } from "@/components/assistant-ui/model-selector";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  responseForRequest,
  usePiHostUiRequests,
  usePiRuntimeExtras,
  usePiThreadState,
  type PiHostUiRequest,
  type PiThinkingLevel,
} from "@assistant-ui/react-pi";
import { usePiHandshake } from "../pi-handshake";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/reasoning";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/tool-group";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  ListEndIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";
import { useState, type FC } from "react";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "44rem",
        ["--composer-radius" as string]: "24px",
        ["--composer-padding" as string]: "10px",
      }}
    >
      <ThreadPrimitive.Viewport
        data-slot="aui_thread-viewport"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div className="mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-4">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <ThreadWelcome />
          </AuiIf>

          <div
            data-slot="aui_message-group"
            className="mb-10 flex flex-col gap-y-8 empty:hidden"
          >
            <ThreadPrimitive.Messages>
              {() => <ThreadMessage />}
            </ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer bg-background sticky bottom-0 mt-auto flex flex-col gap-4 overflow-visible rounded-t-(--composer-radius) pb-4 md:pb-6">
            <ThreadScrollToBottom />
            <HostUiRequests />
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);

  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root my-auto flex grow flex-col">
      <div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
        <div className="aui-thread-welcome-message flex size-full flex-col justify-center px-4">
          <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-semibold duration-200">
            Hello there!
          </h1>
          <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground text-xl delay-75 duration-200">
            How can I help you today?
          </p>
        </div>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions grid w-full gap-2 pb-4 @md:grid-cols-2">
      <ThreadPrimitive.Suggestions>
        {() => <ThreadSuggestionItem />}
      </ThreadPrimitive.Suggestions>
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200 nth-[n+3]:hidden @md:nth-[n+3]:block">
      <SuggestionPrimitive.Trigger send asChild>
        <Button
          variant="ghost"
          className="aui-thread-welcome-suggestion bg-background hover:bg-muted h-auto w-full flex-wrap items-start justify-start gap-1 rounded-3xl border px-4 py-3 text-start text-sm transition-colors @md:flex-col"
        >
          <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 font-medium" />
          <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-muted-foreground empty:hidden" />
        </Button>
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

const HostUiRequests: FC = () => {
  const { requests, respond } = usePiHostUiRequests();
  const request = requests[0];
  if (!request) return null;
  return (
    <HostUiRequestCard key={request.id} request={request} respond={respond} />
  );
};

const HostUiRequestCard: FC<{
  request: PiHostUiRequest;
  respond: ReturnType<typeof usePiHostUiRequests>["respond"];
}> = ({ request, respond }) => {
  const [value, setValue] = useState(
    request.kind === "editor" ? (request.prefill ?? "") : "",
  );

  const submitValue = () => {
    void respond(responseForRequest(request, value));
  };

  return (
    <div className="border-border bg-background mx-2 rounded-2xl border p-3 text-sm shadow-sm">
      <div className="font-medium">{request.title}</div>
      {request.kind === "confirm" ? (
        <p className="text-muted-foreground mt-1">{request.message}</p>
      ) : request.kind === "select" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {request.options.map((option) => (
            <Button
              key={option}
              size="sm"
              variant="outline"
              onClick={() => void respond(responseForRequest(request, option))}
            >
              {option}
            </Button>
          ))}
        </div>
      ) : request.kind === "editor" ? (
        <textarea
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          className="border-input mt-2 min-h-24 w-full rounded-md border bg-transparent p-2 font-mono text-xs"
        />
      ) : (
        <input
          value={value}
          placeholder={request.placeholder}
          onChange={(event) => setValue(event.currentTarget.value)}
          className="border-input mt-2 w-full rounded-md border bg-transparent px-2 py-1"
        />
      )}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            void respond(
              request.kind === "confirm"
                ? responseForRequest(request, false)
                : { requestId: request.id, dismissed: true },
            )
          }
        >
          {request.kind === "confirm" ? "Deny" : "Dismiss"}
        </Button>
        {request.kind !== "select" && (
          <Button
            size="sm"
            onClick={() =>
              request.kind === "confirm"
                ? void respond(responseForRequest(request, true))
                : submitValue()
            }
          >
            {request.kind === "confirm" ? "Approve" : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
};

/** Mid-run sends sit in Pi's queue (not the thread); this card mirrors them
 * above the composer. Pi only supports clearing the whole queue — no per-item
 * remove/promote — so the lone action restores all queued text to the composer. */
const ComposerQueue: FC = () => {
  const aui = useAui();
  const { clearQueue } = usePiRuntimeExtras();
  const queueLength = useAuiState((s) => s.composer.queue.length);
  if (queueLength === 0) return null;

  const handleClear = () => {
    clearQueue()
      .then(({ steering, followUp }) => {
        const restored = [...steering, ...followUp].join("\n");
        if (!restored) return;
        const composer = aui.composer();
        const current = composer.getState().text;
        composer.setText(current ? `${current}\n${restored}` : restored);
      })
      .catch((error: unknown) => console.error("Failed to clear queue", error));
  };

  return (
    <div className="bg-muted/50 border-border/60 text-muted-foreground -mb-4 flex flex-col gap-1.5 rounded-t-(--composer-radius) border border-b-0 px-4 pt-2.5 pb-7 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">Queued</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={handleClear}
        >
          <Trash2Icon className="size-3" />
          Clear
        </Button>
      </div>
      <ComposerPrimitive.Queue>
        {({ queueItem }) => (
          <div className="flex items-center gap-2">
            <ListEndIcon className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{queueItem.prompt}</span>
            {queueItem.id.startsWith("steer:") && (
              <span className="border-border rounded-full border px-1.5 text-[10px] uppercase">
                steer
              </span>
            )}
          </div>
        )}
      </ComposerPrimitive.Queue>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerQueue />
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div
          data-slot="aui_composer-shell"
          className="bg-background focus-within:border-ring/75 focus-within:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:bg-accent/50 flex w-full flex-col gap-2 rounded-(--composer-radius) border p-(--composer-padding) transition-shadow focus-within:ring-2 data-[dragging=true]:border-dashed"
        >
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder="Send a message..."
            className="aui-composer-input placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-1.75 py-1 text-sm outline-none"
            rows={1}
            autoFocus
            aria-label="Message input"
          />
          <ComposerAction />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      <div className="flex items-center gap-1">
        <ComposerAddAttachment />
        <ComposerModelSelector />
      </div>
      <div className="flex items-center gap-1.5">
        <ComposerContextRing />
        {/* Pi queues mid-run sends (follow-up/steer), so Send stays available
            while text is typed even during a run; Stop shows when empty. */}
        <AuiIf condition={(s) => !s.thread.isRunning || !s.composer.isEmpty}>
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip="Send message"
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-send size-8 rounded-full"
              aria-label="Send message"
            >
              <ArrowUpIcon className="aui-composer-send-icon size-4" />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning && s.composer.isEmpty}>
          <ComposerPrimitive.Cancel asChild>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-cancel size-8 rounded-full"
              aria-label="Stop generating"
            >
              <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
            </Button>
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </div>
  );
};

const modelKey = (provider?: string, modelId?: string) =>
  provider && modelId ? `${provider}:${modelId}` : undefined;

/** Model + thinking-level picker seeded from the server handshake and wired to
 * Pi's per-thread `session.setModel`/`session.setThinkingLevel`. Per-model
 * thinking levels come from the handshake; Pi clamps unsupported levels and the
 * effective config is reflected by the next snapshot/event. */
const ComposerModelSelector: FC = () => {
  const handshake = usePiHandshake();
  const { metadata, setModel, setThinkingLevel, status } = usePiRuntimeExtras();
  const selected =
    modelKey(metadata.config?.provider, metadata.config?.modelId) ??
    handshake?.selectedModelId;
  const thinkingLevel = metadata.config?.thinkingLevel;
  if (!handshake || handshake.models.length === 0) return null;

  return (
    <ModelSelector.Root
      models={handshake.models}
      {...(selected ? { value: selected } : {})}
      onValueChange={(value) => {
        if (status === "running") return;
        const model = handshake.models.find((m) => m.id === value);
        if (!model) return;
        void setModel({ provider: model.provider, modelId: model.modelId });
      }}
      effort={typeof thinkingLevel === "string" ? thinkingLevel : "medium"}
      onEffortChange={(effort) => {
        if (status === "running") return;
        void setThinkingLevel(effort as PiThinkingLevel);
      }}
    >
      <ModelSelector.Trigger variant="ghost" size="sm" />
      <ModelSelector.Content>
        <ModelSelector.Search />
        <ModelSelector.List />
        {/* Slider instead of ModelSelector.Effort: Pi's six thinking levels
            overflow the horizontal segmented layout. */}
        <ModelSelector.EffortSlider label="Thinking" />
      </ModelSelector.Content>
    </ModelSelector.Root>
  );
};

/** Context-window usage as a ring beside the send button. Driven by Pi's
 * `context_usage` events (`usePiThreadState`); hidden until the first run
 * reports a window. */
const ComposerContextRing: FC = () => {
  const usage = usePiThreadState((s) => s.contextUsage);
  if (!usage || !usage.contextWindow) return null;
  return (
    <ContextDisplay.Ring
      modelContextWindow={usage.contextWindow}
      usage={{ totalTokens: usage.tokens ?? 0 }}
      side="top"
    />
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  // reserves space for action bar and compensates with `-mb` for consistent msg spacing
  // keeps hovered action bar from shifting layout (autohide doesn't support absolute positioning well)
  // for pt-[n] use -mb-[n + 6] & min-h-[n + 6] to preserve compensation
  const ACTION_BAR_PT = "pt-1.5";
  const ACTION_BAR_HEIGHT = `-mb-7.5 min-h-7.5 ${ACTION_BAR_PT}`;

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 animate-in relative duration-150"
    >
      <div
        data-slot="aui_assistant-message-content"
        // [contain-intrinsic-size:auto_24px] fixes issue #4104, don't change without checking for regressions
        className="text-foreground px-2 leading-relaxed wrap-break-word [contain-intrinsic-size:auto_24px] [content-visibility:auto]"
      >
        <MessagePrimitive.GroupedParts
          groupBy={groupPartByType({
            reasoning: ["group-chainOfThought", "group-reasoning"],
            "tool-call": ["group-chainOfThought", "group-tool"],
            "standalone-tool-call": [],
          })}
        >
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <div data-slot="aui_chain-of-thought">{children}</div>;
              case "group-reasoning": {
                const running = part.status.type === "running";
                return (
                  <ReasoningRoot
                    defaultOpen={running}
                    variant="ghost"
                    className="my-1 mb-0"
                  >
                    <ReasoningTrigger active={running} />
                    <ReasoningContent aria-busy={running}>
                      <ReasoningText>{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case "group-tool":
                if (part.indices.length === 1) return <>{children}</>;
                return (
                  <ToolGroupRoot variant="ghost" className="my-1">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <WrenchIcon className="size-4 shrink-0" />
                      <ToolGroupTrigger
                        count={part.indices.length}
                        active={part.status.type === "running"}
                      />
                    </div>
                    <ToolGroupContent className="ml-5">
                      {children}
                    </ToolGroupContent>
                  </ToolGroupRoot>
                );
              case "text":
                return <MarkdownText />;
              case "reasoning":
                return <Reasoning {...part} />;
              case "tool-call":
                return part.toolUI ?? <ToolFallback {...part} />;
              case "indicator":
                return (
                  <span
                    data-slot="aui_assistant-message-indicator"
                    className="animate-pulse font-sans"
                    aria-label="Assistant is working"
                  >
                    {"●"}
                  </span>
                );
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessageError />
      </div>

      <div
        data-slot="aui_assistant-message-footer"
        className={cn("ms-2 flex items-center", ACTION_BAR_HEIGHT)}
      >
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root text-muted-foreground col-start-3 row-start-2 -ms-1 flex gap-1"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton
            tooltip="More"
            className="data-[state=open]:bg-accent"
          >
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none">
              <DownloadIcon className="size-4" />
              Export as Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_60px] [content-visibility:auto] [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content peer bg-muted text-foreground rounded-2xl px-4 py-2.5 wrap-break-word empty:hidden">
          <MessagePrimitive.Parts />
        </div>
        <div className="aui-user-action-bar-wrapper absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full">
          <UserActionBar />
        </div>
      </div>

      <BranchPicker
        data-slot="aui_user-branch-picker"
        className="col-span-full col-start-1 row-start-3 -me-1 justify-end"
      />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_edit-composer-wrapper"
      className="flex flex-col px-2"
    >
      <ComposerPrimitive.Root className="aui-edit-composer-root bg-muted ms-auto flex w-full max-w-[85%] flex-col rounded-2xl">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent p-4 text-sm outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">Update</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground -ms-2 me-2 inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
