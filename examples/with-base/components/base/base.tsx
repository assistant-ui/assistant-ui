"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AttachmentPrimitive,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  QueueItemPrimitive,
  ThreadPrimitive,
  WebSpeechDictationAdapter,
  groupPartByType,
  useAui,
  useAuiState,
  type ExportedMessageRepository,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { useThreadTokenUsage } from "@assistant-ui/ai-sdk";
import { usePathname } from "next/navigation";
import {
  Add01Icon,
  Alert02Icon,
  ArrowDown02Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  BubbleChatTemporaryIcon,
  Cancel01Icon,
  CloudIcon,
  CodeIcon,
  ComputerTerminal01Icon,
  Copy01Icon,
  CubeIcon,
  Folder01Icon,
  Flag01Icon,
  FolderAddIcon,
  GitBranchIcon,
  GitForkIcon,
  Idea01Icon,
  LaptopIcon,
  Mic01Icon,
  MicOff01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  RefreshIcon,
  SecurityCheckIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  TouchInteraction01Icon,
  VolumeHighIcon,
  VolumeOffIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import {
  ContextBreakdown,
  type ContextSegment,
} from "@/components/assistant-ui/elements/context-breakdown";
import { ConversationMapAui } from "@/components/assistant-ui/elements/conversation-map.aui";
import { FeedbackDialog } from "@/components/assistant-ui/elements/feedback-dialog";
import { ThreadFollowupSuggestions } from "@/components/assistant-ui/elements/follow-up-suggestions.aui";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { MessageTiming } from "@/components/assistant-ui/elements/message-timing.aui";
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/elements/reasoning.aui";
import {
  SyntaxHighlighter,
  type HighlighterProps,
} from "@/components/assistant-ui/elements/shiki-highlighter.aui";
import { mono } from "@/components/assistant-ui/elements/surfaces";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  BaseThreadShell,
  CHAT_PATH,
  Icon,
  Menu,
  MenuChoice,
  MenuEmpty,
  MenuItem,
  MenuLabel,
  MenuList,
  MenuPopup,
  MenuRadioGroup,
  MenuSeparator,
  MenuSearch,
  MenuSub,
  MenuSubTrigger,
  MenuSwitch,
  MenuTrigger,
  SearchMenu,
  menu,
  menuItem,
  SearchMenuSub,
  Tip,
  focusRing,
  iconButton,
  useBaseShell,
} from "./base-thread-shell";
import { NavUser } from "./nav-user";
import { DEFAULT_EFFORT, DEFAULT_MODEL, EFFORTS } from "@/lib/models";
import { modelKey, useChosenModels } from "@/lib/chosen-models";
import { CODE_THEMES, DEFAULT_CODE_THEME } from "@/lib/custom-theme";
import { useCustomTheme } from "@/lib/theme";

/* -------------------------------------------------------------------------- */
/* Shared styles                                                              */
/* -------------------------------------------------------------------------- */

/* The column every part of the thread sits in. */
const column = "mx-auto w-full max-w-[44rem]";

/* A control that is only its words: 28px tall, a fill on hover and when open. */
const textControl = `hover:bg-foreground/[0.07] data-popup-open:bg-foreground/[0.07] flex h-7 items-center gap-1.5 rounded-full px-2.5 transition-colors motion-reduce:transition-none ${focusRing}`;

/* Code in a reply, highlighted in the theme chosen in the settings. */
function CodeHighlighter(props: HighlighterProps) {
  const { codeTheme = DEFAULT_CODE_THEME } = useCustomTheme();
  const theme =
    CODE_THEMES.find((entry) => entry.id === codeTheme) ?? CODE_THEMES[0];

  return (
    <SyntaxHighlighter
      {...props}
      theme={{ light: theme.light, dark: theme.dark }}
    />
  );
}

const markdownComponents = { SyntaxHighlighter: CodeHighlighter };

/* -------------------------------------------------------------------------- */
/* Frame and pages                                                            */
/* -------------------------------------------------------------------------- */

/** The app's frame: the sidebar, and the page beside it under its header. */
export function Base({ children }: PropsWithChildren) {
  const onChat = usePathname() === CHAT_PATH;

  return (
    <TooltipProvider delay={300}>
      <ForkLanding />
      <BaseThreadShell
        header={onChat ? <ThreadHeader /> : null}
        footer={<NavUser />}
      >
        {children}
      </BaseThreadShell>
    </TooltipProvider>
  );
}

/** The chat page: the open chat, or the start of a new one. */
export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
        <ConversationMapAui side="right" className="max-lg:hidden" />
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <EmptyState />
        </AuiIf>
        <div
          className={cn(column, "flex flex-col gap-6 pt-4 pb-10 empty:hidden")}
        >
          <ThreadPrimitive.Messages>
            {() => <Message />}
          </ThreadPrimitive.Messages>
        </div>
        <ThreadPrimitive.ViewportFooter
          className={cn(
            column,
            "bg-background sticky bottom-0 mt-auto flex flex-col pb-4",
          )}
        >
          <Tip label="Scroll to the newest message">
            <ThreadPrimitive.ScrollToBottom
              className={cn(
                iconButton,
                "bg-popover border-border absolute -top-10 self-center rounded-full border disabled:invisible",
              )}
            >
              <Icon icon={ArrowDown02Icon} />
            </ThreadPrimitive.ScrollToBottom>
          </Tip>
          <div className="pb-2 empty:hidden">
            <ThreadFollowupSuggestions />
          </div>
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

/* The thread's title and branch, in the header the shell gives the page. */
function ThreadHeader() {
  const { branch, temporary, setTemporary } = useBaseShell();
  const title = useAuiState((s) => s.threadListItem.title);
  const empty = useAuiState((s) => s.thread.isEmpty);

  return (
    <>
      <h1 className="min-w-0 flex-1 truncate px-1 font-medium">
        {empty ? (
          <span className="sr-only">
            {temporary ? "Temporary chat" : "New chat"}
          </span>
        ) : (
          title
        )}
      </h1>
      {branch && !temporary && (
        <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 pe-1 font-mono text-xs">
          <Icon icon={GitBranchIcon} className="size-3.5" />
          <span className="sr-only">Branch </span>
          {branch}
        </span>
      )}
      {temporary && <PersonalizeMenu />}
      {empty ? (
        <Tip label="Temporary chat">
          <button
            type="button"
            aria-pressed={temporary}
            onClick={() => setTemporary(!temporary)}
            className={cn(
              iconButton,
              "size-7",
              temporary && "bg-foreground/[0.07] text-foreground",
            )}
          >
            <Icon icon={BubbleChatTemporaryIcon} />
          </button>
        </Tip>
      ) : (
        temporary && (
          <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 px-1">
            <Icon icon={BubbleChatTemporaryIcon} className="size-4" />
            Temporary
          </span>
        )
      )}
    </>
  );
}

const PERSONALIZE = [
  {
    value: "on",
    label: "Personalized",
    description: "This chat can use memory, plugins and custom instructions",
  },
  {
    value: "off",
    label: "Unpersonalized",
    description: "This chat ignores memory, plugins and custom instructions",
  },
] as const;

/*
 * Whether a temporary chat may draw on what the app knows of the person. The
 * example keeps the choice; it has no memory or instructions to draw on.
 */
function PersonalizeMenu() {
  const [value, setValue] = useState<string>(PERSONALIZE[0].value);
  const current = PERSONALIZE.find((entry) => entry.value === value);

  return (
    <Menu>
      <MenuTrigger className={textControl}>{current?.label}</MenuTrigger>
      <MenuPopup align="end" className="min-w-72">
        <MenuRadioGroup value={value} onValueChange={setValue}>
          {PERSONALIZE.map((entry) => (
            <MenuChoice
              key={entry.value}
              value={entry.value}
              className="items-start"
            >
              <span className="flex min-w-0 flex-col">
                {entry.label}
                <span className="text-muted-foreground text-xs">
                  {entry.description}
                </span>
              </span>
            </MenuChoice>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </Menu>
  );
}

function EmptyState() {
  const { temporary } = useBaseShell();

  return (
    <div className="my-auto flex flex-col items-center gap-7 pb-16">
      <span className="text-muted-foreground/70 border-muted-foreground/40 flex size-11 items-center justify-center rounded-2xl border-2">
        <Icon
          icon={temporary ? BubbleChatTemporaryIcon : ComputerTerminal01Icon}
          className="size-5.5"
        />
      </span>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-[1.625rem] leading-8 tracking-tight">
          {temporary ? "Temporary chat" : "What should we build?"}
        </p>
        {temporary && (
          <p className="text-muted-foreground max-w-80 text-sm leading-6">
            This chat stays out of your recents, and is deleted once you open
            another.
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer: the strip that says where the work happens, then the message box */
/* -------------------------------------------------------------------------- */

const ENVIRONMENTS: readonly {
  id: string;
  label: string;
  note?: string;
  icon: IconSvgElement;
}[] = [
  { id: "local", label: "This computer", icon: LaptopIcon },
  { id: "cloud", label: "Cloud", note: "Default environment", icon: CloudIcon },
];

/* Where the agent would run. The example keeps the choice; it runs nothing. */
function EnvironmentMenu() {
  const [value, setValue] = useState(ENVIRONMENTS[0]?.id ?? "");
  const current = ENVIRONMENTS.find((entry) => entry.id === value);

  return (
    <SearchMenu>
      <MenuTrigger className={textControl}>
        <Icon icon={current?.icon ?? LaptopIcon} className="size-4" />
        {current?.label}
      </MenuTrigger>
      <MenuPopup side="top" className="min-w-60">
        <MenuSearch placeholder="Work in" aria-label="Work in" />
        <MenuList>
          <MenuRadioGroup value={value} onValueChange={setValue}>
            {ENVIRONMENTS.map((entry) => (
              <MenuChoice key={entry.id} value={entry.id}>
                <Icon icon={entry.icon} />
                {entry.label}
                {entry.note && (
                  <span className="text-muted-foreground">{entry.note}</span>
                )}
              </MenuChoice>
            ))}
          </MenuRadioGroup>
          <MenuEmpty>Nothing matches</MenuEmpty>
        </MenuList>
      </MenuPopup>
    </SearchMenu>
  );
}

/* The projects to pick from, in the strip's menu and the add menu alike. */
function ProjectChoices({ onChoose }: { onChoose?: () => void }) {
  const { projects, project, setProject } = useBaseShell();

  return (
    <>
      <MenuSearch placeholder="Search projects" aria-label="Search projects" />
      <MenuList>
        <MenuRadioGroup
          value={project?.name ?? ""}
          onValueChange={(name) => {
            setProject(projects.find((entry) => entry.name === name) ?? null);
            onChoose?.();
          }}
        >
          {projects.map((entry) => (
            <MenuChoice key={entry.name} value={entry.name}>
              <Icon icon={Folder01Icon} />
              {entry.name}
            </MenuChoice>
          ))}
        </MenuRadioGroup>
        <MenuEmpty>
          {projects.length === 0 ? "No projects yet" : "No project matches"}
        </MenuEmpty>
      </MenuList>
    </>
  );
}

function ProjectMenu() {
  const { project } = useBaseShell();

  return (
    <SearchMenu>
      <MenuTrigger
        className={cn(textControl, !project && "text-muted-foreground")}
      >
        <Icon icon={Folder01Icon} className="size-4" />
        {project ? project.name : "Choose project"}
      </MenuTrigger>
      <MenuPopup side="top" className="min-w-60">
        <ProjectChoices />
      </MenuPopup>
    </SearchMenu>
  );
}

/*
 * What a chosen project adds: whether the work gets a worktree of its own,
 * and the branch it starts from. The example keeps both; it checks out nothing.
 */
function SettingsMenu() {
  const { project, branch, setBranch } = useBaseShell();
  const [worktree, setWorktree] = useState(true);
  if (!project) return null;

  return (
    <Menu>
      <Tip label="Additional settings" side="top">
        <MenuTrigger
          className={cn(
            iconButton,
            "data-popup-open:bg-foreground/[0.07] size-7 rounded-full",
          )}
        >
          <Icon icon={MoreHorizontalIcon} />
        </MenuTrigger>
      </Tip>
      <MenuPopup side="top" className="min-w-60">
        <MenuLabel>Additional settings</MenuLabel>
        <MenuSwitch checked={worktree} onCheckedChange={setWorktree}>
          <Icon icon={GitForkIcon} />
          New worktree
        </MenuSwitch>
        <MenuSub>
          <MenuSubTrigger>
            <Icon icon={CubeIcon} />
            Environment
            <span className="text-muted-foreground min-w-0 flex-1 truncate ps-4 text-end">
              No environment
            </span>
          </MenuSubTrigger>
          <MenuPopup side="right" sideOffset={6} alignOffset={-4}>
            <MenuRadioGroup value="none">
              <MenuChoice value="none">No environment</MenuChoice>
            </MenuRadioGroup>
          </MenuPopup>
        </MenuSub>
        <SearchMenuSub>
          <MenuSubTrigger>
            <Icon icon={GitBranchIcon} />
            Branch
            <span className="text-muted-foreground min-w-0 flex-1 truncate ps-4 text-end font-mono text-xs">
              {branch}
            </span>
          </MenuSubTrigger>
          <MenuPopup
            side="right"
            sideOffset={6}
            alignOffset={-4}
            className="min-w-60"
          >
            <MenuSearch
              placeholder="Search branches"
              aria-label="Search branches"
            />
            <MenuList>
              <MenuRadioGroup value={branch ?? ""} onValueChange={setBranch}>
                {project.branches.map((entry) => (
                  <MenuChoice key={entry} value={entry}>
                    <Icon icon={GitBranchIcon} />
                    <span className="font-mono text-xs">{entry}</span>
                  </MenuChoice>
                ))}
              </MenuRadioGroup>
              <MenuEmpty>No branch matches</MenuEmpty>
            </MenuList>
          </MenuPopup>
        </SearchMenuSub>
      </MenuPopup>
    </Menu>
  );
}

const APPROVALS = [
  {
    value: "ask",
    label: "Ask for approval",
    description: "Always ask to edit external files and use the internet",
    icon: TouchInteraction01Icon,
  },
  {
    value: "auto",
    label: "Approve for me",
    description: "Only ask for actions detected as potentially unsafe",
    icon: SecurityCheckIcon,
  },
  {
    value: "full",
    label: "Full access",
    description:
      "Unrestricted access to the internet and any file on your computer",
    icon: Alert02Icon,
    danger: true,
  },
] as const;

/*
 * How much the agent may do without asking. The example keeps the choice; its
 * chat route has no actions that need approval.
 */
function ApprovalMenu() {
  const [value, setValue] = useState<string>(APPROVALS[0].value);
  const current = APPROVALS.find((entry) => entry.value === value);

  return (
    <Menu>
      <MenuTrigger className={cn(textControl, "text-muted-foreground")}>
        {current?.label}
      </MenuTrigger>
      <MenuPopup side="top" className="min-w-72">
        <MenuLabel>How should actions be approved?</MenuLabel>
        <MenuRadioGroup value={value} onValueChange={setValue}>
          {APPROVALS.map((entry) => (
            <MenuChoice
              key={entry.value}
              value={entry.value}
              className={cn(
                "items-start",
                "danger" in entry && "text-orange-600 dark:text-orange-500",
              )}
            >
              <Icon icon={entry.icon} className="mt-0.5" />
              <span className="flex min-w-0 flex-col">
                {entry.label}
                <span
                  className={cn(
                    "text-xs",
                    !("danger" in entry) && "text-muted-foreground",
                  )}
                >
                  {entry.description}
                </span>
              </span>
            </MenuChoice>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </Menu>
  );
}

/*
 * The model and the effort the next message is sent with. The models are the
 * ones chosen in the settings; one taken off that list falls back to the
 * default. The runtime reads both on each send.
 */
function ModelMenu() {
  const aui = useAui();
  const chosen = useChosenModels();
  const [picked, setPicked] = useState<string>(DEFAULT_MODEL);
  const [effort, setEffort] = useState<string>(DEFAULT_EFFORT);
  const current = chosen.find((entry) => modelKey(entry) === picked);
  const model = current ? picked : DEFAULT_MODEL;

  useEffect(
    () =>
      aui.modelContext.register({
        getModelContext: () => ({
          config: {
            ...(model === DEFAULT_MODEL ? {} : { modelName: model }),
            reasoningEffort: effort,
          },
        }),
      }),
    [aui, model, effort],
  );

  const effortLabel = EFFORTS.find((entry) => entry.value === effort)?.label;

  return (
    <Menu>
      <MenuTrigger className={textControl}>
        {current?.name ?? "Default"}
        <span className="text-muted-foreground">{effortLabel}</span>
      </MenuTrigger>
      <MenuPopup
        side="top"
        align="end"
        className="max-h-80 min-w-56 overflow-y-auto"
      >
        <MenuLabel>Select model</MenuLabel>
        <MenuRadioGroup value={model} onValueChange={setPicked}>
          <MenuChoice value={DEFAULT_MODEL}>
            <span className="flex min-w-0 flex-col">
              Default
              <span className="text-muted-foreground text-xs">
                The chat route&apos;s own model
              </span>
            </span>
          </MenuChoice>
          {chosen.map((entry) => (
            <MenuChoice key={modelKey(entry)} value={modelKey(entry)}>
              {entry.name}
            </MenuChoice>
          ))}
        </MenuRadioGroup>
        {chosen.length === 0 && (
          <p className="text-muted-foreground px-2 py-1 text-xs">
            Add models in the settings, under Models.
          </p>
        )}
        <MenuSeparator />
        <MenuSub>
          <MenuSubTrigger>
            <Icon icon={Idea01Icon} />
            Reasoning
            <span className="text-muted-foreground">{effortLabel}</span>
          </MenuSubTrigger>
          <MenuPopup side="left" sideOffset={6} alignOffset={-4}>
            <MenuRadioGroup value={effort} onValueChange={setEffort}>
              {EFFORTS.map((entry) => (
                <MenuChoice key={entry.value} value={entry.value}>
                  {entry.label}
                </MenuChoice>
              ))}
            </MenuRadioGroup>
          </MenuPopup>
        </MenuSub>
      </MenuPopup>
    </Menu>
  );
}

const FOLDER_LIMIT = 50;

/* Left out of a folder: hidden files and folders, and installed packages. */
const skipped = (path: string) =>
  path
    .split("/")
    .some((part) => part.startsWith(".") || part === "node_modules");

const readAsDataURL = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/*
 * A folder as one attachment: a text file that holds each of its text files
 * under its path, up to a limit a message can carry. The name ends in a
 * slash, which is how a folder is told from a file once the message is sent.
 */
async function folderAttachment(picked: File[]) {
  const files = picked
    .filter((file) => !skipped(file.webkitRelativePath))
    .slice(0, FOLDER_LIMIT);
  const texts = await Promise.all(
    files.map(async (file) => ({
      path: file.webkitRelativePath,
      text: await file.text(),
    })),
  );
  const readable = texts.filter((file) => !file.text.includes("\0"));
  const name = files[0]?.webkitRelativePath.split("/")[0];
  if (!name || readable.length === 0) return null;

  const body = readable
    .map((file) => `<file path="${file.path}">\n${file.text}\n</file>`)
    .join("\n\n");
  return {
    type: "file",
    name: `${name}/`,
    contentType: "text/plain",
    content: [
      {
        type: "file" as const,
        mimeType: "text/plain",
        filename: `${name}/`,
        data: await readAsDataURL(new Blob([body], { type: "text/plain" })),
      },
    ],
  };
}

/* Picks a folder and attaches it. */
function useAddFolder() {
  const aui = useAui();

  return () => {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    input.hidden = true;
    document.body.appendChild(input);

    input.onchange = async () => {
      const picked = Array.from(input.files ?? []);
      input.remove();
      const folder = await folderAttachment(picked).catch(() => null);
      // The composer reports an attachment it cannot take through its own event.
      if (folder)
        aui
          .composer()
          .addAttachment(folder)
          .catch(() => {});
    };
    input.oncancel = () => input.remove();
    input.click();
  };
}

/*
 * What a message can carry, then what the chat can work with. Code and a
 * project both open the strip above the box.
 */
function AddMenu({
  code,
  onCodeChange,
  onAddFiles,
}: {
  code: boolean;
  onCodeChange: (code: boolean) => void;
  onAddFiles: () => void;
}) {
  const { project, temporary } = useBaseShell();
  const addFolder = useAddFolder();

  return (
    <Menu>
      <Tip label="Add">
        <MenuTrigger className={cn(iconButton, "group size-7 rounded-full")}>
          <Icon
            icon={Add01Icon}
            className="size-[1.125rem] transition-transform duration-200 ease-out group-aria-expanded:rotate-45 motion-reduce:transition-none"
          />
        </MenuTrigger>
      </Tip>
      <MenuPopup side="top" className="min-w-52">
        <MenuItem onClick={onAddFiles}>
          <Icon icon={Attachment01Icon} />
          Add files
        </MenuItem>
        <MenuItem onClick={addFolder}>
          <Icon icon={FolderAddIcon} />
          Add folder
        </MenuItem>
        {!temporary && (
          <>
            <MenuSeparator />
            <MenuSwitch
              closeOnClick
              checked={code}
              onCheckedChange={onCodeChange}
            >
              <Icon icon={CodeIcon} />
              Code
            </MenuSwitch>
            <SearchMenuSub>
              <MenuSubTrigger>
                <Icon icon={Folder01Icon} />
                Project
                {project && (
                  <span className="text-muted-foreground min-w-0 flex-1 truncate ps-4 text-end">
                    {project.name}
                  </span>
                )}
              </MenuSubTrigger>
              <MenuPopup
                side="right"
                sideOffset={6}
                alignOffset={-4}
                className="min-w-60"
              >
                <ProjectChoices onChoose={() => onCodeChange(true)} />
              </MenuPopup>
            </SearchMenuSub>
          </>
        )}
      </MenuPopup>
    </Menu>
  );
}

/*
 * Messages sent while a reply is still coming wait here in the order they
 * will go. One can be sent at once, which steers the run, or taken out.
 */
function Queue() {
  const count = useAuiState((s) => s.composer.queue.length);
  if (count === 0) return null;

  return (
    <div className="flex flex-col gap-1 px-3.5 pb-2">
      <div
        className={cn(
          mono,
          "text-muted-foreground flex items-baseline justify-between px-1",
        )}
      >
        <span>{count} queued</span>
        <span>sends when this finishes</span>
      </div>
      <ul className="flex flex-col gap-1">
        <ComposerPrimitive.Queue>
          {({ queueItem }) => (
            <li
              key={queueItem.id}
              className="flex h-8 items-center gap-1 rounded-xl bg-(--strip) ps-3 pe-1"
            >
              <span className="text-muted-foreground min-w-0 flex-1 truncate">
                <QueueItemPrimitive.Text />
              </span>
              <Tip label="Send now" side="top">
                <QueueItemPrimitive.Steer className={cn(iconButton, "size-6")}>
                  <Icon icon={ArrowUp02Icon} />
                </QueueItemPrimitive.Steer>
              </Tip>
              <Tip label="Remove from the queue" side="top">
                <QueueItemPrimitive.Remove className={cn(iconButton, "size-6")}>
                  <Icon icon={Cancel01Icon} />
                </QueueItemPrimitive.Remove>
              </Tip>
            </li>
          )}
        </ComposerPrimitive.Queue>
      </ul>
    </div>
  );
}

/* A chosen model's own window is not kept, so every model is measured by this one. */
const CONTEXT_WINDOW = 128_000;

/*
 * How much of the model's context window the chat holds: the prompt and the
 * reply of the latest step, the two figures a provider reports.
 */
function ContextMeter() {
  const usage = useThreadTokenUsage();
  const segments: ContextSegment[] = [
    {
      label: "Prompt",
      tokens: usage?.inputTokens ?? 0,
      tint: "bg-foreground/30",
    },
    { label: "Reply", tokens: usage?.outputTokens ?? 0, tint: "bg-brand" },
  ];
  const used = segments.reduce((sum, segment) => sum + segment.tokens, 0);
  const share = Math.min(100, (used / CONTEXT_WINDOW) * 100);

  return (
    <Popover>
      <Tip label="Context" side="top">
        <PopoverTrigger
          className={cn(
            iconButton,
            "data-popup-open:bg-foreground/[0.07] size-7 rounded-full",
          )}
        >
          <svg viewBox="0 0 16 16" fill="none" className="-rotate-90">
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="2"
            />
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${share} 100`}
            />
          </svg>
        </PopoverTrigger>
      </Tip>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-80 bg-transparent p-0 ring-0"
      >
        <ContextBreakdown
          segments={segments}
          limit={CONTEXT_WINDOW}
          className="max-w-none shadow-[0_8px_24px_rgb(0_0_0/0.16)]"
        />
      </PopoverContent>
    </Popover>
  );
}

function Composer() {
  const { project, setProject, temporary } = useBaseShell();
  const [code, setCode] = useState(project !== null);
  const attached = useAuiState((s) => s.composer.attachments.length > 0);
  const addFiles = useRef<HTMLButtonElement>(null);
  // A temporary chat has no code or project; the choice comes back after it.
  const coding = code && !temporary;
  const strip = coding || attached;

  /* Turning code off puts its part of the strip away, and the project with it. */
  const onCodeChange = (next: boolean) => {
    setCode(next);
    if (!next) setProject(null);
  };

  return (
    <ComposerPrimitive.Root className="flex flex-col">
      <Queue />
      {/*
       * The strip holds where the work happens and what is attached, and
       * tucks behind the box, whose top corners sit over it.
       */}
      <div
        inert={!strip}
        className={cn(
          "grid transition-[grid-template-rows,margin] duration-200 ease-out motion-reduce:transition-none",
          strip ? "-mb-3.5 grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mx-3.5 flex items-center gap-1.5 rounded-t-2xl bg-(--strip) px-1.5 pt-1.5 pb-5">
            {coding && (
              <div className="flex shrink-0 items-center gap-0.5">
                <EnvironmentMenu />
                <ProjectMenu />
                <SettingsMenu />
              </div>
            )}
            <div className="-m-0.5 flex min-w-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] gap-1.5 overflow-x-auto p-0.5 empty:hidden">
              <ComposerPrimitive.Attachments>
                {() => <Attachment removable />}
              </ComposerPrimitive.Attachments>
            </div>
          </div>
        </div>
      </div>
      {/*
       * The picker stays here, outside the menu that opens it: the primitive
       * drops a pick made after it has unmounted, as a closed menu's has.
       */}
      <ComposerPrimitive.AddAttachment ref={addFiles} hidden />
      <ComposerPrimitive.AttachmentDropzone className="data-[dragging=true]:border-primary/60 border-border relative flex flex-col gap-0.5 rounded-[1.125rem] border bg-(--background) p-2 transition-colors motion-reduce:transition-none">
        <AuiIf condition={(s) => s.composer.dictation != null}>
          <DictationStatus />
        </AuiIf>

        <ComposerPrimitive.Input
          rows={2}
          placeholder="Do anything"
          aria-label="Message"
          className="placeholder:text-muted-foreground/70 max-h-48 min-h-11 w-full resize-none bg-transparent px-2 pt-1 text-sm leading-6 outline-none"
        />

        <div className="flex items-center gap-1">
          <AddMenu
            code={code}
            onCodeChange={onCodeChange}
            onAddFiles={() => addFiles.current?.click()}
          />
          <ApprovalMenu />
          <div className="ms-auto flex items-center gap-1">
            <ContextMeter />
            <ModelMenu />
            <DictationButton />
            {/* While a reply is coming, a typed message can be sent to wait its turn. */}
            <AuiIf condition={(s) => s.thread.isRunning && s.composer.isEmpty}>
              <Tip label="Stop">
                <ComposerPrimitive.Cancel
                  className={cn(
                    "bg-foreground text-background flex size-7 items-center justify-center rounded-full",
                    focusRing,
                  )}
                >
                  <span
                    aria-hidden
                    className="size-2.5 rounded-[2px] bg-current"
                  />
                </ComposerPrimitive.Cancel>
              </Tip>
            </AuiIf>
            <AuiIf
              condition={(s) => !s.thread.isRunning || !s.composer.isEmpty}
            >
              <Tip label="Send">
                <ComposerPrimitive.Send
                  className={cn(
                    "bg-foreground text-background flex size-7 items-center justify-center rounded-full transition-opacity disabled:opacity-40 motion-reduce:transition-none",
                    focusRing,
                  )}
                >
                  <Icon icon={ArrowUp02Icon} className="size-4" />
                </ComposerPrimitive.Send>
              </Tip>
            </AuiIf>
          </div>
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

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
          "bg-foreground/[0.07] text-foreground size-7 rounded-full",
        )}
      >
        <Icon icon={MicOff01Icon} />
      </ComposerPrimitive.StopDictation>
    </Tip>
  ) : (
    <Tip label="Dictate">
      <ComposerPrimitive.Dictate
        className={cn(iconButton, "text-foreground size-7 rounded-full")}
      >
        <Icon icon={Mic01Icon} />
      </ComposerPrimitive.Dictate>
    </Tip>
  );
}

/* While dictating: the words being heard, or a note that it is listening. */
function DictationStatus() {
  const hearing = useAuiState((s) => Boolean(s.composer.dictation?.transcript));

  return (
    <div className="text-muted-foreground flex items-center gap-2 px-2.5 pt-1.5">
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

const thumb =
  "bg-foreground/[0.06] text-muted-foreground flex h-6 min-w-6 items-center justify-center rounded-md px-1 font-mono text-[10px]";

/* A file, or a folder, whose name ends in a slash. */
function Attachment({ removable = false }: { removable?: boolean }) {
  const name = useAuiState((s) => s.attachment.name);
  const folder = name.endsWith("/");

  return (
    <AttachmentPrimitive.Root className="border-border bg-background flex h-9 max-w-56 shrink-0 items-center gap-2 rounded-xl border ps-1.5 pe-2.5">
      {folder ? (
        <span className={thumb}>
          <Icon icon={Folder01Icon} className="size-3.5" />
        </span>
      ) : (
        <AttachmentPrimitive.unstable_Thumb className={thumb} />
      )}
      <span className="min-w-0 flex-1 truncate">
        {folder ? name.slice(0, -1) : name}
      </span>
      {removable && (
        <Tip label={folder ? "Remove the folder" : "Remove the file"}>
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
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

const dayOf = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const dayFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayOf(date) === dayOf(today)) return "Today";
  if (dayOf(date) === dayOf(yesterday)) return "Yesterday";
  return dayFormat.format(date);
}

/* The day separator element's rule and label, above the first message of each day. */
function DayMark() {
  const label = useAuiState((s) => {
    const previous = s.thread.messages[s.message.index - 1];
    const { createdAt } = s.message;
    return previous && dayOf(previous.createdAt) === dayOf(createdAt)
      ? null
      : dayLabel(createdAt);
  });
  if (!label) return null;

  return (
    <div
      role="separator"
      aria-label={label}
      className="flex items-center gap-2.5"
    >
      <span className="bg-border h-px flex-1" />
      <span className={cn(mono, "text-muted-foreground")}>{label}</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}

/* When a message was sent, shown with its actions. */
function MessageTime() {
  const time = useAuiState((s) => timeFormat.format(s.message.createdAt));
  return (
    <span className={cn(mono, "text-muted-foreground px-1.5 tabular-nums")}>
      {time}
    </span>
  );
}

function Message() {
  const role = useAuiState((s) => s.message.role);
  const editing = useAuiState((s) => s.message.composer.isEditing);

  return (
    <>
      <DayMark />
      {editing ? (
        <EditComposer />
      ) : role === "user" ? (
        <UserMessage />
      ) : (
        <AssistantMessage />
      )}
    </>
  );
}

/* Shown only while the pointer is over the message, or focus is inside it. */
const actionBar =
  "flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 has-data-popup-open:opacity-100 has-data-[state=open]:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100";

/*
 * A sent message is rewritten in a chat of its own, so a chat keeps one line
 * of turns. Until its reply is finished it can still be edited in place.
 */
function UserMessage() {
  const awaitingReply = useAuiState(
    (s) =>
      s.thread.isRunning && s.message.index >= s.thread.messages.length - 2,
  );

  return (
    <MessagePrimitive.Root className="group flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2 empty:hidden">
        <MessagePrimitive.Attachments>
          {() => <Attachment />}
        </MessagePrimitive.Attachments>
      </div>
      <div className="max-w-[80%] rounded-2xl bg-(--composer) px-3.5 py-2 text-sm leading-6 wrap-break-word whitespace-pre-wrap">
        <MessagePrimitive.Parts>
          {({ part }) => (part.type === "text" ? part.text : null)}
        </MessagePrimitive.Parts>
      </div>
      <div className="flex h-7 items-center">
        <ActionBarPrimitive.Root className={actionBar}>
          <MessageTime />
          {awaitingReply ? (
            <Tip label="Edit">
              <ActionBarPrimitive.Edit className={iconButton}>
                <Icon icon={PencilEdit02Icon} />
              </ActionBarPrimitive.Edit>
            </Tip>
          ) : (
            <ForkFromHere />
          )}
          <CopyButton />
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function EditComposer() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <ComposerPrimitive.Root className="flex w-full max-w-[80%] flex-col gap-2 rounded-2xl bg-(--composer) p-2">
        <ComposerPrimitive.Input
          autoFocus
          aria-label="Edit the message"
          className="min-h-9 w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none"
        />
        <div className="flex justify-end gap-1">
          <ComposerPrimitive.Cancel
            className={cn(textControl, "text-muted-foreground")}
          >
            Cancel
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send
            className={cn(
              "bg-foreground text-background flex h-7 items-center rounded-full px-3 font-medium",
              focusRing,
            )}
          >
            Send
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

/* A reply's reasoning and tool calls, run together, read as one trace. */
const groupWork = groupPartByType({
  reasoning: ["group-chainOfThought"],
  "tool-call": ["group-chainOfThought"],
});

function AssistantMessage() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const askWhy = () => setFeedbackOpen(true);

  return (
    <MessagePrimitive.Root className="group flex flex-col items-start gap-1">
      <div className="flex w-full max-w-full flex-col gap-2.5 text-sm leading-6 wrap-break-word">
        <MessagePrimitive.GroupedParts groupBy={groupWork}>
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <Trace part={part}>{children}</Trace>;
              case "text":
                return <MarkdownText components={markdownComponents} />;
              case "reasoning":
                return <MarkdownText components={markdownComponents} />;
              case "tool-call":
                return part.toolUI ?? <ToolCallPart {...part} />;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <AuiIf
          condition={(s) =>
            s.message.status?.type === "running" && s.message.parts.length === 0
          }
        >
          <span
            role="status"
            className="text-muted-foreground shimmer motion-reduce:animate-none"
          >
            Working
          </span>
        </AuiIf>
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="border-destructive/25 text-destructive bg-destructive/5 rounded-xl border px-3.5 py-2.5 text-sm leading-5">
            <ErrorPrimitive.Message />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
      <div className="-ms-1.5 flex h-7 items-center">
        <ActionBarPrimitive.Root hideWhenRunning className={actionBar}>
          <CopyButton />
          <Tip label="Good reply">
            <ActionBarPrimitive.FeedbackPositive
              className={cn(
                iconButton,
                "data-submitted:bg-foreground/[0.07] data-submitted:text-foreground",
              )}
            >
              <Icon icon={ThumbsUpIcon} />
            </ActionBarPrimitive.FeedbackPositive>
          </Tip>
          <Tip label="Bad reply">
            <ActionBarPrimitive.FeedbackNegative
              onClick={askWhy}
              className={cn(
                iconButton,
                "data-submitted:bg-foreground/[0.07] data-submitted:text-foreground",
              )}
            >
              <Icon icon={ThumbsDownIcon} />
            </ActionBarPrimitive.FeedbackNegative>
          </Tip>
          <TryAgain />
          <MoreActions onReport={askWhy} />
          <MessageTiming side="top" className="h-6.5 px-1.5" />
          <MessageTime />
        </ActionBarPrimitive.Root>
      </div>
      <FeedbackForm open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </MessagePrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* The agent's work: its reasoning and the tools it called                    */
/* -------------------------------------------------------------------------- */

/* One line of work: an icon, what was done, and a chevron that opens it. */
const workLine = `text-muted-foreground hover:text-foreground flex w-fit max-w-full min-w-0 items-center gap-2 rounded-md text-start text-[0.8125rem] leading-5 transition-colors motion-reduce:transition-none ${focusRing}`;

function WorkLine({
  icon,
  running = false,
  open,
  onToggle,
  children,
}: PropsWithChildren<{
  icon: IconSvgElement;
  running?: boolean;
  open: boolean;
  onToggle: () => void;
}>) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={workLine}
    >
      <Icon icon={icon} className="size-4 shrink-0" />
      <span
        className={cn(
          "min-w-0 truncate",
          running ? "shimmer motion-reduce:animate-none" : "",
        )}
      >
        {children}
      </span>
      <Icon
        icon={ArrowRight01Icon}
        className={cn(
          "size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none",
          open ? "rotate-90" : "rtl:rotate-180",
        )}
      />
    </button>
  );
}

type WorkGroup = MessagePrimitive.GroupedParts.GroupPart;

const secondsOf = (timing: WorkGroup["timing"]) =>
  timing?.completedAt === undefined
    ? undefined
    : Math.round((timing.completedAt - timing.startedAt) / 1000);

/*
 * The work behind a reply, in the reasoning element: open while it happens,
 * folded to a line once it is done. Grouped parts took the place of the
 * chain of thought primitive.
 */
function Trace({ part, children }: PropsWithChildren<{ part: WorkGroup }>) {
  const running = part.status.type === "running";

  return (
    <ReasoningRoot variant="ghost" streaming={running} className="mb-0">
      <ReasoningTrigger
        active={running}
        label={running ? "Working" : "Worked"}
        duration={secondsOf(part.timing)}
        className="py-0.5 text-[0.8125rem]"
      />
      {/* The fade over the first line is for long reasoning; a trace starts clear. */}
      <ReasoningContent
        aria-busy={running}
        className="[&>[data-slot=reasoning-fade]:first-child]:hidden"
      >
        <ReasoningText className="text-[0.8125rem] leading-5">
          {children}
        </ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
}

/* A tool call with no interface of its own: its name, and what it was given and gave back. */
function ToolCallPart({
  toolName,
  argsText,
  result,
  status,
}: Pick<
  ToolCallMessagePartProps,
  "toolName" | "argsText" | "result" | "status"
>) {
  const [open, setOpen] = useState(false);
  const running = status.type === "running";

  return (
    <div className="flex flex-col gap-2">
      <WorkLine
        icon={Wrench01Icon}
        running={running}
        open={open}
        onToggle={() => setOpen((value) => !value)}
      >
        {running ? "Running" : "Ran"}{" "}
        <span className="font-mono text-xs">{toolName}</span>
      </WorkLine>
      {open && (
        <pre className="bg-foreground/[0.05] text-foreground overflow-x-auto rounded-xl px-3.5 py-2.5 font-mono text-xs leading-5">
          {argsText}
          {result === undefined ? "" : `\n${JSON.stringify(result, null, 2)}`}
        </pre>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Action bar pieces                                                          */
/* -------------------------------------------------------------------------- */

/*
 * A fork is a chat of its own: the turns up to a message, and for a message
 * of the person's, its words in the message box to send again. The switch
 * mounts that chat, so the copy is applied once it is on screen.
 */
type PendingFork = {
  repository: ExportedMessageRepository | null;
  draft: string;
};

let pendingFork: PendingFork | null = null;

function branchThrough(
  messages: ExportedMessageRepository["messages"],
  messageId: string,
): ExportedMessageRepository {
  const byId = new Map(messages.map((item) => [item.message.id, item]));
  const chain = [];
  const seen = new Set<string>();
  let id: string | null = messageId;
  while (id !== null && !seen.has(id)) {
    seen.add(id);
    const item = byId.get(id);
    if (!item) break;
    chain.push(item);
    id = item.parentId;
  }
  chain.reverse();
  return {
    headId: messageId,
    messages: chain.map((item, index) =>
      index === 0 ? { ...item, parentId: null } : item,
    ),
  };
}

function firstUserText(repository: ExportedMessageRepository) {
  for (const item of repository.messages) {
    if (item.message.role !== "user") continue;
    for (const part of item.message.content) {
      if (part.type === "text" && part.text.trim()) return part.text;
    }
  }
  return "";
}

const chatTitle = (text: string) =>
  text.length > 60 ? `${text.slice(0, 57).trimEnd()}...` : text;

function ForkLanding() {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threads.mainThreadId);
  const empty = useAuiState((s) => s.thread.isEmpty);

  useEffect(() => {
    const fork = pendingFork;
    if (!fork) return;
    if (!empty) {
      pendingFork = null;
      return;
    }
    if (fork.draft) aui.composer.setText(fork.draft);
    if (!fork.repository) {
      pendingFork = null;
      return;
    }
    aui.thread.import(fork.repository);
    const text = firstUserText(fork.repository);
    if (text) aui.threads.item("main").rename(chatTitle(text));
  }, [aui, empty, threadId]);

  return null;
}

/* Opens the turns before this message as a new chat, with its words ready to send again. */
function ForkFromHere() {
  const aui = useAui();

  return (
    <Tip label="Fork from here">
      <button
        type="button"
        className={iconButton}
        onClick={() => {
          const { id, content } = aui.message.getState();
          const messages = aui.thread.export().messages;
          const parentId =
            messages.find((item) => item.message.id === id)?.parentId ?? null;
          pendingFork = {
            repository: parentId ? branchThrough(messages, parentId) : null,
            draft: content
              .flatMap((part) => (part.type === "text" ? [part.text] : []))
              .join("\n"),
          };
          aui.threads.switchToNewThread();
        }}
      >
        <Icon icon={GitForkIcon} />
      </button>
    </Tip>
  );
}

function useCurrentModel() {
  const aui = useAui();
  return useSyncExternalStore(
    (onChange) => aui.modelContext.subscribe?.(onChange) ?? (() => {}),
    () => aui.modelContext.getState().modelName ?? DEFAULT_MODEL,
    () => DEFAULT_MODEL,
  );
}

/* Asks for the reply again, from the route's model or one of the chosen ones. */
function TryAgain() {
  const aui = useAui();
  const chosen = useChosenModels();
  const currentId = useCurrentModel();
  const options = [
    { id: DEFAULT_MODEL, name: "Default", detail: "Route" },
    ...chosen.map((entry) => ({
      id: modelKey(entry),
      name: entry.name,
      detail: entry.provider,
    })),
  ];

  return (
    <Menu>
      <Tip label="Try again">
        <MenuTrigger
          className={cn(
            iconButton,
            "data-popup-open:bg-foreground/[0.07] data-popup-open:text-foreground",
          )}
        >
          <Icon icon={RefreshIcon} />
        </MenuTrigger>
      </Tip>
      <MenuPopup side="top" className="max-h-80 min-w-56 overflow-y-auto">
        <MenuLabel>Try again with</MenuLabel>
        {options.map((option) => (
          <MenuItem
            key={option.id}
            onClick={() =>
              aui.message.reload({
                runConfig: {
                  custom: {
                    modelName: option.id === DEFAULT_MODEL ? "" : option.id,
                  },
                },
              })
            }
          >
            <span className="min-w-0 truncate">{option.name}</span>
            <span className="text-muted-foreground ms-auto ps-4">
              {option.id === currentId ? "Current" : option.detail}
            </span>
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}

const REASONS = [
  "Not correct",
  "Didn't follow instructions",
  "Too long",
  "Unsafe",
] as const;

/*
 * The feedback dialog element, in the app's dialog: after a thumbs-down, what
 * went wrong. The reasons and the note go with the rating as its comment.
 */
function FeedbackForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const aui = useAui();
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setSelected([]);
          setNote("");
          setSent(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-sm bg-transparent p-0 shadow-none ring-0 sm:max-w-sm"
      >
        <DialogTitle className="sr-only">Feedback on this reply</DialogTitle>
        <DialogDescription className="sr-only">
          Say what went wrong with this reply.
        </DialogDescription>
        <FeedbackDialog
          reasons={REASONS}
          selected={selected}
          note={note}
          sent={sent}
          onToggleReason={(reason) =>
            setSelected((current) =>
              current.includes(reason)
                ? current.filter((item) => item !== reason)
                : [...current, reason],
            )
          }
          onNoteChange={setNote}
          onSubmit={() => {
            const comment = [...selected, note.trim()]
              .filter(Boolean)
              .join(". ");
            aui.message.submitFeedback({
              type: "negative",
              ...(comment ? { comment } : {}),
            });
            setSent(true);
          }}
          className="shadow-[0_8px_24px_rgb(0_0_0/0.16)]"
        />
      </DialogContent>
    </Dialog>
  );
}

function MoreActions({ onReport }: { onReport: () => void }) {
  const aui = useAui();
  const reading = useAuiState(
    (s) => s.thread.speech?.messageId === s.message.id,
  );

  return (
    <ActionBarMorePrimitive.Root>
      <Tip label="More">
        <ActionBarMorePrimitive.Trigger
          className={cn(
            iconButton,
            "data-[state=open]:bg-foreground/[0.07] data-[state=open]:text-foreground",
          )}
        >
          <Icon icon={MoreHorizontalIcon} />
        </ActionBarMorePrimitive.Trigger>
      </Tip>
      <ActionBarMorePrimitive.Content
        side="top"
        align="start"
        sideOffset={6}
        className={menu}
      >
        <ActionBarMorePrimitive.Item
          className={cn(menuItem, "w-full")}
          onSelect={onReport}
        >
          <Icon icon={Flag01Icon} />
          Report
        </ActionBarMorePrimitive.Item>
        {reading ? (
          <ActionBarMorePrimitive.Item
            className={cn(menuItem, "w-full")}
            render={<ActionBarPrimitive.StopSpeaking />}
          >
            <Icon icon={VolumeOffIcon} />
            Stop reading
          </ActionBarMorePrimitive.Item>
        ) : (
          <ActionBarMorePrimitive.Item
            className={cn(menuItem, "w-full")}
            render={<ActionBarPrimitive.Speak />}
          >
            <Icon icon={VolumeHighIcon} />
            Read out loud
          </ActionBarMorePrimitive.Item>
        )}
        <ActionBarMorePrimitive.Item
          className={cn(menuItem, "w-full")}
          onSelect={() => {
            const repository = branchThrough(
              aui.thread.export().messages,
              aui.message.getState().id,
            );
            if (repository.messages.length === 0) return;
            pendingFork = { repository, draft: "" };
            aui.threads.switchToNewThread();
          }}
        >
          <Icon icon={GitForkIcon} />
          Fork
        </ActionBarMorePrimitive.Item>
      </ActionBarMorePrimitive.Content>
    </ActionBarMorePrimitive.Root>
  );
}

function CopyButton() {
  const copied = useAuiState((s) => s.message.isCopied);

  return (
    <Tip label={copied ? "Copied" : "Copy"}>
      <ActionBarPrimitive.Copy className={iconButton}>
        <Icon icon={copied ? Tick02Icon : Copy01Icon} />
      </ActionBarPrimitive.Copy>
    </Tip>
  );
}
