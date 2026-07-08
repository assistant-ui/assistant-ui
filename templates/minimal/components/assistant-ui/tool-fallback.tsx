"use client";

import { memo, useCallback, useRef, useState } from "react";
import {
  AlertCircleIcon,
  ChevronDownIcon,
  GlobeIcon,
  WrenchIcon,
} from "lucide-react";
import {
  useScrollLock,
  useToolCallElapsed,
  type ToolApprovalOption,
  type ToolCallMessagePart,
  type ToolCallMessagePartProps,
  type ToolCallMessagePartStatus,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ANIMATION_DURATION = 200;

const pressable = "active:scale-[0.98]";

export type ToolFallbackRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
};

function ToolFallbackRoot({
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  children,
  ...props
}: ToolFallbackRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      lockScroll();
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      controlledOnOpenChange?.(open);
    },
    [lockScroll, isControlled, controlledOnOpenChange],
  );

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="tool-fallback-root"
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        "aui-tool-fallback-root group/tool-fallback-root relative w-full",
        "animate-in fade-in-0 slide-in-from-top-1 duration-(--animation-duration) ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none",
        className,
      )}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
      <div
        aria-hidden
        data-slot="tool-fallback-connector"
        className="aui-tool-fallback-connector bg-border absolute start-[11.5px] top-[26px] -bottom-1.5 hidden w-px"
      />
    </Collapsible>
  );
}

const prettifyToolName = (toolName: string) => {
  if (!toolName) return "Tool";
  const words = toolName.replace(/[_-]+/g, " ").trim();
  return words.length === 0
    ? toolName
    : words[0]!.toUpperCase() + words.slice(1);
};

const PREFERRED_ARG_KEYS = ["query", "path", "command", "code", "url", "file"];

const primaryArg = (args: unknown, argsText: string | undefined) => {
  if (args && typeof args === "object") {
    const record: Record<string, unknown> = { ...args };
    const candidates = [
      ...PREFERRED_ARG_KEYS.map((key) => record[key]),
      ...Object.values(record),
    ];
    for (const value of candidates) {
      if (typeof value === "string" && value.length > 0) {
        const [firstLine] = value.split("\n", 1);
        return firstLine;
      }
    }
  }
  if (argsText && argsText !== "{}") return argsText;
  return undefined;
};

/** Provider-executed searches carry the query in the output's `action`. */
const outputQuery = (result: unknown) => {
  if (result && typeof result === "object" && "action" in result) {
    const action = result.action;
    if (action && typeof action === "object") {
      if (
        "query" in action &&
        typeof action.query === "string" &&
        action.query.length > 0
      ) {
        return action.query;
      }
      if ("queries" in action && Array.isArray(action.queries)) {
        const queries = action.queries.filter(
          (q): q is string => typeof q === "string",
        );
        if (queries.length > 0) return queries.join(", ");
      }
    }
  }
  return undefined;
};

const collectResults = (result: unknown) => {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object") {
    if ("results" in result && Array.isArray(result.results)) {
      return result.results;
    }
    if ("sources" in result && Array.isArray(result.sources)) {
      return result.sources;
    }
  }
  return undefined;
};

type ToolPreset = {
  /** Row label while the call is in flight, e.g. "Searching web". */
  running: string;
  /** Row label once the call settled, e.g. "Searched web". */
  done: string;
  icon: React.ReactNode;
};

const TOOL_PRESETS: Record<string, ToolPreset> = {
  web_search: {
    running: "Searching web",
    done: "Searched web",
    icon: <GlobeIcon />,
  },
  web_search_preview: {
    running: "Searching web",
    done: "Searched web",
    icon: <GlobeIcon />,
  },
};

const formatToolDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 1) return null;
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

function ToolFallbackDuration({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const elapsedMs = useToolCallElapsed();
  if (elapsedMs === undefined) return null;
  const duration = formatToolDuration(elapsedMs);
  if (duration === null) return null;

  return (
    <span
      data-slot="tool-fallback-duration"
      className={cn(
        "aui-tool-fallback-duration text-muted-foreground text-xs tabular-nums",
        className,
      )}
      {...props}
    >
      {duration}
    </span>
  );
}

function ToolFallbackFavicons({
  urls,
  max = 3,
  className,
}: {
  urls: readonly string[];
  max?: number;
  className?: string;
}) {
  const domains = urls
    .map((url) => {
      try {
        return new URL(url).hostname;
      } catch {
        return null;
      }
    })
    .filter((domain): domain is string => domain !== null)
    .filter((domain, i, all) => all.indexOf(domain) === i)
    .slice(0, max);

  if (domains.length === 0) return null;

  return (
    <span
      data-slot="tool-fallback-favicons"
      className={cn("aui-tool-fallback-favicons flex items-center", className)}
    >
      {domains.map((domain, i) => (
        <img
          key={domain}
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          role="presentation"
          className={cn(
            "aui-tool-fallback-favicon bg-muted ring-background size-[18px] rounded-full ring-2",
            i > 0 && "-ms-2",
          )}
          style={{ zIndex: domains.length - i }}
        />
      ))}
    </span>
  );
}

function ToolFallbackTrigger({
  toolName,
  status,
  detail,
  icon,
  meta,
  expandable = true,
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
  toolName: string;
  status?: ToolCallMessagePartStatus;
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  expandable?: boolean;
}) {
  const statusType = status?.type ?? "complete";
  const isRunning = statusType === "running";
  const isCancelled =
    status?.type === "incomplete" && status.reason === "cancelled";
  const isFailed = status?.type === "incomplete" && !isCancelled;
  const preset = Object.hasOwn(TOOL_PRESETS, toolName)
    ? TOOL_PRESETS[toolName]
    : undefined;
  const label = preset
    ? isRunning
      ? preset.running
      : preset.done
    : prettifyToolName(toolName);

  return (
    <CollapsibleTrigger
      data-slot="tool-fallback-trigger"
      className={cn(
        "aui-tool-fallback-trigger group/trigger flex w-full items-start",
        className,
      )}
      {...props}
    >
      <span
        data-slot="tool-fallback-trigger-icon"
        className={cn(
          "aui-tool-fallback-trigger-icon relative flex h-8 w-6 shrink-0 items-center justify-center",
          isFailed ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "aui-tool-fallback-trigger-glyph flex items-center justify-center [&>svg]:size-4",
            expandable &&
              "transition-opacity group-hover/trigger:opacity-0 motion-reduce:transition-none",
          )}
        >
          {icon ??
            preset?.icon ??
            (statusType === "requires-action" ? (
              <AlertCircleIcon />
            ) : (
              <WrenchIcon />
            ))}
        </span>
        {expandable && (
          <span
            data-slot="tool-fallback-trigger-chevron"
            className="aui-tool-fallback-trigger-chevron absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/trigger:opacity-100 motion-reduce:transition-none"
          >
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform duration-(--animation-duration) ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                "group-data-[state=closed]/trigger:-rotate-90",
                "group-data-[state=open]/trigger:rotate-0",
              )}
            />
          </span>
        )}
      </span>
      <span className="aui-tool-fallback-trigger-line flex min-h-8 min-w-0 flex-1 items-center gap-1.5 py-1 pe-2 text-start">
        <span
          data-slot="tool-fallback-trigger-label"
          className={cn(
            "aui-tool-fallback-trigger-label-wrapper relative shrink-0 text-sm leading-6 transition-colors motion-reduce:transition-none",
            isFailed
              ? "text-destructive"
              : "text-muted-foreground group-hover/trigger:text-foreground",
            isCancelled && "line-through",
          )}
        >
          {label}
          {isRunning && (
            <span
              aria-hidden
              data-slot="tool-fallback-trigger-shimmer"
              className="aui-tool-fallback-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
            >
              {label}
            </span>
          )}
        </span>
        {detail && (
          <span
            data-slot="tool-fallback-trigger-detail"
            className="aui-tool-fallback-trigger-detail text-muted-foreground/70 min-w-0 truncate font-mono text-xs"
          >
            {detail}
          </span>
        )}
        <span
          data-slot="tool-fallback-trigger-meta"
          className="aui-tool-fallback-trigger-meta text-muted-foreground ms-auto flex shrink-0 items-center gap-2 ps-2 text-xs"
        >
          {meta ?? <ToolFallbackDuration />}
        </span>
      </span>
    </CollapsibleTrigger>
  );
}

function ToolFallbackContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="tool-fallback-content"
      className={cn(
        "aui-tool-fallback-content relative overflow-hidden text-sm outline-none",
        "group/collapsible-content ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none",
        "data-[state=closed]:animate-collapsible-up",
        "data-[state=open]:animate-collapsible-down",
        "data-[state=closed]:fill-mode-forwards",
        "data-[state=closed]:pointer-events-none",
        "data-[state=open]:duration-(--animation-duration)",
        "data-[state=closed]:duration-(--animation-duration)",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex flex-col gap-2 ps-6 pe-2 pt-0.5 pb-2 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none",
          "group-data-[state=open]/collapsible-content:animate-in group-data-[state=open]/collapsible-content:fade-in-0 group-data-[state=open]/collapsible-content:blur-in-[2px] group-data-[state=open]/collapsible-content:slide-in-from-top-1",
          "group-data-[state=closed]/collapsible-content:animate-out group-data-[state=closed]/collapsible-content:fade-out-0 group-data-[state=closed]/collapsible-content:blur-out-[2px] group-data-[state=closed]/collapsible-content:slide-out-to-top-1",
          "group-data-[state=closed]/collapsible-content:duration-(--animation-duration) group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        )}
      >
        {children}
      </div>
    </CollapsibleContent>
  );
}

function ToolFallbackArgs({
  argsText,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  argsText?: string;
}) {
  if (!argsText || argsText === "{}") return null;

  return (
    <div
      data-slot="tool-fallback-args"
      className={cn("aui-tool-fallback-args", className)}
      {...props}
    >
      <p className="aui-tool-fallback-args-header text-muted-foreground mb-1 text-xs font-medium">
        Request
      </p>
      <pre
        className="aui-tool-fallback-args-value bg-muted/50 text-foreground/90 max-h-64 overflow-auto rounded-md p-2.5 text-xs whitespace-pre-wrap"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {argsText}
      </pre>
    </div>
  );
}

function ToolFallbackResult({
  result,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  result?: unknown;
}) {
  if (result === undefined) return null;

  return (
    <div
      data-slot="tool-fallback-result"
      className={cn("aui-tool-fallback-result", className)}
      {...props}
    >
      <p className="aui-tool-fallback-result-header text-muted-foreground mb-1 text-xs font-medium">
        Response
      </p>
      <pre
        className="aui-tool-fallback-result-content bg-muted/50 text-foreground/90 max-h-64 overflow-auto rounded-md p-2.5 text-xs whitespace-pre-wrap"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

function ToolFallbackError({
  status,
  result,
  isError,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  status?: ToolCallMessagePartStatus;
  result?: unknown;
  isError?: boolean | undefined;
}) {
  const isCancelled =
    status?.type === "incomplete" && status.reason === "cancelled";
  const statusError = status?.type === "incomplete" ? status.error : undefined;
  const raw = statusError
    ? statusError
    : isError === true && result !== undefined
      ? result
      : undefined;
  const errorText =
    raw === undefined
      ? null
      : typeof raw === "string"
        ? raw
        : JSON.stringify(raw, null, 2);

  if (!errorText) return null;

  const headerText = isCancelled ? "Cancelled" : "Error";

  return (
    <div
      data-slot="tool-fallback-error"
      className={cn("aui-tool-fallback-error", className)}
      {...props}
    >
      <p
        className={cn(
          "aui-tool-fallback-error-header mb-1 text-xs font-medium",
          isCancelled ? "text-muted-foreground" : "text-destructive",
        )}
      >
        {headerText}
      </p>
      <pre
        className={cn(
          "aui-tool-fallback-error-reason max-h-64 overflow-auto rounded-md p-2.5 text-xs whitespace-pre-wrap",
          isCancelled
            ? "bg-muted/50 text-muted-foreground"
            : "bg-destructive/5 text-destructive",
        )}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {errorText}
      </pre>
    </div>
  );
}

const APPROVED_RESULT = "Approved by user";
const DENIED_RESULT = "User denied tool execution";

const APPROVAL_OPTION_DEFAULT_LABELS: Record<string, string> = {
  "allow-once": "Allow",
  "allow-always": "Always allow",
  "reject-once": "Deny",
  "reject-always": "Always deny",
};

const isAllowKind = (kind: string) =>
  kind === "allow-once" || kind === "allow-always";

const approvalOptionLabel = (option: ToolApprovalOption) =>
  option.label ??
  (Object.hasOwn(APPROVAL_OPTION_DEFAULT_LABELS, option.kind)
    ? APPROVAL_OPTION_DEFAULT_LABELS[option.kind]
    : undefined) ??
  option.id;

function ToolFallbackApproval({
  className,
  addResult,
  resume,
  interrupt,
  approval,
  respondToApproval,
  ...props
}: React.ComponentProps<"div"> &
  Partial<
    Pick<ToolCallMessagePartProps, "addResult" | "resume" | "respondToApproval">
  > & {
    interrupt?: ToolCallMessagePart["interrupt"];
    approval?: ToolCallMessagePart["approval"];
  }) {
  const [submitted, setSubmitted] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (
    approval != null &&
    (approval.approved !== undefined || approval.resolution !== undefined)
  )
    return null;

  // Custom (`_`-prefixed) kinds cannot be resolved to a boolean by the kit;
  // hosts using custom kinds render their own bar. A declared option list is
  // a host constraint: the kit never adds an approval path beyond it, but
  // always preserves a refusal path.
  const declaredOptions = respondToApproval ? approval?.options : undefined;
  const options = declaredOptions?.filter((o) =>
    Object.hasOwn(APPROVAL_OPTION_DEFAULT_LABELS, o.kind),
  );

  const respond = (approved: boolean) => {
    if (submitted) return;
    if (
      approval != null &&
      approval.approved === undefined &&
      respondToApproval
    ) {
      respondToApproval({ approved });
    } else if (interrupt) {
      resume?.({ approved });
    } else {
      addResult?.(approved ? APPROVED_RESULT : DENIED_RESULT);
    }
    setSubmitted(true);
  };

  const respondWithOption = (option: ToolApprovalOption) => {
    if (submitted) return;
    respondToApproval?.({ optionId: option.id });
    setSubmitted(true);
    setConfirmingId(null);
  };

  const handleOption = (option: ToolApprovalOption) => {
    if (option.confirm) {
      setConfirmingId(option.id);
    } else {
      respondWithOption(option);
    }
  };

  const confirming =
    confirmingId != null
      ? options?.find((o) => o.id === confirmingId)
      : undefined;

  if (confirming) {
    const confirmMeta =
      typeof confirming.confirm === "object" ? confirming.confirm : undefined;
    const confirmDescription =
      confirmMeta?.description ?? confirming.description;
    return (
      <div
        data-slot="tool-fallback-approval-confirm"
        className={cn(
          "aui-tool-fallback-approval-confirm flex flex-col gap-2 pt-1",
          className,
        )}
        {...props}
      >
        <p className="aui-tool-fallback-approval-confirm-title font-semibold">
          {confirmMeta?.title ?? `${approvalOptionLabel(confirming)}?`}
        </p>
        {confirmDescription && (
          <p className="aui-tool-fallback-approval-confirm-description text-muted-foreground">
            {confirmDescription}
          </p>
        )}
        {confirming.grants && confirming.grants.length > 0 && (
          <ul className="aui-tool-fallback-approval-confirm-grants flex flex-col gap-1">
            {confirming.grants.map((grant) => (
              <li key={grant}>
                <code className="aui-tool-fallback-approval-confirm-grant bg-muted rounded px-1.5 py-0.5 text-xs">
                  {grant}
                </code>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className={pressable}
            onClick={() => respondWithOption(confirming)}
            disabled={submitted}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={pressable}
            onClick={() => setConfirmingId(null)}
            disabled={submitted}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (declaredOptions && declaredOptions.length > 0) {
    const allowOptions = options?.filter((o) => isAllowKind(o.kind)) ?? [];
    const rejectOptions = options?.filter((o) => !isAllowKind(o.kind)) ?? [];
    return (
      <div
        data-slot="tool-fallback-approval"
        className={cn(
          "aui-tool-fallback-approval flex flex-wrap items-center gap-2 pt-1",
          className,
        )}
        {...props}
      >
        {[...allowOptions, ...rejectOptions].map((option) => (
          <Button
            key={option.id}
            size="sm"
            variant={option === allowOptions[0] ? "default" : "outline"}
            className={pressable}
            onClick={() => handleOption(option)}
            disabled={submitted}
          >
            {approvalOptionLabel(option)}
          </Button>
        ))}
        {rejectOptions.length === 0 && (
          <Button
            size="sm"
            variant="outline"
            className={pressable}
            onClick={() => respond(false)}
            disabled={submitted}
          >
            Deny
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      data-slot="tool-fallback-approval"
      className={cn(
        "aui-tool-fallback-approval flex items-center gap-2 pt-1",
        className,
      )}
      {...props}
    >
      <Button
        size="sm"
        className={pressable}
        onClick={() => respond(true)}
        disabled={submitted}
      >
        Allow
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={pressable}
        onClick={() => respond(false)}
        disabled={submitted}
      >
        Deny
      </Button>
    </div>
  );
}

const ToolFallbackImpl: ToolCallMessagePartComponent = ({
  toolName,
  args,
  argsText,
  result,
  isError,
  status,
  addResult,
  resume,
  interrupt,
  approval,
  respondToApproval,
}) => {
  const isCancelled =
    status?.type === "incomplete" && status.reason === "cancelled";
  const isRequiresAction = status?.type === "requires-action";
  const isRunning = status?.type === "running";

  const [open, setOpen] = useState(isRequiresAction);
  const [prevRequiresAction, setPrevRequiresAction] =
    useState(isRequiresAction);
  if (isRequiresAction !== prevRequiresAction) {
    setPrevRequiresAction(isRequiresAction);
    if (isRequiresAction) setOpen(true);
  }

  let prettyArgs = argsText;
  if (args && typeof args === "object" && Object.keys(args).length > 0) {
    try {
      prettyArgs = JSON.stringify(args, null, 2);
    } catch {}
  }
  const showArgs = prettyArgs !== undefined && prettyArgs !== "{}";

  const results = isRunning ? undefined : collectResults(result);
  const resultUrls =
    results
      ?.map((item: unknown) =>
        item && typeof item === "object" && "url" in item
          ? item.url
          : undefined,
      )
      .filter((url): url is string => typeof url === "string") ?? [];

  const hasError =
    (status?.type === "incomplete" && Boolean(status.error)) ||
    isError === true;
  const expandable =
    showArgs || hasError || result !== undefined || isRequiresAction;

  return (
    <ToolFallbackRoot open={expandable ? open : false} onOpenChange={setOpen}>
      <ToolFallbackTrigger
        toolName={toolName}
        status={status}
        detail={primaryArg(args, argsText) ?? outputQuery(result)}
        expandable={expandable}
        disabled={!expandable}
        meta={
          results ? (
            <>
              <span className="aui-tool-fallback-results whitespace-nowrap">
                {results.length} {results.length === 1 ? "result" : "results"}
              </span>
              {resultUrls.length > 0 && (
                <ToolFallbackFavicons urls={resultUrls} />
              )}
            </>
          ) : undefined
        }
      />
      {expandable && (
        <ToolFallbackContent>
          <ToolFallbackArgs
            argsText={prettyArgs}
            className={cn(isCancelled && "opacity-60")}
          />
          <ToolFallbackError
            status={status}
            result={result}
            isError={isError}
          />
          {isRequiresAction && (
            <ToolFallbackApproval
              addResult={addResult}
              resume={resume}
              interrupt={interrupt}
              approval={approval}
              respondToApproval={respondToApproval}
            />
          )}
          {!isCancelled && !hasError && <ToolFallbackResult result={result} />}
        </ToolFallbackContent>
      )}
    </ToolFallbackRoot>
  );
};

const ToolFallback = memo(
  ToolFallbackImpl,
) as unknown as ToolCallMessagePartComponent & {
  Root: typeof ToolFallbackRoot;
  Trigger: typeof ToolFallbackTrigger;
  Content: typeof ToolFallbackContent;
  Args: typeof ToolFallbackArgs;
  Result: typeof ToolFallbackResult;
  Error: typeof ToolFallbackError;
  Approval: typeof ToolFallbackApproval;
};

ToolFallback.displayName = "ToolFallback";
ToolFallback.Root = ToolFallbackRoot;
ToolFallback.Trigger = ToolFallbackTrigger;
ToolFallback.Content = ToolFallbackContent;
ToolFallback.Args = ToolFallbackArgs;
ToolFallback.Result = ToolFallbackResult;
ToolFallback.Error = ToolFallbackError;
ToolFallback.Approval = ToolFallbackApproval;

export {
  prettifyToolName,
  ToolFallback,
  ToolFallbackRoot,
  ToolFallbackTrigger,
  ToolFallbackContent,
  ToolFallbackArgs,
  ToolFallbackResult,
  ToolFallbackError,
  ToolFallbackApproval,
};
