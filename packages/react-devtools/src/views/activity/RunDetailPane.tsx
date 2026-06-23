import clsx from "clsx";
import { formatClockTime, formatMs } from "../../utils/common";
import { PartDisclosure } from "../message/PartDisclosure";
import { Chip, JSONTree, SummaryItem, SummaryList, ToneBadge } from "../ui";
import type { RunEventEntry, RunPreview } from "../runs/types";

const SCOPE_TONE: Record<string, string> = {
  thread: "bg-blue-500",
  composer: "bg-emerald-500",
  threadListItem: "bg-amber-500",
};

const clampPercent = (offset: number, span: number) =>
  span > 0 ? Math.min(100, Math.max(0, (offset / span) * 100)) : 0;

const eventLabel = (entry: RunEventEntry) =>
  entry.event.slice(entry.scope.length + 1) || entry.event;

const dotClass = (scope: string) => SCOPE_TONE[scope] ?? "bg-muted-foreground";

const RULER_TICKS = 4;

const Ruler = ({ spanMs }: { spanMs: number }) => (
  <div className="flex items-center">
    <span className="w-28 shrink-0" />
    <div className="text-muted-foreground flex flex-1 justify-between font-mono text-[10px] tabular-nums">
      {Array.from({ length: RULER_TICKS + 1 }, (_, index) => (
        <span key={index}>{formatMs((spanMs * index) / RULER_TICKS)}</span>
      ))}
    </div>
    <span className="w-10 shrink-0" />
  </div>
);

const TimelineRow = ({
  entry,
  spanMs,
}: {
  entry: RunEventEntry;
  spanMs: number;
}) => (
  <div className="flex items-center gap-2 py-0.5">
    <span className="flex w-28 shrink-0 items-center gap-1.5">
      <span
        className={clsx(
          "size-1.5 shrink-0 rounded-full",
          dotClass(entry.scope),
        )}
      />
      <span className="text-foreground truncate text-[11px]">
        {eventLabel(entry)}
      </span>
    </span>
    <div className="bg-muted/40 relative h-3 flex-1 rounded">
      <span
        title={`${entry.event} +${formatMs(entry.offsetMs)}`}
        className={clsx(
          "absolute top-0 h-full w-0.5 rounded",
          dotClass(entry.scope),
        )}
        style={{ left: `${clampPercent(entry.offsetMs, spanMs)}%` }}
      />
    </div>
    <span className="text-muted-foreground w-10 shrink-0 text-right font-mono text-[10px] tabular-nums">
      +{formatMs(entry.offsetMs)}
    </span>
  </div>
);

export const RunDetailPane = ({ run }: { run: RunPreview }) => (
  <div className="flex flex-col gap-3">
    <SummaryList>
      <SummaryItem label="Started" value={formatClockTime(run.startTime)} />
      <SummaryItem
        label="Duration"
        value={
          run.endTime === undefined ? (
            <ToneBadge tone="blue" size="sm">
              running
            </ToneBadge>
          ) : (
            formatMs(run.durationMs ?? 0)
          )
        }
      />
      <SummaryItem label="Events" value={String(run.events.length)} />
      {run.threadId ? (
        <SummaryItem label="Thread" value={run.threadId} />
      ) : null}
    </SummaryList>

    <div className="flex flex-col gap-0.5">
      <Ruler spanMs={run.spanMs} />
      {run.events.map((entry, index) => (
        <TimelineRow
          key={`${entry.event}-${index}`}
          entry={entry}
          spanMs={run.spanMs}
        />
      ))}
    </div>

    <div className="flex flex-col">
      {run.events.map((entry, index) => {
        const scope = entry.scope;
        const suffix = eventLabel(entry);
        return (
          <div key={`detail-${entry.event}-${index}`} className="py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-muted-foreground w-12 shrink-0 font-mono text-[10px] tabular-nums">
                +{formatMs(entry.offsetMs)}
              </span>
              <Chip className="shrink-0">{scope}</Chip>
              <span className="text-foreground min-w-0 truncate text-[11px] font-medium">
                {suffix}
              </span>
            </div>
            <div className="ps-[3.75rem]">
              <PartDisclosure label="Payload">
                <JSONTree value={entry.data} openDepth={0} compact />
              </PartDisclosure>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
