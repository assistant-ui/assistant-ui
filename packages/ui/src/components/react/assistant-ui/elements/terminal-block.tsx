"use client";

import { useId, useState, type ComponentProps } from "react";
import { CheckIcon, CopyIcon, Loader2Icon, XIcon } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import { ghostButton, mono, paper } from "./surfaces";
import { clamp, take } from "../utils/range";

export type AnsiColor =
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 90
  | 91
  | 92
  | 93
  | 94
  | 95
  | 96
  | 97;

export type AnsiSegment = {
  text: string;
  color?: AnsiColor | undefined;
  bold: boolean;
  dim: boolean;
};

const ANSI_COLORS = new Set<AnsiColor>([
  30, 31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97,
]);

const findCsiEnd = (line: string, start: number) => {
  for (let index = start; index < line.length; index += 1) {
    const code = line.charCodeAt(index);
    if (code >= 0x40 && code <= 0x7e) return index;
  }
  return line.length;
};

const findStringEnd = (line: string, start: number, bell: boolean) => {
  for (let index = start; index < line.length; index += 1) {
    if (bell && line[index] === "\u0007") return index + 1;
    if (line[index] === "\u001b" && line[index + 1] === "\\") {
      return index + 2;
    }
  }
  return line.length;
};

const applySgr = (value: string, state: Omit<AnsiSegment, "text">) => {
  const parts = value.split(";");
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const code = part === "" ? 0 : Number(part);
    if (code === 38 || code === 48) {
      index += parts[index + 1] === "2" ? 4 : parts[index + 1] === "5" ? 2 : 1;
    } else if (code === 0) {
      state.color = undefined;
      state.bold = false;
      state.dim = false;
    } else if (code === 1) {
      state.bold = true;
    } else if (code === 2) {
      state.dim = true;
    } else if (code === 22) {
      state.bold = false;
      state.dim = false;
    } else if (code === 39) {
      state.color = undefined;
    } else if (ANSI_COLORS.has(code as AnsiColor)) {
      state.color = code as AnsiColor;
    }
  }
};

export function parseAnsi(line: string): AnsiSegment[] {
  const state: Omit<AnsiSegment, "text"> = {
    color: undefined,
    bold: false,
    dim: false,
  };
  const segments: AnsiSegment[] = [];
  let index = 0;

  const append = (text: string) => {
    if (text === "") return;
    const previous = segments[segments.length - 1];
    if (
      previous &&
      previous.color === state.color &&
      previous.bold === state.bold &&
      previous.dim === state.dim
    ) {
      previous.text += text;
      return;
    }
    segments.push({ text, ...state });
  };

  while (index < line.length) {
    const escape = line.indexOf("\u001b", index);
    const c1Offset = line.slice(index).search(/[\u009b\u009d]/);
    const c1 = c1Offset === -1 ? -1 : index + c1Offset;
    const next = escape === -1 ? c1 : c1 === -1 ? escape : Math.min(escape, c1);

    if (next === -1) {
      append(line.slice(index));
      break;
    }

    append(line.slice(index, next));
    const csi = line[next] === "\u009b" || line[next + 1] === "[";
    const osc = line[next] === "\u009d" || line[next + 1] === "]";

    if (csi) {
      const start = next + (line[next] === "\u001b" ? 2 : 1);
      const end = findCsiEnd(line, start);
      if (end === line.length) break;
      if (line[end] === "m") applySgr(line.slice(start, end), state);
      index = end + 1;
    } else if (osc) {
      index = findStringEnd(
        line,
        next + (line[next] === "\u001b" ? 2 : 1),
        true,
      );
    } else if (
      line[next] === "\u001b" &&
      ["P", "^", "_"].includes(line[next + 1] ?? "")
    ) {
      index = findStringEnd(line, next + 2, false);
    } else {
      index =
        line[next] === "\u001b" &&
        ["(", ")", "*", "+", "-", ".", "/"].includes(line[next + 1] ?? "")
          ? next + 3
          : next + 2;
    }
  }

  return segments;
}

const ansiColor = (color: AnsiColor, ink: boolean) => {
  const paperColors: Record<AnsiColor, string> = {
    30: "text-foreground/70",
    31: "text-red-600 dark:text-red-400",
    32: "text-emerald-600 dark:text-emerald-400",
    33: "text-amber-600 dark:text-amber-400",
    34: "text-blue-600 dark:text-blue-400",
    35: "text-fuchsia-600 dark:text-fuchsia-400",
    36: "text-cyan-600 dark:text-cyan-400",
    37: "text-foreground/85",
    90: "text-foreground/45",
    91: "text-red-500 dark:text-red-400",
    92: "text-emerald-500 dark:text-emerald-400",
    93: "text-amber-500 dark:text-amber-400",
    94: "text-blue-500 dark:text-blue-400",
    95: "text-fuchsia-500 dark:text-fuchsia-400",
    96: "text-cyan-500 dark:text-cyan-400",
    97: "text-foreground/85",
  };
  const inkColors: Record<AnsiColor, string> = {
    30: "text-background/70 dark:text-foreground/70",
    31: "text-red-400 dark:text-red-400",
    32: "text-emerald-400 dark:text-emerald-400",
    33: "text-amber-300 dark:text-amber-300",
    34: "text-blue-400 dark:text-blue-400",
    35: "text-fuchsia-400 dark:text-fuchsia-400",
    36: "text-cyan-300 dark:text-cyan-300",
    37: "text-background/90 dark:text-foreground/90",
    90: "text-background/50 dark:text-foreground/50",
    91: "text-red-400 dark:text-red-400",
    92: "text-emerald-400 dark:text-emerald-400",
    93: "text-amber-300 dark:text-amber-300",
    94: "text-blue-400 dark:text-blue-400",
    95: "text-fuchsia-400 dark:text-fuchsia-400",
    96: "text-cyan-300 dark:text-cyan-300",
    97: "text-background/90 dark:text-foreground/90",
  };

  return (ink ? inkColors : paperColors)[color];
};

const formatDuration = (durationMs: number) => {
  const duration = Math.floor(clamp(durationMs, 0, Number.MAX_SAFE_INTEGER));
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60_000) {
    const seconds = Math.round(duration / 100) / 10;
    return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(duration / 60_000);
  const seconds = Math.floor((duration % 60_000) / 1000);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

const plainText = (line: string) =>
  parseAnsi(line)
    .map((segment) => segment.text)
    .join("");

export function TerminalBlock({
  command,
  lines,
  visibleCount,
  done,
  variant = "paper",
  exitCode: exitCodeProp,
  stderr,
  cwd,
  durationMs,
  truncated,
  maxCollapsedLines,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "command"
  | "lines"
  | "visibleCount"
  | "done"
  | "variant"
  | "exitCode"
  | "stderr"
  | "cwd"
  | "durationMs"
  | "truncated"
  | "maxCollapsedLines"
> & {
  command: string;
  lines: readonly string[];
  visibleCount: number;
  done: boolean;
  variant?: "paper" | "ink" | undefined;
  exitCode?: number | undefined;
  stderr?: readonly string[] | undefined;
  cwd?: string | undefined;
  durationMs?: number | undefined;
  truncated?: boolean | undefined;
  maxCollapsedLines?: number | undefined;
}) {
  const ink = variant === "ink";
  const exitCode = exitCodeProp ?? 0;
  const failed = done && exitCode !== 0;
  const state = !done ? "running" : failed ? "failed" : "done";
  const output = [
    ...lines.map((line) => ({ line, stderr: false })),
    ...(stderr ?? []).map((line) => ({ line, stderr: true })),
  ];
  const revealedLines = take(output, visibleCount);
  const collapsedLines = Math.floor(
    clamp(maxCollapsedLines ?? revealedLines.length, 0, revealedLines.length),
  );
  const canCollapse =
    done &&
    maxCollapsedLines !== undefined &&
    revealedLines.length > collapsedLines;
  const [expanded, setExpanded] = useState(false);
  const displayedLines =
    canCollapse && !expanded
      ? take(revealedLines, collapsedLines)
      : revealedLines;
  const outputId = useId();
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  return (
    <div
      className={cn(
        ink ? "bg-foreground dark:bg-popover" : paper,
        "w-full max-w-md overflow-hidden rounded-2xl font-mono text-xs",
        className,
      )}
      {...props}
      data-slot="terminal-block"
      data-state={state}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1.5">
        <span
          className={cn(
            "min-w-0 break-all",
            ink
              ? "text-background/90 dark:text-foreground/90"
              : "text-foreground/90",
          )}
        >
          {cwd ? (
            <span
              className={cn(
                ink
                  ? "text-background/40 dark:text-foreground/40"
                  : "text-foreground/40",
              )}
            >
              {cwd} ${" "}
            </span>
          ) : null}
          {command}
        </span>
        {done ? (
          <div className="flex shrink-0 items-center gap-1">
            {failed ? (
              <XIcon className="size-3 text-red-600 dark:text-red-400" />
            ) : (
              <CheckIcon className="size-3 text-emerald-500" />
            )}
            <span
              className={cn(
                mono,
                failed
                  ? "text-red-600 dark:text-red-400"
                  : ink
                    ? "text-background/40 dark:text-foreground/40"
                    : "text-foreground/40",
              )}
            >
              exit {exitCode}
            </span>
            {durationMs !== undefined ? (
              <span
                className={cn(
                  mono,
                  ink
                    ? "text-background/40 dark:text-foreground/40"
                    : "text-foreground/40",
                )}
              >
                {formatDuration(durationMs)}
              </span>
            ) : null}
            {output.length > 0 ? (
              <button
                type="button"
                aria-label="Copy output"
                onClick={() =>
                  copyToClipboard(
                    output.map(({ line }) => plainText(line)).join("\n"),
                  )
                }
                className={cn(
                  ghostButton,
                  "size-6",
                  ink &&
                    "text-background/45 hover:text-background dark:text-foreground/45 dark:hover:text-foreground",
                )}
              >
                {isCopied ? (
                  <CheckIcon className="size-3.5 text-emerald-500" />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
              </button>
            ) : null}
          </div>
        ) : (
          <Loader2Icon
            className={cn(
              "size-3 animate-spin motion-reduce:animate-none",
              ink
                ? "text-background/35 dark:text-foreground/35"
                : "text-foreground/35",
            )}
          />
        )}
      </div>
      <div
        className={cn(
          "flex min-h-[8.5rem] flex-col gap-1 px-4 pt-1 pb-3.5",
          ink
            ? "text-background/55 dark:text-foreground/50"
            : "text-foreground/50",
        )}
      >
        <div id={outputId} className="flex flex-col gap-1">
          {displayedLines.map(({ line, stderr: isStderr }, index) => {
            const isLast = index === revealedLines.length - 1;
            return (
              <div
                key={`${index}-${line}`}
                className={cn(
                  "fade-in animate-in fill-mode-both break-words whitespace-pre-wrap duration-300 motion-reduce:animate-none",
                  isStderr
                    ? "text-red-600 dark:text-red-400"
                    : isLast &&
                        (ink
                          ? "text-background/90 dark:text-foreground/90"
                          : "text-foreground/90"),
                )}
              >
                {parseAnsi(line).map((segment, segmentIndex) => (
                  <span
                    key={segmentIndex}
                    className={cn(
                      !isStderr &&
                        segment.color !== undefined &&
                        ansiColor(segment.color, ink),
                      segment.bold && "font-bold",
                      segment.dim && "opacity-60",
                    )}
                  >
                    {segment.text}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        {canCollapse ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={outputId}
            onClick={() => setExpanded((value) => !value)}
            className={cn(
              ghostButton,
              "h-7 self-start px-2 text-xs",
              ink &&
                "text-background/45 hover:text-background dark:text-foreground/45 dark:hover:text-foreground",
            )}
          >
            {expanded ? "Show less" : `Show all ${revealedLines.length} lines`}
          </button>
        ) : null}
        {truncated ? (
          <span
            className={cn(
              mono,
              ink
                ? "text-background/35 dark:text-foreground/35"
                : "text-foreground/35",
            )}
          >
            output truncated
          </span>
        ) : null}
        {!done && (
          <span
            aria-hidden
            className="inline-block h-3 w-1.5 animate-pulse bg-blue-500/70 motion-reduce:animate-none dark:bg-blue-400/70"
          />
        )}
      </div>
    </div>
  );
}
