import { formatDateTime } from "../common";
import { Chip, JSONPreview, SummaryItem, ToneBadge } from "../ui";
import { ChainOfThought } from "./ChainOfThought";
import { partKey } from "./parse";
import { PartView } from "./PartView";
import { StatusBadge } from "./StatusBadge";
import type { MessagePreview, PartPreview } from "./types";

const formatMs = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;

const isThoughtPart = (part: PartPreview) =>
  part.type === "reasoning" || part.type === "tool-call";

type RenderGroup =
  | { kind: "cot"; key: string; parts: PartPreview[] }
  | { kind: "part"; key: string; part: PartPreview };

const groupParts = (parts: readonly PartPreview[]): RenderGroup[] => {
  const groups: RenderGroup[] = [];
  let run: { part: PartPreview; index: number }[] = [];

  const flush = () => {
    const first = run[0];
    if (
      first &&
      run.length >= 2 &&
      run.some((entry) => entry.part.type === "reasoning")
    ) {
      groups.push({
        kind: "cot",
        key: `cot:${partKey(first.part, first.index)}`,
        parts: run.map((entry) => entry.part),
      });
    } else {
      for (const entry of run) {
        groups.push({
          kind: "part",
          key: partKey(entry.part, entry.index),
          part: entry.part,
        });
      }
    }
    run = [];
  };

  parts.forEach((part, index) => {
    if (isThoughtPart(part)) {
      run.push({ part, index });
    } else {
      flush();
      groups.push({ kind: "part", key: partKey(part, index), part });
    }
  });
  flush();
  return groups;
};

const RoleLabel = ({ role }: { role: string }) =>
  role === "user" ? (
    <span className="bg-accent text-foreground rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize">
      {role}
    </span>
  ) : (
    <span className="text-foreground font-semibold capitalize">{role}</span>
  );

const MetaStrip = ({ message }: { message: MessagePreview }) => {
  const { timing, usage } = message;
  const ttft =
    timing?.firstTokenTime !== undefined &&
    timing?.streamStartTime !== undefined
      ? timing.firstTokenTime - timing.streamStartTime
      : undefined;

  const items: { label: string; value: string }[] = [];
  if (ttft !== undefined) items.push({ label: "TTFT", value: formatMs(ttft) });
  if (timing?.totalStreamTime !== undefined) {
    items.push({
      label: "Stream time",
      value: formatMs(timing.totalStreamTime),
    });
  }
  if (timing?.tokensPerSecond !== undefined) {
    items.push({
      label: "Tokens / s",
      value: timing.tokensPerSecond.toFixed(1),
    });
  }
  if (timing?.tokenCount !== undefined) {
    items.push({ label: "Tokens", value: String(timing.tokenCount) });
  }
  if (timing?.totalChunks !== undefined) {
    items.push({ label: "Chunks", value: String(timing.totalChunks) });
  }
  if (timing?.toolCallCount !== undefined) {
    items.push({ label: "Tool calls", value: String(timing.toolCallCount) });
  }
  if (usage) {
    items.push({
      label: "Input / output",
      value: `${usage.inputTokens} in / ${usage.outputTokens} out`,
    });
    items.push({ label: "Steps", value: String(usage.stepCount) });
  }

  if (items.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <SummaryItem key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
};

export const MessageItem = ({ message }: { message: MessagePreview }) => {
  const groups = groupParts(message.parts);
  const hasBranches =
    message.branchNumber !== undefined &&
    message.branchCount !== undefined &&
    message.branchCount > 1;
  const errorValue =
    message.status && message.status.type === "incomplete"
      ? message.status.error
      : undefined;

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <RoleLabel role={message.role} />
          {message.index !== undefined ? (
            <span className="text-muted-foreground text-[10px]">
              #{message.index}
            </span>
          ) : null}
          {message.status ? (
            <StatusBadge
              type={message.status.type}
              reason={message.status.reason}
            />
          ) : null}
          {hasBranches ? (
            <Chip>
              branch {message.branchNumber}/{message.branchCount}
            </Chip>
          ) : null}
          {message.isOptimistic ? (
            <ToneBadge tone="amber">optimistic</ToneBadge>
          ) : null}
          {message.submittedFeedback ? (
            <span className="text-muted-foreground text-[10px]">
              feedback: {message.submittedFeedback}
            </span>
          ) : null}
        </div>
        <span className="text-muted-foreground text-[10px]">
          {formatDateTime(message.createdAt) ?? "—"}
        </span>
      </div>

      <MetaStrip message={message} />

      {errorValue !== undefined ? (
        <div className="bg-muted/40 rounded-md border p-2 text-[11px]">
          <ToneBadge tone="red">error</ToneBadge>
          <div className="mt-1">
            <JSONPreview value={errorValue} />
          </div>
        </div>
      ) : null}

      {message.attachments.length ? (
        <div className="flex flex-wrap gap-1">
          {message.attachments.map((attachment, index) => (
            <Chip key={`${message.id}-attachment-${index}`}>{attachment}</Chip>
          ))}
        </div>
      ) : null}

      {groups.length ? (
        <div className="flex flex-col gap-2">
          {groups.map((group) =>
            group.kind === "cot" ? (
              <ChainOfThought key={group.key} parts={group.parts} />
            ) : (
              <PartView key={group.key} part={group.part} />
            ),
          )}
        </div>
      ) : (
        <div className="text-muted-foreground text-[11px]">
          No content parts
        </div>
      )}
    </div>
  );
};
