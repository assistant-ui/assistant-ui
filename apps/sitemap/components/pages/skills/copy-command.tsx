"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

function CopyMark({ copied }: { copied: boolean }) {
  return (
    <span
      aria-hidden
      className="text-muted-foreground relative flex size-4 flex-none items-center justify-center"
    >
      <CheckIcon
        className={cn(
          "absolute size-3.5 transition-all duration-100 motion-reduce:transition-none",
          copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      />
      <CopyIcon
        className={cn(
          "absolute size-3.5 transition-all duration-100 motion-reduce:transition-none",
          copied
            ? "scale-50 opacity-0"
            : "scale-100 opacity-50 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      />
    </span>
  );
}

/** A command on a field panel that copies itself; wraps on a phone instead of scrolling. */
export function CopyCommand({
  command,
  className,
}: {
  command: string;
  className?: string;
}) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });

  return (
    <button
      type="button"
      onClick={() => copyToClipboard(command)}
      aria-label={`Copy command: ${command}`}
      className={cn(
        "group rounded-control hover:bg-foreground/[0.06] focus-visible:ring-ring bg-foreground/[0.025] dark:bg-foreground/[0.04] inline-flex max-w-full items-start gap-2 px-3 py-1.5 text-start transition-colors outline-none focus-visible:ring-2",
        className,
      )}
    >
      <span className="font-mono text-[13px] leading-5 [overflow-wrap:anywhere] [font-variant-ligatures:none]">
        <span aria-hidden className="text-muted-foreground me-2 select-none">
          $
        </span>
        {command}
      </span>
      <span className="mt-0.5">
        <CopyMark copied={isCopied} />
      </span>
      <span role="status" className="sr-only">
        {isCopied ? "Copied" : ""}
      </span>
    </button>
  );
}

/** A list entry that copies a command when pressed. */
export function CopyRow({
  command,
  label,
  children,
}: {
  command: string;
  label: string;
  children: ReactNode;
}) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });

  return (
    <button
      type="button"
      onClick={() => copyToClipboard(command)}
      aria-label={label}
      title={command}
      className="group rounded-control hover:bg-foreground/[0.025] focus-visible:ring-ring flex w-full items-center justify-between gap-3 px-2 py-1.5 text-start transition-colors outline-none focus-visible:ring-2"
    >
      <span className="min-w-0">{children}</span>
      <CopyMark copied={isCopied} />
      <span role="status" className="sr-only">
        {isCopied ? "Copied" : ""}
      </span>
    </button>
  );
}
