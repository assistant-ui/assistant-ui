import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { truncate } from "../../utils/common";
import { StatusBadge } from "../message";
import type { MessagePreview, PartPreview } from "../message";
import { messageStepCount } from "../message/MessageTimeline";
import { RoleLabel } from "../message/RoleLabel";
import {
  Chip,
  PaneHeader,
  PaneHeaderStack,
  RailTime,
  RAIL_STATUS_BADGE_CLASS,
  SelectableRow,
  Sparkline,
  ToneBadge,
} from "../ui";
import type { ComposerPreview, ThreadPreview } from "./types";

interface MetricSeries {
  label: string;
  values: number[];
  format: (value: number) => string;
}

export const messageNodeId = (id: string) => `msg:${id}`;

const formatTokens = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

const textOf = (parts: readonly PartPreview[]) =>
  parts
    .filter(
      (part): part is Extract<PartPreview, { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();

const rowSummary = (message: MessagePreview) => {
  const text = textOf(message.parts);
  if (text) return truncate(text, 72);
  const tool = message.parts.find(
    (part): part is Extract<PartPreview, { type: "tool-call" }> =>
      part.type === "tool-call",
  );
  if (tool) return tool.toolName;
  return "—";
};

const rowStepHint = (message: MessagePreview) => {
  const { tools, texts } = messageStepCount(message.parts);
  const hints: string[] = [];
  if (tools > 1) hints.push(`${tools} tools`);
  if (texts > 1) hints.push(`${texts} msgs`);
  return hints.length ? hints.join(" · ") : null;
};

const railStatus = (message: MessagePreview) => {
  if (message.isOptimistic) return null;
  if (!message.status || message.status.type === "complete") return null;
  return message.status;
};

const railAttachmentCount = (message: MessagePreview) => {
  if (message.attachments.length > 0) return message.attachments.length;
  return message.parts.filter(
    (part) =>
      part.type === "image" || part.type === "file" || part.type === "audio",
  ).length;
};

const TurnRow = memo(function TurnRow({
  message,
  selected,
  nodeId,
  onSelect,
  rowRef,
}: {
  message: MessagePreview;
  selected: boolean;
  nodeId: string;
  onSelect: (nodeId: string) => void;
  rowRef?: React.Ref<HTMLButtonElement> | undefined;
}) {
  const status = railStatus(message);
  const summary = rowSummary(message);
  const stepHint = rowStepHint(message);
  const attachmentCount = railAttachmentCount(message);

  return (
    <SelectableRow
      ref={rowRef}
      selected={selected}
      onSelect={() => onSelect(nodeId)}
      dense
    >
      <div
        className="flex h-10 flex-col justify-center gap-0.5"
        title={stepHint ? `${stepHint}\n${summary}` : summary}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <RoleLabel role={message.role} compact />
            {message.isOptimistic ? (
              <ToneBadge
                tone="amber"
                size="sm"
                className={RAIL_STATUS_BADGE_CLASS}
              >
                opt
              </ToneBadge>
            ) : status ? (
              <StatusBadge
                type={status.type}
                reason={"reason" in status ? status.reason : undefined}
                compact
                size="sm"
                className={RAIL_STATUS_BADGE_CLASS}
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {attachmentCount > 0 ? (
              <span
                className="text-muted-foreground text-[10px] leading-none"
                title={`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}
              >
                📎{attachmentCount}
              </span>
            ) : null}
            <RailTime value={message.createdAt} />
          </div>
        </div>
        <p className="text-foreground min-w-0 truncate text-[12px] leading-tight">
          {stepHint ? (
            <span className="text-muted-foreground">{stepHint} · </span>
          ) : null}
          {summary}
        </p>
      </div>
    </SelectableRow>
  );
});

const GhostComposer = ({ composer }: { composer: ComposerPreview }) => (
  <div className="border-border text-muted-foreground flex items-center gap-2 border-t px-3 py-2 text-[11px]">
    <span className="text-foreground font-medium">draft</span>
    <span>{composer.role ?? "user"}</span>
    <span>· {composer.textLength} chars</span>
    {composer.canSend ? <Chip>can send</Chip> : null}
    {composer.queue.length ? <Chip>{composer.queue.length} queued</Chip> : null}
  </div>
);

const collect = (
  messages: readonly MessagePreview[],
  pick: (message: MessagePreview) => number | undefined,
): number[] =>
  messages.map(pick).filter((value): value is number => value !== undefined);

const metricSeries = (messages: readonly MessagePreview[]): MetricSeries[] =>
  [
    {
      label: "tok/s",
      values: collect(messages, (message) => message.timing?.tokensPerSecond),
      format: (value: number) => value.toFixed(1),
    },
    {
      label: "TTFT",
      values: collect(messages, (message) =>
        message.timing?.firstTokenTime !== undefined &&
        message.timing?.streamStartTime !== undefined
          ? message.timing.firstTokenTime - message.timing.streamStartTime
          : undefined,
      ),
      format: (value: number) => `${Math.round(value)}ms`,
    },
    {
      label: "output",
      values: collect(messages, (message) => message.usage?.outputTokens),
      format: (value: number) => String(value),
    },
  ].filter((series) => series.values.length >= 3);

export const TranscriptHeader = memo(function TranscriptHeader({
  thread,
}: {
  thread: ThreadPreview;
}) {
  const [expanded, setExpanded] = useState(false);
  const messages = thread.messages;

  const { stats, series, canExpand } = useMemo(() => {
    const tools = messages.reduce(
      (sum, message) =>
        sum + message.parts.filter((part) => part.type === "tool-call").length,
      0,
    );
    const errors = messages.filter(
      (message) => message.status?.type === "incomplete",
    ).length;
    const tokens = messages.reduce(
      (sum, message) =>
        sum +
        (message.usage
          ? message.usage.inputTokens + message.usage.outputTokens
          : 0),
      0,
    );

    const statParts = [
      `${messages.length} msg${messages.length === 1 ? "" : "s"}`,
      tokens ? `${formatTokens(tokens)} tok` : null,
      tools ? `${tools} tool${tools === 1 ? "" : "s"}` : null,
      errors ? `${errors} err` : null,
    ].filter(Boolean);

    const trendSeries = metricSeries(messages);

    return {
      stats: statParts,
      series: trendSeries,
      canExpand: trendSeries.length > 0,
    };
  }, [messages]);

  const titleRow = (
    <PaneHeader
      borderless={canExpand && expanded}
      trailing={
        <>
          {thread.isRunning ? (
            <ToneBadge tone="blue" size="sm">
              running
            </ToneBadge>
          ) : null}
          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-muted-foreground hover:text-foreground text-[11px] leading-none"
            >
              <span
                className={clsx(
                  "inline-block transition-transform",
                  expanded && "rotate-90",
                )}
              >
                ›
              </span>{" "}
              trends
            </button>
          ) : null}
        </>
      }
    >
      {stats.join(" · ")}
    </PaneHeader>
  );

  if (canExpand && expanded) {
    return (
      <PaneHeaderStack header={titleRow}>
        {series.map((entry) => (
          <div
            key={entry.label}
            className="flex items-center justify-between gap-3 px-3 py-1.5"
          >
            <div className="flex flex-col">
              <span className="text-muted-foreground text-[10px]">
                {entry.label}
              </span>
              <span className="text-foreground text-[12px] font-medium tabular-nums">
                {entry.format(entry.values[entry.values.length - 1]!)}
              </span>
            </div>
            <Sparkline values={entry.values} className="h-6 w-24" />
          </div>
        ))}
      </PaneHeaderStack>
    );
  }

  return titleRow;
});

export const Transcript = ({
  thread,
  selection,
  onSelect,
}: {
  thread: ThreadPreview;
  selection: string | null;
  onSelect: (nodeId: string) => void;
}) => {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const prevSelectionRef = useRef(selection);
  const handleSelect = useCallback(
    (nodeId: string) => onSelect(nodeId),
    [onSelect],
  );

  useEffect(() => {
    if (prevSelectionRef.current === selection) return;
    prevSelectionRef.current = selection;
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selection]);

  return (
    <>
      {thread.messages.map((message) => {
        const nodeId = messageNodeId(message.id);
        const selected = selection === nodeId;
        return (
          <TurnRow
            key={message.id}
            message={message}
            nodeId={nodeId}
            selected={selected}
            onSelect={handleSelect}
            rowRef={selected ? selectedRef : undefined}
          />
        );
      })}
      {thread.composer && thread.composer.textLength > 0 ? (
        <GhostComposer composer={thread.composer} />
      ) : null}
    </>
  );
};
