"use client";

import { ChevronDownIcon } from "lucide-react";
import {
  type FC,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuiState } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { Crossfade } from "./crossfade";
import type { ChainOfThoughtPhase, StepType } from "./model";
import {
  inferStepTypeFromTool,
  isMessageStatusStreaming,
  mapPartStatusToStepStatus,
} from "./runtime-activity";
import {
  PrimitiveToolDisclosureContext,
  type PrimitiveToolDisclosureContextValue,
} from "./runtime-tool";
import {
  ChainOfThoughtStep,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepHeader,
  renderStepTypeBaseIcon as renderBaseStepTypeIcon,
} from "./step";

export const ChainOfThoughtPrimitivePartLayout: FC<
  PropsWithChildren<{ partIndex?: number }>
> = ({ children, partIndex }) => {
  const part = useAuiState((s) => s.part);
  if (part.type !== "tool-call" && part.type !== "reasoning") {
    return <>{children}</>;
  }

  const statusType = part.status?.type;
  const messageStatusType = useAuiState((s) => s.message.status?.type);
  const isStreamingFromMessage = isMessageStatusStreaming(messageStatusType);
  const isLastPartInGroup = useAuiState((s) => {
    const parts = s.chainOfThought.parts;
    if (partIndex != null) {
      return partIndex === parts.length - 1;
    }
    const lastPart = parts[parts.length - 1];
    return Object.is(s.part, lastPart);
  });
  const isToolCall = part.type === "tool-call";
  const toolName = isToolCall ? part.toolName : undefined;
  const stepType: StepType = isToolCall
    ? inferStepTypeFromTool(toolName ?? "tool")
    : "default";
  const isActive =
    statusType === "running" ||
    statusType === "requires-action" ||
    (isStreamingFromMessage && isLastPartInGroup);
  const mappedStepStatus = mapPartStatusToStepStatus(statusType);
  const [toolDisclosureHasDetails, setToolDisclosureHasDetails] =
    useState(false);
  const [toolDisclosureOpen, setToolDisclosureOpen] = useState(false);
  const [toolDisclosureHovered, setToolDisclosureHovered] = useState(false);

  useEffect(() => {
    if (!isToolCall) {
      setToolDisclosureHasDetails(false);
      setToolDisclosureOpen(false);
      setToolDisclosureHovered(false);
    }
  }, [isToolCall]);

  useEffect(() => {
    if (!toolDisclosureHasDetails) {
      setToolDisclosureOpen(false);
      setToolDisclosureHovered(false);
    }
  }, [toolDisclosureHasDetails]);

  const disclosureContextValue =
    useMemo<PrimitiveToolDisclosureContextValue | null>(
      () =>
        isToolCall
          ? {
              setHasDetails: setToolDisclosureHasDetails,
              open: toolDisclosureOpen,
              setOpen: setToolDisclosureOpen,
              setHovered: setToolDisclosureHovered,
            }
          : null,
      [isToolCall, toolDisclosureOpen],
    );

  const disclosureIcon = useMemo(() => {
    if (!isToolCall || !toolDisclosureHasDetails) return undefined;
    const baseIcon = renderBaseStepTypeIcon(stepType);
    return (
      <Crossfade
        value={toolDisclosureOpen || toolDisclosureHovered ? "chevron" : "icon"}
        exitDuration={120}
        enterDuration={150}
        enterDelay={30}
        className="size-4 items-center justify-center"
      >
        {(value) =>
          value === "chevron" ? (
            <ChevronDownIcon
              data-slot="chain-of-thought-step-disclosure-chevron"
              aria-hidden
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-150 ease-out",
                toolDisclosureOpen ? "rotate-0" : "-rotate-90",
              )}
            />
          ) : (
            <span data-slot="chain-of-thought-step-disclosure-icon">
              {baseIcon}
            </span>
          )
        }
      </Crossfade>
    );
  }, [
    isToolCall,
    stepType,
    toolDisclosureHasDetails,
    toolDisclosureHovered,
    toolDisclosureOpen,
  ]);

  return (
    <PrimitiveToolDisclosureContext.Provider value={disclosureContextValue}>
      <ChainOfThoughtStep
        status={mappedStepStatus}
        active={isActive}
        type={stepType}
        {...(disclosureIcon ? { icon: disclosureIcon, iconPulse: false } : {})}
      >
        <ChainOfThoughtStepBody>{children}</ChainOfThoughtStepBody>
      </ChainOfThoughtStep>
    </PrimitiveToolDisclosureContext.Provider>
  );
};

export function ChainOfThoughtTerminalStep({
  phase,
  elapsedSeconds,
}: {
  phase: ChainOfThoughtPhase;
  elapsedSeconds?: number;
}) {
  const isIncomplete = phase === "incomplete";
  const label = isIncomplete
    ? elapsedSeconds
      ? `Stopped after ${elapsedSeconds}s`
      : "Stopped"
    : elapsedSeconds
      ? `Done in ${elapsedSeconds}s`
      : "Done";

  return (
    <ChainOfThoughtStep
      status={isIncomplete ? "error" : "complete"}
      type={isIncomplete ? "error" : "complete"}
    >
      <ChainOfThoughtStepHeader data-slot="chain-of-thought-terminal-step-label">
        {label}
      </ChainOfThoughtStepHeader>
    </ChainOfThoughtStep>
  );
}
