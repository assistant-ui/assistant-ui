"use client";

import { BotIcon, ChevronDownIcon } from "lucide-react";
import {
  type CSSProperties,
  type ComponentType,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Collapsible } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChainOfThoughtContent } from "./disclosure";
import { ChainOfThoughtTimeline } from "./layout";
import { Crossfade } from "./crossfade";
import { STEP_ICON_CLASS } from "./styles";
import { stepTypeIcons, type TraceGroup, type TraceNode } from "./model";
import {
  BulletDot,
  ChainOfThoughtStep,
  ChainOfThoughtStepBody,
  ChainOfThoughtToolBadge,
} from "./step";
import {
  getLatestTraceStep,
  mapTraceStatusToStepStatus,
  mapTraceStatusToToolBadge,
  type ChainOfThoughtTraceGroupSummaryProps,
  type ChainOfThoughtTraceNodeComponents,
} from "./trace-shared";

const DefaultTraceGroupSummary: ComponentType<
  ChainOfThoughtTraceGroupSummaryProps
> = ({ group, latestStep, isOpen, canExpand, onToggle }) => {
  const toolName = group.summary?.toolName ?? latestStep?.toolName;
  const badgeStatus = mapTraceStatusToToolBadge(
    latestStep?.status ?? group.status,
  );

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!canExpand}
      data-slot="chain-of-thought-trace-group-summary"
      data-variant={group.variant ?? "default"}
      className={cn(
        "aui-chain-of-thought-trace-group-summary group/trace-summary w-full text-left",
        "rounded-md px-0 py-0 transition-colors",
        "disabled:cursor-default",
      )}
      aria-expanded={isOpen}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">{group.label}</span>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground">
          {toolName ? (
            <span className="inline-flex h-5 shrink-0 items-center">
              <ChainOfThoughtToolBadge
                toolName={toolName}
                status={badgeStatus}
                showIcon={false}
              />
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
};

function useTraceGroupState(allowGroupExpand: boolean) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!allowGroupExpand) setIsOpen(false);
  }, [allowGroupExpand]);

  return { isOpen, setIsOpen };
}

export function ChainOfThoughtTraceGroupNode({
  group,
  depth,
  maxDepth,
  nodeComponents,
  allowGroupExpand,
  renderNode,
  style,
  className,
}: {
  group: TraceGroup;
  depth: number;
  maxDepth: number;
  nodeComponents?: ChainOfThoughtTraceNodeComponents;
  allowGroupExpand: boolean;
  renderNode: (node: TraceNode, index: number, depth: number) => ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const { isOpen, setIsOpen } = useTraceGroupState(allowGroupExpand);
  const latestStep = useMemo(() => getLatestTraceStep(group), [group]);
  const canExpand =
    allowGroupExpand && depth < maxDepth && group.children.length > 0;
  const GroupSummary = nodeComponents?.GroupSummary ?? DefaultTraceGroupSummary;
  const isSubagent = group.variant === "subagent";

  const [isSummaryHovered, setIsSummaryHovered] = useState(false);

  const groupStatus = group.status ?? latestStep?.status;
  const type =
    group.summary?.latestType ??
    latestStep?.type ??
    (latestStep?.toolName ? "tool" : "default");
  const icon = canExpand ? (
    isSubagent ? (
      <Crossfade
        value={isSummaryHovered ? "chevron" : "bot"}
        exitDuration={120}
        enterDuration={150}
        enterDelay={30}
        className="size-4 items-center justify-center"
      >
        {(value) =>
          value === "chevron" ? (
            <ChevronDownIcon
              aria-hidden
              className={cn(
                "size-4 text-muted-foreground",
                isOpen ? "rotate-0" : "-rotate-90",
              )}
            />
          ) : (
            <BotIcon
              aria-hidden
              className={cn(
                "size-4",
                groupStatus === "running" &&
                  "animate-pulse [animation-duration:1.5s] motion-reduce:animate-none",
              )}
            />
          )
        }
      </Crossfade>
    ) : (
      <ChevronDownIcon
        aria-hidden
        className={cn(
          STEP_ICON_CLASS,
          "text-muted-foreground transition-transform duration-150 ease-out",
          isOpen ? "rotate-0" : "-rotate-90",
        )}
      />
    )
  ) : (
    (() => {
      if (isSubagent) return <BotIcon className={STEP_ICON_CLASS} />;
      const TypeIcon = stepTypeIcons[type];
      if (TypeIcon === null) return <BulletDot />;
      if (!TypeIcon) return <BulletDot />;
      return <TypeIcon className={STEP_ICON_CLASS} />;
    })()
  );
  const indicatorType = isSubagent ? "default" : type;

  return (
    <ChainOfThoughtStep
      data-role="trace-group"
      data-variant={group.variant ?? "default"}
      status={mapTraceStatusToStepStatus(groupStatus)}
      active={groupStatus === "running"}
      type={indicatorType}
      icon={icon}
      iconPulse={!(isSubagent && canExpand)}
      className={className}
      style={style}
    >
      <ChainOfThoughtStepBody>
        <div
          onPointerEnter={() => setIsSummaryHovered(true)}
          onPointerLeave={() => setIsSummaryHovered(false)}
        >
          <GroupSummary
            group={group}
            {...(latestStep != null ? { latestStep } : {})}
            isOpen={isOpen}
            canExpand={canExpand}
            depth={depth}
            onToggle={() => {
              if (!canExpand) return;
              setIsOpen((prev) => !prev);
            }}
          />
        </div>
        <Collapsible open={isOpen && canExpand} onOpenChange={setIsOpen}>
          <ChainOfThoughtContent className="mt-1">
            <ChainOfThoughtTimeline
              autoScroll={false}
              constrainHeight={false}
              style={
                {
                  "--step-stagger-delay": "24ms",
                } as CSSProperties
              }
            >
              {group.children.map((node, i) => renderNode(node, i, depth + 1))}
            </ChainOfThoughtTimeline>
          </ChainOfThoughtContent>
        </Collapsible>
      </ChainOfThoughtStepBody>
    </ChainOfThoughtStep>
  );
}
