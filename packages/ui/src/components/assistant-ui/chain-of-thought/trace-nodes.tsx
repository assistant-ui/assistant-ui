"use client";

import { BotIcon, ChevronDownIcon } from "lucide-react";
import {
  createContext,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Collapsible } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  BulletDot,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepHeader,
  ChainOfThoughtTimeline,
  ChainOfThoughtToolBadge,
  Crossfade,
  STEP_ICON_CLASS,
  stepTypeIcons,
  type TraceGroup,
  type TraceNode,
  type TraceStep,
} from "./core";
import {
  getLatestTraceStep,
  getTraceStepLabel,
  isRecord,
  isTraceGroup,
  mapTraceStatusToStepStatus,
  mapTraceStatusToToolBadge,
  type ChainOfThoughtTraceGroupSummaryProps,
  type ChainOfThoughtTraceNodeComponents,
  type ChainOfThoughtTraceNodesProps,
} from "./trace-shared";

type TraceTreeConfig = {
  maxDepth: number;
  nodeComponents?: ChainOfThoughtTraceNodeComponents;
  allowGroupExpand: boolean;
};

const TraceTreeConfigContext = createContext<TraceTreeConfig>({
  maxDepth: 2,
  allowGroupExpand: true,
});

const TraceDepthContext = createContext(0);

const DefaultTraceStepBody: NonNullable<
  ChainOfThoughtTraceNodeComponents["StepBody"]
> = ({ step }) => {
  const output = (() => {
    if (step.output == null) return null;
    if (isRecord(step.output) && "content" in step.output) {
      return step.output.content as ReactNode;
    }
    return step.output as ReactNode;
  })();

  if (output == null && step.detail == null) return null;

  return (
    <ChainOfThoughtStepBody className="space-y-1">
      {output != null ? (
        <div className="text-muted-foreground/80 text-sm">{output}</div>
      ) : null}
      {step.detail != null ? <div>{step.detail}</div> : null}
    </ChainOfThoughtStepBody>
  );
};

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

function ChainOfThoughtTraceStepNode({
  step,
  style,
  className,
}: {
  step: TraceStep;
  style?: CSSProperties;
  className?: string;
}) {
  const { nodeComponents } = useContext(TraceTreeConfigContext);
  const StepBody = nodeComponents?.StepBody ?? DefaultTraceStepBody;
  const label = getTraceStepLabel(step);
  const status = mapTraceStatusToStepStatus(step.status);
  const type = step.type ?? (step.toolName ? "tool" : "default");
  const isActive = step.status === "running";
  const isTextType = type === "text";
  const isMonologue = isTextType && !step.toolName;

  const toolBadge = step.toolName ? (
    <span className="inline-flex h-5 shrink-0 items-center">
      <ChainOfThoughtToolBadge
        toolName={step.toolName}
        status={mapTraceStatusToToolBadge(step.status)}
        showIcon={false}
        className="min-w-0 max-w-[7rem]"
      />
    </span>
  ) : null;

  const showHeader = !isMonologue && (label !== undefined || toolBadge);

  return (
    <ChainOfThoughtStep
      data-role="trace-step"
      status={status}
      active={isActive}
      type={isMonologue ? "default" : type}
      className={className}
      style={style}
    >
      {showHeader ? (
        <ChainOfThoughtStepHeader className="flex items-center gap-2">
          {label !== undefined ? <span>{label}</span> : null}
          {toolBadge}
        </ChainOfThoughtStepHeader>
      ) : null}
      <StepBody step={step} />
    </ChainOfThoughtStep>
  );
}

function ChainOfThoughtTraceNode({
  node,
  style,
  className,
}: {
  node: TraceNode;
  style?: CSSProperties;
  className?: string;
}) {
  if (isTraceGroup(node)) {
    return (
      <ChainOfThoughtTraceGroupNode
        group={node}
        {...(style != null ? { style } : {})}
        {...(className != null ? { className } : {})}
      />
    );
  }

  return (
    <ChainOfThoughtTraceStepNode
      step={node}
      {...(style != null ? { style } : {})}
      {...(className != null ? { className } : {})}
    />
  );
}

function useTraceGroupState(allowGroupExpand: boolean) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!allowGroupExpand) setIsOpen(false);
  }, [allowGroupExpand]);

  return { isOpen, setIsOpen };
}

function ChainOfThoughtTraceGroupNode({
  group,
  style,
  className,
}: {
  group: TraceGroup;
  style?: CSSProperties;
  className?: string;
}) {
  const depth = useContext(TraceDepthContext);
  const { maxDepth, nodeComponents, allowGroupExpand } = useContext(
    TraceTreeConfigContext,
  );
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
            <TraceDepthContext.Provider value={depth + 1}>
              <ChainOfThoughtTimeline
                autoScroll={false}
                constrainHeight={false}
                style={
                  {
                    "--step-stagger-delay": "24ms",
                  } as CSSProperties
                }
              >
                {group.children.map((node, i) => (
                  <ChainOfThoughtTraceNode
                    key={node.id}
                    node={node}
                    style={{ "--step-index": i } as CSSProperties}
                  />
                ))}
              </ChainOfThoughtTimeline>
            </TraceDepthContext.Provider>
          </ChainOfThoughtContent>
        </Collapsible>
      </ChainOfThoughtStepBody>
    </ChainOfThoughtStep>
  );
}

export function ChainOfThoughtTraceNodes({
  className,
  trace,
  maxDepth = 2,
  nodeComponents,
  constrainHeight = true,
  allowGroupExpand = true,
  ...timelineProps
}: ChainOfThoughtTraceNodesProps) {
  const treeConfig = useMemo<TraceTreeConfig>(
    () => ({
      maxDepth,
      ...(nodeComponents != null ? { nodeComponents } : {}),
      allowGroupExpand,
    }),
    [maxDepth, nodeComponents, allowGroupExpand],
  );

  return (
    <TraceTreeConfigContext.Provider value={treeConfig}>
      <TraceDepthContext.Provider value={0}>
        <ChainOfThoughtTimeline
          className={className}
          constrainHeight={constrainHeight}
          {...timelineProps}
        >
          {trace.map((node, i) => (
            <ChainOfThoughtTraceNode
              key={node.id}
              node={node}
              style={{ "--step-index": i } as CSSProperties}
            />
          ))}
        </ChainOfThoughtTimeline>
      </TraceDepthContext.Provider>
    </TraceTreeConfigContext.Provider>
  );
}
