import { formatMs } from "../../utils/common";
import type { MessageTimingPreview } from "./types";

/**
 * Splits a model turn into the time-to-first-token segment (dim) and the
 * streaming segment (solid). The only width-bearing timing form: both numbers
 * are measured, not derived. Renders nothing unless all three timestamps exist.
 */
export const TtftBar = ({ timing }: { timing: MessageTimingPreview }) => {
  const { streamStartTime, firstTokenTime, totalStreamTime } = timing;
  if (
    streamStartTime === undefined ||
    firstTokenTime === undefined ||
    totalStreamTime === undefined
  ) {
    return null;
  }

  const ttft = Math.max(0, firstTokenTime - streamStartTime);
  const total = Math.max(totalStreamTime, ttft);
  const stream = Math.max(0, total - ttft);
  const ttftPercent = total > 0 ? (ttft / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-muted-foreground flex justify-between text-[9px] leading-none tabular-nums">
        <span>TTFT {formatMs(ttft)}</span>
        <span>{formatMs(stream)} stream</span>
      </div>
      <div className="bg-muted flex h-1 overflow-hidden rounded-full">
        <div
          className="bg-muted-foreground/40 h-full"
          style={{ width: `${ttftPercent}%` }}
          title={`TTFT ${formatMs(ttft)}`}
        />
        <div
          className="bg-primary h-full"
          style={{ width: `${100 - ttftPercent}%` }}
          title={`stream ${formatMs(stream)}`}
        />
      </div>
    </div>
  );
};
