"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useShikiHighlighter } from "react-shiki";
import { cn } from "@/lib/utils";

export interface CommandTabsProps extends Omit<
  ComponentProps<"figure">,
  "onChange"
> {
  /** Tab label to command line, in display order. */
  commands: Record<string, string>;
  /**
   * Persists the selected tab in localStorage and keeps every CommandTabs
   * with the same key in sync.
   */
  storageKey?: string;
  /** Called when the user picks a tab. */
  onValueChange?: (value: string) => void;
}

function syncEventName(storageKey: string) {
  return `command-tabs:${storageKey}`;
}

/**
 * One command in several dialects: a tab per variant, the active command as
 * highlighted Bash, and a copy button. With a `storageKey`, picking a tab
 * switches every instance sharing that key and survives reloads.
 */
export function CommandTabs({
  commands,
  storageKey,
  onValueChange,
  className,
  ...props
}: CommandTabsProps) {
  const labels = Object.keys(commands);
  const [active, setActive] = useState(labels[0] ?? "");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  useEffect(() => {
    if (!storageKey) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(storageKey);
    } catch {}
    if (stored && Object.hasOwn(commandsRef.current, stored)) setActive(stored);

    const onSync = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (Object.hasOwn(commandsRef.current, value)) setActive(value);
    };
    window.addEventListener(syncEventName(storageKey), onSync);
    return () => window.removeEventListener(syncEventName(storageKey), onSync);
  }, [storageKey]);

  const select = useCallback(
    (value: string) => {
      setActive(value);
      onValueChange?.(value);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, value);
      } catch {}
      window.dispatchEvent(
        new CustomEvent(syncEventName(storageKey), { detail: value }),
      );
    },
    [storageKey, onValueChange],
  );

  const activeLabel = Object.hasOwn(commands, active)
    ? active
    : (labels[0] ?? "");
  const command = commands[activeLabel] ?? "";
  const highlighted = useShikiHighlighter(command, "bash", {
    light: "catppuccin-latte",
    dark: "catppuccin-mocha",
  });

  return (
    <figure
      className={cn(
        "not-prose border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] my-6 flex min-w-0 flex-col overflow-hidden rounded-sm border",
        className,
      )}
      {...props}
    >
      <div className="border-foreground/10 flex h-9 shrink-0 items-center justify-between gap-2 border-b py-0 ps-1.5 pe-2">
        <div
          role="group"
          aria-label="Command variants"
          className="flex h-full min-w-0 items-center gap-1 overflow-x-auto"
        >
          {labels.map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={label === activeLabel}
              onClick={() => select(label)}
              className={cn(
                "after:bg-foreground relative flex h-full shrink-0 items-center px-2 font-mono text-[11px] font-medium tracking-wide transition-colors after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:opacity-0 after:transition-opacity",
                label === activeLabel
                  ? "text-foreground after:opacity-100"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Copy command"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(command);
            } catch {
              return;
            }
            setCopied(true);
            clearTimeout(copyTimer.current);
            copyTimer.current = setTimeout(() => setCopied(false), 1500);
          }}
          className="text-muted-foreground hover:text-foreground grid size-6 shrink-0 place-items-center rounded-sm transition-colors"
        >
          {copied ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      </div>
      <div
        className={cn(
          "min-w-0 overflow-x-auto",
          "[&_pre]:w-max [&_pre]:min-w-full [&_pre]:bg-transparent! [&_pre]:px-3.5 [&_pre]:py-4 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-relaxed [&_pre]:whitespace-pre [&_pre]:[font-variant-ligatures:none]",
          "[&_code_span]:[color:var(--shiki-light,inherit)]",
          "dark:[&_code_span]:[color:var(--shiki-dark)]!",
        )}
      >
        {highlighted ?? (
          <pre>
            <code>{command}</code>
          </pre>
        )}
      </div>
    </figure>
  );
}
