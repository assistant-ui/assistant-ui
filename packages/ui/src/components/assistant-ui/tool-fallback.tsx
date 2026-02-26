"use client";

import { memo, type ReactNode } from "react";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react";
import {
  type ToolCallMessagePartStatus,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  DisclosureContent,
  DisclosureRoot,
  type DisclosureRootProps,
} from "./disclosure";

export type ToolFallbackRootProps = DisclosureRootProps;

function ToolFallbackRoot({
  className,
  children,
  ...props
}: ToolFallbackRootProps) {
  return (
    <DisclosureRoot
      data-slot="tool-fallback-root"
      className={cn(
        "aui-tool-fallback-root group/tool-fallback-root w-full rounded-lg border py-3",
        className,
      )}
      {...props}
    >
      {children}
    </DisclosureRoot>
  );
}

type ToolStatus = ToolCallMessagePartStatus["type"];

const statusIconMap: Record<ToolStatus, React.ElementType> = {
  running: LoaderIcon,
  complete: CheckIcon,
  incomplete: XCircleIcon,
  "requires-action": AlertCircleIcon,
};

export type ToolFallbackTriggerRenderArgs = {
  label: string;
  toolName: string;
  statusType: ToolStatus;
  isCancelled: boolean;
  hasDetails: boolean;
  defaultChevron: ReactNode;
};

function ToolFallbackTrigger({
  toolName,
  status,
  hasDetails = false,
  renderContent,
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
  toolName: string;
  status?: ToolCallMessagePartStatus;
  hasDetails?: boolean;
  renderContent?: (args: ToolFallbackTriggerRenderArgs) => ReactNode;
}) {
  const statusType = status?.type ?? "complete";
  const isRunning = statusType === "running";
  const isCancelled =
    status?.type === "incomplete" && status.reason === "cancelled";

  const Icon = statusIconMap[statusType];
  const label = isCancelled ? "Cancelled tool" : "Used tool";
  const defaultChevron = (
    <ChevronDownIcon
      data-slot="tool-fallback-trigger-chevron"
      className={cn(
        "aui-tool-fallback-trigger-chevron size-4 shrink-0 transition-transform duration-(--animation-duration) ease-out",
        hasDetails
          ? "group-data-[state=closed]/trigger:-rotate-90 group-data-[state=open]/trigger:rotate-0"
          : "opacity-50",
      )}
    />
  );

  return (
    <CollapsibleTrigger
      data-slot="tool-fallback-trigger"
      disabled={!hasDetails}
      className={cn(
        "aui-tool-fallback-trigger group/trigger flex w-full items-center gap-2 px-4 text-sm transition-colors",
        className,
      )}
      {...props}
    >
      {renderContent ? (
        renderContent({
          label,
          toolName,
          statusType,
          isCancelled,
          hasDetails,
          defaultChevron,
        })
      ) : (
        <>
          <Icon
            data-slot="tool-fallback-trigger-icon"
            className={cn(
              "aui-tool-fallback-trigger-icon size-4 shrink-0",
              isCancelled && "text-muted-foreground",
              isRunning && "animate-spin",
            )}
          />
          <span
            data-slot="tool-fallback-trigger-label"
            className={cn(
              "aui-tool-fallback-trigger-label-wrapper relative inline-block grow text-left leading-none",
              isCancelled && "text-muted-foreground line-through",
            )}
          >
            <span>
              {label}: <b>{toolName}</b>
            </span>
            {isRunning && (
              <span
                aria-hidden
                data-slot="tool-fallback-trigger-shimmer"
                className="aui-tool-fallback-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
              >
                {label}: <b>{toolName}</b>
              </span>
            )}
          </span>
          {defaultChevron}
        </>
      )}
    </CollapsibleTrigger>
  );
}

function ToolFallbackContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DisclosureContent>) {
  return (
    <DisclosureContent
      data-slot="tool-fallback-content"
      className={cn("aui-tool-fallback-content text-sm", className)}
      {...props}
    >
      <div className="mt-3 flex flex-col gap-2 border-t pt-2">{children}</div>
    </DisclosureContent>
  );
}

function ToolFallbackArgs({
  argsText,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  argsText?: string;
}) {
  if (!argsText) return null;

  return (
    <div
      data-slot="tool-fallback-args"
      className={cn("aui-tool-fallback-args px-4", className)}
      {...props}
    >
      <pre className="aui-tool-fallback-args-value whitespace-pre-wrap">
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
      className={cn(
        "aui-tool-fallback-result border-t border-dashed px-4 pt-2",
        className,
      )}
      {...props}
    >
      <p className="aui-tool-fallback-result-header font-semibold">Result:</p>
      <pre className="aui-tool-fallback-result-content whitespace-pre-wrap">
        {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

function ToolFallbackError({
  status,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  status?: ToolCallMessagePartStatus;
}) {
  if (status?.type !== "incomplete") return null;

  const error = status.error;
  const errorText = error
    ? typeof error === "string"
      ? error
      : JSON.stringify(error)
    : null;

  if (!errorText) return null;

  const isCancelled = status.reason === "cancelled";
  const headerText = isCancelled ? "Cancelled reason:" : "Error:";

  return (
    <div
      data-slot="tool-fallback-error"
      className={cn("aui-tool-fallback-error px-4", className)}
      {...props}
    >
      <p className="aui-tool-fallback-error-header font-semibold text-muted-foreground">
        {headerText}
      </p>
      <p className="aui-tool-fallback-error-reason text-muted-foreground">
        {errorText}
      </p>
    </div>
  );
}

type ToolFallbackProps = React.ComponentProps<ToolCallMessagePartComponent> & {
  renderTriggerContent?: (args: ToolFallbackTriggerRenderArgs) => ReactNode;
};

const ToolFallbackImpl = ({
  toolName,
  argsText,
  result,
  status,
  renderTriggerContent,
}: ToolFallbackProps) => {
  const isCancelled =
    status?.type === "incomplete" && status.reason === "cancelled";
  const hasDetails =
    (typeof argsText === "string" && argsText.length > 0) ||
    result !== undefined ||
    (status?.type === "incomplete" && status.error != null);

  return (
    <ToolFallbackRoot
      className={cn(isCancelled && "border-muted-foreground/30 bg-muted/30")}
    >
      <ToolFallbackTrigger
        toolName={toolName}
        status={status}
        hasDetails={hasDetails}
        renderContent={renderTriggerContent}
      />
      <ToolFallbackContent>
        <ToolFallbackError status={status} />
        <ToolFallbackArgs
          argsText={argsText}
          className={cn(isCancelled && "opacity-60")}
        />
        {!isCancelled && <ToolFallbackResult result={result} />}
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
};

const ToolFallback = memo(
  ToolFallbackImpl,
) as unknown as ToolCallMessagePartComponent &
  React.ComponentType<ToolFallbackProps> & {
    Root: typeof ToolFallbackRoot;
    Trigger: typeof ToolFallbackTrigger;
    Content: typeof ToolFallbackContent;
    Args: typeof ToolFallbackArgs;
    Result: typeof ToolFallbackResult;
    Error: typeof ToolFallbackError;
  };

ToolFallback.displayName = "ToolFallback";
ToolFallback.Root = ToolFallbackRoot;
ToolFallback.Trigger = ToolFallbackTrigger;
ToolFallback.Content = ToolFallbackContent;
ToolFallback.Args = ToolFallbackArgs;
ToolFallback.Result = ToolFallbackResult;
ToolFallback.Error = ToolFallbackError;

export {
  ToolFallback,
  ToolFallbackRoot,
  ToolFallbackTrigger,
  ToolFallbackContent,
  ToolFallbackArgs,
  ToolFallbackResult,
  ToolFallbackError,
};
