"use client";

import "./gemini.css";
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AttachmentPrimitive,
  AuiIf,
  ComposerPrimitive,
  CompositeAttachmentAdapter,
  MessagePrimitive,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  ThreadPrimitive,
  WebSpeechDictationAdapter,
  WebSpeechSynthesisAdapter,
  groupPartByType,
  unstable_useMentionAdapter,
  useAui,
  useAuiEvent,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
  type DirectiveFormatter,
  type FeedbackAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import {
  Add01Icon,
  Album02Icon,
  AnalyticsUpIcon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowMoveDownRightIcon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  AtIcon,
  Attachment01Icon,
  Book02Icon,
  Briefcase01Icon,
  BubbleChatIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  Clock01Icon,
  CodeIcon,
  Comment01Icon,
  Copy01Icon,
  CopyrightIcon,
  Cursor01Icon,
  DashboardSpeed01Icon,
  DashboardSquare01Icon,
  Delete02Icon,
  DiamondIcon,
  Download04Icon,
  File01Icon,
  FileEditIcon,
  FilterIcon,
  Flag02Icon,
  GitBranchIcon,
  GlobalSearchIcon,
  Globe02Icon,
  GoogleDriveIcon,
  HelpCircleIcon,
  HistoryIcon,
  Image01Icon,
  Link01Icon,
  Loading03Icon,
  Location01Icon,
  Mail01Icon,
  Menu01Icon,
  Message01Icon,
  MessageDone01Icon,
  MessageNotification01Icon,
  Mic01Icon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  Note01Icon,
  Notebook01Icon,
  PencilEdit01Icon,
  PencilEdit02Icon,
  PinIcon,
  RedoIcon,
  Rocket01Icon,
  Search01Icon,
  SecurityCheckIcon,
  SentIcon,
  Settings02Icon,
  Share01Icon,
  Share08Icon,
  Shield01Icon,
  ShoppingCart01Icon,
  SidebarLeftIcon,
  SquareLock02Icon,
  StopCircleIcon,
  StopIcon,
  Sun03Icon,
  Target02Icon,
  TaskEdit01Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  Upload04Icon,
  UserCircleIcon,
  UserIcon,
  UserSettings01Icon,
  Video01Icon,
  VolumeHighIcon,
  WorkflowSquare03Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Tooltip } from "@base-ui/react/tooltip";
import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { useAttachmentSrc } from "@/hooks/use-attachment-src";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import { DEMO_PERSON, PersonAvatar } from "../person";
import data from "./data.json";

/** Ratings stay in the message's metadata; this demo sends them nowhere. */
const feedback: FeedbackAdapter = { submit() {} };

const adapters = {
  attachments: new CompositeAttachmentAdapter([
    new SimpleImageAttachmentAdapter(),
    new SimpleTextAttachmentAdapter(),
  ]),
  dictation: new WebSpeechDictationAdapter(),
  speech: new WebSpeechSynthesisAdapter(),
  feedback,
};

/* -------------------------------------------------------------------------- */
/* The script: what Gemini answers, in place of a model.                      */
/* Swap `script` for a real ChatModelAdapter to answer with a model.          */
/* -------------------------------------------------------------------------- */

const THINKING = [
  "Reading the request and what is attached to it.",
  "This demo answers from a script, so the reply describes the clone instead of the question.",
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function lastUserText(messages: readonly ThreadMessage[]) {
  const message = messages.findLast((entry) => entry.role === "user");
  return (message?.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

/** Yields `text` a word at a time, each step the full text so far. */
async function* streamWords(text: string, signal: AbortSignal) {
  let shown = "";
  for (const word of text.split(/(?<=\s)/)) {
    if (signal.aborted) return;
    shown += word;
    yield shown;
    await wait(30);
  }
}

function quote(text: string) {
  return text.length > 60 ? `${text.slice(0, 60).trimEnd()}…` : text;
}

function replyFor(asked: string, custom: Record<string, unknown>) {
  const tool = typeof custom["tool"] === "string" ? custom["tool"] : null;
  const opener =
    custom["mode"] === "task"
      ? `Here is how this task would go. The demo answers from a script, so nothing was done for “${quote(asked)}”.`
      : `This is the Gemini clone answering from a script, so no model read “${quote(asked)}”.`;

  return `${opener}${tool ? `\n\nThe **${tool}** chip rode along in the run config, so a real route could read it.` : ""}

What works here:

- **Chats** in the sidebar, with pin, rename, mark as unread, and delete
- **Temporary chat**, which keeps a chat out of the list
- **Attachments** from the + menu, and **@** for mentions
- **Dictation**, **Listen**, ratings, copy, and redo under each reply
- **Theme** under Settings, set to System, Light, or Dark`;
}

const script: ChatModelAdapter = {
  async *run({ messages, abortSignal, runConfig }) {
    const asked = lastUserText(messages) || "your message";
    let thinking = "";
    for (const step of THINKING) {
      await wait(450);
      if (abortSignal.aborted) return;
      thinking += `${thinking ? "\n\n" : ""}${step}`;
      yield { content: [{ type: "reasoning", text: thinking }] };
    }
    const reasoning = { type: "reasoning", text: thinking } as const;
    for await (const text of streamWords(
      replyFor(asked, runConfig?.custom ?? {}),
      abortSignal,
    )) {
      yield { content: [reasoning, { type: "text", text }] };
    }
  },
};

export default function GeminiDemo() {
  const runtime = useLocalRuntime(script, { adapters });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Gemini />
    </AssistantRuntimeProvider>
  );
}

/** The parts of a chat-list entry the sidebar reads. */
type ChatItem = {
  id: string;
  title?: string | undefined;
  custom?: Record<string, unknown> | undefined;
  isRunning: boolean;
};

type Theme = "system" | "light" | "dark";
type Mode = "chat" | "task";
type Filter = "all" | "ready" | "attention" | "running";
type DialogState =
  | { kind: "share" | "rename" | "delete"; threadId: string }
  | { kind: "search" | "task-intro" | "drawer" }
  | null;

type GeminiState = {
  root: RefObject<HTMLDivElement | null>;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  mode: Mode;
  chooseMode: (mode: Mode) => void;
  model: string;
  setModel: (model: string) => void;
  tool: string | null;
  setTool: (tool: string | null) => void;
  temporary: boolean;
  toggleTemporary: () => void;
  newChat: () => void;
  openChat: (id: string) => void;
  dialog: DialogState;
  setDialog: (dialog: DialogState) => void;
  say: (text: string) => void;
};

const GeminiContext = createContext<GeminiState | null>(null);

function useGemini() {
  const state = useContext(GeminiContext);
  if (!state) throw new Error("Gemini parts render inside <Gemini />");
  return state;
}

const notInDemo = (label: string) => `${label} isn't in this demo`;

function setCustom(
  aui: ReturnType<typeof useAui>,
  id: string,
  patch: Record<string, unknown>,
) {
  const item = aui.threads.item({ id });
  item.updateCustom({ ...item.getState().custom, ...patch });
}

function titleFrom(text: string) {
  const line = text.trim().split("\n")[0] ?? "";
  return line.length > 40 ? `${line.slice(0, 40).trimEnd()}…` : line;
}

function Gemini() {
  const aui = useAui();
  const root = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme>("system");
  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<Mode>("chat");
  const [model, setModel] = useState("auto");
  const [tool, setTool] = useState<string | null>(null);
  const [temporary, setTemporary] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(
    null,
  );
  const [seenTaskIntro, setSeenTaskIntro] = useState(false);
  const temporaryRef = useRef(temporary);
  temporaryRef.current = temporary;
  const mainThreadId = useAuiState((s) => s.threads.mainThreadId);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const threadReady = useAuiState((s) => !s.thread.isLoading);

  useEffect(() => {
    if (!threadReady) return;
    aui.composer.setRunConfig({ custom: { mode, tool, model } });
  }, [aui, mode, tool, model, mainThreadId, threadReady]);

  useAuiEvent({ scope: "*", event: "thread.runStart" }, ({ threadId }) => {
    if (temporaryRef.current) setCustom(aui, threadId, { temporary: true });
  });

  useAuiEvent({ scope: "*", event: "thread.runEnd" }, ({ threadId }) => {
    const threads = aui.threads.getState();
    const item = threads.threadItems.find((thread) => thread.id === threadId);
    if (!item || item.custom?.["temporary"]) return;
    if (threadId !== threads.mainThreadId) {
      setCustom(aui, threadId, { unread: true });
      return;
    }
    if (item.title) return;
    const first = aui.thread
      .getState()
      .messages.find((message) => message.role === "user");
    const text = first?.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    if (text?.trim())
      aui.threads.item({ id: threadId }).rename(titleFrom(text));
  });

  const leaveCurrent = () => {
    const threads = aui.threads.getState();
    const current = threads.threadItems.find(
      (thread) => thread.id === threads.mainThreadId,
    );
    aui.threads.switchToNewThread();
    if (current?.custom?.["temporary"]) {
      aui.threads.item({ id: current.id }).delete();
    }
  };

  const state: GeminiState = {
    root,
    theme,
    setTheme,
    expanded,
    setExpanded,
    mode,
    chooseMode: (next) => {
      setMode(next);
      if (next === "task" && !seenTaskIntro) {
        setSeenTaskIntro(true);
        setDialog({ kind: "task-intro" });
      }
    },
    model,
    setModel,
    tool,
    setTool,
    temporary,
    toggleTemporary: () => {
      leaveCurrent();
      setTemporary((on) => !on);
      setMode("chat");
    },
    newChat: () => {
      leaveCurrent();
      setTemporary(false);
      setMode("chat");
      setTool(null);
      setDialog(null);
    },
    openChat: (id) => {
      const threads = aui.threads.getState();
      const current = threads.threadItems.find(
        (thread) => thread.id === threads.mainThreadId,
      );
      if (current?.custom?.["temporary"] && current.id !== id) {
        aui.threads.item({ id: current.id }).delete();
      }
      aui.threads.switchToThread(id);
      setCustom(aui, id, { unread: false });
      setTemporary(false);
      setDialog(null);
    },
    dialog,
    setDialog,
    say: (text) => setNotice({ id: Date.now(), text }),
  };

  return (
    <GeminiContext.Provider value={state}>
      <Tooltip.Provider delay={500}>
        <div
          ref={root}
          data-theme={theme}
          className="gm @container/gm relative isolate flex h-full overflow-hidden"
        >
          <aside
            aria-label="Gemini menu"
            className={cn(
              "hidden shrink-0 flex-col transition-[width] duration-200 motion-reduce:transition-none @2xl/gm:flex",
              expanded
                ? "w-[17rem] bg-[var(--gm-rail)]"
                : "w-[4.5rem] bg-[var(--gm-rail-collapsed)]",
            )}
          >
            <Sidebar expanded={expanded} />
          </aside>
          <main className="relative flex min-w-0 flex-1 flex-col">
            <TopBar />
            <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
              <AuiIf condition={(s) => s.thread.messages.length === 0}>
                <EmptyState />
              </AuiIf>
              <AuiIf condition={(s) => s.thread.messages.length > 0}>
                <Conversation />
              </AuiIf>
            </ThreadPrimitive.Root>
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute start-4 bottom-4 z-30"
            >
              {notice ? (
                <p
                  key={notice.id}
                  className="rounded-md bg-[var(--gm-snack)] px-4 py-3 text-sm text-[var(--gm-snack-text)] shadow-[var(--gm-shadow)]"
                >
                  {notice.text}
                </p>
              ) : null}
            </div>
          </main>
          <Dialogs />
        </div>
      </Tooltip.Provider>
    </GeminiContext.Provider>
  );
}

/** Gemini's own icon font is internal, so each icon is its closest Hugeicons match. */
const ICONS = {
  account_tree: WorkflowSquare03Icon,
  add: Add01Icon,
  add_to_drive: GoogleDriveIcon,
  adjust: Target02Icon,
  ads_click: Cursor01Icon,
  alternate_email: AtIcon,
  arrow_downward: ArrowDown02Icon,
  article: Note01Icon,
  assignment: TaskEdit01Icon,
  attach_file: Attachment01Icon,
  book_2: Book02Icon,
  branding_watermark: CopyrightIcon,
  call_split: GitBranchIcon,
  chat_bubble: Message01Icon,
  check: Tick02Icon,
  check_circle: CheckmarkCircle02Icon,
  chevron_right: ArrowRight01Icon,
  circle: CircleIcon,
  close: Cancel01Icon,
  code: CodeIcon,
  construction: Wrench01Icon,
  content_copy: Copy01Icon,
  data_usage: DashboardSpeed01Icon,
  delete: Delete02Icon,
  description: File01Icon,
  diamond: DiamondIcon,
  download: Download04Icon,
  edit: PencilEdit02Icon,
  edit_document: FileEditIcon,
  edit_square: PencilEdit01Icon,
  face: UserCircleIcon,
  feedback: Comment01Icon,
  filter_list: FilterIcon,
  flag: Flag02Icon,
  forum: BubbleChatIcon,
  grid_view: DashboardSquare01Icon,
  help: HelpCircleIcon,
  history: HistoryIcon,
  imagesmode: Image01Icon,
  ios_share: Share08Icon,
  keep: PinIcon,
  keyboard_arrow_down: ArrowDown01Icon,
  keyboard_arrow_up: ArrowUp01Icon,
  language: Globe02Icon,
  left_panel_close: SidebarLeftIcon,
  light_mode: Sun03Icon,
  link: Link01Icon,
  location_on: Location01Icon,
  lock: SquareLock02Icon,
  mail: Mail01Icon,
  manage_accounts: UserSettings01Icon,
  mark_chat_read: MessageDone01Icon,
  mark_chat_unread: MessageNotification01Icon,
  menu: Menu01Icon,
  menu_book: Notebook01Icon,
  mic: Mic01Icon,
  monitoring: AnalyticsUpIcon,
  more_horiz: MoreHorizontalIcon,
  more_vert: MoreVerticalIcon,
  movie: Video01Icon,
  person: UserIcon,
  photo_library: Album02Icon,
  progress_activity: Loading03Icon,
  refresh: RedoIcon,
  rocket_launch: Rocket01Icon,
  schedule: Clock01Icon,
  search: Search01Icon,
  send: SentIcon,
  settings: Settings02Icon,
  share: Share01Icon,
  shield_person: Shield01Icon,
  shopping_cart: ShoppingCart01Icon,
  stop: StopIcon,
  stop_circle: StopCircleIcon,
  subdirectory_arrow_right: ArrowMoveDownRightIcon,
  thumb_down: ThumbsDownIcon,
  thumb_up: ThumbsUpIcon,
  travel_explore: GlobalSearchIcon,
  upload: Upload04Icon,
  verified_user: SecurityCheckIcon,
  volume_up: VolumeHighIcon,
  work: Briefcase01Icon,
};

function Icon({
  name,
  className,
  fill = false,
}: {
  name: string;
  className?: string;
  fill?: boolean;
}) {
  return (
    <HugeiconsIcon
      icon={ICONS[name as keyof typeof ICONS] ?? CircleIcon}
      aria-hidden
      strokeWidth={fill ? 2.2 : 1.6}
      className={cn("size-5 shrink-0", className)}
    />
  );
}

const SPARKLE_PATH =
  "M32.447 0c.68 0 1.273.465 1.439 1.125a38.904 38.904 0 001.999 5.905c2.152 5 5.105 9.376 8.854 13.125 3.751 3.75 8.126 6.703 13.125 8.855a38.98 38.98 0 005.906 1.999c.66.166 1.124.758 1.124 1.438 0 .68-.464 1.273-1.125 1.439a38.902 38.902 0 00-5.905 1.999c-5 2.152-9.375 5.105-13.125 8.854-3.749 3.751-6.702 8.126-8.854 13.125a38.973 38.973 0 00-2 5.906 1.485 1.485 0 01-1.438 1.124c-.68 0-1.272-.464-1.438-1.125a38.913 38.913 0 00-2-5.905c-2.151-5-5.103-9.375-8.854-13.125-3.75-3.749-8.125-6.702-13.125-8.854a38.973 38.973 0 00-5.905-2A1.485 1.485 0 010 32.448c0-.68.465-1.272 1.125-1.438a38.903 38.903 0 005.905-2c5-2.151 9.376-5.104 13.125-8.854 3.75-3.749 6.703-8.125 8.855-13.125a38.972 38.972 0 001.999-5.905A1.485 1.485 0 0132.447 0z";

function Sparkle({ className }: { className?: string }) {
  const id = `gm-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg aria-hidden viewBox="0 0 65 65" className={className}>
      <defs>
        <linearGradient
          id={id}
          x1="10"
          y1="10"
          x2="55"
          y2="55"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#4285f4" />
          <stop offset="0.55" stopColor="#9b72cb" />
          <stop offset="1" stopColor="#d96570" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d={SPARKLE_PATH} />
    </svg>
  );
}

function Tip({
  label,
  side = "bottom",
  children,
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement;
}) {
  const { root } = useGemini();
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal container={root}>
        <Tooltip.Positioner side={side} sideOffset={6} className="z-50">
          <Tooltip.Popup className="rounded-md bg-[var(--gm-snack)] px-2 py-1 text-xs text-[var(--gm-snack-text)]">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function MenuPopup({
  children,
  side = "bottom",
  align = "start",
  className,
}: {
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right" | "inline-end";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const { root } = useGemini();
  return (
    <Menu.Portal container={root}>
      <Menu.Positioner
        side={side}
        align={align}
        sideOffset={6}
        collisionPadding={8}
        className="z-50 outline-none"
      >
        <Menu.Popup
          className={cn(
            "max-h-[var(--available-height)] min-w-56 overflow-y-auto rounded-2xl bg-[var(--gm-menu)] py-2 text-[var(--gm-text)] shadow-[var(--gm-shadow)] outline-none",
            className,
          )}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

const menuItem =
  "flex min-h-10 w-full cursor-default items-center gap-3 px-4 py-2 text-start text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-[var(--gm-hover)] data-[popup-open]:bg-[var(--gm-hover)]";

const menuLabel = "px-4 pt-2 pb-1 text-xs font-medium text-[var(--gm-faint)]";

const menuSeparator = "my-2 h-px bg-[var(--gm-border)]";

function MenuItem({
  icon,
  label,
  hint,
  trailing,
  onClick,
  fill = false,
}: {
  icon: string;
  label: string;
  hint?: string | undefined;
  trailing?: ReactNode;
  onClick: () => void;
  fill?: boolean;
}) {
  return (
    <Menu.Item onClick={onClick} className={menuItem}>
      <Icon name={icon} fill={fill} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{label}</span>
        {hint ? (
          <span className="text-xs text-[var(--gm-faint)]">{hint}</span>
        ) : null}
      </span>
      {trailing}
    </Menu.Item>
  );
}

function Submenu({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger className={menuItem}>
        <Icon name={icon} />
        <span className="flex-1">{label}</span>
        <Icon name="chevron_right" className="text-[var(--gm-faint)]" />
      </Menu.SubmenuTrigger>
      <MenuPopup side="inline-end">{children}</MenuPopup>
    </Menu.SubmenuRoot>
  );
}

const iconButton =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--gm-muted)] transition-colors hover:bg-[var(--gm-hover)] focus-visible:outline-2 focus-visible:outline-[var(--gm-blue)] disabled:opacity-40 data-[popup-open]:bg-[var(--gm-hover)]";

function useVisibleChats() {
  const { temporary } = useGemini();
  const items = useAuiState((s) => s.threads.threadItems);
  const mainId = useAuiState((s) => s.threads.mainThreadId);
  return items
    .filter(
      (item) =>
        item.status === "regular" &&
        !item.custom?.["temporary"] &&
        !(temporary && item.id === mainId),
    )
    .toSorted(
      (a, b) =>
        Number(Boolean(b.custom?.["pinned"])) -
        Number(Boolean(a.custom?.["pinned"])),
    );
}

function Sidebar({
  expanded,
  inDrawer = false,
}: {
  expanded: boolean;
  inDrawer?: boolean;
}) {
  const { setExpanded, setDialog, newChat, say, temporary } = useGemini();
  const isEmpty = useAuiState((s) => s.thread.messages.length === 0);
  const [notebooks, setNotebooks] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 px-3 py-3">
      <div className="flex h-10 items-center gap-1">
        {expanded ? (
          <span className="flex flex-1 items-center gap-2 ps-2 text-xl">
            <Sparkle className="size-6" />
            Gemini
          </span>
        ) : (
          <Tip label="Expand menu" side="right">
            <button
              type="button"
              aria-label="Expand menu"
              aria-expanded={false}
              onClick={() => setExpanded(true)}
              className={iconButton}
            >
              <Sparkle className="size-6" />
            </button>
          </Tip>
        )}
        {expanded ? (
          <Tip label="Search chats">
            <button
              type="button"
              aria-label="Search chats"
              onClick={() => setDialog({ kind: "search" })}
              className={iconButton}
            >
              <Icon name="search" />
            </button>
          </Tip>
        ) : null}
        {inDrawer ? (
          <Dialog.Close aria-label="Close menu" className={iconButton}>
            <Icon name="close" />
          </Dialog.Close>
        ) : expanded ? (
          <Tip label="Collapse menu">
            <button
              type="button"
              aria-label="Collapse menu"
              aria-expanded
              onClick={() => setExpanded(false)}
              className={iconButton}
            >
              <Icon name="left_panel_close" />
            </button>
          </Tip>
        ) : null}
      </div>
      <div className="-mx-3 mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-3">
        <nav aria-label="Gemini" className="flex flex-col gap-0.5">
          <SideButton
            icon="edit_square"
            label="New chat"
            expanded={expanded}
            active={isEmpty && !temporary}
            onClick={newChat}
          />
          {expanded ? null : (
            <SideButton
              icon="search"
              label="Search chats"
              expanded={false}
              onClick={() => setDialog({ kind: "search" })}
            />
          )}
          {data.nav.map((item) => (
            <SideButton
              key={item.label}
              icon={item.icon}
              label={item.label}
              expanded={expanded}
              onClick={() => say(notInDemo(item.label))}
            />
          ))}
          {expanded ? (
            <button
              type="button"
              aria-expanded={notebooks}
              onClick={() => setNotebooks((open) => !open)}
              className="mt-3 flex h-8 w-fit items-center gap-0.5 rounded-full ps-3 pe-2 text-sm text-[var(--gm-faint)] transition-colors hover:bg-[var(--gm-hover)]"
            >
              Notebooks
              <Icon
                name="chevron_right"
                className={cn(
                  "size-[18px] transition-transform motion-reduce:transition-none",
                  notebooks && "rotate-90",
                )}
              />
            </button>
          ) : null}
          {expanded && notebooks ? (
            <SideButton
              icon="add"
              label="New notebook"
              expanded
              onClick={() => say(notInDemo("Notebooks"))}
            />
          ) : null}
        </nav>
        {expanded ? <ChatList /> : null}
      </div>
      <SidebarFooter expanded={expanded} />
    </div>
  );
}

function SideButton({
  icon,
  label,
  expanded,
  active = false,
  trailing,
  className,
  onClick,
  "aria-expanded": ariaExpanded,
}: {
  icon: string;
  label: string;
  expanded: boolean;
  active?: boolean;
  trailing?: ReactNode;
  className?: string;
  onClick: () => void;
  "aria-expanded"?: boolean;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={expanded ? undefined : label}
      aria-current={active ? "page" : undefined}
      aria-expanded={ariaExpanded}
      className={cn(
        "flex h-9 shrink-0 items-center gap-3 rounded-full text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--gm-blue)]",
        expanded ? "w-full px-3" : "w-10 justify-center",
        active
          ? "bg-[var(--gm-active)] text-[var(--gm-active-text)]"
          : "hover:bg-[var(--gm-hover)]",
        className,
      )}
    >
      <Icon name={icon} fill={active} />
      {expanded ? <span className="truncate">{label}</span> : null}
      {expanded ? trailing : null}
    </button>
  );
  return expanded ? (
    button
  ) : (
    <Tip label={label} side="right">
      {button}
    </Tip>
  );
}

function ChatList() {
  const chats = useVisibleChats();
  const mainId = useAuiState((s) => s.threads.mainThreadId);
  const [filter, setFilter] = useState<Filter>("all");
  const shown = chats.filter((item) =>
    filter === "ready"
      ? Boolean(item.custom?.["unread"])
      : filter === "running"
        ? item.isRunning
        : filter === "attention"
          ? Boolean(item.custom?.["attention"])
          : true,
  );
  const current = data.chatFilters.find((option) => option.id === filter);

  return (
    <section aria-labelledby="gm-chats" className="mt-4 flex flex-col">
      <div className="flex items-center justify-between ps-3">
        <h2 id="gm-chats" className="text-sm text-[var(--gm-faint)]">
          {current?.label ?? "All"}
        </h2>
        <Menu.Root>
          <Menu.Trigger
            aria-label={`Filter chats: ${current?.label ?? "All"}`}
            className={cn(iconButton, "size-8")}
          >
            <Icon name="filter_list" />
          </Menu.Trigger>
          <MenuPopup align="end">
            <Menu.RadioGroup
              value={filter}
              onValueChange={(value) => setFilter(value as Filter)}
            >
              {data.chatFilters.map((option) => (
                <Menu.RadioItem
                  key={option.id}
                  value={option.id}
                  className={menuItem}
                >
                  <Icon name={option.icon} />
                  <span className="flex-1">{option.label}</span>
                  <Menu.RadioItemIndicator>
                    <Icon name="check" />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </MenuPopup>
        </Menu.Root>
      </div>
      <ul className="mt-1 flex flex-col gap-0.5">
        {shown.map((item) => (
          <ChatRow key={item.id} item={item} active={item.id === mainId} />
        ))}
        {shown.length === 0 ? (
          <li className="px-3 py-2 text-sm text-[var(--gm-faint)]">
            {chats.length === 0
              ? "Your chats show up here."
              : `No chats are ${current?.label.toLowerCase() ?? "here"}.`}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function ChatRow({ item, active }: { item: ChatItem; active: boolean }) {
  const { openChat } = useGemini();
  const pinned = Boolean(item.custom?.["pinned"]);
  const unread = Boolean(item.custom?.["unread"]);

  return (
    <li
      className={cn(
        "group relative flex items-center rounded-full",
        active
          ? "bg-[var(--gm-active)] text-[var(--gm-active-text)]"
          : "hover:bg-[var(--gm-hover)]",
      )}
    >
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={() => openChat(item.id)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full ps-3 pe-10 text-start text-sm focus-visible:outline-2 focus-visible:outline-[var(--gm-blue)]"
      >
        {pinned ? <Icon name="keep" fill className="size-4" /> : null}
        <span className="truncate">{item.title ?? "New chat"}</span>
        {item.isRunning ? (
          <Icon
            name="progress_activity"
            className="ms-auto size-4 animate-spin motion-reduce:animate-none"
          />
        ) : unread ? (
          <span className="ms-auto size-2 shrink-0 rounded-full bg-[var(--gm-dot)]">
            <span className="sr-only">Unread</span>
          </span>
        ) : null}
      </button>
      <ChatMenu
        item={item}
        className="absolute end-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 data-[popup-open]:opacity-100"
      />
    </li>
  );
}

function ChatMenu({ item, className }: { item: ChatItem; className?: string }) {
  const aui = useAui();
  const { setDialog } = useGemini();
  const pinned = Boolean(item.custom?.["pinned"]);
  const unread = Boolean(item.custom?.["unread"]);
  const title = item.title ?? "New chat";

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Options for ${title}`}
        className={cn(iconButton, "size-8", className)}
      >
        <Icon name="more_vert" />
      </Menu.Trigger>
      <MenuPopup align="start">
        <MenuItem
          icon="ios_share"
          label="Share conversation"
          onClick={() => setDialog({ kind: "share", threadId: item.id })}
        />
        <MenuItem
          icon="keep"
          fill={pinned}
          label={pinned ? "Unpin" : "Pin"}
          onClick={() => setCustom(aui, item.id, { pinned: !pinned })}
        />
        <MenuItem
          icon="edit"
          label="Rename"
          onClick={() => setDialog({ kind: "rename", threadId: item.id })}
        />
        <MenuItem
          icon={unread ? "mark_chat_read" : "mark_chat_unread"}
          label={unread ? "Mark as read" : "Mark as unread"}
          onClick={() => setCustom(aui, item.id, { unread: !unread })}
        />
        <MenuItem
          icon="delete"
          label="Delete"
          onClick={() => setDialog({ kind: "delete", threadId: item.id })}
        />
      </MenuPopup>
    </Menu.Root>
  );
}

function SidebarFooter({ expanded }: { expanded: boolean }) {
  const { theme, setTheme, say } = useGemini();

  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-2 pt-2",
        expanded ? "ps-2" : "flex-col",
      )}
    >
      <PersonAvatar />
      {expanded ? (
        <span className="min-w-0 flex-1 truncate text-[15px]">
          {DEMO_PERSON.name}
        </span>
      ) : null}
      <Menu.Root>
        <Menu.Trigger aria-label="Settings and help" className={iconButton}>
          <Icon name="settings" />
        </Menu.Trigger>
        <MenuPopup side="top" align="start" className="w-72">
          {data.settings.map((group, index) => (
            <Fragment key={group.group}>
              {index > 0 ? <Menu.Separator className={menuSeparator} /> : null}
              <Menu.Group>
                <Menu.GroupLabel className={menuLabel}>
                  {group.group}
                </Menu.GroupLabel>
                {group.items.map((item) =>
                  item.action === "theme" ? (
                    <Submenu key={item.label} icon={item.icon} label="Theme">
                      <Menu.RadioGroup
                        value={theme}
                        onValueChange={(value) => setTheme(value as Theme)}
                      >
                        {data.themes.map((option) => (
                          <Menu.RadioItem
                            key={option.id}
                            value={option.id}
                            className={menuItem}
                          >
                            <span className="flex-1">{option.label}</span>
                            <Menu.RadioItemIndicator>
                              <Icon name="check" />
                            </Menu.RadioItemIndicator>
                          </Menu.RadioItem>
                        ))}
                      </Menu.RadioGroup>
                    </Submenu>
                  ) : (
                    <MenuItem
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      onClick={() => say(notInDemo(item.label))}
                    />
                  ),
                )}
              </Menu.Group>
            </Fragment>
          ))}
        </MenuPopup>
      </Menu.Root>
    </div>
  );
}

function TopBar() {
  const { setDialog, temporary, toggleTemporary } = useGemini();
  const isEmpty = useAuiState((s) => s.thread.messages.length === 0);

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 px-2 @2xl/gm:px-4">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setDialog({ kind: "drawer" })}
        className={cn(iconButton, "@2xl/gm:hidden")}
      >
        <Icon name="menu" />
      </button>
      <span className="ps-1 text-xl @2xl/gm:hidden">Gemini</span>
      {temporary ? (
        <span className="ms-2 rounded-full bg-[var(--gm-soft)] px-3 py-1 text-xs text-[var(--gm-muted)]">
          Temporary chat
        </span>
      ) : null}
      <div className="ms-auto flex items-center gap-1">
        {isEmpty || temporary ? (
          <Tip label={temporary ? "Exit temporary chat" : "Temporary chat"}>
            <button
              type="button"
              aria-label={temporary ? "Exit temporary chat" : "Temporary chat"}
              aria-pressed={temporary}
              onClick={toggleTemporary}
              className={iconButton}
            >
              {temporary ? <Icon name="close" /> : <TemporaryIcon />}
            </button>
          </Tip>
        ) : null}
        {!isEmpty && !temporary ? <ConversationMenu /> : null}
      </div>
    </header>
  );
}

function TemporaryIcon() {
  return (
    <span aria-hidden className="relative inline-flex size-5">
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-5">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeDasharray="3.2 2.6"
        />
      </svg>
      <Icon name="edit" className="absolute inset-0 m-auto size-[11px]" />
    </span>
  );
}

function ConversationMenu() {
  const aui = useAui();
  const { setDialog, say } = useGemini();
  const mainId = useAuiState((s) => s.threads.mainThreadId);
  const item = useAuiState((s) =>
    s.threads.threadItems.find(
      (thread) => thread.id === s.threads.mainThreadId,
    ),
  );
  const pinned = Boolean(item?.custom?.["pinned"]);

  const run = (action: string | undefined, label: string) => {
    if (action === "share") setDialog({ kind: "share", threadId: mainId });
    else if (action === "rename")
      setDialog({ kind: "rename", threadId: mainId });
    else if (action === "delete")
      setDialog({ kind: "delete", threadId: mainId });
    else if (action === "pin") setCustom(aui, mainId, { pinned: !pinned });
    else say(notInDemo(label));
  };

  return (
    <Menu.Root>
      <Menu.Trigger aria-label="Conversation options" className={iconButton}>
        <Icon name="more_vert" />
      </Menu.Trigger>
      <MenuPopup align="end">
        {data.conversationMenu.map((entry) => (
          <MenuItem
            key={entry.label}
            icon={entry.icon}
            fill={entry.action === "pin" && pinned}
            label={entry.action === "pin" && pinned ? "Unpin" : entry.label}
            onClick={() => run(entry.action, entry.label)}
          />
        ))}
      </MenuPopup>
    </Menu.Root>
  );
}

function EmptyState() {
  const { mode, chooseMode, temporary } = useGemini();
  const aui = useAui();
  const glow = temporary ? "temporary" : mode;
  const greeting = temporary ? data.greetings.temporary : data.greetings[mode];

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-500"
        style={{ background: `var(--gm-glow-${glow})` }}
      />
      <div className="relative flex w-full max-w-[46rem] flex-col gap-6">
        <div className="flex flex-col items-center gap-2 px-2 text-center">
          <h2 className="text-[1.75rem] leading-tight @2xl/gm:text-[2rem]">
            {greeting}
          </h2>
          {temporary ? (
            <p className="max-w-md text-sm text-[var(--gm-muted)]">
              {data.temporaryNote}
            </p>
          ) : null}
        </div>
        <Composer />
        {temporary ? null : (
          <div
            role="group"
            aria-label="Mode"
            className="-mt-2 flex justify-center gap-1"
          >
            {(
              [
                ["chat", "Chat"],
                ["task", "Task"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => chooseMode(id)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-sm transition-colors",
                  mode === id
                    ? "bg-[var(--gm-pill)] shadow-[var(--gm-shadow)]"
                    : "text-[var(--gm-muted)] hover:bg-[var(--gm-hover)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {mode === "task" && !temporary ? (
          <ul
            aria-label="Task ideas"
            className="mx-auto flex w-full max-w-md flex-col gap-1"
          >
            {data.taskSuggestions.map((suggestion) => (
              <li key={suggestion.label}>
                <button
                  type="button"
                  onClick={() => aui.composer.setText(suggestion.prompt)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition-colors hover:bg-[var(--gm-hover)]"
                >
                  <Icon
                    name={suggestion.icon}
                    className="text-[var(--gm-muted)]"
                  />
                  {suggestion.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function Conversation() {
  return (
    <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-8 px-4 pt-4 pb-6">
        <ThreadPrimitive.Messages>
          {({ message }) =>
            message.role === "user" ? <UserMessage /> : <AssistantMessage />
          }
        </ThreadPrimitive.Messages>
      </div>
      <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-[var(--gm-bg)] px-4 pb-3">
        <div className="relative mx-auto flex w-full max-w-[46rem] flex-col gap-2">
          <ThreadPrimitive.ScrollToBottom
            aria-label="Scroll to the latest reply"
            className={cn(
              iconButton,
              "absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--gm-surface)] shadow-[var(--gm-shadow)] disabled:invisible",
            )}
          >
            <Icon name="arrow_downward" />
          </ThreadPrimitive.ScrollToBottom>
          <Composer followUp />
          <p className="text-center text-xs text-[var(--gm-faint)]">
            {data.disclaimer}
          </p>
        </div>
      </ThreadPrimitive.ViewportFooter>
    </ThreadPrimitive.Viewport>
  );
}

/** Inserts a mention as plain `@Name` text, so the sent message reads as typed. */
const atFormatter: DirectiveFormatter = {
  serialize: (item) => `@${item.label}`,
  parse: (text) => [{ kind: "text", text }],
};

const MENTIONS = [
  ...data.mentions.map((item) => ({ ...item, id: item.label, type: "app" })),
  ...data.connectors
    .filter((item) => item.label !== "View all connectors")
    .map((item) => ({ ...item, id: item.label, type: "connector" })),
];

function Composer({ followUp = false }: { followUp?: boolean }) {
  const { mode, temporary, tool, setTool } = useGemini();
  const mention = unstable_useMentionAdapter({
    items: MENTIONS,
    includeModelContextTools: false,
    formatter: atFormatter,
  });
  const active = [...data.tools, ...data.moreTools].find(
    (entry) => entry.label === tool,
  );
  const placeholder = followUp
    ? data.placeholders.followUp
    : temporary
      ? data.placeholders.temporary
      : data.placeholders[mode];

  return (
    <ComposerPrimitive.TriggerPopoverRoot>
      <ComposerPrimitive.Root className="relative">
        <ComposerPrimitive.TriggerPopover
          char="@"
          adapter={mention.adapter}
          className="absolute start-0 bottom-full z-20 mb-2 w-80 max-w-full overflow-hidden rounded-2xl bg-[var(--gm-menu)] shadow-[var(--gm-shadow)]"
        >
          <ComposerPrimitive.TriggerPopover.Directive
            formatter={mention.directive.formatter}
          />
          <ComposerPrimitive.TriggerPopoverItems>
            {(items) => (
              <div className="py-2">
                {items.map((item, index) => (
                  <Fragment key={item.id}>
                    {item.type === "connector" &&
                    items[index - 1]?.type !== "connector" ? (
                      <p className={menuLabel}>Connectors</p>
                    ) : null}
                    <ComposerPrimitive.TriggerPopoverItem
                      item={item}
                      index={index}
                      className="flex w-full items-center gap-3 px-4 py-2 text-start outline-none hover:bg-[var(--gm-hover)] data-[highlighted]:bg-[var(--gm-hover)]"
                    >
                      <Icon
                        name={
                          typeof item.metadata?.["icon"] === "string"
                            ? item.metadata["icon"]
                            : "alternate_email"
                        }
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm">{item.label}</span>
                        {item.description ? (
                          <span className="text-xs text-[var(--gm-faint)]">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                    </ComposerPrimitive.TriggerPopoverItem>
                  </Fragment>
                ))}
                {items.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-[var(--gm-faint)]">
                    Nothing matches
                  </p>
                ) : null}
              </div>
            )}
          </ComposerPrimitive.TriggerPopoverItems>
        </ComposerPrimitive.TriggerPopover>
        <ComposerPrimitive.AttachmentDropzone className="flex flex-col rounded-[1.75rem] border border-transparent bg-[var(--gm-surface)] shadow-[var(--gm-shadow)] transition-colors focus-within:border-[var(--gm-border)] data-[dragging=true]:border-dashed data-[dragging=true]:border-[var(--gm-blue)]">
          <div className="flex flex-wrap gap-2 px-4 empty:hidden has-[*]:pt-3">
            <ComposerPrimitive.Attachments>
              {() => <AttachmentTile removable />}
            </ComposerPrimitive.Attachments>
          </div>
          <div className="flex items-end gap-1 p-2">
            <PlusMenu />
            {active ? (
              <button
                type="button"
                onClick={() => setTool(null)}
                aria-label={`Turn off ${active.label}`}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[var(--gm-soft)] ps-3 pe-2 text-sm"
              >
                <Icon name={active.icon} className="size-[18px]" />
                <span className="hidden @md/gm:inline">{active.label}</span>
                <Icon name="close" className="size-4" />
              </button>
            ) : null}
            <ComposerPrimitive.Input
              rows={1}
              placeholder={placeholder}
              aria-label={placeholder}
              className="max-h-48 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-base leading-6 outline-none placeholder:text-[var(--gm-faint)]"
            />
            <div className="flex shrink-0 items-center gap-1">
              <ModelMenu />
              <AuiIf condition={(s) => s.composer.dictation === undefined}>
                <Tip label="Use microphone">
                  <ComposerPrimitive.Dictate
                    aria-label="Use microphone"
                    className={iconButton}
                  >
                    <Icon name="mic" />
                  </ComposerPrimitive.Dictate>
                </Tip>
              </AuiIf>
              <AuiIf condition={(s) => s.composer.dictation !== undefined}>
                <ComposerPrimitive.StopDictation
                  aria-label="Stop microphone"
                  className={cn(
                    iconButton,
                    "bg-[var(--gm-active)] text-[var(--gm-active-text)]",
                  )}
                >
                  <span
                    aria-hidden
                    className="gm-wave flex h-4 items-center gap-0.5"
                  >
                    {[0, 1, 2, 3].map((bar) => (
                      <span
                        key={bar}
                        className="h-full w-0.5 rounded-full bg-current"
                      />
                    ))}
                  </span>
                </ComposerPrimitive.StopDictation>
              </AuiIf>
              <AuiIf
                condition={(s) => !s.thread.isRunning && !s.composer.isEmpty}
              >
                <ComposerPrimitive.Send
                  aria-label="Send message"
                  className={cn(
                    iconButton,
                    "bg-[var(--gm-active)] text-[var(--gm-active-text)] hover:bg-[var(--gm-active)]",
                  )}
                >
                  <Icon name="send" fill />
                </ComposerPrimitive.Send>
              </AuiIf>
              <AuiIf condition={(s) => s.thread.isRunning}>
                <ComposerPrimitive.Cancel
                  aria-label="Stop response"
                  className={cn(
                    iconButton,
                    "bg-[var(--gm-active)] text-[var(--gm-active-text)] hover:bg-[var(--gm-active)]",
                  )}
                >
                  <Icon name="stop" fill />
                </ComposerPrimitive.Cancel>
              </AuiIf>
            </div>
          </div>
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Root>
    </ComposerPrimitive.TriggerPopoverRoot>
  );
}

function PlusMenu() {
  const aui = useAui();
  const { tool, setTool, say } = useGemini();
  const accept = useAuiState((s) => s.composer.attachmentAccept);
  const input = useRef<HTMLInputElement>(null);

  const pick = (entry: { label: string; tool?: boolean; locked?: boolean }) => {
    if (entry.tool) setTool(tool === entry.label ? null : entry.label);
    else say(notInDemo(entry.label));
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        hidden
        onChange={async (event) => {
          const files = [...(event.currentTarget.files ?? [])];
          event.currentTarget.value = "";
          for (const file of files) await aui.composer.addAttachment(file);
        }}
      />
      <Menu.Root>
        <Menu.Trigger
          aria-label="Upload files and tools"
          className={iconButton}
        >
          <Icon name="add" />
        </Menu.Trigger>
        <MenuPopup side="top" align="start" className="w-72">
          {data.uploads.map((entry) => (
            <MenuItem
              key={entry.label}
              icon={entry.icon}
              label={entry.label}
              onClick={() =>
                entry.action === "upload"
                  ? input.current?.click()
                  : say(notInDemo(entry.label))
              }
            />
          ))}
          <Submenu icon="more_horiz" label="More uploads">
            {data.moreUploads.map((entry) => (
              <MenuItem
                key={entry.label}
                icon={entry.icon}
                label={entry.label}
                onClick={() => say(notInDemo(entry.label))}
              />
            ))}
          </Submenu>
          <Menu.Separator className={menuSeparator} />
          {data.tools.map((entry) => (
            <MenuItem
              key={entry.label}
              icon={entry.icon}
              label={entry.label}
              hint={entry.hint}
              fill={tool === entry.label}
              trailing={
                entry.locked ? (
                  <Icon name="lock" className="text-[var(--gm-faint)]" />
                ) : tool === entry.label ? (
                  <Icon name="check" className="text-[var(--gm-blue)]" />
                ) : null
              }
              onClick={() => pick(entry)}
            />
          ))}
          <Submenu icon="construction" label="More tools">
            {data.moreTools.map((entry) => (
              <MenuItem
                key={entry.label}
                icon={entry.icon}
                label={entry.label}
                trailing={
                  tool === entry.label ? (
                    <Icon name="check" className="text-[var(--gm-blue)]" />
                  ) : null
                }
                onClick={() => pick(entry)}
              />
            ))}
          </Submenu>
        </MenuPopup>
      </Menu.Root>
    </>
  );
}

function ModelMenu() {
  const { mode, model, setModel } = useGemini();
  const current =
    data.models.find((entry) => entry.id === model) ?? data.models[0];

  if (mode === "task") {
    return (
      <span className="px-3 text-sm text-[var(--gm-muted)]">
        {data.taskModel}
      </span>
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Model: ${current?.label}`}
        className="flex h-9 items-center gap-0.5 rounded-full ps-3 pe-2 text-sm text-[var(--gm-muted)] transition-colors hover:bg-[var(--gm-hover)] data-[popup-open]:bg-[var(--gm-hover)]"
      >
        {current?.label}
        <Icon name="keyboard_arrow_down" />
      </Menu.Trigger>
      <MenuPopup side="top" align="end" className="w-72">
        <Menu.RadioGroup
          value={model}
          onValueChange={(value) => setModel(value as string)}
        >
          {data.models.map((entry) => (
            <Menu.RadioItem
              key={entry.id}
              value={entry.id}
              disabled={entry.locked}
              className={menuItem}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span>{entry.label}</span>
                <span className="text-xs text-[var(--gm-faint)]">
                  {entry.description}
                </span>
              </span>
              {entry.locked ? (
                <Icon name="lock" className="text-[var(--gm-faint)]" />
              ) : (
                <Menu.RadioItemIndicator>
                  <Icon
                    name="check_circle"
                    fill
                    className="text-[var(--gm-blue)]"
                  />
                </Menu.RadioItemIndicator>
              )}
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </MenuPopup>
    </Menu.Root>
  );
}

function AttachmentTile({ removable = false }: { removable?: boolean }) {
  const src = useAttachmentSrc();
  const name = useAuiState((s) => s.attachment.name);

  return (
    <AttachmentPrimitive.Root className="relative">
      {src ? (
        <img src={src} alt={name} className="size-14 rounded-xl object-cover" />
      ) : (
        <div className="flex h-14 max-w-52 items-center gap-2 rounded-xl bg-[var(--gm-soft)] px-3 text-sm">
          <Icon name="description" className="text-[var(--gm-blue)]" />
          <span className="truncate">
            <AttachmentPrimitive.Name />
          </span>
        </div>
      )}
      {removable ? (
        <AttachmentPrimitive.Remove
          aria-label={`Remove ${name}`}
          className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--gm-text)] text-[var(--gm-bg)]"
        >
          <Icon name="close" className="size-3.5" />
        </AttachmentPrimitive.Remove>
      ) : null}
    </AttachmentPrimitive.Root>
  );
}

function UserMessage() {
  const text = useAuiState((s) =>
    s.message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
  );
  const long = text.length > 280 || text.split("\n").length > 4;
  const [open, setOpen] = useState(false);

  return (
    <MessagePrimitive.Root className="group flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2 empty:hidden">
        <MessagePrimitive.Attachments>
          {() => <AttachmentTile />}
        </MessagePrimitive.Attachments>
      </div>
      <div className="flex max-w-[85%] items-start gap-1">
        <ActionBarPrimitive.Root
          autohide="always"
          className="flex pt-1 text-[var(--gm-muted)]"
        >
          <Tip label="Copy prompt">
            <ActionBarPrimitive.Copy
              aria-label="Copy prompt"
              className={iconButton}
            >
              <Icon name="content_copy" className="size-[18px]" />
            </ActionBarPrimitive.Copy>
          </Tip>
        </ActionBarPrimitive.Root>
        <div
          className={cn(
            "relative rounded-3xl rounded-se-md bg-[var(--gm-soft)] px-5 py-3.5 text-[15px] leading-6 wrap-break-word whitespace-pre-wrap",
            long && "pe-12",
          )}
        >
          <div className={cn(long && !open && "line-clamp-4")}>
            <MessagePrimitive.Parts />
          </div>
          {long ? (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? "Show less" : "Show more"}
              onClick={() => setOpen((shown) => !shown)}
              className={cn(
                iconButton,
                "absolute end-2 bottom-2 size-8 bg-[var(--gm-surface)]",
              )}
            >
              <Icon name={open ? "keyboard_arrow_up" : "keyboard_arrow_down"} />
            </button>
          ) : null}
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

const groupBy = groupPartByType({ reasoning: ["group-reasoning"] });

function AssistantMessage() {
  const running = useAuiState((s) => s.message.status?.type === "running");

  return (
    <MessagePrimitive.Root className="flex gap-4">
      <Sparkle
        className={cn("mt-0.5 size-7 shrink-0", running && "gm-sparkle-spin")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <AuiIf
          condition={(s) =>
            s.message.status?.type === "running" && s.message.parts.length === 0
          }
        >
          <p className="gm-shimmer pt-1 text-[15px]">Just a sec…</p>
        </AuiIf>
        <MessagePrimitive.GroupedParts groupBy={groupBy}>
          {({ part, children }) => {
            switch (part.type) {
              case "group-reasoning":
                return (
                  <Thinking running={part.status.type === "running"}>
                    {children}
                  </Thinking>
                );
              case "reasoning":
              case "text":
                return <MarkdownText />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <ResponseActions />
      </div>
    </MessagePrimitive.Root>
  );
}

function Thinking({
  running,
  children,
}: {
  running: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((shown) => !shown)}
        className="-ms-3 flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--gm-muted)] transition-colors hover:bg-[var(--gm-hover)]"
      >
        <span className={running ? "gm-shimmer" : undefined}>
          {running
            ? "Thinking it through…"
            : open
              ? "Hide thinking"
              : "Show thinking"}
        </span>
        <Icon name={open ? "keyboard_arrow_up" : "keyboard_arrow_down"} />
      </button>
      <div
        id={id}
        hidden={!open}
        className="border-s-2 border-[var(--gm-border)] ps-4 text-sm text-[var(--gm-muted)]"
      >
        {children}
      </div>
    </div>
  );
}

function ResponseActions() {
  const { setDialog } = useGemini();
  const mainId = useAuiState((s) => s.threads.mainThreadId);

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="-ms-2 flex flex-wrap items-center text-[var(--gm-muted)]"
    >
      <Tip label="Good response">
        <ActionBarPrimitive.FeedbackPositive
          aria-label="Good response"
          className={iconButton}
        >
          <Icon name="thumb_up" className="size-[18px]" />
        </ActionBarPrimitive.FeedbackPositive>
      </Tip>
      <Tip label="Bad response">
        <ActionBarPrimitive.FeedbackNegative
          aria-label="Bad response"
          className={iconButton}
        >
          <Icon name="thumb_down" className="size-[18px]" />
        </ActionBarPrimitive.FeedbackNegative>
      </Tip>
      <Tip label="Redo">
        <ActionBarPrimitive.Reload aria-label="Redo" className={iconButton}>
          <Icon name="refresh" className="size-[18px]" />
        </ActionBarPrimitive.Reload>
      </Tip>
      <Tip label="Share">
        <button
          type="button"
          aria-label="Share"
          onClick={() => setDialog({ kind: "share", threadId: mainId })}
          className={iconButton}
        >
          <Icon name="share" className="size-[18px]" />
        </button>
      </Tip>
      <Tip label="Copy response">
        <ActionBarPrimitive.Copy
          aria-label="Copy response"
          className={iconButton}
        >
          <AuiIf condition={(s) => !s.message.isCopied}>
            <Icon name="content_copy" className="size-[18px]" />
          </AuiIf>
          <AuiIf condition={(s) => s.message.isCopied}>
            <Icon name="check" className="size-[18px]" />
          </AuiIf>
        </ActionBarPrimitive.Copy>
      </Tip>
      <ResponseMenu />
    </ActionBarPrimitive.Root>
  );
}

function ResponseMenu() {
  const aui = useAui();
  const { say } = useGemini();
  const speaking = useAuiState((s) => s.message.speech !== undefined);

  return (
    <Menu.Root>
      <Menu.Trigger aria-label="More options" className={iconButton}>
        <Icon name="more_horiz" className="size-[18px]" />
      </Menu.Trigger>
      <MenuPopup align="start" className="w-64">
        {data.responseMenu.map((entry) =>
          entry.action === "listen" ? (
            <MenuItem
              key={entry.label}
              icon={speaking ? "stop_circle" : entry.icon}
              label={speaking ? "Stop listening" : entry.label}
              onClick={() =>
                speaking ? aui.message.stopSpeaking() : aui.message.speak()
              }
            />
          ) : (
            <MenuItem
              key={entry.label}
              icon={entry.icon}
              label={entry.label}
              onClick={() => say(notInDemo(entry.label))}
            />
          ),
        )}
      </MenuPopup>
    </Menu.Root>
  );
}

function MarkdownText() {
  return (
    <MarkdownTextPrimitive className="text-[15px] leading-7 [&_a]:text-[var(--gm-blue)] [&_a]:underline [&_code]:rounded [&_code]:bg-[var(--gm-soft)] [&_code]:px-1 [&_code]:font-mono [&_code]:text-[13px] [&_h1]:mt-4 [&_h1]:text-xl [&_h2]:mt-4 [&_h2]:text-lg [&_h3]:mt-3 [&_h3]:font-medium [&_li]:mt-1.5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:ps-6 [&_p+p]:mt-3 [&_pre]:mt-3 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-[var(--gm-soft)] [&_pre]:p-4 [&_strong]:font-medium [&_ul]:mt-2 [&_ul]:list-[circle] [&_ul]:ps-6" />
  );
}

function Modal({
  open,
  title,
  className,
  children,
}: {
  open: boolean;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const { root, setDialog } = useGemini();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setDialog(null);
      }}
      modal="trap-focus"
    >
      <Dialog.Portal container={root}>
        <Dialog.Backdrop className="absolute inset-0 z-40 bg-black/40" />
        <Dialog.Popup
          className={cn(
            "absolute top-1/2 left-1/2 z-50 flex max-h-[calc(100%-2rem)] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-3xl bg-[var(--gm-menu)] p-6 text-[var(--gm-text)] shadow-[var(--gm-shadow)] outline-none",
            className,
          )}
        >
          <Dialog.Title className="text-xl">{title}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const textButton =
  "h-10 rounded-full px-4 text-sm font-medium text-[var(--gm-blue)] transition-colors hover:bg-[var(--gm-hover)]";

const fillButton =
  "h-10 rounded-full bg-[var(--gm-blue)] px-5 text-sm font-medium text-[var(--gm-bg)] transition-opacity hover:opacity-90 disabled:opacity-40";

function Dialogs() {
  const { dialog, root, setDialog } = useGemini();
  const threadId = dialog && "threadId" in dialog ? dialog.threadId : null;

  return (
    <>
      <Dialog.Root
        open={dialog?.kind === "drawer"}
        onOpenChange={(next) => {
          if (!next) setDialog(null);
        }}
        modal="trap-focus"
      >
        <Dialog.Portal container={root}>
          <Dialog.Backdrop className="absolute inset-0 z-40 bg-black/40 @2xl/gm:hidden" />
          <Dialog.Popup className="absolute inset-y-0 start-0 z-50 w-[min(17rem,85%)] bg-[var(--gm-rail)] text-[var(--gm-text)] shadow-[var(--gm-shadow)] outline-none">
            <Dialog.Title className="sr-only">Gemini menu</Dialog.Title>
            <Sidebar expanded inDrawer />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <SearchDialog open={dialog?.kind === "search"} />
      <TaskIntroDialog open={dialog?.kind === "task-intro"} />
      {threadId ? (
        <>
          <ShareDialog open={dialog?.kind === "share"} threadId={threadId} />
          <RenameDialog
            key={threadId}
            open={dialog?.kind === "rename"}
            threadId={threadId}
          />
          <DeleteDialog open={dialog?.kind === "delete"} threadId={threadId} />
        </>
      ) : null}
    </>
  );
}

function useThreadTitle(threadId: string) {
  return useAuiState(
    (s) =>
      s.threads.threadItems.find((thread) => thread.id === threadId)?.title ??
      "New chat",
  );
}

function ShareDialog({ open, threadId }: { open: boolean; threadId: string }) {
  const { say } = useGemini();
  const title = useThreadTitle(threadId);
  const link = `https://example.com/share/${threadId.slice(-10)}`;
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 1500,
  });

  return (
    <Modal open={open} title="Share public link to chat">
      <p className="text-sm text-[var(--gm-muted)]">{title}</p>
      <div className="flex items-center gap-2 rounded-full border border-[var(--gm-border)] ps-4 pe-1">
        <input
          readOnly
          value={link}
          aria-label="Public link"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => copyToClipboard(link)}
          className={fillButton}
        >
          {isCopied ? "Copied" : "Copy link"}
        </button>
      </div>
      <ul aria-label="Share to" className="flex gap-3">
        {data.shareTargets.map((target) => (
          <li key={target.label}>
            <button
              type="button"
              aria-label={`Share to ${target.label}`}
              onClick={() => say(notInDemo(`Sharing to ${target.label}`))}
              className="flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ background: target.color }}
            >
              {target.short}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--gm-faint)]">
        This demo makes no public page, so the link above is an example.
      </p>
      <div className="flex justify-end">
        <Dialog.Close className={textButton}>Done</Dialog.Close>
      </div>
    </Modal>
  );
}

function RenameDialog({ open, threadId }: { open: boolean; threadId: string }) {
  const aui = useAui();
  const { setDialog } = useGemini();
  const title = useThreadTitle(threadId);
  const [value, setValue] = useState(title);

  return (
    <Modal open={open} title="Rename this chat">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!value.trim()) return;
          aui.threads.item({ id: threadId }).rename(value.trim());
          setDialog(null);
        }}
      >
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Chat name"
          className="h-12 rounded-xl border border-[var(--gm-border)] bg-transparent px-4 text-sm outline-none focus:border-[var(--gm-blue)]"
        />
        <div className="flex justify-end gap-2">
          <Dialog.Close type="button" className={textButton}>
            Cancel
          </Dialog.Close>
          <button type="submit" disabled={!value.trim()} className={fillButton}>
            Rename
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({ open, threadId }: { open: boolean; threadId: string }) {
  const aui = useAui();
  const { setDialog, say, newChat } = useGemini();
  const mainId = useAuiState((s) => s.threads.mainThreadId);

  return (
    <Modal open={open} title="Delete chat?">
      <p className="text-sm text-[var(--gm-muted)]">
        This chat and its replies leave your chat list.
      </p>
      <div className="flex justify-end gap-2">
        <Dialog.Close className={textButton}>Cancel</Dialog.Close>
        <button
          type="button"
          className={fillButton}
          onClick={() => {
            if (threadId === mainId) newChat();
            aui.threads.item({ id: threadId }).delete();
            setDialog(null);
            say("Chat deleted");
          }}
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}

function SearchDialog({ open }: { open: boolean }) {
  const { openChat } = useGemini();
  const chats = useVisibleChats();
  const [query, setQuery] = useState("");
  const found = chats.filter((item) =>
    (item.title ?? "New chat").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Modal
      open={open}
      title="Search chats"
      className="w-[min(36rem,calc(100%-2rem))]"
    >
      <div className="flex items-center gap-3 rounded-full bg-[var(--gm-soft)] px-4">
        <Icon name="search" className="text-[var(--gm-muted)]" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--gm-faint)]"
        />
      </div>
      <section aria-labelledby="gm-recent" className="flex flex-col gap-1">
        <h3
          id="gm-recent"
          className="px-3 text-xs font-medium text-[var(--gm-faint)]"
        >
          {query ? "Results" : "Recent"}
        </h3>
        <ul className="flex flex-col">
          {found.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openChat(item.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm hover:bg-[var(--gm-hover)]"
              >
                <Icon name="chat_bubble" className="text-[var(--gm-muted)]" />
                <span className="truncate">{item.title ?? "New chat"}</span>
                <span className="ms-auto shrink-0 text-xs text-[var(--gm-faint)]">
                  Today
                </span>
              </button>
            </li>
          ))}
          {found.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-[var(--gm-faint)]">
              {chats.length === 0 ? "No chats yet." : "No chats match."}
            </li>
          ) : null}
        </ul>
      </section>
    </Modal>
  );
}

function TaskIntroDialog({ open }: { open: boolean }) {
  return (
    <Modal open={open} title={data.taskIntro.title}>
      <Icon
        name={data.taskIntro.icon}
        className="-order-1 size-9 text-[var(--gm-blue)]"
      />
      <ul className="flex flex-col gap-4">
        {data.taskIntro.items.map((item) => (
          <li key={item.title} className="flex gap-3">
            <Icon name={item.icon} className="text-[var(--gm-muted)]" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-sm text-[var(--gm-muted)]">
                {item.body}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Dialog.Close className={fillButton}>Got it</Dialog.Close>
      </div>
    </Modal>
  );
}
