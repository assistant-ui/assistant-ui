"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ChainOfThoughtPrimitive,
  useAui,
  useAuiState,
  type PartState,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  ChainOfThoughtContent,
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
  type ChainOfThoughtRootProps,
  type ChainOfThoughtTriggerProps,
} from "./disclosure";
import { ChainOfThoughtPlaceholder, ChainOfThoughtTimeline } from "./layout";
import { derivePhase, type ChainOfThoughtPhase } from "./model";
import {
  deriveCollapsedActivity,
  findLastReasoningOrToolPart,
  inferToolActivityStatusType,
  isCollapsedActivityReasoning,
  isMessageStatusStreaming,
  partStatusOrFallback,
  type ToolActivity,
} from "./runtime-activity";
import {
  ChainOfThoughtPrimitivePartLayout,
  ChainOfThoughtTerminalStep,
} from "./runtime-part-layout";
import { ChainOfThoughtPrimitiveToolWithLabels } from "./runtime-tool";
import { ToolActivityLabelsContext } from "./runtime-tool-context";
import { useElapsedSeconds } from "./trace-time";
import {
  ChainOfThoughtStringsContext,
  mergeChainOfThoughtStrings,
  type ChainOfThoughtStrings,
} from "./strings";

const ChainOfThoughtRuntimePart = memo(function ChainOfThoughtRuntimePart({
  part,
}: {
  part: PartState;
}) {
  const aui = useAui();
  const Tool = useAuiState<ToolCallMessagePartComponent | null>((s) =>
    part.type === "tool-call"
      ? (s.tools.toolUIs[part.toolName]?.[0]?.render ??
        ChainOfThoughtPrimitiveToolWithLabels)
      : null,
  );

  if (part.type === "reasoning") {
    return (
      <ChainOfThoughtPrimitivePartLayout>
        <MarkdownText />
      </ChainOfThoughtPrimitivePartLayout>
    );
  }

  if (part.type === "tool-call" && Tool) {
    return (
      <ChainOfThoughtPrimitivePartLayout>
        <Tool
          {...part}
          addResult={aui.part().addToolResult}
          resume={aui.part().resumeToolCall}
          respondToApproval={aui.part().respondToToolApproval}
        />
      </ChainOfThoughtPrimitivePartLayout>
    );
  }

  return null;
});

const renderChainOfThoughtRuntimePart = ({ part }: { part: PartState }) => {
  return <ChainOfThoughtRuntimePart part={part} />;
};

type ChainOfThoughtRuntimeTimelineProps = {
  partsLength: number;
  isChainStreaming: boolean;
  constrainHeight: boolean;
  phase: ChainOfThoughtPhase;
  terminalElapsedSeconds?: number | undefined;
  toolActivityLabels?: Record<string, ToolActivity> | undefined;
};

const ChainOfThoughtRuntimeTimeline = memo(
  function ChainOfThoughtRuntimeTimeline({
    partsLength,
    isChainStreaming,
    constrainHeight,
    phase,
    terminalElapsedSeconds,
    toolActivityLabels,
  }: ChainOfThoughtRuntimeTimelineProps) {
    if (partsLength === 0) {
      return <ChainOfThoughtPlaceholder />;
    }

    return (
      <ChainOfThoughtTimeline
        autoScroll={isChainStreaming}
        autoScrollKey={partsLength}
        autoScrollBehavior="smooth"
        constrainHeight={constrainHeight}
      >
        <ToolActivityLabelsContext.Provider value={toolActivityLabels}>
          <ChainOfThoughtPrimitive.Parts>
            {renderChainOfThoughtRuntimePart}
          </ChainOfThoughtPrimitive.Parts>
          {(phase === "complete" || phase === "incomplete") && (
            <ChainOfThoughtTerminalStep
              phase={phase}
              {...(terminalElapsedSeconds !== undefined
                ? { elapsedSeconds: terminalElapsedSeconds }
                : {})}
            />
          )}
        </ToolActivityLabelsContext.Provider>
      </ChainOfThoughtTimeline>
    );
  },
);

export type ChainOfThoughtProps = {
  constrainHeight?: boolean | undefined;
  toolActivityLabels?: Record<string, ToolActivity> | undefined;
  renderTriggerContent?: ChainOfThoughtTriggerProps["renderTriggerContent"];
  autoCollapseOnComplete?: boolean | undefined;
  variant?: ChainOfThoughtRootProps["variant"] | undefined;
  strings?: Partial<ChainOfThoughtStrings> | undefined;
};

export const ChainOfThoughtImpl = ({
  constrainHeight = false,
  toolActivityLabels,
  renderTriggerContent,
  autoCollapseOnComplete = true,
  variant = "ghost",
  strings: stringsProp,
}: ChainOfThoughtProps = {}) => {
  const aui = useAui();
  const rootRef = useRef<HTMLDivElement>(null);
  const strings = useMemo(
    () => mergeChainOfThoughtStrings(stringsProp),
    [stringsProp],
  );
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
  const partsLength = useAuiState((s) => s.chainOfThought.parts.length);

  const collapsedActivity = useAuiState((s) =>
    deriveCollapsedActivity({
      parts: s.chainOfThought.parts,
      chainStatusType: s.chainOfThought.status.type,
      messageStatusType: s.message.status?.type,
      toolActivityLabels,
      reasoningActivity: strings.reasoningActivity,
    }),
  );
  const collapsedActivityIsReasoning = useAuiState((s) =>
    isCollapsedActivityReasoning(s.chainOfThought.parts),
  );

  const isChainStreaming = useAuiState((s) => {
    const chainStatusType = s.chainOfThought.status.type;
    if (isMessageStatusStreaming(chainStatusType)) return true;
    const messageStatusType = s.message.status?.type;
    // Finished messages override stale running part status.
    if (!isMessageStatusStreaming(messageStatusType)) return false;

    const parts = s.chainOfThought.parts;
    if (parts.some((part) => isMessageStatusStreaming(part.status?.type))) {
      return true;
    }

    const lastPart = findLastReasoningOrToolPart(parts);
    if (!lastPart) return false;
    if (lastPart.type === "reasoning") return true;

    const lastPartStatusType = partStatusOrFallback(
      lastPart.status?.type,
      chainStatusType,
      messageStatusType,
    );
    const inferredStatusType = inferToolActivityStatusType(
      lastPart,
      lastPartStatusType,
      messageStatusType,
    );
    return isMessageStatusStreaming(inferredStatusType);
  });

  const hasRequiresAction = useAuiState((s) => {
    const chainStatusType = s.chainOfThought.status.type;
    if (chainStatusType === "requires-action") return true;
    const messageStatusType = s.message.status?.type;
    if (messageStatusType === "requires-action") return true;
    const parts = s.chainOfThought.parts;
    return parts.some((part) => part.status?.type === "requires-action");
  });

  const hasIncomplete = useAuiState((s) => {
    const chainStatusType = s.chainOfThought.status.type;
    if (chainStatusType === "incomplete") return true;
    const messageStatusType = s.message.status?.type;
    if (messageStatusType === "incomplete") return true;
    const parts = s.chainOfThought.parts;
    return parts.some((part) => part.status?.type === "incomplete");
  });

  const phase = derivePhase({
    partsLength,
    isStreaming: isChainStreaming,
    hasRequiresAction,
    hasIncomplete,
  });
  const isActivePhase = phase === "running" || phase === "requires-action";
  const elapsedSeconds = useElapsedSeconds(isActivePhase);
  const terminalElapsedSeconds =
    phase === "complete" || phase === "incomplete" ? elapsedSeconds : undefined;
  // Preserve an auto-opened stream only when auto-collapse is disabled.
  const holdOpenAfterStreamingRef = useRef(
    isChainStreaming && !autoCollapseOnComplete,
  );
  if (autoCollapseOnComplete) {
    holdOpenAfterStreamingRef.current = false;
  } else if (isChainStreaming) {
    holdOpenAfterStreamingRef.current = true;
  }
  const wasStreamingRef = useRef(isChainStreaming);

  useEffect(() => {
    if (
      !isChainStreaming &&
      wasStreamingRef.current &&
      autoCollapseOnComplete
    ) {
      // Move focus out of content before auto-collapse unmounts it.
      const root = rootRef.current;
      const active = root?.ownerDocument.activeElement;
      if (root && active && active !== root.ownerDocument.body) {
        const content = root.querySelector<HTMLElement>(
          "[data-slot=chain-of-thought-content]",
        );
        if (content?.contains(active)) {
          root
            .querySelector<HTMLElement>("[data-slot=chain-of-thought-trigger]")
            ?.focus();
        }
      }
    }

    wasStreamingRef.current = isChainStreaming;
  }, [autoCollapseOnComplete, isChainStreaming]);

  const open =
    isChainStreaming || !collapsed || holdOpenAfterStreamingRef.current;

  // Keep reasoning announcements stable while tokens stream.
  const liveStatus =
    phase === "complete"
      ? strings.done(terminalElapsedSeconds)
      : phase === "incomplete"
        ? strings.stopped(terminalElapsedSeconds)
        : isActivePhase
          ? collapsedActivity && !collapsedActivityIsReasoning
            ? collapsedActivity
            : strings.thinking
          : "";

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        holdOpenAfterStreamingRef.current = false;
      }
      aui.chainOfThought().setCollapsed(!nextOpen);
    },
    [aui],
  );

  return (
    <ChainOfThoughtStringsContext.Provider value={strings}>
      <div ref={rootRef} className="contents">
        <output
          aria-live="polite"
          aria-atomic
          data-slot="chain-of-thought-live-status"
          className="sr-only"
        >
          {liveStatus}
        </output>
        <ChainOfThoughtRoot
          open={open}
          onOpenChange={handleOpenChange}
          {...(variant ? { variant } : {})}
        >
          <ChainOfThoughtTrigger
            phase={phase}
            isOpen={open}
            reasoningLabel={strings.reasoning}
            streamingLabel={strings.thinking}
            {...(collapsedActivity ? { activityLabel: collapsedActivity } : {})}
            {...(elapsedSeconds !== undefined ? { elapsedSeconds } : {})}
            {...(renderTriggerContent ? { renderTriggerContent } : {})}
          />
          <ChainOfThoughtContent aria-busy={isChainStreaming}>
            <ChainOfThoughtRuntimeTimeline
              partsLength={partsLength}
              isChainStreaming={isChainStreaming}
              constrainHeight={constrainHeight}
              phase={phase}
              {...(terminalElapsedSeconds !== undefined
                ? { terminalElapsedSeconds }
                : {})}
              {...(toolActivityLabels !== undefined
                ? { toolActivityLabels }
                : {})}
            />
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>
    </ChainOfThoughtStringsContext.Provider>
  );
};
