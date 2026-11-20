"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  chipClass,
  Composer,
  CopyButton,
  field,
  floating,
  focusComposer,
  glyphFor,
  hairline,
  Icon,
  IconButton,
  icons,
  listRowClass,
  MarkdownText,
  paper,
  Popover,
  PopoverContent,
  PopoverTrigger,
  radius,
  text,
  variantRoot,
  weight,
  ChatList,
} from "../components/ui";
import {
  ASSISTANT,
  isStoppedEdit,
  isWidgetPart,
  SUGGESTIONS,
  useAskForChange,
  useFollowUps,
  useNewChat,
  useOpenChanges,
  useWidgetCall,
  useWidgetCode,
  useWidgets,
  WELCOME,
  WidgetChip,
  WidgetCode,
  WidgetFrame,
  WidgetStatusLine,
  widgetStatusText,
} from "../lib/widgets";

/**
 * Inline thread: one centred column. A widget is drawn in the reply that
 * made it, and the composer stays at the bottom.
 */
export function ThreadVariant() {
  return (
    <ThreadPrimitive.Root
      data-gfc-thread
      className={cn(variantRoot, "flex-col")}
    >
      <div
        aria-hidden
        className="from-background via-background/80 pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-linear-to-b to-transparent"
      />
      <TopBar />
      <ThreadPrimitive.Viewport className="gfc-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col pt-16">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <Welcome />
          </AuiIf>
          <div className="flex flex-col gap-6 pb-8 empty:hidden">
            <ThreadPrimitive.Messages>{renderMessage}</ThreadPrimitive.Messages>
            <FollowUps />
          </div>
          <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto flex flex-col gap-2 pb-3">
            <div
              aria-hidden
              className="from-background pointer-events-none absolute inset-x-0 -top-6 h-6 bg-linear-to-t to-transparent"
            />
            <ThreadPrimitive.ScrollToBottom asChild>
              <IconButton
                label="Scroll to the newest message"
                icon={icons.arrowDown}
                side="top"
                className={cn(
                  paper,
                  "hover:bg-accent absolute -top-10 self-center shadow-(--float-shadow) disabled:invisible",
                )}
              />
            </ThreadPrimitive.ScrollToBottom>
            <Composer />
            <p className={cn("text-muted-foreground text-center", text.small)}>
              {WELCOME.note}
            </p>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

/** The chats of this visit and a new one, in a pill at the top. */
function TopBar() {
  const [open, setOpen] = useState(false);
  const newChat = useNewChat();

  return (
    <div
      className={cn(
        floating,
        "absolute start-3 top-3 z-20 flex h-9 items-center gap-0.5 rounded-full p-px pointer-coarse:h-10",
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <IconButton label="Chats" icon={icons.history} className="size-8" />
          }
        />
        <PopoverContent aria-label="Chats">
          <ChatList
            onPick={() => setOpen(false)}
            className="gfc-scroll max-h-72 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain p-1"
          />
        </PopoverContent>
      </Popover>
      <IconButton
        label="New chat"
        icon={icons.newChat}
        className="size-8"
        onClick={newChat}
      />
    </div>
  );
}

function Welcome() {
  return (
    <div className="my-auto flex flex-col items-center gap-6 pb-8">
      <h1 className={cn("text-center font-sans", text.title, weight.heading)}>
        {WELCOME.title}
      </h1>
      <div className="flex w-full max-w-sm flex-col gap-0.5">
        {SUGGESTIONS.map((suggestion) => (
          <ThreadPrimitive.Suggestion
            key={suggestion.prompt}
            prompt={suggestion.prompt}
            send
            onClick={focusComposer}
            className={cn(listRowClass, "h-9 gap-2.5 pointer-coarse:h-11")}
          >
            <span
              className={cn(
                field,
                "flex size-6 shrink-0 items-center justify-center rounded-full",
              )}
            >
              <Icon {...glyphFor(suggestion.icon)} className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate">{suggestion.label}</span>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

/** What to ask next, as chips under the newest reply. */
function FollowUps() {
  const followUps = useFollowUps();
  if (followUps.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Suggested next steps"
      className="flex flex-wrap gap-1.5"
    >
      {followUps.map((prompt) => (
        <ThreadPrimitive.Suggestion
          key={prompt}
          prompt={prompt}
          send
          onClick={focusComposer}
          className={chipClass}
        >
          <span className="min-w-0 truncate">{prompt}</span>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

const renderMessage = () => <Message />;

function Message() {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div
        className={cn(
          field,
          radius.xl,
          "max-w-[85%] px-3.5 py-2 text-[0.9375rem] leading-6 wrap-break-word whitespace-pre-wrap",
        )}
      >
        <MessagePrimitive.Parts>
          {({ part }) => (part.type === "text" ? part.text : null)}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  const copied = useAuiState((s) => s.message.isCopied);

  return (
    <MessagePrimitive.Root className="group flex min-w-0 flex-col gap-2">
      <p className={cn("flex items-center gap-2", weight.strong)}>
        <Avatar src={ASSISTANT.avatar} name={ASSISTANT.name} decorative />
        {ASSISTANT.name}
      </p>
      <AuiIf
        condition={(s) =>
          s.message.status?.type === "running" && s.message.content.length === 0
        }
      >
        <p role="status" className={cn("text-muted-foreground", text.bodySm)}>
          <span className="shimmer motion-reduce:animate-none">Thinking</span>
        </p>
      </AuiIf>
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "text") return part.text ? <MarkdownText /> : <></>;
          if (isWidgetPart(part))
            return (
              <InlineWidget toolCallId={part.toolCallId}>
                {part.toolUI}
              </InlineWidget>
            );
          return <></>;
        }}
      </MessagePrimitive.Parts>
      <ActionBarPrimitive.Root
        hideWhenRunning
        className="-ms-1.5 flex h-7 gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
      >
        <ActionBarPrimitive.Copy asChild>
          <IconButton
            label={copied ? "Copied" : "Copy the reply"}
            icon={copied ? icons.tick : icons.copy}
          />
        </ActionBarPrimitive.Copy>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

/**
 * A widget call in its message. The call that draws the widget now is a live
 * frame with a bar under it; a call that a later one replaced is a chip that
 * leads to the version that replaced it; an edit that was stopped is one line.
 */
function InlineWidget({
  toolCallId,
  children,
}: {
  toolCallId: string;
  children: ReactNode;
}) {
  const call = useWidgetCall(toolCallId);
  const widgets = useWidgets();
  if (!call) return null;
  if (isStoppedEdit(call)) return <WidgetStatusLine toolCallId={toolCallId} />;

  if (call.status === "ready" && !call.current) {
    const latest = widgets.find((entry) => entry.title === call.title)?.call;
    const showLatest = (event: MouseEvent<HTMLButtonElement>) => {
      const target = event.currentTarget
        .closest("[data-gfc-thread]")
        ?.querySelector(`[data-widget-call="${latest?.toolCallId}"]`);
      target?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
      if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    };
    return (
      <WidgetChip
        toolCallId={toolCallId}
        onOpen={showLatest}
        label={`${call.label}, earlier version. Go to the newest version`}
      />
    );
  }

  return (
    <section
      tabIndex={-1}
      data-widget-call={toolCallId}
      aria-label={call.label}
      className="flex min-w-0 flex-col gap-2 py-1 outline-none"
    >
      <WidgetStatusLine toolCallId={toolCallId} />
      <WidgetFrame>{children}</WidgetFrame>
      {call.status === "ready" && <WidgetBar toolCallId={toolCallId} />}
    </section>
  );
}

/**
 * Under a widget: its name, its source, and a way to ask for a change while
 * the script has one the widget does not have yet.
 */
function WidgetBar({ toolCallId }: { toolCallId: string }) {
  const call = useWidgetCall(toolCallId);
  const code = useWidgetCode(toolCallId);
  const askForChange = useAskForChange();
  const canChange = useOpenChanges(call?.title ?? "").length > 0;
  const [showCode, setShowCode] = useState(false);
  if (!call) return null;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          hairline,
          "text-muted-foreground flex items-center gap-2 border-t pt-1.5",
          text.bodySm,
        )}
      >
        <Icon {...glyphFor(call.icon)} className="size-3.5" />
        <span className="text-foreground min-w-0 truncate">{call.label}</span>
        <span className="shrink-0">{widgetStatusText(call)}</span>
        <span className="min-w-0 flex-1" />
        {canChange && (
          <IconButton
            label="Ask for a change"
            icon={icons.edit}
            side="top"
            onClick={() => askForChange(call.title)}
          />
        )}
        <IconButton
          label={showCode ? "Hide the code" : "Show the code"}
          icon={icons.code}
          side="top"
          aria-expanded={showCode}
          className="aria-expanded:bg-accent aria-expanded:text-foreground"
          onClick={() => setShowCode((value) => !value)}
        />
      </div>
      {showCode && (
        <div className={cn(field, radius.sm, "relative")}>
          <WidgetCode id={toolCallId} className="max-h-72 p-3 pe-10" />
          <CopyButton
            text={code ?? ""}
            label="Copy the code"
            side="left"
            className="absolute end-1.5 top-1.5"
          />
        </div>
      )}
    </div>
  );
}
