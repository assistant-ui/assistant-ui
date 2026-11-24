"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  AssistantRuntimeProvider,
  AttachmentPrimitive,
  AuiConfig,
  AuiIf,
  ComposerPrimitive,
  CompositeAttachmentAdapter,
  ErrorPrimitive,
  MessagePrimitive,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  ThreadPrimitive,
  Tools,
  WebSpeechDictationAdapter,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import {
  Add01Icon,
  ArrowDown02Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  Cancel01Icon,
  LayoutAlignLeftIcon,
  Mic01Icon,
  MicOff01Icon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { usePanelRef, type Layout } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import data from "../data.json";
import toolkit from "../toolkit";
import {
  describe,
  formatDate,
  formatTime,
  getSelected,
  getTasks,
  nextRun,
  runDue,
  select,
  useSelected,
  useTasks,
  type Task,
} from "./store";
import { TaskDetail, status } from "./task";
import {
  Icon,
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
  Tip,
  field,
  focusRing,
  iconButton,
  inkButton,
  listRow,
  rItem,
  rSurface,
} from "./ui";
import { User } from "./user";

/* -------------------------------------------------------------------------- */
/* Runtime: one chat for the overview and one for each task that is opened    */
/* -------------------------------------------------------------------------- */

const config = AuiConfig({ tools: Tools({ toolkit }) });

const subscribeNever = () => () => {};

/* Speech recognition is a browser feature, so the server answers no. */
function useCanDictate() {
  return useSyncExternalStore(
    subscribeNever,
    WebSpeechDictationAdapter.isSupported,
    () => false,
  );
}

function useDictationAdapter() {
  const supported = useCanDictate();
  return useMemo(
    () => (supported ? new WebSpeechDictationAdapter() : undefined),
    [supported],
  );
}

/*
 * What the model is told with every message: the time here, the tasks as
 * they stand, and the one that is open. It is read when the message is sent.
 */
function contextText() {
  const now = new Date();
  const tasks = getTasks().map((task) => ({
    id: task.id,
    title: task.title,
    prompt: task.prompt,
    schedule: task.schedule,
    paused: task.paused,
    nextRun: nextRun(task)?.toString() ?? null,
  }));
  return [
    `Current local time: ${now.toString()}`,
    `Open task id: ${getSelected() ?? "none"}`,
    `Tasks: ${JSON.stringify(tasks)}`,
  ].join("\n");
}

/*
 * Keeps the model's picture of the tasks current, runs each task when its
 * time comes, and gives every task a chat of its own.
 */
function Housekeeping() {
  const aui = useAui();
  const selected = useSelected();
  const previous = useRef<string>("");
  const [chats] = useState(() => new Map<string, string>());

  useEffect(
    () =>
      aui.modelContext.register({
        getModelContext: () => ({ system: contextText() }),
      }),
    [aui],
  );

  useEffect(() => {
    runDue();
    const timer = window.setInterval(() => runDue(), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const key = selected ?? "";
    if (previous.current === key) return;
    const { mainThreadId, threadIds } = aui.threads.getState();
    if (!aui.thread.getState().isEmpty)
      chats.set(previous.current, mainThreadId);
    previous.current = key;
    const saved = chats.get(key);
    if (saved && threadIds.includes(saved)) aui.threads.switchToThread(saved);
    else aui.threads.switchToNewThread();
  }, [aui, chats, selected]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Frame: the schedule, and the one page beside it                            */
/* -------------------------------------------------------------------------- */

/**
 * The sidebar opens and closes in one step, from the button, the shortcut or
 * a drag past its minimum width. This plays that step back as a 200ms slide.
 */
function useSnapAnimation() {
  const groupRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<Layout | null>(null);

  const onLayoutChange = useCallback((layout: Layout) => {
    const previous = layoutRef.current;
    layoutRef.current = layout;
    const group = groupRef.current;
    if (!previous || !group) return;

    const snapped = Object.keys(layout).some(
      (id) => (previous[id] ?? 0) > 0 !== (layout[id] ?? 0) > 0,
    );
    if (!snapped) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const id of Object.keys(layout)) {
      const panel = group.querySelector<HTMLElement>(`:scope > [id="${id}"]`);
      const from = previous[id];
      const to = layout[id];
      if (!panel || from === undefined || to === undefined) continue;
      for (const animation of panel.getAnimations()) animation.cancel();
      panel.animate([{ flexGrow: from }, { flexGrow: to }], {
        duration: 200,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      });
    }
  }, []);

  return { elementRef: groupRef, onLayoutChange };
}

export function Tasks() {
  const [transport] = useState(
    () => new AssistantChatTransport({ api: "/blocks/demos/tasks/api/chat" }),
  );
  const [attachments] = useState(
    () =>
      new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
  );
  const dictation = useDictationAdapter();
  const runtime = useChatRuntime({
    transport,
    adapters: { attachments, dictation },
  });
  const isMobile = useIsMobile();
  const sidebarRef = usePanelRef();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const snap = useSnapAnimation();

  const toggleSidebar = useCallback(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    if (sidebar.isCollapsed()) sidebar.expand();
    else sidebar.collapse();
  }, [sidebarRef]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey)
        return;
      if (event.key?.toLowerCase() !== "b") return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Housekeeping />
      <TooltipProvider delay={300}>
        <ResizablePanelGroup
          {...snap}
          className="bg-background text-foreground text-sm"
        >
          {/* A phone has no room for the sidebar; the header keeps New task. */}
          {!isMobile && (
            <>
              <ResizablePanel
                id="sidebar"
                panelRef={sidebarRef}
                collapsible
                collapsedSize={0}
                defaultSize="16rem"
                minSize="12rem"
                maxSize="24rem"
                groupResizeBehavior="preserve-pixel-size"
                onResize={(size) => setSidebarOpen(size.inPixels > 0)}
                style={{ overflow: "hidden" }}
              >
                <aside
                  inert={!sidebarOpen}
                  className="flex h-full min-w-48 flex-col"
                >
                  <Sidebar onSidebarToggle={toggleSidebar} />
                </aside>
              </ResizablePanel>
              <ResizableHandle
                disabled={!sidebarOpen}
                // Hidden once the sidebar has finished sliding shut.
                className={
                  sidebarOpen
                    ? ""
                    : "pointer-events-none invisible transition-[visibility] delay-200 motion-reduce:delay-0"
                }
              />
            </>
          )}
          <ResizablePanel id="main" className="flex min-w-0 flex-col">
            <Header
              onSidebarToggle={
                isMobile || sidebarOpen ? undefined : toggleSidebar
              }
            />
            <Page />
          </ResizablePanel>
        </ResizablePanelGroup>
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}

/* A new task starts from the overview, with a chat that has nothing in it. */
function useNewTask() {
  const aui = useAui();
  return () => {
    select(null);
    aui.threads.switchToNewThread();
  };
}

function Header({
  onSidebarToggle,
}: {
  /** Set while the sidebar is hidden, when the header holds its button. */
  onSidebarToggle: (() => void) | undefined;
}) {
  const newTask = useNewTask();

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-3">
      {onSidebarToggle && (
        <Tip label="Show the sidebar">
          <button
            type="button"
            onClick={onSidebarToggle}
            className={cn(iconButton, "-ms-1")}
          >
            <Icon icon={LayoutAlignLeftIcon} />
          </button>
        </Tip>
      )}
      <Tip label="New task">
        <button
          type="button"
          onClick={newTask}
          className={cn(iconButton, "ms-auto md:hidden")}
        >
          <Icon icon={Add01Icon} />
        </button>
      </Tip>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar: the schedule, soonest first, and the person at the foot           */
/* -------------------------------------------------------------------------- */

const GROUPS = ["Today", "Tomorrow", "Later", "Paused", "Done"] as const;

type Slot = { task: Task; group: (typeof GROUPS)[number]; at: string };

/* Where a task sits in the schedule, and the time shown beside its name. */
function slot(task: Task, now: number): Slot {
  const next = nextRun(task);
  if (task.paused) return { task, group: "Paused", at: "" };
  if (!next) return { task, group: "Done", at: "" };

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(tomorrow.getDate() + 1);
  dayAfter.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);

  if (next < tomorrow) return { task, group: "Today", at: formatTime(next) };
  if (next < dayAfter) return { task, group: "Tomorrow", at: formatTime(next) };
  return { task, group: "Later", at: formatDate(next) };
}

const byNext = (a: Slot, b: Slot) =>
  (nextRun(a.task)?.getTime() ?? Infinity) -
  (nextRun(b.task)?.getTime() ?? Infinity);

/*
 * The schedule is redrawn each half minute, as tasks come due and move on.
 * The server has no tasks to place, so it is given no time to read.
 */
let tick = 0;

const subscribeTick = (listener: () => void) => {
  const timer = window.setInterval(() => {
    tick = Date.now();
    listener();
  }, 30_000);
  return () => window.clearInterval(timer);
};

const readTick = () => {
  tick ||= Date.now();
  return tick;
};

function useNow() {
  return useSyncExternalStore(subscribeTick, readTick, () => 0);
}

function Sidebar({ onSidebarToggle }: { onSidebarToggle: () => void }) {
  const tasks = useTasks();
  const selected = useSelected();
  const now = useNow();
  const newTask = useNewTask();
  const slots = tasks.map((task) => slot(task, now)).sort(byNext);

  return (
    <nav aria-label="Schedule" className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center px-2">
        <span className="px-2 text-lg font-medium">Tasks</span>
        <Tip label="Hide the sidebar">
          <button
            type="button"
            onClick={onSidebarToggle}
            className={cn(iconButton, "ms-auto")}
          >
            <Icon icon={SidebarLeftIcon} />
          </button>
        </Tip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        <button
          type="button"
          onClick={newTask}
          aria-current={selected === null ? "page" : undefined}
          className={cn(listRow, "aria-[current]:bg-accent mb-2 font-medium")}
        >
          <Icon icon={Add01Icon} className="size-4" />
          New task
        </button>
        {GROUPS.map((group) => {
          const rows = slots.filter((entry) => entry.group === group);
          if (rows.length === 0) return null;
          return (
            <section key={group} className="flex flex-col gap-0.5 pb-2">
              <h2 className="text-muted-foreground px-2 pb-1">{group}</h2>
              {rows.map(({ task, at }) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => select(task.id)}
                  aria-current={selected === task.id ? "page" : undefined}
                  className={cn(listRow, "aria-[current]:bg-accent text-start")}
                >
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {at}
                  </span>
                </button>
              ))}
            </section>
          );
        })}
        {tasks.length === 0 && (
          <p className="text-muted-foreground px-2">Nothing scheduled yet.</p>
        )}
      </div>
      <div className="shrink-0 p-2">
        <User />
      </div>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* The page: the overview or the open task, then the chat about it            */
/* -------------------------------------------------------------------------- */

function Page() {
  const tasks = useTasks();
  const selected = useSelected();
  const empty = useAuiState((s) => s.thread.isEmpty);
  const task = tasks.find((entry) => entry.id === selected);
  const top = task ? <TaskDetail task={task} /> : null;

  // Until something is said, the page scrolls from its top with the message box floating over its foot.
  if (empty)
    return (
      <ThreadPrimitive.Root className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 pb-32">
          {top ?? <Overview />}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
          <div className="pointer-events-auto mx-auto w-full max-w-3xl">
            <Composer />
          </div>
        </div>
      </ThreadPrimitive.Root>
    );

  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
        {top}
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pt-6 pb-10">
          <ThreadPrimitive.Messages>
            {() => <Message />}
          </ThreadPrimitive.Messages>
        </div>
        <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mx-auto mt-auto flex w-full max-w-3xl flex-col pb-4">
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
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

/* What a new chat shows: prompts to start from, then what is coming up. */
function Overview() {
  const aui = useAui();
  const tasks = useTasks();
  const upcoming = tasks
    .filter((task) => !task.paused && nextRun(task))
    .sort((a, b) => (nextRun(a)?.getTime() ?? 0) - (nextRun(b)?.getTime() ?? 0))
    .slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pt-2">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-medium tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">
          Say what should happen and when. A task runs at its time while this
          page is open.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {data.examples.map((example) => (
          <li key={example.title}>
            <button
              type="button"
              onClick={() => aui.composer.setText(example.prompt)}
              className={cn(
                field,
                rSurface,
                "hover:bg-foreground/[0.07] flex h-full w-full flex-col gap-1 p-4 text-start transition-colors motion-reduce:transition-none",
                focusRing,
              )}
            >
              <span className="font-medium">{example.title}</span>
              <span className="text-muted-foreground leading-[1.375rem]">
                {example.prompt}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {upcoming.length > 0 && (
        <div className="flex flex-col gap-1">
          <h2 className="text-muted-foreground pb-1">Coming up</h2>
          {upcoming.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => select(task.id)}
              className={cn(listRow, "h-auto min-h-11 py-1.5 text-start")}
            >
              <span className="flex min-w-0 flex-1 flex-col leading-5">
                <span className="truncate font-medium">{task.title}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {describe(task.schedule)}
                </span>
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {status(task)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Message() {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col items-end gap-2">
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
    </MessagePrimitive.Root>
  );
}

const markdown =
  "flex flex-col gap-2 leading-[1.375rem] wrap-break-word [&_a]:underline [&_a]:underline-offset-2 [&_code]:bg-foreground/6 [&_code]:rounded-[6px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1 [&_ol]:ps-5 [&_strong]:font-medium [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:ps-5";

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col items-start gap-2.5">
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "text")
            return <MarkdownTextPrimitive className={markdown} />;
          // A tool call draws the receipt its toolkit entry renders.
          if (part.type === "tool-call") return part.toolUI ?? null;
          return null;
        }}
      </MessagePrimitive.Parts>
      <AuiIf
        condition={(s) =>
          s.message.status?.type === "running" && s.message.parts.length === 0
        }
      >
        <p
          role="status"
          className="text-muted-foreground animate-pulse motion-reduce:animate-none"
        >
          Working
        </p>
      </AuiIf>
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root
          className={cn(
            rSurface,
            "border-destructive/25 text-destructive bg-destructive/5 border px-3.5 py-2.5",
          )}
        >
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Message box: always at the foot of the page                                */
/* -------------------------------------------------------------------------- */

/*
 * One row: add, the words, dictate, send. Attached files sit in a muted
 * strip that tucks behind the box.
 */
function Composer() {
  const selected = useSelected();
  const attached = useAuiState((s) => s.composer.attachments.length > 0);
  const addFiles = useRef<HTMLButtonElement>(null);

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
          <div className="bg-muted border-border/60 mx-4 flex [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] gap-2 overflow-x-auto rounded-t-2xl border border-b-0 px-2 pt-2 pb-6">
            <ComposerPrimitive.Attachments>
              {() => <Attachment removable />}
            </ComposerPrimitive.Attachments>
          </div>
        </div>
      </div>
      {/*
       * The picker stays here, outside the menu that opens it: the primitive
       * drops a pick made after it has unmounted, as a closed menu's has.
       */}
      <ComposerPrimitive.AddAttachment ref={addFiles} hidden />
      <ComposerPrimitive.AttachmentDropzone className="bg-background border-border/60 data-[dragging=true]:border-foreground/40 relative flex flex-col rounded-[1.75rem] border p-1.5 shadow-(--float-shadow) transition-colors motion-reduce:transition-none">
        <AuiIf condition={(s) => s.composer.dictation != null}>
          <DictationStatus />
        </AuiIf>
        <div className="flex items-end gap-0.5">
          <Menu>
            <Tip label="Add" side="top">
              <MenuTrigger className={cn(iconButton, "group size-9")}>
                <Icon
                  icon={Add01Icon}
                  className="size-5 transition-transform duration-200 ease-out group-aria-expanded:rotate-45 motion-reduce:transition-none"
                />
              </MenuTrigger>
            </Tip>
            <MenuPopup side="top" className="min-w-44">
              <MenuItem onClick={() => addFiles.current?.click()}>
                <Icon icon={Attachment01Icon} />
                Add files
              </MenuItem>
            </MenuPopup>
          </Menu>
          <ComposerPrimitive.Input
            rows={1}
            placeholder={
              selected ? "Ask to change this task" : "Describe a task and when"
            }
            aria-label="Message"
            className="placeholder:text-muted-foreground/70 max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-base leading-6 outline-none"
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

/* An attached file: in the message box before it is sent, and on the message after. */
function Attachment({ removable = false }: { removable?: boolean }) {
  return (
    <AttachmentPrimitive.Root
      className={cn(
        rItem,
        "border-border/60 bg-background flex h-9 max-w-56 shrink-0 items-center gap-2 border ps-1.5 pe-2.5",
      )}
    >
      <AttachmentPrimitive.unstable_Thumb className="bg-foreground/[0.06] text-muted-foreground flex h-6 min-w-6 items-center justify-center rounded-md px-1 font-mono text-[10px]" />
      <span className="min-w-0 flex-1 truncate">
        <AttachmentPrimitive.Name />
      </span>
      {removable && (
        <Tip label="Remove the file" side="top">
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
