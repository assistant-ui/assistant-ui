import clsx from "clsx";
import { formatClockTime } from "../../utils/common";
import type { EventLogEntry } from "../../data/types";
import { eventScope } from "../../utils/common";
import { PartDisclosure } from "../message/PartDisclosure";
import { PayloadDiff } from "../runs/PayloadDiff";
import { Chip, JSONTree } from "../ui";

export const EventLogRow = ({
  log,
  previous,
  showDiff = false,
  timeLabel,
}: {
  log: EventLogEntry;
  previous?: EventLogEntry | undefined;
  showDiff?: boolean;
  /** Overrides the default clock time label. */
  timeLabel?: string | undefined;
}) => {
  const scope = eventScope(log.event);
  const suffix = log.event.slice(scope.length + 1) || log.event;

  return (
    <div className="flex flex-col gap-1 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground w-16 shrink-0 font-mono text-[10px] tabular-nums">
          {timeLabel ?? formatClockTime(log.time)}
        </span>
        <Chip className="shrink-0">{scope}</Chip>
        <span className="text-foreground min-w-0 truncate text-[11px] font-medium">
          {suffix}
        </span>
      </div>
      <div className="ps-[4.5rem]">
        <PartDisclosure label="Payload">
          <JSONTree value={log.data} openDepth={0} compact />
        </PartDisclosure>
        {showDiff && previous ? (
          <div className="mt-1">
            <PartDisclosure label="Diff">
              <PayloadDiff before={previous.data} after={log.data} />
            </PartDisclosure>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const ScopeFilterBar = ({
  eventTypesByScope,
  unselectedEventTypes,
  toggleScope,
  toggleEventType,
}: {
  eventTypesByScope: readonly (readonly [string, string[]])[];
  unselectedEventTypes: ReadonlySet<string>;
  toggleScope: (types: string[]) => void;
  toggleEventType: (eventType: string) => void;
}) => {
  if (!eventTypesByScope.length) return null;

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {eventTypesByScope.map(([scope, types]) => {
        const allSelected = types.every(
          (type) => !unselectedEventTypes.has(type),
        );
        return (
          <div key={scope} className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleScope(types)}
              className={clsx(
                "rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                allSelected
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {scope}
            </button>
            {types.map((eventType) => (
              <label
                key={eventType}
                title={eventType}
                className={clsx(
                  "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  !unselectedEventTypes.has(eventType)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <input
                  type="checkbox"
                  checked={!unselectedEventTypes.has(eventType)}
                  onChange={() => toggleEventType(eventType)}
                  className="accent-foreground size-3 rounded"
                />
                <span>{eventType.slice(scope.length + 1) || eventType}</span>
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
};
