"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from "react";
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AttachmentPrimitive,
  AuiConfig,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  CompositeAttachmentAdapter,
  InMemoryThreadListAdapter,
  MessagePrimitive,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  SuggestionPrimitive,
  Suggestions,
  ThreadPrimitive,
  WebSpeechDictationAdapter,
  useAui,
  useAuiState,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type ReasoningMessagePartComponent,
  type SuggestionAdapter,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { createAssistantStream } from "assistant-stream";
import {
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  Cancel01Icon,
  Copy01Icon,
  Delete01Icon,
  KeyboardIcon,
  Mic01Icon,
  MicOff01Icon,
  PencilEdit02Icon,
  RefreshIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ChatHeader,
  ChatList,
  ChatSidebar,
  SidebarUser,
  SidebarUserItem,
  SidebarUserSeparator,
  useChats,
} from "@/app/(blocks)/blocks/demos/chat-sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAttachmentSrc } from "@/hooks/use-attachment-src";
import { cn } from "@/lib/utils";
import data from "./data.json";

/* -------------------------------------------------------------------------- */
/* Runtime: a scripted model, so the chat runs without a key or a server.     */
/* Replace `script` with a real `ChatModelAdapter` to talk to a model.        */
/* -------------------------------------------------------------------------- */

type Reply = { thinking: string; answer: string; followUps: string[] };

const REPLIES = data.replies.map((reply) => ({
  ...reply,
  match: new RegExp(reply.match),
}));

const replyTo = (question: string): Reply =>
  REPLIES.find((reply) => reply.match.test(question.toLowerCase())) ??
  data.fallback;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

const lastQuestion = (messages: readonly ThreadMessage[]) =>
  messages.findLast((message) => message.role === "user");

const textOf = (message: ThreadMessage | undefined) =>
  (message?.content ?? [])
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ")
    .trim();

/** Thinks out loud first, then writes the answer, a word at a time. */
const script: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const question = lastQuestion(messages);
    const reply = replyTo(textOf(question));
    const files = question?.attachments?.map((file) => file.name) ?? [];
    const answer = files.length
      ? `You attached **${files.join("**, **")}**. The script can't read files, so here is what it would say anyway.\n\n${reply.answer}`
      : reply.answer;

    const parts: ThreadAssistantMessagePart[] = [];
    for (const [index, text] of [
      [0, reply.thinking],
      [1, answer],
    ] as const) {
      let shown = "";
      for (const word of text.split(/(?<=\s)/)) {
        if (abortSignal.aborted) return;
        shown += word;
        parts[index] = {
          type: index === 0 ? "reasoning" : "text",
          text: shown,
        };
        yield { content: [...parts] };
        await wait(index === 0 ? 45 : 22, abortSignal);
      }
      await wait(index === 0 ? 300 : 0, abortSignal);
    }
  },
};

/** After a reply, the questions its script entry points to next. */
const followUps: SuggestionAdapter = {
  async generate({ messages }) {
    return replyTo(textOf(lastQuestion(messages))).followUps.map((prompt) => ({
      prompt,
    }));
  },
};

/** The chats, kept while the page is open, each named from its first message. */
class ScriptedThreads extends InMemoryThreadListAdapter {
  override async generateTitle(
    _remoteId?: string,
    messages: readonly ThreadMessage[] = [],
  ) {
    const title = textOf(messages.find((message) => message.role === "user"));
    return createAssistantStream((controller) => {
      controller.appendText(
        title.length > 48 ? `${title.slice(0, 48).trimEnd()}…` : title,
      );
    });
  }
}

const attachments = new CompositeAttachmentAdapter([
  new SimpleImageAttachmentAdapter(),
  new SimpleTextAttachmentAdapter(),
]);

const subscribeNever = () => () => {};

/** Speech recognition exists only in some browsers, which the server can't see. */
function useCanDictate() {
  return useSyncExternalStore(
    subscribeNever,
    WebSpeechDictationAdapter.isSupported,
    () => false,
  );
}

function useScriptedRuntime() {
  const adapter = useMemo(() => new ScriptedThreads(), []);
  return useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function ScriptedRuntime() {
      const canDictate = useCanDictate();
      const dictation = useMemo(
        () => (canDictate ? new WebSpeechDictationAdapter() : undefined),
        [canDictate],
      );
      return useLocalRuntime(script, {
        adapters: {
          attachments,
          suggestion: followUps,
          ...(dictation && { dictation }),
        },
      });
    },
  });
}

const config = AuiConfig({
  suggestions: Suggestions(data.welcome.suggestions),
});

/* -------------------------------------------------------------------------- */
/* Styles, on the same scale as the shell                                     */
/* -------------------------------------------------------------------------- */

const focusRing =
  "outline-hidden focus-visible:ring-1 focus-visible:ring-foreground/20";

const rItem = "rounded-[calc(var(--radius)-4px)]";

const iconButton = `text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground/90 dark:hover:bg-foreground/[0.09] flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-3.5 ${focusRing}`;

const textButton = `hover:bg-foreground/[0.06] flex h-7 items-center gap-1 rounded-full px-2.5 text-sm leading-5 transition-colors motion-reduce:transition-none ${focusRing}`;

const inkButton = `bg-foreground text-background flex items-center justify-center rounded-full font-medium transition-[opacity,scale] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none ${focusRing}`;

const field = "bg-foreground/4 dark:bg-foreground/6";

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

function Tip({
  label,
  side = "bottom",
  children,
}: {
  label: string;
  side?: "top" | "bottom";
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} aria-label={label} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

/* -------------------------------------------------------------------------- */
/* Chat: the shared shell, with a thread for its page                         */
/* -------------------------------------------------------------------------- */

export function Chat() {
  const runtime = useScriptedRuntime();
  const [query, setQuery] = useState("");

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <ChatSidebar
        title="Chat"
        history
        search={{ query, onQueryChange: setQuery, label: "Search chats" }}
        defaultOpen={false}
        list={<ChatList label="New chat" heading="Recent" query={query} />}
        footer={<User />}
      >
        <ChatHeader newLabel="New chat" searchLabel="Search chats" />
        <Thread />
      </ChatSidebar>
    </AssistantRuntimeProvider>
  );
}

function Thread() {
  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pt-2">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <Welcome />
          </AuiIf>
          <div className="flex flex-col gap-8 pb-10 empty:hidden">
            <ThreadPrimitive.Messages>
              {() => <Message />}
            </ThreadPrimitive.Messages>
          </div>
          <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto flex flex-col gap-2 pb-4">
            <Tip label="Scroll to the newest message">
              <ThreadPrimitive.ScrollToBottom
                className={cn(
                  iconButton,
                  "bg-background border-border/60 absolute -top-10 self-center border disabled:invisible",
                )}
              >
                <Icon icon={ArrowDown02Icon} />
              </ThreadPrimitive.ScrollToBottom>
            </Tip>
            <FollowUps />
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function Welcome() {
  return (
    <div className="my-auto flex flex-col items-center gap-6 py-8">
      <p className="text-center text-2xl font-medium tracking-tight">
        {data.welcome.title}
      </p>
      <div className="flex w-full max-w-md flex-col gap-0.5">
        <ThreadPrimitive.Suggestions>
          {() => (
            <SuggestionPrimitive.Trigger
              send
              className={cn(
                "hover:bg-accent flex h-10 items-center px-3 text-start transition-colors motion-reduce:transition-none",
                rItem,
                focusRing,
              )}
            >
              <span className="min-w-0 flex-1 truncate">
                <SuggestionPrimitive.Title />{" "}
                <SuggestionPrimitive.Description className="text-muted-foreground" />
              </span>
            </SuggestionPrimitive.Trigger>
          )}
        </ThreadPrimitive.Suggestions>
      </div>
      <p className="text-muted-foreground text-xs">{data.welcome.note}</p>
    </div>
  );
}

/* Suggestions that follow a reply, as chips right above the message box. */
function FollowUps() {
  const suggestions = useAuiState((s) => s.thread.suggestions);
  const visible = useAuiState(
    (s) =>
      !s.thread.isEmpty &&
      !s.thread.isRunning &&
      s.thread.suggestions.length > 0,
  );
  if (!visible) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map((suggestion) => (
        <ThreadPrimitive.Suggestion
          key={suggestion.prompt}
          prompt={suggestion.prompt}
          send
          className={cn(
            "border-border/60 hover:bg-accent h-8 rounded-full border px-3 text-sm transition-colors motion-reduce:transition-none",
            focusRing,
          )}
        >
          {suggestion.title ?? suggestion.prompt}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The message box                                                            */
/* -------------------------------------------------------------------------- */

function Composer() {
  const attached = useAuiState((s) => s.composer.attachments.length > 0);

  return (
    <ComposerPrimitive.Root className="flex flex-col">
      <div
        inert={!attached}
        className={cn(
          "grid transition-[grid-template-rows,margin] duration-200 ease-out motion-reduce:transition-none",
          attached ? "-mb-4 grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="bg-muted border-border/60 mx-4 flex [scrollbar-width:thin] gap-2 overflow-x-auto rounded-t-2xl border border-b-0 px-2 pt-2 pb-6">
            <ComposerPrimitive.Attachments>
              {() => <Attachment removable />}
            </ComposerPrimitive.Attachments>
          </div>
        </div>
      </div>
      <ComposerPrimitive.AttachmentDropzone className="bg-background/70 border-border/60 data-[dragging=true]:border-foreground/40 relative flex flex-col rounded-[1.75rem] border p-1.5 shadow-(--float-shadow) backdrop-blur-sm transition-colors motion-reduce:transition-none">
        <AuiIf condition={(s) => s.composer.dictation != null}>
          <DictationStatus />
        </AuiIf>
        {/* A phone has no room for the words beside the controls, so they take a row of their own above. */}
        <div className="flex items-end gap-0.5 max-sm:flex-wrap">
          <Tip label="Add a file" side="top">
            <ComposerPrimitive.AddAttachment
              className={cn(iconButton, "text-foreground size-9")}
            >
              <Icon icon={Attachment01Icon} className="size-4.5" />
            </ComposerPrimitive.AddAttachment>
          </Tip>
          {/* On a phone the words sit above, so this keeps the send button at the end of its row. */}
          <span aria-hidden className="hidden flex-1 max-sm:block" />
          <ComposerPrimitive.Input
            rows={1}
            autoFocus
            placeholder="Ask anything"
            aria-label="Message"
            className="placeholder:text-muted-foreground/70 max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-base leading-6 outline-none max-sm:order-first max-sm:basis-full max-sm:px-3"
          />
          <DictationButton />
          <AuiIf condition={(s) => s.thread.isRunning}>
            <Tip label="Stop" side="top">
              <ComposerPrimitive.Cancel className={cn(inkButton, "size-9")}>
                <span
                  aria-hidden
                  className="size-2.5 rounded-[2px] bg-current"
                />
              </ComposerPrimitive.Cancel>
            </Tip>
          </AuiIf>
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <Tip label="Send" side="top">
              <ComposerPrimitive.Send className={cn(inkButton, "size-9")}>
                <Icon icon={ArrowUp02Icon} className="size-4.5" />
              </ComposerPrimitive.Send>
            </Tip>
          </AuiIf>
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

function DictationButton() {
  const canDictate = useCanDictate();
  const dictating = useAuiState((s) => s.composer.dictation != null);
  if (!canDictate) return null;

  return dictating ? (
    <Tip label="Stop dictating" side="top">
      <ComposerPrimitive.StopDictation
        className={cn(
          iconButton,
          "bg-foreground/[0.07] text-foreground size-9",
        )}
      >
        <Icon icon={MicOff01Icon} className="size-4.5" />
      </ComposerPrimitive.StopDictation>
    </Tip>
  ) : (
    <Tip label="Dictate" side="top">
      <ComposerPrimitive.Dictate
        className={cn(iconButton, "text-foreground size-9")}
      >
        <Icon icon={Mic01Icon} className="size-4.5" />
      </ComposerPrimitive.Dictate>
    </Tip>
  );
}

/* While dictating: the words being heard, or a note that it is listening. */
function DictationStatus() {
  const hearing = useAuiState((s) => Boolean(s.composer.dictation?.transcript));

  return (
    <div className="text-muted-foreground flex items-center gap-2 px-3 pt-1.5 pb-0.5">
      <span
        aria-hidden
        className="bg-destructive size-1.5 shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
      />
      {hearing ? (
        <ComposerPrimitive.DictationTranscript className="min-w-0 truncate" />
      ) : (
        <span role="status">Listening</span>
      )}
    </div>
  );
}

/* A file: in the message box before it is sent, and on the message after. */
function Attachment({ removable = false }: { removable?: boolean }) {
  const name = useAuiState((s) => s.attachment.name);
  const isImage = useAuiState((s) => s.attachment.type === "image");
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root
      className={cn(
        field,
        rItem,
        "border-border/60 relative flex h-14 shrink-0 items-center overflow-hidden border",
        isImage && src ? "w-14" : "max-w-48 px-3",
      )}
    >
      {isImage && src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span className="truncate text-sm">{name}</span>
      )}
      {removable && (
        <Tip label="Remove the file" side="top">
          <AttachmentPrimitive.Remove
            className={cn(
              iconButton,
              "bg-background/90 text-foreground hover:bg-background absolute end-0.5 top-0.5 size-5",
            )}
          >
            <Icon icon={Cancel01Icon} />
          </AttachmentPrimitive.Remove>
        </Tip>
      )}
    </AttachmentPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

function Message() {
  const role = useAuiState((s) => s.message.role);
  const editing = useAuiState((s) => s.message.composer.isEditing);
  if (editing) return <EditComposer />;
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="group flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2 empty:hidden">
        <MessagePrimitive.Attachments>
          {() => <Attachment />}
        </MessagePrimitive.Attachments>
      </div>
      <div
        className={cn(
          field,
          "max-w-[80%] rounded-3xl px-4 py-2 leading-[1.375rem] wrap-break-word whitespace-pre-wrap",
        )}
      >
        <MessagePrimitive.Parts>
          {({ part }) => (part.type === "text" ? part.text : null)}
        </MessagePrimitive.Parts>
      </div>
      <div className="flex items-center gap-0.5">
        <BranchPicker />
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="always"
          className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 data-floating:opacity-0 motion-reduce:transition-none pointer-coarse:opacity-100"
        >
          <Tip label="Edit">
            <ActionBarPrimitive.Edit className={iconButton}>
              <Icon icon={PencilEdit02Icon} />
            </ActionBarPrimitive.Edit>
          </Tip>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function EditComposer() {
  return (
    <ComposerPrimitive.Root
      className={cn(
        field,
        "ms-auto flex w-full max-w-[80%] flex-col gap-1 rounded-3xl p-2",
      )}
    >
      <ComposerPrimitive.Input
        rows={1}
        autoFocus
        aria-label="Edit the message"
        className="max-h-40 min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-base leading-6 outline-none"
      />
      <div className="flex justify-end gap-1.5">
        <ComposerPrimitive.Cancel className={textButton}>
          Cancel
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send className={cn(inkButton, "h-7 px-3 text-sm")}>
          Send
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="group flex flex-col gap-2">
      <AuiIf
        condition={(s) =>
          s.message.status?.type === "running" && s.message.parts.length === 0
        }
      >
        <p role="status" className="text-muted-foreground">
          <span className="animate-pulse motion-reduce:animate-none">
            Thinking
          </span>
        </p>
      </AuiIf>
      <div className="leading-7">
        <MessagePrimitive.Parts
          components={{ Text: MarkdownText, Reasoning: Reasoning }}
        />
      </div>
      <div className="flex items-center gap-0.5">
        <BranchPicker />
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          className="-ms-1.5 flex data-floating:opacity-0 data-floating:group-hover:opacity-100 data-floating:focus-within:opacity-100 pointer-coarse:data-floating:opacity-100"
        >
          <Tip label="Copy">
            <ActionBarPrimitive.Copy className={iconButton}>
              <AuiIf condition={(s) => s.message.isCopied}>
                <Icon icon={Tick02Icon} />
              </AuiIf>
              <AuiIf condition={(s) => !s.message.isCopied}>
                <Icon icon={Copy01Icon} />
              </AuiIf>
            </ActionBarPrimitive.Copy>
          </Tip>
          <Tip label="Try again">
            <ActionBarPrimitive.Reload className={iconButton}>
              <Icon icon={RefreshIcon} />
            </ActionBarPrimitive.Reload>
          </Tip>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function MarkdownText() {
  return (
    <MarkdownTextPrimitive className="[&_:not(pre)>code]:bg-foreground/6 [&_pre]:bg-foreground/4 dark:[&_pre]:bg-foreground/6 [&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.875em] [&_h3]:mt-5 [&_h3]:mb-1 [&_h3]:font-semibold [&_li]:mt-1 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:ps-5 [&_ol+p]:mt-3 [&_p+p]:mt-3 [&_p+pre]:mt-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-5 [&_pre+p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:ps-5 [&_ul+p]:mt-3" />
  );
}

/* The model's thinking, folded under one line once the answer starts. */
const Reasoning: ReasoningMessagePartComponent = ({ text, status }) => {
  const [open, setOpen] = useState(false);
  const thinking = status.type === "running";

  return (
    <div className="mb-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={cn(
          "text-muted-foreground hover:text-foreground -ms-1 flex h-7 items-center gap-1 rounded-full px-1 transition-colors motion-reduce:transition-none",
          focusRing,
        )}
      >
        <span
          className={cn(thinking && "animate-pulse motion-reduce:animate-none")}
        >
          {thinking ? "Thinking" : "Thought it through"}
        </span>
        <Icon
          icon={ArrowDown01Icon}
          className={cn(
            "size-3.5 transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      {(open || thinking) && (
        <p className="text-muted-foreground border-border/60 mt-1 border-s-2 ps-3 text-sm leading-6">
          {text}
        </p>
      )}
    </div>
  );
};

/* Retrying or editing keeps every version; these step between them. */
function BranchPicker() {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className="text-muted-foreground flex items-center text-xs tabular-nums"
    >
      <Tip label="Previous version">
        <BranchPickerPrimitive.Previous className={iconButton}>
          <Icon icon={ArrowLeft01Icon} className="rtl:rotate-180" />
        </BranchPickerPrimitive.Previous>
      </Tip>
      <span>
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <Tip label="Next version">
        <BranchPickerPrimitive.Next className={iconButton}>
          <Icon icon={ArrowRight01Icon} className="rtl:rotate-180" />
        </BranchPickerPrimitive.Next>
      </Tip>
    </BranchPickerPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* The user row: shortcuts, and clearing the chats                            */
/* -------------------------------------------------------------------------- */

const SHORTCUTS = [
  { action: "Search chats", keys: ["⌘K", "Ctrl K"] },
  { action: "Show or hide the sidebar", keys: ["⌘B", "Ctrl B"] },
  { action: "Send the message", keys: ["Enter"] },
  { action: "Start a new line", keys: ["Shift Enter"] },
];

function User() {
  const aui = useAui();
  const chats = useChats();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <>
      <SidebarUser
        detail={chats.length === 1 ? "1 chat" : `${chats.length} chats`}
      >
        <SidebarUserItem onClick={() => setShortcutsOpen(true)}>
          <Icon icon={KeyboardIcon} />
          Keyboard shortcuts
        </SidebarUserItem>
        <SidebarUserSeparator />
        <SidebarUserItem
          destructive
          disabled={chats.length === 0}
          onClick={() => {
            for (const chat of chats)
              aui.threads().item({ id: chat.id }).delete();
          }}
        >
          <Icon icon={Delete01Icon} />
          Delete all chats
        </SidebarUserItem>
      </SidebarUser>
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-sm sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              ⌘ on a Mac, Ctrl on Windows and Linux.
            </DialogDescription>
          </DialogHeader>
          <dl className="flex flex-col text-sm">
            {SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.action}
                className="flex items-center justify-between gap-4 py-2"
              >
                <dt>{shortcut.action}</dt>
                <dd className="flex gap-1">
                  {shortcut.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}
