import { formatMs } from "../../utils/common";
import type { MessagePreview } from "./types";
import { TtftBar } from "./TtftBar";

const canRenderBar = (timing: MessagePreview["timing"]) =>
  Boolean(
    timing &&
    timing.streamStartTime !== undefined &&
    timing.firstTokenTime !== undefined &&
    timing.totalStreamTime !== undefined,
  );

const inlineStats = (message: MessagePreview): string[] => {
  const { timing, usage } = message;
  const stats: string[] = [];

  if (timing && !canRenderBar(timing)) {
    const ttft =
      timing.firstTokenTime !== undefined &&
      timing.streamStartTime !== undefined
        ? Math.max(0, timing.firstTokenTime - timing.streamStartTime)
        : undefined;
    if (ttft !== undefined) stats.push(`TTFT ${formatMs(ttft)}`);
    if (timing.totalStreamTime !== undefined) {
      stats.push(`${formatMs(timing.totalStreamTime)} stream`);
    }
  }

  if (timing?.tokensPerSecond !== undefined) {
    stats.push(`${timing.tokensPerSecond.toFixed(1)} tok/s`);
  }
  if (timing?.tokenCount !== undefined) {
    stats.push(`${timing.tokenCount} tok`);
  }
  if (timing?.totalChunks !== undefined) {
    stats.push(`${timing.totalChunks} chunks`);
  }
  if (timing?.toolCallCount !== undefined) {
    const count = timing.toolCallCount;
    stats.push(`${count} tool${count === 1 ? "" : "s"}`);
  }
  if (usage) {
    stats.push(`${usage.inputTokens}/${usage.outputTokens} in/out`);
    const steps = usage.stepCount;
    stats.push(`${steps} step${steps === 1 ? "" : "s"}`);
  }

  return stats;
};

export const MessageMetrics = ({ message }: { message: MessagePreview }) => {
  const { timing } = message;
  const stats = inlineStats(message);
  const bar = timing && canRenderBar(timing);

  if (!bar && stats.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {bar ? <TtftBar timing={timing} /> : null}
      {stats.length ? (
        <p className="text-muted-foreground text-[10px] leading-tight tabular-nums">
          {stats.join(" · ")}
        </p>
      ) : null}
    </div>
  );
};
