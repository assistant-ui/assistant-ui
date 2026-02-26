"use client";

import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
  useMemo,
} from "react";
import { MessagePrimitive, useAuiState } from "@assistant-ui/react";
import { ChainOfThoughtTimeline } from "./layout";
import {
  ChainOfThoughtStep,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepHeader,
} from "./step";
import {
  defaultInferStep,
  groupMessagePartsByParentId,
  type ChainOfThoughtTracePartsProps,
} from "./trace-shared";

type ChainOfThoughtTraceContextValue = {
  inferStep: NonNullable<ChainOfThoughtTracePartsProps["inferStep"]>;
  getStepIndex: (indices: number[]) => number | undefined;
};

const ChainOfThoughtTraceContext =
  createContext<ChainOfThoughtTraceContextValue | null>(null);

function ChainOfThoughtTracePartsGroup({
  groupKey,
  indices,
  children,
}: {
  groupKey: string | undefined;
  indices: number[];
  children?: ReactNode;
}) {
  const context = useContext(ChainOfThoughtTraceContext);
  const inferStep = context?.inferStep ?? defaultInferStep;
  const stepIndex = useMemo(
    () => context?.getStepIndex(indices),
    [indices, context],
  );

  const messageParts = useAuiState(({ message }) => message.parts);
  const isRunning = useAuiState(
    ({ message }) => message.status?.type === "running",
  );

  const groupParts = useMemo(() => {
    return indices
      .map((i) => messageParts[i])
      .filter((part): part is (typeof messageParts)[number] => Boolean(part));
  }, [indices, messageParts]);

  const lastIndex = messageParts.length - 1;
  const isActive = isRunning && lastIndex >= 0 && indices.includes(lastIndex);

  const meta = useMemo(
    () =>
      inferStep({
        groupKey,
        indices,
        parts: groupParts,
        isActive,
      }),
    [inferStep, groupKey, indices, groupParts, isActive],
  );

  return (
    <ChainOfThoughtStep
      active={isActive}
      style={
        stepIndex !== undefined
          ? ({ "--step-index": stepIndex } as CSSProperties)
          : undefined
      }
      {...(meta.type ? { type: meta.type } : {})}
      {...(meta.status ? { status: meta.status } : {})}
      {...(meta.stepLabel !== undefined ? { stepLabel: meta.stepLabel } : {})}
      {...(meta.icon !== undefined ? { icon: meta.icon } : {})}
    >
      {meta.label !== undefined ? (
        <ChainOfThoughtStepHeader>{meta.label}</ChainOfThoughtStepHeader>
      ) : null}
      <ChainOfThoughtStepBody>{children}</ChainOfThoughtStepBody>
    </ChainOfThoughtStep>
  );
}

export function ChainOfThoughtTraceParts({
  className,
  groupingFunction = groupMessagePartsByParentId,
  components,
  inferStep = defaultInferStep,
  ...timelineProps
}: ChainOfThoughtTracePartsProps) {
  const messageParts = useAuiState(({ message }) => message.parts);
  const groups = useMemo(
    () => (messageParts.length === 0 ? [] : groupingFunction(messageParts)),
    [groupingFunction, messageParts],
  );
  const groupIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [index, group] of groups.entries()) {
      map.set(group.indices.join("|"), index);
    }
    return map;
  }, [groups]);

  const contextValue = useMemo(
    () => ({
      inferStep,
      getStepIndex: (indices: number[]) => groupIndexMap.get(indices.join("|")),
    }),
    [inferStep, groupIndexMap],
  );

  const groupedComponents = useMemo(
    () => ({
      ...components,
      Group: ChainOfThoughtTracePartsGroup,
    }),
    [components],
  );

  const renderedGroups = useMemo(() => {
    if (messageParts.length === 0) {
      return (
        <MessagePrimitive.Unstable_PartsGrouped
          groupingFunction={groupingFunction}
          components={groupedComponents}
        />
      );
    }

    const GroupComponent =
      groupedComponents?.Group ?? ChainOfThoughtTracePartsGroup;

    return groups.map((group, groupIndex) => (
      <GroupComponent
        key={`group-${groupIndex}-${group.groupKey ?? "ungrouped"}`}
        groupKey={group.groupKey}
        indices={group.indices}
      >
        {group.indices.map((partIndex) => (
          <MessagePrimitive.PartByIndex
            key={partIndex}
            index={partIndex}
            components={groupedComponents}
          />
        ))}
      </GroupComponent>
    ));
  }, [groupedComponents, groupingFunction, groups, messageParts.length]);

  return (
    <ChainOfThoughtTraceContext.Provider value={contextValue}>
      <ChainOfThoughtTimeline className={className} {...timelineProps}>
        {renderedGroups}
      </ChainOfThoughtTimeline>
    </ChainOfThoughtTraceContext.Provider>
  );
}
