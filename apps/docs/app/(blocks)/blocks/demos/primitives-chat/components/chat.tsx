"use client";

import { useMemo, useState, type PropsWithChildren } from "react";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AssistantModalPrimitive,
  AssistantRuntimeProvider,
  AttachmentPrimitive,
  AuiConfig,
  AuiIf,
  BranchPickerPrimitive,
  ChainOfThoughtPrimitive,
  ComposerPrimitive,
  CompositeAttachmentAdapter,
  ErrorPrimitive,
  InMemoryThreadListAdapter,
  MessagePartPrimitive,
  MessagePrimitive,
  QueueItemPrimitive,
  SelectionToolbarPrimitive,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  SuggestionPrimitive,
  Suggestions,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  WebSpeechSynthesisAdapter,
  useAuiState,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
  type LocalRuntimeOptions,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import {
  Add01Icon,
  Archive02Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  BubbleChatIcon,
  Cancel01Icon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  PictureInPictureExitIcon,
  PictureInPictureOnIcon,
  QuoteDownIcon,
  RefreshIcon,
  StopIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  Unarchive03Icon,
  VolumeHighIcon,
  VolumeMute02Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

/* -------------------------------------------------------------------------- */
/* Runtime: a scripted model, so the chat runs without a key or a server.     */
/* Replace `scriptedModel` with a real `ChatModelAdapter` to talk to a model. */
/* -------------------------------------------------------------------------- */

const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#e8e6df"/><circle cx="236" cy="62" r="26" fill="#d97757"/><path d="M0 180 96 84l58 58 44-36 122 74z" fill="#3d3d3a"/></svg>',
)}`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function lastUserText(messages: readonly ThreadMessage[]) {
  const message = messages.findLast((entry) => entry.role === "user");
  return (message?.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ");
}

async function* write(
  parts: ThreadAssistantMessagePart[],
  type: "text" | "reasoning",
  text: string,
  signal: AbortSignal,
): AsyncGenerator<ChatModelRunResult, void> {
  const index = parts.length;
  let shown = "";
  for (const word of text.split(/(?<=\s)/)) {
    if (signal.aborted) return;
    shown += word;
    parts[index] = { type, text: shown };
    yield { content: [...parts] };
    await wait(40);
  }
}

const scriptedModel: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const prompt = lastUserText(messages).toLowerCase();
    const parts: ThreadAssistantMessagePart[] = [];
    await wait(400);

    if (/error|fail/.test(prompt)) {
      throw new Error(
        "The scripted model fails when a message mentions an error. Edit the message to get a reply.",
      );
    }

    if (/weather|tool|think/.test(prompt)) {
      yield* write(
        parts,
        "reasoning",
        "The question needs live data, so the weather tool runs first.",
        abortSignal,
      );
      const call = {
        type: "tool-call",
        toolCallId: crypto.randomUUID(),
        toolName: "get_weather",
        args: { city: "Tokyo" },
        argsText: '{ "city": "Tokyo" }',
      } as const;
      const index = parts.length;
      parts[index] = call;
      yield { content: [...parts] };
      await wait(900);
      parts[index] = { ...call, result: { temperature: "22°C", sky: "Clear" } };
      yield* write(
        parts,
        "reasoning",
        "The tool returned a reading, so the answer can be written.",
        abortSignal,
      );
      yield* write(
        parts,
        "text",
        "It is 22°C and clear in Tokyo. Open Thinking above to see the reasoning and the tool call.",
        abortSignal,
      );
      return;
    }

    if (/image|picture|draw/.test(prompt)) {
      yield* write(parts, "text", "Here is a small picture.", abortSignal);
      parts.push({ type: "image", image: SAMPLE_IMAGE });
      yield { content: [...parts] };
      return;
    }

    yield* write(
      parts,
      "text",
      "This reply comes from a script inside the file. Select part of it to quote it, press Regenerate to add a branch, or send another message while this one is still being written to see the queue.",
      abortSignal,
    );
  },
};

class ScriptedThreadList extends InMemoryThreadListAdapter {
  override async generateTitle(
    _remoteId?: string,
    messages: readonly ThreadMessage[] = [],
  ) {
    const title = lastUserText(messages.slice(0, 1)).trim().slice(0, 48);
    return createAssistantStream((controller) => {
      controller.appendText(title || "New chat");
    });
  }
}

const runtimeOptions: LocalRuntimeOptions = {
  unstable_enableMessageQueue: true,
  adapters: {
    attachments: new CompositeAttachmentAdapter([
      new SimpleImageAttachmentAdapter(),
      new SimpleTextAttachmentAdapter(),
    ]),
    feedback: { submit: () => {} },
    speech: new WebSpeechSynthesisAdapter(),
  },
};

const config = AuiConfig({
  suggestions: Suggestions([
    {
      title: "Check the weather",
      label: "with reasoning and a tool call",
      prompt: "What is the weather in Tokyo?",
    },
    {
      title: "Show an image",
      label: "in the reply",
      prompt: "Draw me a picture.",
    },
    {
      title: "Cause an error",
      label: "to see the error state",
      prompt: "Fail with an error.",
    },
  ]),
});

function useScriptedRuntime() {
  const adapter = useMemo(() => new ScriptedThreadList(), []);
  return useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function RuntimeHook() {
      return useLocalRuntime(scriptedModel, runtimeOptions);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Shared styles                                                              */
/* -------------------------------------------------------------------------- */

function Icon({
  icon,
  className,
}: {
  icon: IconSvgElement;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={1.75}
      aria-hidden
      {...(className ? { className } : {})}
    />
  );
}

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const iconButton = `text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-4 ${focusRing}`;

const menu =
  "bg-popover text-popover-foreground z-50 min-w-40 rounded-lg border p-1 shadow-md";

const menuItem =
  "hover:bg-accent focus:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none [&_svg]:size-4";

/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */

export function Chat() {
  const runtime = useScriptedRuntime();
  const [floating, setFloating] = useState(false);

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <div className="bg-background text-foreground flex h-full text-sm">
        <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-e p-2 md:flex">
          <ThreadList />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <Header floating={floating} onFloatingChange={setFloating} />
          {floating ? <FloatingChat /> : <Thread />}
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}

function Header({
  floating,
  onFloatingChange,
}: {
  floating: boolean;
  onFloatingChange: (floating: boolean) => void;
}) {
  const title = useAuiState((s) => s.threadListItem.title);
  const label = floating ? "Dock the chat" : "Float the chat";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <h1 className="min-w-0 flex-1 truncate font-medium">
        {title || "New chat"}
      </h1>
      <ThreadListPrimitive.New
        aria-label="New chat"
        title="New chat"
        className={`${iconButton} md:hidden`}
      >
        <Icon icon={Add01Icon} />
      </ThreadListPrimitive.New>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={floating}
        onClick={() => onFloatingChange(!floating)}
        className={iconButton}
      >
        {floating ? (
          <Icon icon={PictureInPictureExitIcon} />
        ) : (
          <Icon icon={PictureInPictureOnIcon} />
        )}
      </button>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* ThreadList, ThreadListItem, ThreadListItemMore                             */
/* -------------------------------------------------------------------------- */

function ThreadList() {
  return (
    <ThreadListPrimitive.Root className="flex flex-col gap-0.5">
      <ThreadListPrimitive.New
        className={`hover:bg-accent data-active:bg-accent mb-1 flex h-9 items-center gap-2 rounded-lg px-2.5 font-medium transition-colors motion-reduce:transition-none ${focusRing}`}
      >
        <Icon icon={Add01Icon} className="size-4" />
        New chat
      </ThreadListPrimitive.New>
      <ThreadListPrimitive.Items>
        {() => <ThreadListItem />}
      </ThreadListPrimitive.Items>
      <AuiIf condition={(s: any) => s.threads.archivedThreadIds.length > 0}>
        <p className="text-muted-foreground mt-4 px-2.5 pb-1 text-xs">
          Archived
        </p>
        <ThreadListPrimitive.Items archived>
          {() => <ThreadListItem />}
        </ThreadListPrimitive.Items>
      </AuiIf>
    </ThreadListPrimitive.Root>
  );
}

function ThreadListItem() {
  const archived = useAuiState((s) => s.threadListItem.status === "archived");

  return (
    <ThreadListItemPrimitive.Root className="group hover:bg-accent data-active:bg-accent has-data-[state=open]:bg-accent relative flex h-9 items-center rounded-lg transition-colors motion-reduce:transition-none">
      <ThreadListItemPrimitive.Trigger
        className={`h-full min-w-0 flex-1 truncate rounded-lg ps-2.5 pe-9 text-start ${focusRing}`}
      >
        <ThreadListItemPrimitive.Title fallback="New chat" />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMorePrimitive.Root>
        <ThreadListItemMorePrimitive.Trigger
          aria-label="Chat options"
          className={`${iconButton} absolute end-1 opacity-0 group-hover:opacity-100 group-data-active:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100`}
        >
          <Icon icon={MoreHorizontalIcon} />
        </ThreadListItemMorePrimitive.Trigger>
        <ThreadListItemMorePrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className={menu}
        >
          {archived ? (
            <ThreadListItemPrimitive.Unarchive asChild>
              <ThreadListItemMorePrimitive.Item className={menuItem}>
                <Icon icon={Unarchive03Icon} />
                Restore
              </ThreadListItemMorePrimitive.Item>
            </ThreadListItemPrimitive.Unarchive>
          ) : (
            <ThreadListItemPrimitive.Archive asChild>
              <ThreadListItemMorePrimitive.Item className={menuItem}>
                <Icon icon={Archive02Icon} />
                Archive
              </ThreadListItemMorePrimitive.Item>
            </ThreadListItemPrimitive.Archive>
          )}
          <ThreadListItemMorePrimitive.Separator className="bg-border -mx-1 my-1 h-px" />
          <ThreadListItemPrimitive.Delete asChild>
            <ThreadListItemMorePrimitive.Item
              className={`${menuItem} text-destructive`}
            >
              <Icon icon={Delete02Icon} />
              Delete
            </ThreadListItemMorePrimitive.Item>
          </ThreadListItemPrimitive.Delete>
        </ThreadListItemMorePrimitive.Content>
      </ThreadListItemMorePrimitive.Root>
    </ThreadListItemPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* AssistantModal: the same thread in a floating bubble                       */
/* -------------------------------------------------------------------------- */

function FloatingChat() {
  return (
    <div className="relative min-h-0 flex-1">
      <p className="text-muted-foreground p-6">
        The chat is in the bubble at the bottom corner.
      </p>
      <AssistantModalPrimitive.Root defaultOpen>
        <AssistantModalPrimitive.Anchor className="absolute end-4 bottom-4 size-11">
          <AssistantModalPrimitive.Trigger
            aria-label="Toggle the chat"
            className={`bg-primary text-primary-foreground flex size-full items-center justify-center rounded-full transition-transform active:scale-95 motion-reduce:transition-none ${focusRing}`}
          >
            <Icon icon={BubbleChatIcon} className="size-5" />
          </AssistantModalPrimitive.Trigger>
        </AssistantModalPrimitive.Anchor>
        <AssistantModalPrimitive.Content
          sideOffset={12}
          aria-label="Chat"
          className="bg-background z-50 flex h-[30rem] max-h-(--radix-popover-content-available-height) w-[24rem] max-w-[calc(100vw-2rem)] flex-col overflow-clip rounded-xl border shadow-lg outline-none"
        >
          <Thread />
        </AssistantModalPrimitive.Content>
      </AssistantModalPrimitive.Root>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Thread, Suggestion, SelectionToolbar                                       */
/* -------------------------------------------------------------------------- */

function Thread() {
  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col pt-6">
          <AuiIf condition={(s: any) => s.thread.isEmpty}>
            <Welcome />
          </AuiIf>
          <div className="flex flex-col gap-6 pb-10 empty:hidden">
            <ThreadPrimitive.Messages>
              {() => <Message />}
            </ThreadPrimitive.Messages>
          </div>
          <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto flex flex-col pb-4">
            <ThreadPrimitive.ScrollToBottom
              aria-label="Scroll to the newest message"
              className={`${iconButton} bg-background absolute -top-10 self-center rounded-full border disabled:invisible`}
            >
              <Icon icon={ArrowDown02Icon} />
            </ThreadPrimitive.ScrollToBottom>
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>

      <SelectionToolbarPrimitive.Root className="bg-popover text-popover-foreground z-50 rounded-lg border p-1 shadow-md">
        <SelectionToolbarPrimitive.Quote
          className={`hover:bg-accent flex items-center gap-1.5 rounded-md px-2 py-1 text-sm ${focusRing}`}
        >
          <Icon icon={QuoteDownIcon} className="size-3.5" />
          Quote
        </SelectionToolbarPrimitive.Quote>
      </SelectionToolbarPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

function Welcome() {
  return (
    <div className="my-auto flex flex-col gap-4 pb-6">
      <p className="text-xl font-medium tracking-tight">
        What should we try first?
      </p>
      <div className="flex flex-col gap-1">
        <ThreadPrimitive.Suggestions>
          {() => (
            <SuggestionPrimitive.Trigger
              send
              className={`hover:bg-accent -mx-2.5 rounded-lg px-2.5 py-2 text-start transition-colors motion-reduce:transition-none ${focusRing}`}
            >
              <SuggestionPrimitive.Title />{" "}
              <SuggestionPrimitive.Description className="text-muted-foreground" />
            </SuggestionPrimitive.Trigger>
          )}
        </ThreadPrimitive.Suggestions>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer, Attachment, QueueItem                                            */
/* -------------------------------------------------------------------------- */

function Composer() {
  return (
    <ComposerPrimitive.Root className="flex flex-col">
      <ComposerPrimitive.AttachmentDropzone className="bg-muted/40 focus-within:border-foreground/25 data-[dragging=true]:border-ring flex flex-col gap-2 rounded-2xl border p-2 transition-colors data-[dragging=true]:border-dashed motion-reduce:transition-none">
        <ComposerPrimitive.Queue>
          {() => (
            <div className="bg-background flex items-center gap-1 rounded-lg border py-1 ps-2.5 pe-1">
              <QueueItemPrimitive.Text className="min-w-0 flex-1 truncate" />
              <QueueItemPrimitive.Steer
                className={`hover:bg-accent text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-xs ${focusRing}`}
              >
                Send now
              </QueueItemPrimitive.Steer>
              <QueueItemPrimitive.Remove
                aria-label="Remove from the queue"
                className={iconButton}
              >
                <Icon icon={Cancel01Icon} />
              </QueueItemPrimitive.Remove>
            </div>
          )}
        </ComposerPrimitive.Queue>

        <ComposerPrimitive.Quote className="bg-background flex items-start gap-2 rounded-lg border py-1.5 ps-2.5 pe-1">
          <Icon
            icon={QuoteDownIcon}
            className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
          />
          <ComposerPrimitive.QuoteText className="text-muted-foreground line-clamp-2 min-w-0 flex-1" />
          <ComposerPrimitive.QuoteDismiss
            aria-label="Remove the quote"
            className={iconButton}
          >
            <Icon icon={Cancel01Icon} />
          </ComposerPrimitive.QuoteDismiss>
        </ComposerPrimitive.Quote>

        <div className="flex flex-wrap gap-2 empty:hidden">
          <ComposerPrimitive.Attachments>
            {() => <Attachment removable />}
          </ComposerPrimitive.Attachments>
        </div>

        <ComposerPrimitive.Input
          rows={1}
          placeholder="Send a message"
          aria-label="Message"
          className="placeholder:text-muted-foreground/70 max-h-40 min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none"
        />

        <div className="flex items-center justify-between">
          <ComposerPrimitive.AddAttachment
            aria-label="Add a file"
            title="Add a file"
            className={iconButton}
          >
            <Icon icon={Attachment01Icon} />
          </ComposerPrimitive.AddAttachment>
          <div className="flex items-center gap-1.5">
            <AuiIf condition={(s: any) => s.thread.isRunning}>
              <ComposerPrimitive.Cancel
                aria-label="Stop the reply"
                title="Stop the reply"
                className={`${iconButton} border`}
              >
                <Icon icon={StopIcon} className="size-3! fill-current" />
              </ComposerPrimitive.Cancel>
            </AuiIf>
            <ComposerPrimitive.Send
              aria-label="Send the message"
              title="Send the message"
              className={`bg-primary text-primary-foreground inline-flex size-7 items-center justify-center rounded-full transition-opacity disabled:opacity-30 motion-reduce:transition-none ${focusRing}`}
            >
              <Icon icon={ArrowUp02Icon} className="size-4" />
            </ComposerPrimitive.Send>
          </div>
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

function Attachment({ removable = false }: { removable?: boolean }) {
  return (
    <AttachmentPrimitive.Root className="bg-background flex h-9 max-w-52 items-center gap-2 rounded-lg border ps-1 pe-2">
      <AttachmentPrimitive.unstable_Thumb className="bg-muted text-muted-foreground flex h-7 min-w-7 items-center justify-center rounded-md px-1 font-mono text-[10px]" />
      <span className="min-w-0 flex-1 truncate">
        <AttachmentPrimitive.Name />
      </span>
      {removable && (
        <AttachmentPrimitive.Remove
          aria-label="Remove the file"
          className={`${iconButton} -me-1.5 size-6`}
        >
          <Icon icon={Cancel01Icon} />
        </AttachmentPrimitive.Remove>
      )}
    </AttachmentPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Message, MessagePart, ChainOfThought, Error                                */
/* -------------------------------------------------------------------------- */

function Message() {
  const role = useAuiState((s) => s.message.role);
  const editing = useAuiState((s) => s.message.composer.isEditing);

  if (editing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="group flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2 empty:hidden">
        <MessagePrimitive.Attachments>
          {() => <Attachment />}
        </MessagePrimitive.Attachments>
      </div>
      <MessagePrimitive.Quote>
        {({ text }: { text: string }) => (
          <blockquote className="text-muted-foreground line-clamp-3 max-w-[80%] border-s-2 ps-3">
            {text}
          </blockquote>
        )}
      </MessagePrimitive.Quote>
      <div className="bg-muted max-w-[80%] rounded-2xl px-4 py-2 wrap-break-word whitespace-pre-wrap">
        <MessagePrimitive.Parts />
      </div>
      <div className="flex min-h-7 items-center">
        <BranchPicker />
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          className="flex gap-0.5 group-focus-within:opacity-100 group-hover:opacity-100 data-floating:opacity-0"
        >
          <ActionBarPrimitive.Edit
            aria-label="Edit"
            title="Edit"
            className={iconButton}
          >
            <Icon icon={PencilEdit02Icon} />
          </ActionBarPrimitive.Edit>
          <CopyButton />
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function EditComposer() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <ComposerPrimitive.Root className="bg-muted/40 focus-within:border-foreground/25 flex w-full max-w-[80%] flex-col gap-2 rounded-2xl border p-2">
        <ComposerPrimitive.Input
          autoFocus
          aria-label="Edit the message"
          className="min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none"
        />
        <div className="flex justify-end gap-1.5">
          <ComposerPrimitive.Cancel
            className={`hover:bg-accent h-8 rounded-lg px-3 ${focusRing}`}
          >
            Cancel
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send
            className={`bg-primary text-primary-foreground h-8 rounded-lg px-3 disabled:opacity-40 ${focusRing}`}
          >
            Send
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="group flex flex-col gap-1.5">
      <div className="flex flex-col gap-2 leading-relaxed wrap-break-word">
        <MessagePrimitive.Parts
          components={{
            Text: TextPart,
            Image: ImagePart,
            Empty: WorkingDot,
            ChainOfThought,
          }}
        />
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2">
            <ErrorPrimitive.Message />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
      <div className="-ms-1.5 flex min-h-7 items-center">
        <BranchPicker />
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          className="flex gap-0.5 group-focus-within:opacity-100 group-hover:opacity-100 data-floating:opacity-0"
        >
          <CopyButton />
          <AuiIf condition={(s: any) => s.message.speech == null}>
            <ActionBarPrimitive.Speak
              aria-label="Read aloud"
              title="Read aloud"
              className={iconButton}
            >
              <Icon icon={VolumeHighIcon} />
            </ActionBarPrimitive.Speak>
          </AuiIf>
          <AuiIf condition={(s: any) => s.message.speech != null}>
            <ActionBarPrimitive.StopSpeaking
              aria-label="Stop reading"
              title="Stop reading"
              className={iconButton}
            >
              <Icon icon={VolumeMute02Icon} />
            </ActionBarPrimitive.StopSpeaking>
          </AuiIf>
          <ActionBarPrimitive.FeedbackPositive
            aria-label="Good reply"
            title="Good reply"
            className={`${iconButton} data-submitted:bg-accent data-submitted:text-foreground`}
          >
            <Icon icon={ThumbsUpIcon} />
          </ActionBarPrimitive.FeedbackPositive>
          <ActionBarPrimitive.FeedbackNegative
            aria-label="Bad reply"
            title="Bad reply"
            className={`${iconButton} data-submitted:bg-accent data-submitted:text-foreground`}
          >
            <Icon icon={ThumbsDownIcon} />
          </ActionBarPrimitive.FeedbackNegative>
          <ActionBarPrimitive.Reload
            aria-label="Regenerate"
            title="Regenerate"
            className={iconButton}
          >
            <Icon icon={RefreshIcon} />
          </ActionBarPrimitive.Reload>
          <ActionBarMorePrimitive.Root>
            <ActionBarMorePrimitive.Trigger
              aria-label="More"
              title="More"
              className={`${iconButton} data-[state=open]:bg-accent`}
            >
              <Icon icon={MoreHorizontalIcon} />
            </ActionBarMorePrimitive.Trigger>
            <ActionBarMorePrimitive.Content
              side="bottom"
              align="start"
              sideOffset={4}
              className={menu}
            >
              <ActionBarPrimitive.ExportMarkdown asChild>
                <ActionBarMorePrimitive.Item className={menuItem}>
                  <Icon icon={Download01Icon} />
                  Export as Markdown
                </ActionBarMorePrimitive.Item>
              </ActionBarPrimitive.ExportMarkdown>
            </ActionBarMorePrimitive.Content>
          </ActionBarMorePrimitive.Root>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function TextPart() {
  return (
    <p className="whitespace-pre-wrap">
      <MessagePartPrimitive.Text />
      <MessagePartPrimitive.InProgress>
        <span
          aria-hidden
          className="ms-1 animate-pulse motion-reduce:animate-none"
        >
          ●
        </span>
      </MessagePartPrimitive.InProgress>
    </p>
  );
}

function ImagePart() {
  return (
    <MessagePartPrimitive.Image
      alt="A sun over two hills"
      className="w-64 max-w-full rounded-lg border"
    />
  );
}

function WorkingDot() {
  const running = useAuiState((s) => s.message.status?.type === "running");
  if (!running) return null;

  return (
    <span
      role="status"
      aria-label="Writing a reply"
      className="animate-pulse motion-reduce:animate-none"
    >
      ●
    </span>
  );
}

function ChainOfThought() {
  return (
    <ChainOfThoughtPrimitive.Root className="rounded-lg border">
      <ChainOfThoughtPrimitive.AccordionTrigger
        className={`text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 rounded-lg px-3 py-2 transition-colors motion-reduce:transition-none ${focusRing}`}
      >
        <AuiIf condition={(s: any) => s.chainOfThought.collapsed}>
          <Icon icon={ArrowRight01Icon} className="size-4 rtl:rotate-180" />
        </AuiIf>
        <AuiIf condition={(s: any) => !s.chainOfThought.collapsed}>
          <Icon icon={ArrowDown01Icon} className="size-4" />
        </AuiIf>
        Thinking
      </ChainOfThoughtPrimitive.AccordionTrigger>
      <AuiIf condition={(s: any) => !s.chainOfThought.collapsed}>
        <div className="flex flex-col gap-2 px-3 pb-3">
          <ChainOfThoughtPrimitive.Parts
            components={{
              Reasoning: ReasoningPart,
              tools: { Fallback: ToolCallPart },
              Layout: PartLayout,
            }}
          />
        </div>
      </AuiIf>
    </ChainOfThoughtPrimitive.Root>
  );
}

function PartLayout({ children }: PropsWithChildren) {
  return <div>{children}</div>;
}

function ReasoningPart({ text }: { text: string }) {
  return <p className="text-muted-foreground whitespace-pre-wrap">{text}</p>;
}

function ToolCallPart({
  toolName,
  argsText,
  result,
}: ToolCallMessagePartProps) {
  return (
    <div className="bg-muted/40 rounded-md border px-2.5 py-2 font-mono text-xs">
      <p className="flex items-center gap-1.5">
        <Icon icon={Wrench01Icon} className="text-muted-foreground size-3.5" />
        {toolName}
        <span className="text-muted-foreground">{argsText}</span>
      </p>
      <p className="text-muted-foreground mt-1" role="status">
        {result === undefined ? "Running" : JSON.stringify(result)}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ActionBar pieces and BranchPicker                                          */
/* -------------------------------------------------------------------------- */

function CopyButton() {
  return (
    <ActionBarPrimitive.Copy
      aria-label="Copy"
      title="Copy"
      className={iconButton}
    >
      <AuiIf condition={(s: any) => s.message.isCopied}>
        <Icon icon={Tick02Icon} />
      </AuiIf>
      <AuiIf condition={(s: any) => !s.message.isCopied}>
        <Icon icon={Copy01Icon} />
      </AuiIf>
    </ActionBarPrimitive.Copy>
  );
}

function BranchPicker() {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className="text-muted-foreground me-1 inline-flex items-center text-xs tabular-nums"
    >
      <BranchPickerPrimitive.Previous
        aria-label="Previous version"
        className={iconButton}
      >
        <Icon icon={ArrowLeft01Icon} className="rtl:rotate-180" />
      </BranchPickerPrimitive.Previous>
      <span>
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next
        aria-label="Next version"
        className={iconButton}
      >
        <Icon icon={ArrowRight01Icon} className="rtl:rotate-180" />
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
}
