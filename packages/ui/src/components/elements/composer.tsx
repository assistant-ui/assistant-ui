"use client";

import { type ComponentProps, useMemo } from "react";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  FileArchiveIcon,
  FileImageIcon,
  FileTextIcon,
  Loader2Icon,
  MicIcon,
  PlusIcon,
  SquareIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  field,
  floating,
  ghostButton,
  iconSwap,
  iconSwapIn,
  iconSwapOut,
  inkButton,
  mono,
  paper,
  ShimmerLabel,
} from "./surfaces";
import { clamp, pct } from "./range";

export interface ComposerAttachment {
  name: string;
  meta: string;
  state: "uploading" | "done" | "error";
  progress?: number;
  kind?: "image" | "text" | "archive";
}

export interface ComposerCommand {
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface ComposerPerson {
  name: string;
  role: "agent" | "human";
}

export interface ComposerModel {
  name: string;
  meta: string;
}

export interface ComposerUsage {
  system: number;
  tools: number;
  messages: number;
  total: number;
}

const ATTACHMENT_ICONS: Record<
  NonNullable<ComposerAttachment["kind"]>,
  LucideIcon
> = {
  image: FileImageIcon,
  text: FileTextIcon,
  archive: FileArchiveIcon,
};

const BARS = Array.from({ length: 14 }, (_, i) => i);

function barHeight(bar: number, tick: number): number {
  return 5 + Math.abs(Math.sin(bar * 1.35 + tick * 0.55)) * 13;
}

/** Commands whose name starts with the slash query, or none when not typing one. */
export function useSlashMatches(
  value: string,
  commands: readonly ComposerCommand[] | undefined,
): ComposerCommand[] {
  return useMemo(() => {
    if (!commands || !value.startsWith("/")) return [];
    const query = value.slice(1).toLowerCase();
    return commands.filter((command) => command.name.startsWith(query));
  }, [commands, value]);
}

/** People matching a trailing @mention, or none when the caret is not in one. */
export function useMentionMatches(
  value: string,
  people: readonly ComposerPerson[] | undefined,
): ComposerPerson[] {
  return useMemo(() => {
    if (!people) return [];
    const match = /@([\w]*)$/.exec(value);
    if (!match) return [];
    const query = match[1]?.toLowerCase() ?? "";
    return people.filter((person) =>
      person.name.toLowerCase().startsWith(query),
    );
  }, [people, value]);
}

/** Replaces the trailing @mention with the chosen name. */
export function applyMention(value: string, name: string): string {
  return value.replace(/@[\w]*$/, `@${name} `);
}

export function Composer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="composer"
      className={cn("relative w-full max-w-lg", className)}
      {...props}
    />
  );
}

export function ComposerBar({
  dragActive = false,
  className,
  ...props
}: ComponentProps<"div"> & { dragActive?: boolean }) {
  return (
    <div
      data-slot="composer-bar"
      data-drag-active={dragActive || undefined}
      className={cn(
        paper,
        "flex w-full flex-col gap-2 rounded-[24px] p-2.5 transition-colors",
        dragActive && "bg-blue-500/[0.04] dark:bg-blue-500/10",
        className,
      )}
      {...props}
    />
  );
}

export function ComposerMenu({
  open,
  align = "start",
  className,
  ...props
}: ComponentProps<"div"> & { open: boolean; align?: "start" | "end" }) {
  return (
    <div
      data-slot="composer-menu"
      data-open={open || undefined}
      className={cn(
        floating,
        "absolute bottom-full z-10 mb-2 flex w-72 flex-col gap-0.5 rounded-2xl p-1.5",
        align === "start"
          ? "start-0 origin-bottom-left"
          : "end-0 origin-bottom-right",
        "transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
        open
          ? "scale-100 opacity-100"
          : "pointer-events-none scale-[0.97] opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export function ComposerMenuItem({
  active = false,
  className,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-slot="composer-menu-item"
      data-active={active || undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] transition-colors",
        active ? field : "hover:bg-foreground/[0.04]",
        className,
      )}
      {...props}
    />
  );
}

export function ComposerCommandItem({
  command,
  active,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  command: ComposerCommand;
  active: boolean;
}) {
  return (
    <ComposerMenuItem active={active} {...props}>
      <command.icon className="text-foreground/35 size-3.5 shrink-0" />
      <span className="font-medium">/{command.name}</span>
      <span className="text-foreground/45 flex-1 truncate text-start text-xs">
        {command.description}
      </span>
      {active && (
        <kbd className="bg-foreground/[0.06] text-foreground/45 rounded px-1 font-mono text-[10px]">
          ↵
        </kbd>
      )}
    </ComposerMenuItem>
  );
}

export function ComposerPersonItem({
  person,
  active,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  person: ComposerPerson;
  active: boolean;
}) {
  return (
    <ComposerMenuItem active={active} {...props}>
      <span className="bg-foreground/[0.06] text-foreground/45 flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium">
        {person.name[0]}
      </span>
      <span className="flex-1 truncate text-start">{person.name}</span>
      <span className={cn(mono, "text-foreground/35")}>{person.role}</span>
    </ComposerMenuItem>
  );
}

export function ComposerAttachments({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-attachments"
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  );
}

export function ComposerAttachmentChip({
  attachment,
  onRemove,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  attachment: ComposerAttachment;
  onRemove?: (name: string) => void;
}) {
  const Icon = ATTACHMENT_ICONS[attachment.kind ?? "text"];
  return (
    <div
      data-slot="composer-attachment"
      data-state={attachment.state}
      className={cn(
        field,
        "relative flex items-center gap-2.5 overflow-hidden rounded-[14px] py-1.5 ps-1.5 pe-2.5",
        className,
      )}
      {...props}
    >
      <span className="bg-background text-foreground/45 flex size-8 shrink-0 items-center justify-center rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-white/10 dark:shadow-none">
        <Icon className="size-4" />
      </span>
      <span className="flex flex-col">
        <span className="max-w-36 truncate text-xs font-medium">
          {attachment.name}
        </span>
        <span
          className={cn(
            "text-[11px]",
            attachment.state === "error"
              ? "text-red-600/80 dark:text-red-400/80"
              : "text-foreground/40",
          )}
        >
          {attachment.meta}
        </span>
      </span>
      <span className="ms-1 flex w-5 items-center justify-end">
        {attachment.state === "uploading" ? (
          <Loader2Icon className="text-foreground/35 size-3.5 animate-spin motion-reduce:animate-none" />
        ) : attachment.state === "done" && onRemove ? (
          <button
            type="button"
            aria-label={`Remove ${attachment.name}`}
            onClick={() => onRemove(attachment.name)}
            className={cn(ghostButton, "size-5 [&_svg]:size-3")}
          >
            <XIcon />
          </button>
        ) : attachment.state === "done" ? (
          <CheckIcon className="size-3.5 text-emerald-500" />
        ) : null}
      </span>
      {attachment.state === "uploading" && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500/70 transition-[width] duration-300 dark:bg-blue-400/70"
          style={{ width: `${pct(attachment.progress ?? 0, 100)}%` }}
        />
      )}
    </div>
  );
}

export function ComposerInput({
  onSubmit,
  onKeyDown,
  className,
  ...props
}: Omit<ComponentProps<"input">, "onSubmit"> & { onSubmit?: () => void }) {
  return (
    <input
      data-slot="composer-input"
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
        onSubmit?.();
      }}
      className={cn(
        "placeholder:text-foreground/35 min-h-11 w-full bg-transparent px-3 text-[15px] caret-blue-500 outline-none dark:caret-blue-400",
        className,
      )}
      {...props}
    />
  );
}

export function ComposerVoice({
  recording,
  seconds,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  recording: boolean;
  seconds: number;
}) {
  return (
    <div
      data-slot="composer-voice"
      data-recording={recording || undefined}
      className={cn("flex min-h-11 items-center gap-3 ps-3", className)}
      {...props}
    >
      {recording && (
        <span
          aria-hidden
          className="size-1.5 animate-pulse rounded-full bg-blue-500 dark:bg-blue-400"
        />
      )}
      <div className="flex h-6 items-center gap-[3px]" aria-hidden>
        {BARS.map((bar) => (
          <span
            key={bar}
            className={cn(
              "w-0.5 rounded-full transition-[height,background-color] duration-150 motion-reduce:transition-none",
              recording ? "bg-foreground/50" : "bg-foreground/25",
            )}
            style={{ height: recording ? barHeight(bar, seconds * 10) : 3 }}
          />
        ))}
      </div>
      {recording ? (
        <span className={cn(mono, "text-foreground/40 tabular-nums")}>
          0:{String(seconds).padStart(2, "0")}
        </span>
      ) : (
        <ShimmerLabel className="text-foreground/55 relative text-[13px]">
          Transcribing
        </ShimmerLabel>
      )}
    </div>
  );
}

export function ComposerToolbar({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-toolbar"
      className={cn("flex items-center justify-between", className)}
      {...props}
    />
  );
}

export function ComposerActions({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-actions"
      className={cn("flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

export function ComposerAttachButton({
  className,
  ...props
}: Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      aria-label="Add attachment"
      data-slot="composer-attach"
      disabled={!props.onClick}
      className={cn(
        ghostButton,
        "size-8 disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      <PlusIcon className="size-4" />
    </button>
  );
}

export function ComposerModelTrigger({
  model,
  open,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  model: string;
  open: boolean;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      data-slot="composer-model-trigger"
      className={cn(
        "text-foreground/55 hover:bg-foreground/[0.06] hover:text-foreground/90 dark:hover:bg-foreground/[0.09] flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors",
        className,
      )}
      {...props}
    >
      {model}
      <ChevronDownIcon className="size-3 opacity-60" />
    </button>
  );
}

export function ComposerModelItem({
  entry,
  selected,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  entry: ComposerModel;
  selected: boolean;
}) {
  return (
    <ComposerMenuItem active={selected} {...props}>
      <span className="flex-1 text-start">{entry.name}</span>
      <span className={cn(mono, "text-foreground/35 tabular-nums")}>
        {entry.meta}
      </span>
      <span className="flex w-4 justify-end">
        {selected && (
          <CheckIcon className="fade-in zoom-in-90 animate-in size-3.5 duration-200" />
        )}
      </span>
    </ComposerMenuItem>
  );
}

export function ComposerContext({
  usage,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & { usage: ComposerUsage }) {
  const used = usage.system + usage.tools + usage.messages;
  const fraction = usage.total === 0 ? 0 : used / usage.total;
  const warn = fraction > 0.85;
  const circumference = 2 * Math.PI * 6;
  const segments = [
    { label: "System", value: usage.system, className: "bg-foreground/25" },
    { label: "Tools", value: usage.tools, className: "bg-foreground/45" },
    { label: "Messages", value: usage.messages, className: "bg-foreground/80" },
  ];

  return (
    <div
      data-slot="composer-context"
      className={cn("group/ctx relative", className)}
      {...props}
    >
      <div
        className={cn(
          floating,
          "absolute end-0 bottom-full z-10 mb-2 flex w-60 origin-bottom-right flex-col gap-3.5 rounded-2xl p-4",
          "transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          "pointer-events-none scale-[0.97] opacity-0",
          "group-hover/ctx:pointer-events-auto group-hover/ctx:scale-100 group-hover/ctx:opacity-100",
          "group-focus-within/ctx:pointer-events-auto group-focus-within/ctx:scale-100 group-focus-within/ctx:opacity-100",
        )}
      >
        <div className="flex items-baseline justify-between">
          <p className="text-[13.5px] font-medium">Context</p>
          <p
            className={cn(
              mono,
              "tabular-nums",
              warn ? "text-red-500 dark:text-red-400" : "text-foreground/35",
            )}
          >
            {Math.round(fraction * 100)}%
          </p>
        </div>
        <div className="bg-foreground/[0.06] flex h-[5px] w-full gap-px overflow-hidden rounded-full">
          {segments.map((segment) => (
            <span
              key={segment.label}
              className={cn(
                "h-full transition-[width] duration-700 motion-reduce:transition-none",
                segment.className,
              )}
              style={{ width: `${pct(segment.value, usage.total)}%` }}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className="text-foreground/55 flex items-center gap-2.5 text-[13px]"
            >
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", segment.className)}
              />
              <span className="flex-1">{segment.label}</span>
              <span className={cn(mono, "text-foreground/40 tabular-nums")}>
                {segment.value}k
              </span>
            </div>
          ))}
        </div>
        <div className="bg-foreground/[0.06] h-px" />
        <div className="text-foreground/55 flex items-center justify-between text-[13px]">
          <span>Total</span>
          <span className={cn(mono, "text-foreground/40 tabular-nums")}>
            {used}k / {usage.total}k
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-label="Context usage"
        className={cn(
          ghostButton,
          "size-8",
          warn && "text-red-500 dark:text-red-400",
        )}
      >
        <svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-hidden>
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            strokeWidth="2.5"
            className="stroke-foreground/10"
          />
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="stroke-current transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamp(fraction, 0, 1))}
          />
        </svg>
      </button>
    </div>
  );
}

export function ComposerVoiceButton({
  active,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-label={active ? "Stop recording" : "Start voice input"}
      data-slot="composer-voice-button"
      className={cn(
        active
          ? cn(
              inkButton,
              "flex size-8 items-center justify-center rounded-full",
            )
          : cn(ghostButton, "size-8"),
        className,
      )}
      {...props}
    >
      {active ? (
        <SquareIcon className="size-3 fill-current" />
      ) : (
        <MicIcon className="size-4" />
      )}
    </button>
  );
}

export function ComposerSend({
  streaming,
  idle,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  streaming: boolean;
  idle: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={streaming ? "Stop generating" : "Send message"}
      data-slot="composer-send"
      className={cn(
        "grid size-8 place-items-center rounded-full",
        streaming || !idle
          ? inkButton
          : "bg-foreground/[0.06] text-foreground/30 dark:bg-foreground/[0.09] transition-colors",
        className,
      )}
      {...props}
    >
      <ArrowUpIcon
        className={cn(iconSwap, "size-4", streaming ? iconSwapOut : iconSwapIn)}
      />
      <SquareIcon
        className={cn(
          iconSwap,
          "size-3 fill-current",
          streaming ? iconSwapIn : iconSwapOut,
        )}
      />
    </button>
  );
}
