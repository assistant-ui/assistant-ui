"use client";

import { useMemo, useState } from "react";
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
} from "./surfaces";

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

export interface ComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSend?: () => void;
  onStop?: () => void;
  placeholder?: string;
  streaming?: boolean;
  attachments?: ComposerAttachment[];
  onRemoveAttachment?: (name: string) => void;
  dragActive?: boolean;
  commands?: ComposerCommand[];
  onCommand?: (command: ComposerCommand) => void;
  people?: ComposerPerson[];
  onMention?: (person: ComposerPerson) => void;
  models?: ComposerModel[];
  model?: string;
  onModelChange?: (name: string) => void;
  defaultModelMenuOpen?: boolean;
  usage?: ComposerUsage;
  recording?: boolean;
  transcribing?: boolean;
  recordingSeconds?: number;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  className?: string;
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

function MenuSurface({
  open,
  align = "start",
  children,
}: {
  open: boolean;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  return (
    <div
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
      )}
    >
      {children}
    </div>
  );
}

export function Composer({
  value,
  onValueChange,
  onSend,
  onStop,
  placeholder = "Ask anything",
  streaming = false,
  attachments,
  onRemoveAttachment,
  dragActive = false,
  commands,
  onCommand,
  people,
  onMention,
  models,
  model,
  onModelChange,
  defaultModelMenuOpen = false,
  usage,
  recording = false,
  transcribing = false,
  recordingSeconds = 0,
  onVoiceStart,
  onVoiceStop,
  className,
}: ComposerProps) {
  const [modelMenuOpen, setModelMenuOpen] = useState(defaultModelMenuOpen);

  const slashQuery = useMemo(() => {
    if (!commands || !value.startsWith("/")) return null;
    return value.slice(1).toLowerCase();
  }, [commands, value]);
  const slashMatches = useMemo(
    () =>
      slashQuery === null
        ? []
        : (commands ?? []).filter((c) => c.name.startsWith(slashQuery)),
    [commands, slashQuery],
  );

  const mentionQuery = useMemo(() => {
    if (!people) return null;
    const match = /@([\w]*)$/.exec(value);
    return match ? (match[1]?.toLowerCase() ?? "") : null;
  }, [people, value]);
  const mentionMatches = useMemo(
    () =>
      mentionQuery === null
        ? []
        : (people ?? []).filter((p) =>
            p.name.toLowerCase().startsWith(mentionQuery),
          ),
    [people, mentionQuery],
  );

  const voiceActive = recording || transcribing;
  const empty = value.length === 0;
  const timer = `0:${String(recordingSeconds).padStart(2, "0")}`;
  const usageUsed = usage ? usage.system + usage.tools + usage.messages : 0;
  const usageFraction = usage ? usageUsed / usage.total : 0;
  const usageWarn = usageFraction > 0.85;
  const circumference = 2 * Math.PI * 6;
  const usageSegments = usage
    ? [
        { label: "System", value: usage.system, className: "bg-foreground/25" },
        { label: "Tools", value: usage.tools, className: "bg-foreground/45" },
        {
          label: "Messages",
          value: usage.messages,
          className: "bg-foreground/80",
        },
      ]
    : [];

  return (
    <div className={cn("relative w-full max-w-lg", className)}>
      <MenuSurface open={slashMatches.length > 0}>
        {slashMatches.map((command, i) => (
          <button
            key={command.name}
            type="button"
            onClick={() => {
              onCommand?.(command);
              onValueChange(`/${command.name} `);
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] transition-colors",
              i === 0 ? field : "hover:bg-foreground/[0.04]",
            )}
          >
            <command.icon className="text-foreground/35 size-3.5 shrink-0" />
            <span className="font-medium">/{command.name}</span>
            <span className="text-foreground/45 flex-1 truncate text-start text-xs">
              {command.description}
            </span>
            {i === 0 && (
              <kbd className="bg-foreground/[0.06] text-foreground/45 rounded px-1 font-mono text-[10px]">
                ↵
              </kbd>
            )}
          </button>
        ))}
      </MenuSurface>

      <MenuSurface open={mentionMatches.length > 0}>
        {mentionMatches.map((person, i) => (
          <button
            key={person.name}
            type="button"
            onClick={() => {
              onMention?.(person);
              onValueChange(value.replace(/@[\w]*$/, `@${person.name} `));
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] transition-colors",
              i === 0 ? field : "hover:bg-foreground/[0.04]",
            )}
          >
            <span className="bg-foreground/[0.06] text-foreground/45 flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium">
              {person.name[0]}
            </span>
            <span className="flex-1 truncate text-start">{person.name}</span>
            <span className={cn(mono, "text-foreground/35")}>
              {person.role}
            </span>
          </button>
        ))}
      </MenuSurface>

      <div
        className={cn(
          paper,
          "flex w-full flex-col gap-2 rounded-[24px] p-2.5 transition-colors",
          dragActive && "bg-blue-500/[0.04] dark:bg-blue-500/10",
        )}
      >
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => {
              const Icon = ATTACHMENT_ICONS[attachment.kind ?? "text"];
              return (
                <div
                  key={attachment.name}
                  className={cn(
                    field,
                    "relative flex items-center gap-2.5 overflow-hidden rounded-[14px] py-1.5 ps-1.5 pe-2.5",
                  )}
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
                    ) : attachment.state === "done" && onRemoveAttachment ? (
                      <button
                        type="button"
                        aria-label={`Remove ${attachment.name}`}
                        onClick={() => onRemoveAttachment(attachment.name)}
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
                      style={{ width: `${attachment.progress ?? 0}%` }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {voiceActive ? (
          <div className="flex min-h-11 items-center gap-3 ps-3">
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
                  style={{
                    height: recording
                      ? barHeight(bar, recordingSeconds * 10)
                      : 3,
                  }}
                />
              ))}
            </div>
            {recording ? (
              <span className={cn(mono, "text-foreground/40 tabular-nums")}>
                {timer}
              </span>
            ) : (
              <span className="text-foreground/55 relative text-[13px]">
                <span>Transcribing</span>
                <span
                  aria-hidden
                  className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
                >
                  Transcribing
                </span>
              </span>
            )}
          </div>
        ) : (
          <input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !empty && !streaming) onSend?.();
            }}
            placeholder={placeholder}
            className="placeholder:text-foreground/35 min-h-11 w-full bg-transparent px-3 text-[15px] caret-blue-500 outline-none dark:caret-blue-400"
          />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Add attachment"
              className={cn(ghostButton, "size-8")}
            >
              <PlusIcon className="size-4" />
            </button>
            {models && model !== undefined && (
              <div className="relative">
                <MenuSurface open={modelMenuOpen}>
                  <p
                    className={cn(
                      mono,
                      "text-foreground/35 px-2.5 pt-2 pb-1.5",
                    )}
                  >
                    Models
                  </p>
                  {models.map((entry) => {
                    const selected = entry.name === model;
                    return (
                      <button
                        key={entry.name}
                        type="button"
                        onClick={() => {
                          onModelChange?.(entry.name);
                          setModelMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] transition-colors",
                          selected ? field : "hover:bg-foreground/[0.04]",
                        )}
                      >
                        <span className="flex-1 text-start">{entry.name}</span>
                        <span
                          className={cn(
                            mono,
                            "text-foreground/35 tabular-nums",
                          )}
                        >
                          {entry.meta}
                        </span>
                        <span className="flex w-4 justify-end">
                          {selected && (
                            <CheckIcon className="fade-in zoom-in-90 animate-in size-3.5 duration-200" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </MenuSurface>
                <button
                  type="button"
                  aria-expanded={modelMenuOpen}
                  onClick={() => setModelMenuOpen((open) => !open)}
                  className="text-foreground/55 hover:bg-foreground/[0.06] hover:text-foreground/90 dark:hover:bg-foreground/[0.09] flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors"
                >
                  {model}
                  <ChevronDownIcon className="size-3 opacity-60" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {usage && (
              <div className="group/ctx relative">
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
                        usageWarn
                          ? "text-red-500 dark:text-red-400"
                          : "text-foreground/35",
                      )}
                    >
                      {Math.round(usageFraction * 100)}%
                    </p>
                  </div>
                  <div className="bg-foreground/[0.06] flex h-[5px] w-full gap-px overflow-hidden rounded-full">
                    {usageSegments.map((segment) => (
                      <span
                        key={segment.label}
                        className={cn(
                          "h-full transition-[width] duration-700 motion-reduce:transition-none",
                          segment.className,
                        )}
                        style={{
                          width: `${(segment.value / usage.total) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    {usageSegments.map((segment) => (
                      <div
                        key={segment.label}
                        className="text-foreground/55 flex items-center gap-2.5 text-[13px]"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "size-1.5 rounded-full",
                            segment.className,
                          )}
                        />
                        <span className="flex-1">{segment.label}</span>
                        <span
                          className={cn(
                            mono,
                            "text-foreground/40 tabular-nums",
                          )}
                        >
                          {segment.value}k
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-foreground/[0.06] h-px" />
                  <div className="text-foreground/55 flex items-center justify-between text-[13px]">
                    <span>Total</span>
                    <span
                      className={cn(mono, "text-foreground/40 tabular-nums")}
                    >
                      {usageUsed}k / {usage.total}k
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Context usage"
                  className={cn(
                    ghostButton,
                    "size-8",
                    usageWarn && "text-red-500 dark:text-red-400",
                  )}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="size-4 -rotate-90"
                    aria-hidden
                  >
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
                      strokeDashoffset={
                        circumference * (1 - Math.min(usageFraction, 1))
                      }
                    />
                  </svg>
                </button>
              </div>
            )}
            {(onVoiceStart || voiceActive) && (
              <button
                type="button"
                aria-label={
                  voiceActive ? "Stop recording" : "Start voice input"
                }
                onClick={voiceActive ? onVoiceStop : onVoiceStart}
                className={cn(
                  voiceActive
                    ? cn(
                        inkButton,
                        "flex size-8 items-center justify-center rounded-full",
                      )
                    : cn(ghostButton, "size-8"),
                )}
              >
                {voiceActive ? (
                  <SquareIcon className="size-3 fill-current" />
                ) : (
                  <MicIcon className="size-4" />
                )}
              </button>
            )}
            <button
              type="button"
              aria-label={streaming ? "Stop generating" : "Send message"}
              onClick={streaming ? onStop : onSend}
              className={cn(
                "grid size-8 place-items-center rounded-full",
                streaming || !empty
                  ? inkButton
                  : "bg-foreground/[0.06] text-foreground/30 dark:bg-foreground/[0.09] transition-colors",
              )}
            >
              <ArrowUpIcon
                className={cn(
                  iconSwap,
                  "size-4",
                  streaming ? iconSwapOut : iconSwapIn,
                )}
              />
              <SquareIcon
                className={cn(
                  iconSwap,
                  "size-3 fill-current",
                  streaming ? iconSwapIn : iconSwapOut,
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
