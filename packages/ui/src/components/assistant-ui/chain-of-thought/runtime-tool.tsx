"use client";

import { useContext, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  useAuiState,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChainOfThoughtToolBadge } from "./step";
import {
  extractSearchResults,
  formatSearchSourceLabel,
  getActivityFromPart,
  inferToolActivityStatusType,
  partStatusOrFallback,
  type ToolActivity,
} from "./runtime-activity";
import { ToolActivityLabelsContext } from "./runtime-tool-context";

export const ChainOfThoughtPrimitiveToolWithLabels: ToolCallMessagePartComponent =
  (props) => {
    const toolActivityLabels = useContext(ToolActivityLabelsContext);
    return (
      <ChainOfThoughtPrimitiveTool
        {...props}
        {...(toolActivityLabels ? { toolActivityLabels } : {})}
      />
    );
  };

export type ChainOfThoughtPrimitiveToolProps =
  React.ComponentProps<ToolCallMessagePartComponent> & {
    toolActivityLabels?: Record<string, ToolActivity> | undefined;
  };

export function ChainOfThoughtPrimitiveTool({
  toolName,
  argsText,
  result,
  status,
  toolActivityLabels,
}: ChainOfThoughtPrimitiveToolProps) {
  const currentPart = useAuiState((s) => s.part);
  const toolPart = currentPart.type === "tool-call" ? currentPart : undefined;
  const chainStatusType = useAuiState((s) => s.chainOfThought.status.type);
  const messageStatusType = useAuiState((s) => s.message.status?.type);

  const statusType = partStatusOrFallback(
    toolPart?.status?.type,
    chainStatusType,
    messageStatusType,
  );
  const activityLabel = getActivityFromPart(
    toolPart,
    statusType,
    toolActivityLabels,
    chainStatusType,
    messageStatusType,
  );

  const effectiveStatusType = inferToolActivityStatusType(
    toolPart,
    statusType,
    messageStatusType,
  );
  const isActiveToolLabel =
    effectiveStatusType === "running" ||
    effectiveStatusType === "requires-action";

  const toolResult = result ?? toolPart?.result;
  const searchResults = extractSearchResults(toolName, toolResult);

  // Prefer live part status; standalone callers fall back to props.
  const badgeStatusType = toolPart?.status?.type ?? status?.type;
  const badgeStatus: "running" | "complete" | "error" =
    badgeStatusType === "running" || badgeStatusType === "requires-action"
      ? "running"
      : badgeStatusType === "incomplete"
        ? "error"
        : "complete";

  const hasArgs = typeof argsText === "string" && argsText.length > 0;
  const hasSearchResults =
    searchResults != null &&
    (Boolean(searchResults.summary) || searchResults.sources.length > 0);
  const hasDetails = hasArgs || hasSearchResults || toolResult !== undefined;

  const [requestedOpen, setRequestedOpen] = useState(false);
  const open = hasDetails && requestedOpen;

  return (
    <Collapsible
      data-slot="chain-of-thought-tool-activity"
      open={open}
      onOpenChange={(nextOpen) => {
        if (hasDetails) setRequestedOpen(nextOpen);
      }}
      className="aui-chain-of-thought-tool-activity space-y-1.5"
    >
      <CollapsibleTrigger
        data-slot="chain-of-thought-tool-activity-trigger"
        disabled={!hasDetails}
        aria-label={hasDetails ? `${toolName} details` : undefined}
        className={cn(
          "aui-chain-of-thought-tool-activity-trigger group/tool-activity-trigger -mt-0.5 flex w-full min-w-0 items-center gap-1.5 text-left text-sm leading-relaxed",
          hasDetails
            ? "text-muted-foreground hover:text-foreground transition-colors"
            : "text-muted-foreground cursor-default",
        )}
      >
        {activityLabel ? (
          <div
            data-slot="chain-of-thought-tool-activity-label"
            className={cn(
              "text-foreground max-w-[52ch] min-w-0 shrink truncate leading-5 font-medium",
              isActiveToolLabel && "shimmer motion-reduce:animate-none",
            )}
          >
            {activityLabel}
          </div>
        ) : null}
        <ChainOfThoughtToolBadge
          toolName={toolName}
          status={badgeStatus}
          showIcon={false}
          className="shrink-0 text-[13px]"
        />
        {hasDetails ? (
          <ChevronDownIcon
            aria-hidden
            data-slot="chain-of-thought-tool-activity-chevron"
            className={cn(
              "aui-chain-of-thought-tool-activity-chevron size-3 shrink-0",
              "transition-transform duration-(--animation-duration) ease-(--spring-easing)",
              "group-data-[state=closed]/tool-activity-trigger:-rotate-90",
              "rtl:group-data-[state=closed]/tool-activity-trigger:rotate-90",
              "group-data-[state=open]/tool-activity-trigger:rotate-0",
              "motion-reduce:transition-none",
            )}
          />
        ) : null}
      </CollapsibleTrigger>
      {hasDetails ? (
        <CollapsibleContent
          data-slot="chain-of-thought-tool-activity-content-wrapper"
          className={cn(
            "aui-chain-of-thought-tool-activity-content-wrapper overflow-hidden outline-none",
            "data-[state=open]:animate-collapsible-down",
            "data-[state=open]:duration-(--animation-duration)",
            "data-[state=open]:ease-(--spring-easing)",
            "data-[state=closed]:animate-collapsible-up",
            "data-[state=closed]:duration-[calc(var(--animation-duration)*0.75)]",
            "data-[state=closed]:ease-(--ease-out-expo)",
            "data-[state=closed]:fill-mode-forwards",
            "data-[state=closed]:pointer-events-none",
            "motion-reduce:animate-none motion-reduce:transition-none",
          )}
        >
          <div
            data-slot="chain-of-thought-tool-activity-content"
            className="aui-chain-of-thought-tool-activity-content space-y-1.5 pt-0.5 pl-[22px]"
          >
            {argsText ? (
              <pre className="bg-muted/40 text-muted-foreground rounded-md px-2 py-1 text-xs whitespace-pre-wrap">
                {argsText}
              </pre>
            ) : null}
            {hasSearchResults && searchResults ? (
              <div
                data-slot="chain-of-thought-search-results"
                className="aui-chain-of-thought-search-results bg-muted/40 space-y-2 rounded-md p-2"
              >
                {searchResults.summary ? (
                  <p className="text-muted-foreground text-xs">
                    {searchResults.summary}
                  </p>
                ) : null}
                {searchResults.sources.length > 0 ? (
                  <ul className="space-y-1 text-xs">
                    {searchResults.sources.map((source, index) => (
                      <li key={`${index}-${source}`}>
                        <span className="text-muted-foreground">
                          {formatSearchSourceLabel(source)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : toolResult !== undefined ? (
              <pre className="bg-muted/40 text-muted-foreground rounded-md px-2 py-1 text-xs whitespace-pre-wrap">
                {typeof toolResult === "string"
                  ? toolResult
                  : JSON.stringify(toolResult, null, 2)}
              </pre>
            ) : null}
          </div>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
}
