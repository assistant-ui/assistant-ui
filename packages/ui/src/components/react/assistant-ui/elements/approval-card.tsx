"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { CheckIcon, Loader2Icon, TerminalIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, ghostButton, inkButton, mono, paper } from "./surfaces";

export type ApprovalState = "request" | "running" | "done" | "denied";

const receiptText: Record<Exclude<ApprovalState, "request">, string> = {
  running: "Approved, running",
  done: "Finished",
  denied: "Denied",
};

export function ApprovalCard({
  state,
  command,
  title,
  subtitle,
  description,
  details,
  variant = "default",
  icon,
  onAllowOnce,
  onAlwaysAllow,
  onDeny,
  allowOnceLabel = "Allow once",
  alwaysAllowLabel = "Always allow",
  denyLabel = "Deny",
  statusLabel,
  className,
  onKeyDown,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "state"
  | "command"
  | "title"
  | "subtitle"
  | "description"
  | "details"
  | "variant"
  | "icon"
  | "onAllowOnce"
  | "onAlwaysAllow"
  | "onDeny"
  | "allowOnceLabel"
  | "alwaysAllowLabel"
  | "denyLabel"
  | "statusLabel"
> & {
  state: ApprovalState;
  command?: string | undefined;
  title: string;
  subtitle: string;
  description?: string | undefined;
  details?: readonly { label: string; value: string }[] | undefined;
  variant?: "default" | "destructive" | undefined;
  icon?: ReactNode | undefined;
  onAllowOnce?: (() => void) | undefined;
  onAlwaysAllow?: (() => void) | undefined;
  onDeny?: (() => void) | undefined;
  allowOnceLabel?: string | undefined;
  alwaysAllowLabel?: string | undefined;
  denyLabel?: string | undefined;
  statusLabel?: string | undefined;
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div
      {...props}
      role="group"
      data-variant={variant}
      data-slot="approval-card"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          !event.defaultPrevented &&
          event.key === "Escape" &&
          state === "request" &&
          onDeny
        ) {
          onDeny();
        }
      }}
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3.5 rounded-[20px] p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            variant === "destructive"
              ? "bg-red-600/10 text-red-600 dark:bg-red-400/10 dark:text-red-400"
              : "bg-foreground/[0.05] text-foreground/45",
          )}
        >
          {icon ?? <TerminalIcon className="size-4" />}
        </span>
        <div className="flex flex-col">
          <p id={titleId} className="text-[13.5px] font-medium">
            {title}
          </p>
          <p className="text-foreground/45 text-xs">{subtitle}</p>
        </div>
      </div>

      {description ? (
        <p id={descriptionId} className="text-foreground/60 text-[13px]">
          {description}
        </p>
      ) : null}

      {command ? (
        <div
          className={cn(
            field,
            "text-foreground/70 rounded-xl px-3.5 py-2.5 font-mono text-xs",
          )}
        >
          {command}
        </div>
      ) : null}

      {details?.length ? (
        <dl
          className={cn(field, "flex flex-col gap-2 rounded-xl px-3.5 py-2.5")}
        >
          {details.map((detail, index) => (
            <div
              key={`${detail.label}-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 text-xs"
            >
              <dt className={cn(mono, "text-foreground/40")}>{detail.label}</dt>
              <dd className="text-foreground/80 break-words">{detail.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="flex min-h-8 flex-wrap items-center justify-end gap-2">
        {state === "request" ? (
          <>
            {onDeny && (
              <button
                type="button"
                onClick={onDeny}
                className={cn(
                  ghostButton,
                  "h-8 px-3.5 text-xs font-medium whitespace-nowrap",
                )}
              >
                {denyLabel}
              </button>
            )}
            {onAlwaysAllow && (
              <button
                type="button"
                onClick={onAlwaysAllow}
                className={cn(
                  ghostButton,
                  "h-8 px-3.5 text-xs font-medium whitespace-nowrap",
                )}
              >
                {alwaysAllowLabel}
              </button>
            )}
            {onAllowOnce && (
              <button
                type="button"
                onClick={onAllowOnce}
                className={cn(
                  variant === "destructive"
                    ? "text-background bg-red-600 transition-[background-color,scale] duration-150 hover:bg-red-600/90 active:scale-[0.96] motion-reduce:transition-none dark:bg-red-400 dark:text-red-950 dark:hover:bg-red-400/90"
                    : inkButton,
                  "flex h-8 items-center rounded-full px-3.5 text-xs font-medium whitespace-nowrap",
                )}
              >
                {allowOnceLabel}
              </button>
            )}
          </>
        ) : (
          <div
            key={state}
            role="status"
            className="fade-in animate-in text-foreground/55 flex items-center gap-2 text-xs duration-300 motion-reduce:animate-none"
          >
            {state === "running" ? (
              <>
                <Loader2Icon className="text-foreground/45 size-3.5 animate-spin motion-reduce:animate-none" />
                {statusLabel ?? receiptText.running}
              </>
            ) : state === "denied" ? (
              <>
                <XIcon className="text-foreground/45 size-3.5" />
                {statusLabel ?? receiptText.denied}
              </>
            ) : (
              <>
                <CheckIcon className="size-3.5 text-emerald-500" />
                {statusLabel ?? receiptText.done}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
