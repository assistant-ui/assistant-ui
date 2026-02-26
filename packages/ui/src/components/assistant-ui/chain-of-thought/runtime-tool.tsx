"use client";

import { memo, useContext, useEffect, useState, createContext } from "react";
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
  ToolActivityLabelsContext,
  extractSearchResults,
  formatSearchSourceLabel,
  getActivityFromPart,
  inferToolActivityStatusType,
  partStatusOrFallback,
} from "./runtime-activity";

export type PrimitiveToolDisclosureContextValue = {
  setHasDetails: (hasDetails: boolean) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  setHovered: (hovered: boolean) => void;
};

export const PrimitiveToolDisclosureContext =
  createContext<PrimitiveToolDisclosureContextValue | null>(null);

export const ChainOfThoughtTraceTool = memo(function ChainOfThoughtTraceTool({
  toolName,
  status,
}: {
  toolName: string;
  argsText?: string;
  result?: unknown;
  status?: { type: string; reason?: string; error?: unknown };
}) {
  const badgeStatus: "running" | "complete" | "error" =
    status?.type === "running"
      ? "running"
      : status?.type === "incomplete"
        ? "error"
        : "complete";

  return (
    <ChainOfThoughtToolBadge
      toolName={toolName}
      status={badgeStatus}
      showIcon={false}
    />
  );
});

export const ChainOfThoughtPrimitiveTool: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
  status,
}) => {
  const toolActivityLabels = useContext(ToolActivityLabelsContext);
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

  const badgeStatus: "running" | "complete" | "error" =
    status?.type === "running"
      ? "running"
      : status?.type === "incomplete"
        ? "error"
        : "complete";
  const hasArgs = typeof argsText === "string" && argsText.length > 0;
  const hasSearchResults =
    searchResults != null &&
    (Boolean(searchResults.summary) || searchResults.sources.length > 0);
  const hasDetails = hasArgs || hasSearchResults || toolResult !== undefined;
  const disclosure = useContext(PrimitiveToolDisclosureContext);
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = disclosure ? disclosure.open : localOpen;

  useEffect(() => {
    if (!disclosure) return;
    disclosure.setHasDetails(hasDetails);
    if (!hasDetails) {
      disclosure.setOpen(false);
      disclosure.setHovered(false);
    }
  }, [disclosure, hasDetails]);

  useEffect(() => {
    if (hasDetails) return;
    setLocalOpen(false);
  }, [hasDetails]);

  return (
    <Collapsible
      data-slot="chain-of-thought-tool-activity"
      open={isOpen}
      onOpenChange={(nextOpen: boolean) => {
        if (disclosure) {
          disclosure.setOpen(nextOpen);
          return;
        }
        setLocalOpen(nextOpen);
      }}
      className="space-y-1.5"
    >
      <CollapsibleTrigger
        data-slot="chain-of-thought-tool-activity-trigger"
        disabled={!hasDetails}
        onPointerEnter={() => disclosure?.setHovered(true)}
        onPointerLeave={() => disclosure?.setHovered(false)}
        onFocus={() => disclosure?.setHovered(true)}
        onBlur={() => disclosure?.setHovered(false)}
        className={cn(
          "group/tool-activity-trigger -mt-0.5 flex w-full min-w-0 items-center gap-1.5 text-left text-sm leading-relaxed",
          hasDetails
            ? "text-muted-foreground transition-colors hover:text-foreground"
            : "cursor-default text-muted-foreground/80",
        )}
      >
        {activityLabel ? (
          <div
            data-slot="chain-of-thought-tool-activity-label"
            className={cn(
              "min-w-0 max-w-[52ch] shrink truncate font-medium text-foreground leading-5",
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
      </CollapsibleTrigger>
      {hasDetails ? (
        <CollapsibleContent
          data-slot="chain-of-thought-tool-activity-content-wrapper"
          className={cn(
            "overflow-hidden outline-none",
            "data-[state=open]:animate-collapsible-down",
            "data-[state=open]:duration-(--animation-duration)",
            "data-[state=open]:ease-(--spring-easing)",
            "data-[state=closed]:animate-collapsible-up",
            "data-[state=closed]:duration-[calc(var(--animation-duration)*0.75)]",
            "data-[state=closed]:ease-(--ease-out-expo)",
            "data-[state=closed]:fill-mode-forwards",
            "data-[state=closed]:pointer-events-none",
          )}
        >
          <div
            data-slot="chain-of-thought-tool-activity-content"
            className="space-y-1.5 pt-0.5 pl-[22px]"
          >
            {argsText ? (
              <pre className="whitespace-pre-wrap rounded-md bg-muted/40 px-2 py-1 text-muted-foreground/80 text-xs">
                {argsText}
              </pre>
            ) : null}
            {hasSearchResults && searchResults ? (
              <div
                data-slot="chain-of-thought-search-results"
                className="space-y-2 rounded-md bg-muted/40 px-2 py-2"
              >
                {searchResults.summary ? (
                  <p className="text-muted-foreground/90 text-xs">
                    {searchResults.summary}
                  </p>
                ) : null}
                {searchResults.sources.length > 0 ? (
                  <ul className="space-y-1 text-xs">
                    {searchResults.sources.map((source) => (
                      <li key={source}>
                        <span className="text-muted-foreground/80">
                          {formatSearchSourceLabel(source)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : toolResult !== undefined ? (
              <pre className="whitespace-pre-wrap rounded-md bg-muted/40 px-2 py-1 text-muted-foreground/80 text-xs">
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
};
