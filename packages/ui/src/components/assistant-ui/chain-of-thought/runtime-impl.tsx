"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChainOfThoughtPrimitive,
  useAui,
  useAuiState,
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
import type { ChainOfThoughtPhase } from "./model";
import {
  ToolActivityLabelsContext,
  deriveCollapsedActivity,
  findLastReasoningOrToolPart,
  inferToolActivityStatusType,
  isMessageStatusStreaming,
  partStatusOrFallback,
  type ToolActivity,
} from "./runtime-activity";
import {
  ChainOfThoughtPrimitivePartLayout,
  ChainOfThoughtTerminalStep,
} from "./runtime-steps";
import { ChainOfThoughtPrimitiveTool } from "./runtime-tool";
import { useElapsedSeconds } from "./trace-time";

export type ChainOfThoughtProps = {
  constrainHeight?: boolean;
  toolActivityLabels?: Record<string, ToolActivity>;
  renderTriggerContent?: ChainOfThoughtTriggerProps["renderTriggerContent"];
  autoCollapseOnComplete?: boolean;
  variant?: ChainOfThoughtRootProps["variant"];
};

export const ChainOfThoughtImpl = ({
  constrainHeight = false,
  toolActivityLabels,
  renderTriggerContent,
  autoCollapseOnComplete = true,
  variant = "ghost",
}: ChainOfThoughtProps = {}) => {
  const aui = useAui();
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
  const partsLength = useAuiState((s) => s.chainOfThought.parts.length);
  const registeredToolActivity = useAuiState((s) =>
    "tools" in s
      ? (
          s.tools as {
            toolActivities?: Record<string, ToolActivity>;
          }
        ).toolActivities
      : undefined,
  );
  const mergedToolActivityLabels = useMemo(() => {
    if (!registeredToolActivity && !toolActivityLabels) return undefined;
    return {
      ...(registeredToolActivity ?? {}),
      ...(toolActivityLabels ?? {}),
    };
  }, [registeredToolActivity, toolActivityLabels]);

  const collapsedActivity = useAuiState((s) =>
    deriveCollapsedActivity({
      parts: s.chainOfThought.parts,
      chainStatusType: s.chainOfThought.status.type,
      messageStatusType: s.message.status?.type,
      toolActivityLabels: mergedToolActivityLabels,
    }),
  );

  const isChainStreaming = useAuiState((s) => {
    const chainStatusType = s.chainOfThought.status.type;
    if (isMessageStatusStreaming(chainStatusType)) return true;
    const messageStatusType = s.message.status?.type;

    const parts = s.chainOfThought.parts;
    if (parts.some((part) => isMessageStatusStreaming(part.status?.type))) {
      return true;
    }
    if (!isMessageStatusStreaming(messageStatusType)) return false;

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

  const phase: ChainOfThoughtPhase =
    partsLength === 0
      ? "idle"
      : hasRequiresAction
        ? "requires-action"
        : isChainStreaming
          ? "running"
          : hasIncomplete
            ? "incomplete"
            : "complete";
  const isActivePhase = phase === "running" || phase === "requires-action";
  const elapsedSeconds = useElapsedSeconds(isActivePhase);
  const [streamingOpenOverride, setStreamingOpenOverride] = useState(false);
  const wasStreamingRef = useRef(isChainStreaming);

  useEffect(() => {
    if (isChainStreaming) {
      setStreamingOpenOverride(true);
    } else if (!isChainStreaming && wasStreamingRef.current) {
      if (!autoCollapseOnComplete) {
        wasStreamingRef.current = isChainStreaming;
        return;
      }
      setStreamingOpenOverride(false);
    }

    wasStreamingRef.current = isChainStreaming;
  }, [autoCollapseOnComplete, isChainStreaming]);

  const open = !collapsed || streamingOpenOverride;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setStreamingOpenOverride(false);
      }
      aui.chainOfThought().setCollapsed(!nextOpen);
    },
    [aui],
  );

  return (
    <ChainOfThoughtRoot
      open={open}
      onOpenChange={handleOpenChange}
      {...(variant ? { variant } : {})}
    >
      <ChainOfThoughtTrigger
        phase={phase}
        isOpen={open}
        {...(collapsedActivity ? { activityLabel: collapsedActivity } : {})}
        {...(elapsedSeconds !== undefined ? { elapsedSeconds } : {})}
        {...(renderTriggerContent ? { renderTriggerContent } : {})}
      />
      <ChainOfThoughtContent aria-busy={isChainStreaming}>
        {partsLength > 0 ? (
          <ChainOfThoughtTimeline
            autoScroll={isChainStreaming}
            autoScrollKey={partsLength}
            autoScrollBehavior="smooth"
            constrainHeight={constrainHeight}
          >
            <ToolActivityLabelsContext.Provider
              value={mergedToolActivityLabels}
            >
              <ChainOfThoughtPrimitive.Parts
                components={{
                  Reasoning: MarkdownText,
                  tools: { Fallback: ChainOfThoughtPrimitiveTool },
                  Layout: ChainOfThoughtPrimitivePartLayout,
                }}
              />
              {(phase === "complete" || phase === "incomplete") && (
                <ChainOfThoughtTerminalStep
                  phase={phase}
                  {...(elapsedSeconds !== undefined ? { elapsedSeconds } : {})}
                />
              )}
            </ToolActivityLabelsContext.Provider>
          </ChainOfThoughtTimeline>
        ) : (
          <ChainOfThoughtPlaceholder />
        )}
      </ChainOfThoughtContent>
    </ChainOfThoughtRoot>
  );
};
