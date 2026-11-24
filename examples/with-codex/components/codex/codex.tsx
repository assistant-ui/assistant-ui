"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import {
  ActionBarPrimitive,
  AttachmentPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  WebSpeechDictationAdapter,
  useAui,
  useAuiState,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import {
  Add01Icon,
  Alert02Icon,
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  Cancel01Icon,
  CloudIcon,
  ComputerTerminal01Icon,
  Copy01Icon,
  CubeIcon,
  Folder01Icon,
  GitBranchIcon,
  GitForkIcon,
  Idea01Icon,
  LaptopIcon,
  Menu01Icon,
  Mic01Icon,
  MicOff01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  RefreshIcon,
  SecurityCheckIcon,
  SidebarLeftIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Tick02Icon,
  TouchInteraction01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CodexThreadShell,
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
  SearchMenuSub,
  Tip,
  focusRing,
  iconButton,
  useCodexShell,
} from "./codex-thread-shell";
import data from "@/lib/data.json";
import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  EFFORTS,
  MODELS,
  RECOMMENDED_MODEL,
} from "@/lib/models";

/* -------------------------------------------------------------------------- */
/* Shared styles                                                              */
/* -------------------------------------------------------------------------- */

/* The column every part of the thread sits in. */
const column = "mx-auto w-full max-w-[44rem]";

/* A control that is only its words: 28px tall, a fill on hover and when open. */
const textControl = `hover:bg-foreground/[0.07] data-popup-open:bg-foreground/[0.07] flex h-7 items-center gap-1.5 rounded-full px-2.5 transition-colors motion-reduce:transition-none ${focusRing}`;

/* -------------------------------------------------------------------------- */
/* Thread                                                                     */
/* -------------------------------------------------------------------------- */

export function Codex() {
  return (
    <TooltipProvider delay={300}>
      <CodexThreadShell>
        <ThreadPrimitive.Root className="flex h-full flex-col">
          <ThreadHeader />
          <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
            <AuiIf condition={(s) => s.thread.isEmpty}>
              <EmptyState />
            </AuiIf>
            <div
              className={cn(
                column,
                "flex flex-col gap-6 pt-4 pb-10 empty:hidden",
              )}
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
              <Composer />
            </ThreadPrimitive.ViewportFooter>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </CodexThreadShell>
    </TooltipProvider>
  );
}

function ThreadHeader() {
  const { sidebarOpen, toggleSidebar, openSheet, branch } = useCodexShell();
  const title = useAuiState((s) => s.threadListItem.title);
  const empty = useAuiState((s) => s.thread.isEmpty);

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 px-3">
      <Tip label="Show the chats">
        <button
          type="button"
          onClick={openSheet}
          className={cn(iconButton, "md:hidden")}
        >
          <Icon icon={Menu01Icon} />
        </button>
      </Tip>
      {!sidebarOpen && (
        <Tip label="Show the sidebar">
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(iconButton, "max-md:hidden")}
          >
            <Icon icon={SidebarLeftIcon} />
          </button>
        </Tip>
      )}
      <h1 className="min-w-0 flex-1 truncate font-medium">
        {empty ? <span className="sr-only">New chat</span> : title}
      </h1>
      {branch && (
        <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 font-mono text-xs">
          <Icon icon={GitBranchIcon} className="size-3.5" />
          <span className="sr-only">Branch </span>
          {branch}
        </span>
      )}
    </header>
  );
}

function EmptyState() {
  return (
    <div className="my-auto flex flex-col items-center gap-7 pb-16">
      <span className="text-muted-foreground/70 border-muted-foreground/40 flex size-11 items-center justify-center rounded-2xl border-2">
        <Icon icon={ComputerTerminal01Icon} className="size-5.5" />
      </span>
      <p className="text-center text-[1.625rem] leading-8 tracking-tight">
        What should we build?
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer: the strip that says where the work happens, then the message box */
/* -------------------------------------------------------------------------- */

const ENVIRONMENT_ICONS: Record<string, IconSvgElement> = {
  local: LaptopIcon,
  cloud: CloudIcon,
};

/* Where the agent would run. The example keeps the choice; it runs nothing. */
function EnvironmentMenu() {
  const [value, setValue] = useState(data.environments[0]?.id ?? "");
  const current = data.environments.find((entry) => entry.id === value);

  return (
    <SearchMenu>
      <MenuTrigger className={textControl}>
        <Icon
          icon={ENVIRONMENT_ICONS[value] ?? LaptopIcon}
          className="size-4"
        />
        {current?.label}
      </MenuTrigger>
      <MenuPopup side="top" className="min-w-60">
        <MenuSearch placeholder="Work in" aria-label="Work in" />
        <MenuList>
          <MenuRadioGroup value={value} onValueChange={setValue}>
            {data.environments.map((entry) => (
              <MenuChoice key={entry.id} value={entry.id}>
                <Icon icon={ENVIRONMENT_ICONS[entry.id] ?? LaptopIcon} />
                {entry.label}
                {"note" in entry && (
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

function ProjectMenu() {
  const { project, setProject } = useCodexShell();

  return (
    <SearchMenu>
      <MenuTrigger
        className={cn(textControl, !project && "text-muted-foreground")}
      >
        <Icon icon={Folder01Icon} className="size-4" />
        {project ? project.name : "Choose project"}
      </MenuTrigger>
      <MenuPopup side="top" className="min-w-60">
        <MenuSearch
          placeholder="Search projects"
          aria-label="Search projects"
        />
        <MenuList>
          <MenuRadioGroup
            value={project?.name ?? ""}
            onValueChange={(name) =>
              setProject(
                data.projects.find((entry) => entry.name === name) ?? null,
              )
            }
          >
            {data.projects.map((entry) => (
              <MenuChoice key={entry.name} value={entry.name}>
                <Icon icon={Folder01Icon} />
                {entry.name}
              </MenuChoice>
            ))}
          </MenuRadioGroup>
          <MenuEmpty>No project matches</MenuEmpty>
        </MenuList>
      </MenuPopup>
    </SearchMenu>
  );
}

/*
 * What a chosen project adds: whether the work gets a worktree of its own,
 * and the branch it starts from. The example keeps both; it checks out nothing.
 */
function SettingsMenu() {
  const { project, branch, setBranch } = useCodexShell();
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
 * The model and the effort the next message is sent with, from models.ts. The
 * runtime reads both on each send.
 */
function ModelMenu() {
  const aui = useAui();
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [effort, setEffort] = useState<string>(DEFAULT_EFFORT);

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

  const shown = model === DEFAULT_MODEL ? RECOMMENDED_MODEL : model;
  const effortLabel = EFFORTS.find((entry) => entry.value === effort)?.label;

  return (
    <Menu>
      <MenuTrigger className={textControl}>
        {MODELS.find((entry) => entry.id === shown)?.name}
        <span className="text-muted-foreground">{effortLabel}</span>
      </MenuTrigger>
      <MenuPopup
        side="top"
        align="end"
        className="max-h-80 min-w-56 overflow-y-auto"
      >
        <MenuLabel>Select model</MenuLabel>
        <MenuRadioGroup value={model} onValueChange={setModel}>
          <MenuChoice value={DEFAULT_MODEL}>
            <span className="flex min-w-0 flex-col">
              Default
              <span className="text-muted-foreground text-xs">
                Recommended set of models
              </span>
            </span>
          </MenuChoice>
          {MODELS.map((entry) => (
            <MenuChoice key={entry.id} value={entry.id}>
              {entry.name}
            </MenuChoice>
          ))}
        </MenuRadioGroup>
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

function Composer() {
  return (
    <ComposerPrimitive.Root className="flex flex-col">
      {/* The strip tucks behind the box, whose top corners sit over it. */}
      <div className="mx-3.5 flex items-center gap-0.5 rounded-t-2xl bg-(--strip) px-1.5 pt-1.5 pb-5">
        <EnvironmentMenu />
        <ProjectMenu />
        <SettingsMenu />
      </div>
      <ComposerPrimitive.AttachmentDropzone className="data-[dragging=true]:border-primary/60 -mt-3.5 flex flex-col gap-0.5 rounded-[1.125rem] border border-transparent bg-(--composer) p-2 transition-colors motion-reduce:transition-none">
        <div className="flex flex-wrap gap-2 px-1.5 pt-1 empty:hidden">
          <ComposerPrimitive.Attachments>
            {() => <Attachment removable />}
          </ComposerPrimitive.Attachments>
        </div>

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
          <Menu>
            <Tip label="Add">
              <MenuTrigger className={cn(iconButton, "size-7 rounded-full")}>
                <Icon icon={Add01Icon} className="size-[1.125rem]" />
              </MenuTrigger>
            </Tip>
            <MenuPopup side="top" className="min-w-52">
              <MenuLabel>Add</MenuLabel>
              <ComposerPrimitive.AddAttachment asChild>
                <MenuItem>
                  <Icon icon={Attachment01Icon} />
                  Files and folders
                </MenuItem>
              </ComposerPrimitive.AddAttachment>
            </MenuPopup>
          </Menu>
          <ApprovalMenu />
          <div className="ms-auto flex items-center gap-1">
            <ModelMenu />
            <DictationButton />
            <AuiIf condition={(s) => s.thread.isRunning}>
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
            <AuiIf condition={(s) => !s.thread.isRunning}>
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

function Attachment({ removable = false }: { removable?: boolean }) {
  return (
    <AttachmentPrimitive.Root className="border-border bg-background flex h-9 max-w-56 items-center gap-2 rounded-xl border ps-1.5 pe-2.5">
      <AttachmentPrimitive.unstable_Thumb className="bg-foreground/[0.06] text-muted-foreground flex h-6 min-w-6 items-center justify-center rounded-md px-1 font-mono text-[10px]" />
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
/* Messages                                                                   */
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
  "flex gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100";

function UserMessage() {
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

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="group flex flex-col items-start gap-1">
      <div className="flex w-full max-w-full flex-col gap-2.5 text-sm leading-6 wrap-break-word">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") return <MarkdownText />;
            if (part.type === "reasoning")
              return <ReasoningPart text={part.text} />;
            if (part.type === "tool-call")
              return part.toolUI ?? <ToolCallPart {...part} />;
            return null;
          }}
        </MessagePrimitive.Parts>
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
        <BranchPicker />
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
              className={cn(
                iconButton,
                "data-submitted:bg-foreground/[0.07] data-submitted:text-foreground",
              )}
            >
              <Icon icon={ThumbsDownIcon} />
            </ActionBarPrimitive.FeedbackNegative>
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

/* -------------------------------------------------------------------------- */
/* The agent's work: its reasoning and the tools it called                    */
/* -------------------------------------------------------------------------- */

/* One line of work: an icon, what was done, and a chevron that opens it. */
const workLine = `text-muted-foreground hover:text-foreground flex w-fit max-w-full min-w-0 items-center gap-2 rounded-md text-start text-[0.8125rem] leading-5 transition-colors motion-reduce:transition-none ${focusRing}`;
const workDetail =
  "border-border text-muted-foreground ms-2 border-s ps-4 text-[0.8125rem] leading-5";

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

function ReasoningPart({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const running = useAuiState((s) => s.message.status?.type === "running");

  return (
    <div className="flex flex-col gap-2">
      <WorkLine
        icon={Idea01Icon}
        running={running}
        open={open}
        onToggle={() => setOpen((value) => !value)}
      >
        {running ? "Thinking" : "Thought it through"}
      </WorkLine>
      {open && <p className={cn(workDetail, "whitespace-pre-wrap")}>{text}</p>}
    </div>
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
