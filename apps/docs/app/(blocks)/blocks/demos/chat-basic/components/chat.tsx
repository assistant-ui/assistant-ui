"use client";

import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
  type ReactElement,
  type RefObject,
} from "react";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AssistantModalPrimitive,
  AssistantRuntimeProvider,
  AttachmentPrimitive,
  AuiConfig,
  AuiIf,
  BranchPickerPrimitive,
  ChainOfThoughtByIndicesProvider,
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
  ThreadListPrimitive,
  ThreadPrimitive,
  WebSpeechDictationAdapter,
  WebSpeechSynthesisAdapter,
  groupPartByType,
  unstable_useTriggerPopoverScopeContext,
  unstable_useTriggerPopoverTriggers,
  useAui,
  useAuiState,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
  type DirectiveFormatter,
  type DirectiveSegment,
  type GenerativeUIComponentRegistry,
  type GenerativeUINode,
  type LocalRuntimeOptions,
  type RemoteThreadListAdapter,
  type SuggestionAdapter,
  type ThreadAssistantMessagePart,
  type ThreadHistoryAdapter,
  type ThreadMessage,
  type ToolCallMessagePartProps,
  type TriggerAdapter,
  type TriggerItem,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import {
  Add01Icon,
  Alert02Icon,
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Copy01Icon,
  Download01Icon,
  Idea01Icon,
  Image01Icon,
  Mic01Icon,
  MicOff01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  PictureInPictureExitIcon,
  PictureInPictureOnIcon,
  PlayIcon,
  QuoteDownIcon,
  RefreshIcon,
  Search01Icon,
  SunCloud01Icon,
  StopIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  VolumeHighIcon,
  VolumeMute02Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChatList, ChatSidebar, ChatSidebarTrigger } from "../../chat-sidebar";

/* -------------------------------------------------------------------------- */
/* Runtime: a scripted model, so the chat runs without a key or a server.     */
/* Replace `scriptedModel` with a real `ChatModelAdapter` to talk to a model. */
/* -------------------------------------------------------------------------- */

const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#e8e6df"/><circle cx="236" cy="62" r="26" fill="#d97757"/><path d="M0 180 96 84l58 58 44-36 122 74z" fill="#3d3d3a"/></svg>',
)}`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const words = (text: string) => text.split(/(?<=\s)/);

function lastUserText(messages: readonly ThreadMessage[]) {
  const message = messages.findLast((entry) => entry.role === "user");
  return (message?.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ");
}

type MentionGroup = {
  id: string;
  label: string;
  items: readonly TriggerItem[];
};

/** What the @ popover offers, in two groups. */
const MENTION_GROUPS: readonly MentionGroup[] = [
  {
    id: "people",
    label: "People",
    items: [
      {
        id: "ada",
        type: "person",
        label: "Ada Lovelace",
        description: "Mathematician",
      },
      {
        id: "alan",
        type: "person",
        label: "Alan Turing",
        description: "Computer scientist",
      },
    ],
  },
  {
    id: "files",
    label: "Files",
    items: [
      {
        id: "chat.tsx",
        type: "file",
        label: "chat.tsx",
        description: "This block",
      },
      {
        id: "block.css",
        type: "file",
        label: "block.css",
        description: "Its theme",
      },
    ],
  },
];

const MENTIONS = new Map(
  MENTION_GROUPS.flatMap((group) => group.items).map((item) => [item.id, item]),
);

/** A mention travels in the message text as "@" and the item's id. */
const mentionFormat: DirectiveFormatter = {
  serialize: (item) => `@${item.id}`,
  parse(text) {
    const segments: DirectiveSegment[] = [];
    let end = 0;
    for (const match of text.matchAll(/(?<!\S)@([\w-]+(?:\.[\w-]+)*)/g)) {
      const item = MENTIONS.get(match[1] ?? "");
      if (!item) continue;
      if (match.index > end)
        segments.push({ kind: "text", text: text.slice(end, match.index) });
      segments.push({
        kind: "mention",
        type: item.type,
        label: item.label,
        id: item.id,
      });
      end = match.index + match[0].length;
    }
    if (end < text.length)
      segments.push({ kind: "text", text: text.slice(end) });
    return segments;
  },
};

const mentionAdapter: TriggerAdapter = {
  categories: () => MENTION_GROUPS,
  categoryItems: (id) =>
    MENTION_GROUPS.find((group) => group.id === id)?.items ?? [],
};

/** What the / popover offers. A command with a prompt sends that message. */
const COMMANDS: readonly TriggerItem[] = [
  {
    id: "weather",
    type: "command",
    label: "/weather",
    description: "Reasoning and a tool call",
    metadata: { prompt: "What is the weather in Tokyo?" },
  },
  {
    id: "image",
    type: "command",
    label: "/image",
    description: "An image in the reply",
    metadata: { prompt: "Draw me a picture." },
  },
  {
    id: "card",
    type: "command",
    label: "/card",
    description: "A card built from data",
    metadata: { prompt: "Show the forecast as a card." },
  },
  {
    id: "research",
    type: "command",
    label: "/research",
    description: "A sub-agent's messages",
    metadata: { prompt: "Hand the research to a sub-agent." },
  },
  {
    id: "drop",
    type: "command",
    label: "/drop",
    description: "A reply you can resume",
    metadata: { prompt: "Drop the connection." },
  },
  {
    id: "new",
    type: "command",
    label: "/new",
    description: "Start a new chat",
  },
];

const commandAdapter: TriggerAdapter = {
  categories: () => [],
  categoryItems: () => [],
  search: (query) =>
    COMMANDS.filter((command) => command.id.startsWith(query.toLowerCase())),
};

/** A stored message, with every field the runtime keeps on one. */
function storedMessage(
  id: string,
  role: "user" | "assistant",
  text: string,
  createdAt = new Date(),
): ThreadMessage {
  const content = [{ type: "text", text }] as const;
  if (role === "user")
    return {
      id,
      createdAt,
      role,
      content,
      attachments: [],
      metadata: { custom: {} },
    };
  return {
    id,
    createdAt,
    role,
    content,
    status: { type: "complete", reason: "stop" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  };
}

async function* write(
  parts: ThreadAssistantMessagePart[],
  type: "text" | "reasoning",
  text: string,
  signal: AbortSignal,
): AsyncGenerator<ChatModelRunResult, void> {
  const index = parts.length;
  let shown = "";
  for (const word of words(text)) {
    if (signal.aborted) return;
    shown += word;
    parts[index] = { type, text: shown };
    yield { content: [...parts] };
    await wait(40);
  }
}

/**
 * How a run ends when it stops before it writes anything. Assistant Cloud
 * reports this for a lost run; here the script reports it.
 */
const INTERRUPTED: ChatModelRunResult = {
  status: {
    type: "incomplete",
    reason: "error",
    error: {
      code: "run_stale",
      message: "The connection dropped before the reply started.",
    },
  },
};

/* A resumed run looks like any other run, so the script remembers which messages it already dropped. */
const dropped = new Set<string>();

const FORECAST = [
  ["Monday", "22°C"],
  ["Tuesday", "19°C"],
  ["Wednesday", "24°C"],
] as const;

const scriptedModel: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const segments = mentionFormat.parse(lastUserText(messages));
    const prompt = segments
      .map((segment) => (segment.kind === "text" ? segment.text : ""))
      .join("")
      .toLowerCase();
    const mentioned = segments.flatMap((segment) =>
      segment.kind === "mention" ? [segment.label] : [],
    );
    const parts: ThreadAssistantMessagePart[] = [];
    await wait(400);

    if (/error|fail/.test(prompt)) {
      throw new Error(
        "The scripted model fails when a message mentions an error. Edit the message to get a reply.",
      );
    }

    if (/connection|interrupt/.test(prompt)) {
      const turn = messages.at(-1)?.id;
      if (turn !== undefined && !dropped.has(turn)) {
        dropped.add(turn);
        await wait(800);
        if (abortSignal.aborted) return;
        yield INTERRUPTED;
        return;
      }
      yield* write(
        parts,
        "text",
        "The run started again from your message, and the empty reply it replaced is gone.",
        abortSignal,
      );
      return;
    }

    if (/card|forecast/.test(prompt)) {
      yield* write(parts, "text", "Here is the week in Tokyo.", abortSignal);
      const index = parts.length;
      const rows: GenerativeUINode[] = [];
      for (const [label, value] of FORECAST) {
        if (abortSignal.aborted) return;
        rows.push({ component: "Row", key: label, props: { label, value } });
        parts[index] = {
          type: "generative-ui",
          spec: {
            root: {
              component: "Card",
              props: { title: "Tokyo this week" },
              children: [...rows],
            },
          },
        };
        yield { content: [...parts] };
        await wait(300);
      }
      return;
    }

    if (/research|sub-agent/.test(prompt)) {
      const call = {
        type: "tool-call",
        toolCallId: crypto.randomUUID(),
        toolName: "research_agent",
        args: { topic: "Tokyo in spring" },
        argsText: '{ "topic": "Tokyo in spring" }',
      } as const;
      const brief = storedMessage(
        `${call.toolCallId}-brief`,
        "user",
        "Find two things to do in Tokyo in spring.",
      );
      const startedAt = new Date();
      const index = parts.length;
      let messages: ThreadMessage[] = [brief];
      parts[index] = { ...call, messages };
      yield { content: [...parts] };
      await wait(500);
      let answer = "";
      for (const word of words(
        "Ueno Park for the blossom, and the Meguro River after dark.",
      )) {
        if (abortSignal.aborted) return;
        answer += word;
        messages = [
          brief,
          storedMessage(
            `${call.toolCallId}-answer`,
            "assistant",
            answer,
            startedAt,
          ),
        ];
        parts[index] = { ...call, messages };
        yield { content: [...parts] };
        await wait(40);
      }
      parts[index] = { ...call, messages, result: { places: 2 } };
      yield* write(
        parts,
        "text",
        "The research agent suggests Ueno Park and the Meguro River. Its messages are under the line above.",
        abortSignal,
      );
      return;
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
        "It is 22°C and clear in Tokyo. Open the line above to see the reasoning and the tool call.",
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

    if (mentioned.length > 0) {
      yield* write(
        parts,
        "text",
        `You mentioned ${mentioned.join(" and ")}. A mention is sent as part of the message text, and the script reads it from there.`,
        abortSignal,
      );
      return;
    }

    yield* write(
      parts,
      "text",
      "This reply comes from a script inside the file. Select part of it to quote it, press Regenerate to add a branch, or send another message while this one is still being written to see the queue. Type / to see what else the script can do.",
      abortSignal,
    );
  },
};

/** Chats saved before the page opened. The sidebar loads them a page at a time. */
const OLDER_CHATS = [
  "Plan a weekend in Kyoto",
  "Name ideas for a bakery",
  "Explain binary search",
  "Draft a thank-you note",
  "Compare two laptops",
  "Fix a flaky test",
].map((title, index) => ({ remoteId: `older-${index + 1}`, title }));

const OLDER_PAGE = 3;

type ListParams = Parameters<RemoteThreadListAdapter["list"]>[0];
type ListPage = Awaited<ReturnType<RemoteThreadListAdapter["list"]>>;

class ScriptedThreadList extends InMemoryThreadListAdapter {
  // The first page holds some older chats, so Show older chats sits under them.
  private olderShown = OLDER_PAGE;

  constructor() {
    super();
    for (const chat of OLDER_CHATS) {
      void this.initialize(chat.remoteId);
      void this.rename(chat.remoteId, chat.title);
    }
  }

  /** This session's chats first, then as many older chats as were asked for. */
  override async list(params?: ListParams): Promise<ListPage> {
    const { threads } = await super.list();
    const first = params?.after === undefined;
    const from = first ? 0 : this.olderShown;
    if (!first) {
      await wait(400);
      this.olderShown += OLDER_PAGE;
    }
    const older = OLDER_CHATS.slice(from, this.olderShown).flatMap(
      (chat) =>
        threads.find((thread) => thread.remoteId === chat.remoteId) ?? [],
    );
    const recent = threads.filter(
      (thread) =>
        !OLDER_CHATS.some((chat) => chat.remoteId === thread.remoteId),
    );
    return {
      threads: first ? [...recent, ...older] : older,
      ...(this.olderShown < OLDER_CHATS.length
        ? { nextCursor: String(this.olderShown) }
        : {}),
    };
  }

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

const PROMPTS = [
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
];

const PROMPT_ICONS: Record<string, IconSvgElement> = {
  "What is the weather in Tokyo?": SunCloud01Icon,
  "Draw me a picture.": Image01Icon,
  "Fail with an error.": Alert02Icon,
};

/** After a reply, offers the prompts this chat has not used yet. */
const followUps: SuggestionAdapter = {
  async generate({ messages }) {
    const sent = new Set(
      messages
        .filter((message) => message.role === "user")
        .flatMap((message) =>
          message.content.map((part) =>
            part.type === "text" ? part.text : "",
          ),
        ),
    );
    return PROMPTS.filter((entry) => !sent.has(entry.prompt));
  },
};

const adapters = {
  attachments: new CompositeAttachmentAdapter([
    new SimpleImageAttachmentAdapter(),
    new SimpleTextAttachmentAdapter(),
  ]),
  dictation: new WebSpeechDictationAdapter(),
  feedback: { submit: () => {} },
  speech: new WebSpeechSynthesisAdapter(),
  suggestion: followUps,
} satisfies LocalRuntimeOptions["adapters"];

const config = AuiConfig({ suggestions: Suggestions(PROMPTS) });

/**
 * The history of one chat. An older chat loads its saved messages; nothing
 * is written back, because a chat lives in its runtime while the page is
 * open. The delete method is what lets Resume remove an interrupted reply.
 */
function useSavedHistory(): ThreadHistoryAdapter {
  const aui = useAui();
  return useMemo(
    () => ({
      async load() {
        const id = aui.threadListItem.getState().remoteId;
        const chat = OLDER_CHATS.find((entry) => entry.remoteId === id);
        if (!chat) return { messages: [] };
        const question = storedMessage(
          `${chat.remoteId}-q`,
          "user",
          chat.title,
        );
        const answer = storedMessage(
          `${chat.remoteId}-a`,
          "assistant",
          "This chat was saved before the page opened. The sidebar loads saved chats three at a time.",
        );
        return {
          messages: [
            { message: question, parentId: null },
            { message: answer, parentId: question.id },
          ],
        };
      },
      append: async () => {},
      delete: async () => {},
    }),
    [aui],
  );
}

function useScriptedRuntime() {
  const adapter = useMemo(() => new ScriptedThreadList(), []);
  return useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function RuntimeHook() {
      const history = useSavedHistory();
      return useLocalRuntime(scriptedModel, {
        unstable_enableMessageQueue: true,
        adapters: { ...adapters, history },
      });
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
  "outline-hidden focus-visible:ring-1 focus-visible:ring-foreground/20";

/*
 * One scale for the whole chat.
 * Corners: 16px for a surface on the page, 12px for anything inside one, and
 * a full pill for buttons and chips. The composer alone is rounder, at 24px.
 * Text: 14px for messages and the interface, 16px for what you type, 13px
 * inside menus, 12px for counts and code.
 * Chips, text buttons and list rows are 32px tall; icon buttons are 28px.
 */
const rSurface = "rounded-(--radius)";
const rItem = "rounded-[calc(var(--radius)-4px)]";
const textReading = "text-sm leading-[1.375rem]";
const textControl = "text-sm leading-5";

/* A row in a list: 32px tall, 12px corners, 8px side padding. */
const listRow = `hover:bg-accent flex h-8 items-center gap-2 px-2 transition-colors motion-reduce:transition-none ${rItem} ${focusRing}`;

const iconButton = `text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground/90 dark:hover:bg-foreground/[0.09] flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none [&_svg]:size-3.5 ${focusRing}`;

const iconSwap =
  "[grid-area:1/1] transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none";
const iconSwapIn = "scale-100 opacity-100 blur-none";
const iconSwapOut = "scale-[0.25] opacity-0 blur-[4px]";

function Tip({
  label,
  side = "bottom",
  children,
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} aria-label={label} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

/* A filled area with no border. */
const field = "bg-foreground/4 dark:bg-foreground/6";

/*
 * Paper: a quiet raised surface on the page, background fill and a 60%
 * border. Only layers that float (menus, popovers) carry a shadow.
 */
const paper = "bg-background border-border/60 border";

/* A suggestion chip: paper, 32px tall. */
const chip = `${paper} hover:bg-accent flex h-8 items-center rounded-full px-3.5 transition-colors motion-reduce:transition-none ${textControl} ${focusRing}`;

/* A small text button, the same height as a chip. */
const textButton = `flex h-8 items-center rounded-full px-3.5 transition-[background-color,color,scale] duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none ${textControl} ${focusRing}`;

/* Floating: glass with the one shadow, for layers above the page. */
const floating =
  "border-border/60 border bg-(--glass) shadow-(--float-shadow) backdrop-blur-(--glass-blur) not-supports-[backdrop-filter:blur(1px)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none";

/* A quote: muted 14px text behind a short rounded bar. */
const quote = `text-muted-foreground before:bg-foreground/20 relative min-w-0 ps-3 before:absolute before:inset-y-0.5 before:start-0 before:w-0.5 before:rounded-full ${textControl}`;

/*
 * A menu: a 16px glass popup with the float shadow, 13px text and 26px rows
 * (36px on touch) with 12px corners. Hover fills and muted text switch to
 * their glass colors, and the surface is solid where blur is unsupported or
 * reduced transparency is on.
 */
const menu =
  "text-popover-foreground border-border/60 z-50 flex min-w-40 origin-(--radix-dropdown-menu-content-transform-origin) flex-col rounded-(--radius) border bg-(--glass) p-1 text-[0.8125rem] leading-[1.125rem] font-[380] shadow-(--float-shadow) outline-none backdrop-blur-(--glass-blur) [--accent:var(--glass-hover)] [--muted-foreground:var(--glass-muted-foreground)] not-supports-[backdrop-filter:blur(1px)]:bg-popover data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-96 data-[state=open]:duration-150 data-[state=open]:ease-[cubic-bezier(0.2,0.7,0.2,1)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-96 data-[state=closed]:duration-100 data-[state=closed]:ease-[cubic-bezier(0.4,0,1,1)] motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100 [@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none";

const menuItem =
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex h-6.5 shrink-0 items-center gap-1.5 rounded-[calc(var(--radius)-4px)] px-2 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 pointer-coarse:h-9 [&_svg]:size-3.5 [&_svg]:shrink-0";

const menuSeparator = "bg-border mx-2 my-1 h-px shrink-0";

/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */

export function Chat() {
  const runtime = useScriptedRuntime();
  const [floating, setFloating] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <ChatSidebar
        title="Chats"
        history
        search={{ query, onQueryChange: setQuery, label: "Search chats" }}
        list={<ChatList label="New chat" archive query={query} />}
      >
        <Header floating={floating} onFloatingChange={setFloating} />
        {floating ? <FloatingChat /> : <Thread />}
      </ChatSidebar>
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
      <ChatSidebarTrigger />
      <h1 className="min-w-0 flex-1 truncate font-medium">
        {title || "New chat"}
      </h1>
      <Tip label="New chat">
        <ThreadListPrimitive.New className={cn(iconButton, "md:hidden")}>
          <Icon icon={Add01Icon} />
        </ThreadListPrimitive.New>
      </Tip>
      <Tip label={label}>
        <button
          type="button"
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
      </Tip>
    </header>
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
          <Tip label="Toggle the chat">
            <AssistantModalPrimitive.Trigger
              className={cn(
                "bg-primary text-primary-foreground flex size-full items-center justify-center rounded-full transition-transform active:scale-95 motion-reduce:transition-none",
                focusRing,
              )}
            >
              <Icon icon={BubbleChatIcon} className="size-5" />
            </AssistantModalPrimitive.Trigger>
          </Tip>
        </AssistantModalPrimitive.Anchor>
        <AssistantModalPrimitive.Content
          sideOffset={12}
          aria-label="Chat"
          className={cn(
            "bg-background border-border/60 z-50 flex h-[30rem] max-h-(--radix-popover-content-available-height) w-[24rem] max-w-[calc(100vw-2rem)] flex-col overflow-clip border shadow-(--float-shadow) outline-none",
            rSurface,
          )}
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
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <Welcome />
          </AuiIf>
          <div className="flex flex-col gap-8 pb-10 empty:hidden">
            <ThreadPrimitive.Messages>
              {() => <Message />}
            </ThreadPrimitive.Messages>
          </div>
          <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto flex flex-col pb-4">
            <Tip label="Scroll to the newest message">
              <ThreadPrimitive.ScrollToBottom
                className={cn(
                  iconButton,
                  paper,
                  "absolute -top-10 self-center disabled:invisible",
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

      <SelectionToolbarPrimitive.Root
        className={cn(
          floating,
          "text-popover-foreground z-50 rounded-full p-0.5",
        )}
      >
        <SelectionToolbarPrimitive.Quote
          className={cn(textButton, "gap-1.5 px-2.5 hover:bg-(--glass-hover)")}
        >
          <Icon icon={QuoteDownIcon} className="size-3.5" />
          Quote
        </SelectionToolbarPrimitive.Quote>
      </SelectionToolbarPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

/* Suggestions that follow a reply, as chips right above the composer. */
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
    <div className="flex flex-wrap gap-1.5 pb-2">
      {suggestions.map((suggestion) => (
        <ThreadPrimitive.Suggestion
          key={suggestion.prompt}
          prompt={suggestion.prompt}
          send
          className={chip}
        >
          {suggestion.title ?? suggestion.prompt}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

/** The icon for the suggestion being rendered, matched by its prompt. */
function SuggestionIcon({ className }: { className?: string }) {
  const prompt = useAuiState((s) => s.suggestion.prompt);
  const icon = PROMPT_ICONS[prompt];
  return icon ? (
    <Icon icon={icon} {...(className ? { className } : {})} />
  ) : null;
}

function Welcome() {
  return (
    <div className="my-auto flex flex-col items-center gap-6 pb-6">
      <p className="text-center text-2xl font-medium tracking-tight">
        What should we try first?
      </p>
      <div className="flex w-full max-w-sm flex-col gap-0.5">
        <ThreadPrimitive.Suggestions>
          {() => (
            <SuggestionPrimitive.Trigger
              send
              className={cn(listRow, "h-9 gap-2.5 text-start")}
            >
              <span
                className={cn(
                  field,
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                )}
              >
                <SuggestionIcon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                <SuggestionPrimitive.Title />{" "}
                <SuggestionPrimitive.Description className="text-muted-foreground" />
              </span>
            </SuggestionPrimitive.Trigger>
          )}
        </ThreadPrimitive.Suggestions>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer, QueueItem                                                        */
/* -------------------------------------------------------------------------- */

function Composer() {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <ComposerPrimitive.TriggerPopoverRoot>
      <ComposerPrimitive.Root className="relative flex flex-col">
        <MentionPopover />
        <CommandPopover />
        <ComposerPrimitive.AttachmentDropzone className="bg-background data-[dragging=true]:border-ring border-border/60 flex flex-col gap-2 rounded-3xl border p-2 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-colors data-[dragging=true]:border-dashed motion-reduce:transition-none">
          <ComposerPrimitive.Queue>
            {() => (
              <div
                className={cn(
                  field,
                  "flex h-9 items-center gap-1 ps-3 pe-1.5",
                  rItem,
                  textControl,
                )}
              >
                <QueueItemPrimitive.Text className="min-w-0 flex-1 truncate" />
                <QueueItemPrimitive.Steer
                  className={cn(
                    textButton,
                    "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground h-7 px-2.5",
                  )}
                >
                  Send now
                </QueueItemPrimitive.Steer>
                <Tip label="Remove from the queue">
                  <QueueItemPrimitive.Remove
                    className={cn(iconButton, "size-6")}
                  >
                    <Icon icon={Cancel01Icon} />
                  </QueueItemPrimitive.Remove>
                </Tip>
              </div>
            )}
          </ComposerPrimitive.Queue>

          <ComposerPrimitive.Quote className="flex items-start gap-2 px-2 pt-1.5">
            <ComposerPrimitive.QuoteText
              className={cn(quote, "line-clamp-2 flex-1")}
            />
            <Tip label="Remove the quote">
              <ComposerPrimitive.QuoteDismiss
                className={cn(iconButton, "-me-1 -mt-0.5 size-6")}
              >
                <Icon icon={Cancel01Icon} />
              </ComposerPrimitive.QuoteDismiss>
            </Tip>
          </ComposerPrimitive.Quote>

          <div className="flex flex-wrap gap-2 empty:hidden">
            <ComposerPrimitive.Attachments>
              {() => <Attachment removable />}
            </ComposerPrimitive.Attachments>
          </div>

          <AuiIf condition={(s) => s.composer.dictation != null}>
            <DictationStatus />
          </AuiIf>

          <ComposerPrimitive.Input
            ref={inputRef}
            rows={1}
            placeholder="Send a message"
            aria-label="Message"
            className="placeholder:text-muted-foreground/50 max-h-40 min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <Tip label="Add a file">
                <ComposerPrimitive.AddAttachment className={iconButton}>
                  <Icon icon={Attachment01Icon} />
                </ComposerPrimitive.AddAttachment>
              </Tip>
              <TriggerButtons inputRef={inputRef} />
            </div>
            <div className="flex items-center gap-1.5">
              <DictationButton />
              <AuiIf condition={(s) => s.thread.isRunning}>
                <Tip label="Stop the reply">
                  <ComposerPrimitive.Cancel
                    className={cn(iconButton, "border-border/60 border")}
                  >
                    <Icon icon={StopIcon} className="size-3! fill-current" />
                  </ComposerPrimitive.Cancel>
                </Tip>
              </AuiIf>
              <Tip label="Send the message">
                <ComposerPrimitive.Send
                  className={cn(
                    "bg-primary text-primary-foreground inline-flex size-7 items-center justify-center rounded-full transition-opacity disabled:opacity-30 motion-reduce:transition-none",
                    focusRing,
                  )}
                >
                  <Icon icon={ArrowUp02Icon} className="size-4" />
                </ComposerPrimitive.Send>
              </Tip>
            </div>
          </div>
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Root>
    </ComposerPrimitive.TriggerPopoverRoot>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer trigger popovers: @ to mention, / for a command                   */
/* -------------------------------------------------------------------------- */

/* A menu that opens above the composer while a trigger is being typed. */
const triggerPopover = cn(
  menu,
  "absolute start-0 bottom-full mb-2 w-64 origin-bottom-left",
);

/* Keeps the caret in the message while a row is clicked. */
const keepFocus = (event: { preventDefault: () => void }) =>
  event.preventDefault();

function MentionPopover() {
  return (
    <ComposerPrimitive.TriggerPopover
      char="@"
      adapter={mentionAdapter}
      aria-label="Mention"
      onMouseDown={keepFocus}
      className={triggerPopover}
    >
      <ComposerPrimitive.TriggerPopover.Directive formatter={mentionFormat} />
      <ComposerPrimitive.TriggerPopoverCategories className="flex flex-col">
        {(categories) =>
          categories.map((category) => (
            <ComposerPrimitive.TriggerPopoverCategoryItem
              key={category.id}
              categoryId={category.id}
              className={cn(menuItem, "w-full justify-between")}
            >
              {category.label}
              <Icon
                icon={ArrowRight01Icon}
                className="text-muted-foreground rtl:rotate-180"
              />
            </ComposerPrimitive.TriggerPopoverCategoryItem>
          ))
        }
      </ComposerPrimitive.TriggerPopoverCategories>
      <TriggerItems />
    </ComposerPrimitive.TriggerPopover>
  );
}

function CommandPopover() {
  const aui = useAui();

  return (
    <ComposerPrimitive.TriggerPopover
      char="/"
      adapter={commandAdapter}
      aria-label="Commands"
      onMouseDown={keepFocus}
      className={triggerPopover}
    >
      <ComposerPrimitive.TriggerPopover.Action
        removeOnExecute
        onExecute={(item) => {
          const prompt = item.metadata?.["prompt"];
          if (typeof prompt === "string") aui.thread().append(prompt);
          else aui.threads().switchToNewThread();
        }}
      />
      <TriggerItems />
    </ComposerPrimitive.TriggerPopover>
  );
}

/* The rows of either popover: a way back out of a group, then its items. */
function TriggerItems() {
  return (
    <ComposerPrimitive.TriggerPopoverItems className="flex flex-col">
      {(items) => (
        <>
          <ComposerPrimitive.TriggerPopoverBack
            className={cn(
              menuItem,
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full",
            )}
          >
            <Icon icon={ArrowLeft01Icon} className="rtl:rotate-180" />
            Back
          </ComposerPrimitive.TriggerPopoverBack>
          {items.map((item, index) => (
            <ComposerPrimitive.TriggerPopoverItem
              key={item.id}
              item={item}
              index={index}
              className={cn(menuItem, "w-full justify-between gap-3")}
            >
              <span className="shrink-0">{item.label}</span>
              <span className="text-muted-foreground truncate">
                {item.description}
              </span>
            </ComposerPrimitive.TriggerPopoverItem>
          ))}
          <NoMatches />
        </>
      )}
    </ComposerPrimitive.TriggerPopoverItems>
  );
}

function NoMatches() {
  const { query, items } = unstable_useTriggerPopoverScopeContext();
  if (items.length > 0) return null;

  return (
    <p className="text-muted-foreground flex h-6.5 items-center px-2 pointer-coarse:h-9">
      {query ? `Nothing matches "${query}"` : "Nothing here"}
    </p>
  );
}

const TRIGGER_BUTTONS = [
  { char: "@", label: "Mention a person or a file" },
  { char: "/", label: "Run a command" },
];

/* One button per popover, for anyone who does not know the character. */
function TriggerButtons({
  inputRef,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const aui = useAui();
  const triggers = unstable_useTriggerPopoverTriggers();

  return TRIGGER_BUTTONS.map(({ char, label }) => (
    <Tip key={char} label={label}>
      <button
        type="button"
        disabled={!triggers.has(char)}
        onClick={() => {
          const text = aui.composer().getState().text;
          const next = /(^|\s)$/.test(text) ? text + char : `${text} ${char}`;
          aui.composer().setText(next);
          triggers.get(char)?.resource.setCursorPosition(next.length);
          const input = inputRef.current;
          input?.focus();
          // The caret moves once the new text is in the field.
          requestAnimationFrame(() =>
            input?.setSelectionRange(next.length, next.length),
          );
        }}
        className={cn(iconButton, "font-mono text-sm")}
      >
        {char}
      </button>
    </Tip>
  ));
}

/* -------------------------------------------------------------------------- */
/* Dictation                                                                  */
/* -------------------------------------------------------------------------- */

const subscribeNever = () => () => {};

/* Speech recognition is a browser feature, so the server answers no. */
function useCanDictate() {
  return useSyncExternalStore(
    subscribeNever,
    WebSpeechDictationAdapter.isSupported,
    () => false,
  );
}

function DictationButton() {
  const canDictate = useCanDictate();
  const dictating = useAuiState((s) => s.composer.dictation != null);
  if (!canDictate) return null;

  return dictating ? (
    <Tip label="Stop dictating">
      <ComposerPrimitive.StopDictation
        className={cn(
          iconButton,
          "bg-foreground/[0.06] text-foreground/90 dark:bg-foreground/[0.09]",
        )}
      >
        <Icon icon={MicOff01Icon} />
      </ComposerPrimitive.StopDictation>
    </Tip>
  ) : (
    <Tip label="Dictate">
      <ComposerPrimitive.Dictate className={iconButton}>
        <Icon icon={Mic01Icon} />
      </ComposerPrimitive.Dictate>
    </Tip>
  );
}

/* While dictating: the words being heard, or a note that it is listening. */
function DictationStatus() {
  const hearing = useAuiState((s) => Boolean(s.composer.dictation?.transcript));

  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-2 px-2 pt-1.5",
        textControl,
      )}
    >
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

/* -------------------------------------------------------------------------- */
/* Attachment                                                                 */
/* -------------------------------------------------------------------------- */

function Attachment({ removable = false }: { removable?: boolean }) {
  return (
    <AttachmentPrimitive.Root
      className={cn(
        paper,
        "flex h-9 max-w-56 items-center gap-2 ps-1.5 pe-2.5",
        rItem,
        textControl,
      )}
    >
      <AttachmentPrimitive.unstable_Thumb
        className={cn(
          field,
          "text-muted-foreground flex h-6 min-w-6 items-center justify-center rounded-[calc(var(--radius)-8px)] px-1 font-mono text-[10px]",
        )}
      />
      <span className="min-w-0 flex-1 truncate">
        <AttachmentPrimitive.Name />
      </span>
      {removable && (
        <Tip label="Remove the file">
          <AttachmentPrimitive.Remove
            className={cn(iconButton, "-me-2 size-6")}
          >
            <Icon icon={Cancel01Icon} />
          </AttachmentPrimitive.Remove>
        </Tip>
      )}
    </AttachmentPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Message, MessagePart, ChainOfThought, Error, ActionBar.Resume              */
/* -------------------------------------------------------------------------- */

function Message() {
  const role = useAuiState((s) => s.message.role);
  const editing = useAuiState((s) => s.message.composer.isEditing);

  if (editing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
}

/* Shown only while the pointer is over the message, or focus is inside it. */
const actionBar =
  "flex gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 has-data-[state=open]:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100";

function UserMessage() {
  return (
    <MessagePrimitive.Root className="group relative flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2 empty:hidden">
        <MessagePrimitive.Attachments>
          {() => <Attachment />}
        </MessagePrimitive.Attachments>
      </div>
      <MessagePrimitive.Quote>
        {({ text }) => (
          <blockquote className={cn(quote, "line-clamp-3 max-w-[80%]")}>
            {text}
          </blockquote>
        )}
      </MessagePrimitive.Quote>
      <div
        data-aui-quote-selectable=""
        className={cn(
          "bg-muted max-w-[80%] wrap-break-word whitespace-pre-wrap",
          "px-3 py-1.5",
          textReading,
          rSurface,
        )}
      >
        <MessagePrimitive.Parts>
          {({ part }) =>
            part.type === "text" ? <UserText text={part.text} /> : null
          }
        </MessagePrimitive.Parts>
      </div>
      <div
        className={cn("flex items-center", "absolute end-0 top-full pt-0.5")}
      >
        <BranchPicker />
        <ActionBarPrimitive.Root hideWhenRunning className={actionBar}>
          <Tip label="Edit">
            <ActionBarPrimitive.Edit className={iconButton}>
              <Icon icon={PencilEdit02Icon} />
            </ActionBarPrimitive.Edit>
          </Tip>
          <CopyButton />
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

/* The text of a user message, with each mention shown by its name. */
function UserText({ text }: { text: string }) {
  return mentionFormat.parse(text).map((segment, index) =>
    segment.kind === "text" ? (
      segment.text
    ) : (
      <span key={index} className="font-semibold">
        @{segment.label}
      </span>
    ),
  );
}

function EditComposer() {
  return (
    <MessagePrimitive.Root
      data-aui-quote-selectable="false"
      className="flex justify-end"
    >
      <ComposerPrimitive.Root
        className={cn(
          paper,
          "flex w-full max-w-[80%] flex-col gap-2 rounded-3xl p-2",
        )}
      >
        <ComposerPrimitive.Input
          autoFocus
          aria-label="Edit the message"
          className="min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none"
        />
        <div className="flex justify-end gap-1">
          <ComposerPrimitive.Cancel
            className={cn(
              textButton,
              "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            Cancel
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send
            className={cn(
              textButton,
              "bg-primary text-primary-foreground hover:bg-primary/90 font-medium",
            )}
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
    <MessagePrimitive.Root className="group relative flex flex-col items-start gap-1.5">
      <div
        data-aui-quote-selectable=""
        className={cn(
          "flex max-w-full flex-col gap-2 wrap-break-word",
          textReading,
        )}
      >
        <MessagePrimitive.GroupedParts groupBy={groupParts}>
          {({ part }) => {
            switch (part.type) {
              case "group-thought":
                return (
                  <ChainOfThoughtByIndicesProvider
                    startIndex={part.indices[0] ?? 0}
                    endIndex={part.indices.at(-1) ?? 0}
                  >
                    <ChainOfThought />
                  </ChainOfThoughtByIndicesProvider>
                );
              case "text":
                return <TextPart />;
              case "image":
                return <ImagePart />;
              case "tool-call":
                return part.messages ? (
                  <SubAgentPart {...part} />
                ) : (
                  <ToolCallPart {...part} />
                );
              case "generative-ui":
                return (
                  <MessagePrimitive.GenerativeUI
                    components={cardComponents}
                    Fallback={UnknownComponent}
                  />
                );
              case "indicator":
                return <WorkingDot />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root
            data-aui-quote-selectable="false"
            className={cn(
              "border-destructive/20 text-destructive bg-destructive/5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border px-3 py-2",
              rItem,
              textControl,
            )}
          >
            <ErrorPrimitive.Message className="min-w-0 flex-1" />
            <ActionBarPrimitive.Resume
              className={cn(
                textButton,
                "hover:bg-destructive/10 -my-1 -me-1.5 h-7 gap-1.5 px-2.5 font-medium disabled:hidden",
              )}
            >
              <Icon icon={PlayIcon} className="size-3.5" />
              Resume
            </ActionBarPrimitive.Resume>
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
      <div
        className={cn(
          "-ms-1.5 flex items-center",
          "absolute start-0 top-full pt-0.5",
        )}
      >
        <BranchPicker />
        <ActionBarPrimitive.Root hideWhenRunning className={actionBar}>
          <CopyButton />
          <AuiIf condition={(s) => s.message.speech != null}>
            <Tip label="Stop reading">
              <ActionBarPrimitive.StopSpeaking className={iconButton}>
                <Icon icon={VolumeMute02Icon} />
              </ActionBarPrimitive.StopSpeaking>
            </Tip>
          </AuiIf>
          <Tip label="Good reply">
            <ActionBarPrimitive.FeedbackPositive
              className={cn(
                iconButton,
                "data-submitted:bg-foreground/[0.06] data-submitted:text-foreground/90 dark:data-submitted:bg-foreground/[0.09]",
              )}
            >
              <Icon icon={ThumbsUpIcon} />
            </ActionBarPrimitive.FeedbackPositive>
          </Tip>
          <Tip label="Bad reply">
            <ActionBarPrimitive.FeedbackNegative
              className={cn(
                iconButton,
                "data-submitted:bg-foreground/[0.06] data-submitted:text-foreground/90 dark:data-submitted:bg-foreground/[0.09]",
              )}
            >
              <Icon icon={ThumbsDownIcon} />
            </ActionBarPrimitive.FeedbackNegative>
          </Tip>
          <Tip label="Regenerate">
            <ActionBarPrimitive.Reload className={iconButton}>
              <Icon icon={RefreshIcon} />
            </ActionBarPrimitive.Reload>
          </Tip>
          <ActionBarMorePrimitive.Root>
            <Tip label="More">
              <ActionBarMorePrimitive.Trigger
                className={cn(
                  iconButton,
                  "data-[state=open]:bg-foreground/[0.06] data-[state=open]:text-foreground/90",
                )}
              >
                <Icon icon={MoreHorizontalIcon} />
              </ActionBarMorePrimitive.Trigger>
            </Tip>
            <ActionBarMorePrimitive.Content
              side="bottom"
              align="start"
              sideOffset={4}
              className={menu}
            >
              <ActionBarPrimitive.Speak asChild>
                <ActionBarMorePrimitive.Item className={menuItem}>
                  <Icon icon={VolumeHighIcon} />
                  Read aloud
                </ActionBarMorePrimitive.Item>
              </ActionBarPrimitive.Speak>
              <ActionBarMorePrimitive.Separator className={menuSeparator} />
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
      className={cn("border-border/60 w-64 max-w-full border", rItem)}
    />
  );
}

function WorkingDot() {
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

/*
 * Reasoning and tool calls that follow one another form one group, shown as
 * a single line that opens. The research agent's call stays outside it.
 */
const groupParts = groupPartByType({
  reasoning: ["group-thought"],
  "tool-call": ["group-thought"],
  "tool-call:research_agent": [],
});

/*
 * Trace lines: reasoning and tool calls as plain muted rows, each an icon, a
 * one-line title and a chevron when it expands. A running row shimmers and
 * says what it is doing in the present tense.
 */
const traceTrigger = `${textControl} text-muted-foreground hover:text-foreground flex w-fit max-w-full min-w-0 items-center gap-1 rounded-full text-start transition-colors motion-reduce:transition-none ${focusRing}`;
const traceDetail = "border-border/60 ms-2 flex flex-col gap-2 border-s ps-4";

function TraceChevron({ open }: { open: boolean }) {
  return (
    <Icon
      icon={ArrowRight01Icon}
      className={cn(
        "size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none",
        open ? "rotate-90" : "rtl:rotate-180",
      )}
    />
  );
}

function TraceTitle({
  running,
  icon,
  children,
}: PropsWithChildren<{ running: boolean; icon: IconSvgElement }>) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon
        icon={running ? icon : CheckmarkCircle02Icon}
        className="size-4 shrink-0"
      />
      <span
        className={cn(
          "min-w-0 truncate",
          running ? "shimmer motion-reduce:animate-none" : "",
        )}
      >
        {children}
      </span>
    </span>
  );
}

function ChainOfThought() {
  const open = useAuiState((s) => !s.chainOfThought.collapsed);
  const running = useAuiState(
    (s) => s.chainOfThought.status.type === "running",
  );

  return (
    <ChainOfThoughtPrimitive.Root
      data-aui-quote-selectable="false"
      className="flex flex-col gap-2"
    >
      <ChainOfThoughtPrimitive.AccordionTrigger className={traceTrigger}>
        <TraceTitle running={running} icon={Idea01Icon}>
          {running ? "Thinking" : "Thought it through"}
        </TraceTitle>
        <TraceChevron open={open} />
      </ChainOfThoughtPrimitive.AccordionTrigger>
      {open && (
        <div className={traceDetail}>
          <ChainOfThoughtPrimitive.Parts>
            {({ part }) => {
              if (part.type === "reasoning")
                return <ReasoningPart text={part.text} />;
              if (part.type === "tool-call") return <ToolCallPart {...part} />;
              return null;
            }}
          </ChainOfThoughtPrimitive.Parts>
        </div>
      )}
    </ChainOfThoughtPrimitive.Root>
  );
}

function ReasoningPart({ text }: { text: string }) {
  return (
    <p className={cn("text-muted-foreground whitespace-pre-wrap", textControl)}>
      {text}
    </p>
  );
}

type ToolCallProps = Pick<
  ToolCallMessagePartProps,
  "toolName" | "args" | "argsText" | "result" | "status"
>;

function ToolCallPart({ toolName, argsText, result, status }: ToolCallProps) {
  const [open, setOpen] = useState(false);
  const running = status.type === "running";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={traceTrigger}
      >
        <TraceTitle running={running} icon={Wrench01Icon}>
          {running ? "Running" : "Ran"}{" "}
          <span className="font-mono text-xs">{toolName}</span>
        </TraceTitle>
        <TraceChevron open={open} />
      </button>
      {open && (
        <pre
          className={cn(
            field,
            "text-foreground overflow-x-auto px-3 py-2 font-mono text-xs leading-5",
            rItem,
          )}
        >
          {argsText}
          {result === undefined ? "" : `\n${JSON.stringify(result)}`}
        </pre>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MessagePart.Messages: the messages of a sub-agent, under its tool call     */
/* -------------------------------------------------------------------------- */

function SubAgentPart({ args, status }: ToolCallProps) {
  const [open, setOpen] = useState(true);
  const running = status.type === "running";

  return (
    <div data-aui-quote-selectable="false" className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={traceTrigger}
      >
        <TraceTitle running={running} icon={Search01Icon}>
          {running ? "Researching" : "Researched"} {String(args["topic"])}
        </TraceTitle>
        <TraceChevron open={open} />
      </button>
      {open && (
        <div className={traceDetail}>
          <MessagePartPrimitive.Messages>
            {() => <SubAgentMessage />}
          </MessagePartPrimitive.Messages>
        </div>
      )}
    </div>
  );
}

function SubAgentMessage() {
  const fromAgent = useAuiState((s) => s.message.role === "assistant");

  return (
    <MessagePrimitive.Root className={cn("flex flex-col", textControl)}>
      <span className="text-muted-foreground text-xs">
        {fromAgent ? "Research agent" : "Brief"}
      </span>
      <MessagePrimitive.Parts>
        {({ part }) =>
          part.type === "text" ? (
            <p className="whitespace-pre-wrap">
              <MessagePartPrimitive.Text />
            </p>
          ) : null
        }
      </MessagePrimitive.Parts>
    </MessagePrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Message.GenerativeUI: a card the reply describes as data                   */
/* -------------------------------------------------------------------------- */

function Card({ title, children }: PropsWithChildren<{ title?: string }>) {
  return (
    <div
      className={cn(paper, "flex w-64 max-w-full flex-col gap-2 p-3", rItem)}
    >
      <p className="font-medium">{title}</p>
      <dl className="flex flex-col gap-1">{children}</dl>
    </div>
  );
}

function CardRow({ label, value }: { label?: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/* The reply may only name the components listed here. */
const cardComponents: GenerativeUIComponentRegistry = {
  Card,
  Row: CardRow,
};

function UnknownComponent({ component }: { component: string }) {
  return (
    <span className={cn("text-muted-foreground font-mono text-xs")}>
      {component}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* ActionBar pieces and BranchPicker                                          */
/* -------------------------------------------------------------------------- */

function CopyButton() {
  const copied = useAuiState((s) => s.message.isCopied);

  return (
    <Tip label={copied ? "Copied" : "Copy"}>
      <ActionBarPrimitive.Copy
        className={cn(
          iconButton,
          "grid place-items-center",
          copied ? "text-emerald-500" : "",
        )}
      >
        <Icon
          icon={Copy01Icon}
          className={cn(iconSwap, copied ? iconSwapOut : iconSwapIn)}
        />
        <Icon
          icon={Tick02Icon}
          className={cn(iconSwap, copied ? iconSwapIn : iconSwapOut)}
        />
      </ActionBarPrimitive.Copy>
    </Tip>
  );
}

function BranchPicker() {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className="text-muted-foreground me-1 inline-flex items-center text-xs tabular-nums"
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
