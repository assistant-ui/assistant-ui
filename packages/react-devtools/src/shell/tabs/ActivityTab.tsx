import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { eventScope, formatClockTime } from "../../views/common";
import { RunTimeline } from "../../views/runs";
import {
  ControlButton,
  EmptyState,
  JSONPreview,
  SectionLabel,
} from "../../views/ui";
import type { DevToolsTabContext } from "../registry";

export const ActivityTab = ({
  apiId,
  data,
  clearEvents,
}: DevToolsTabContext) => {
  const [unselectedEventTypes, setUnselectedEventTypes] = useState<Set<string>>(
    new Set(),
  );
  const knownEventTypesRef = useRef(new Set<string>());

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    data.logs.forEach((log) => types.add(log.event));
    return Array.from(types).sort();
  }, [data.logs]);

  const eventTypesByScope = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const type of eventTypes) {
      const scope = eventScope(type);
      const existing = grouped.get(scope);
      if (existing) {
        existing.push(type);
      } else {
        grouped.set(scope, [type]);
      }
    }
    return Array.from(grouped.entries());
  }, [eventTypes]);

  useEffect(() => {
    setUnselectedEventTypes((prev) => {
      const eventTypeSet = new Set(eventTypes);
      const next = new Set(prev);
      let changed = false;

      Array.from(next).forEach((value) => {
        if (!eventTypeSet.has(value)) {
          next.delete(value);
          knownEventTypesRef.current.delete(value);
          changed = true;
        }
      });

      eventTypes.forEach((type) => {
        if (!knownEventTypesRef.current.has(type)) {
          knownEventTypesRef.current.add(type);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [eventTypes]);

  const filteredLogs = useMemo(
    () => data.logs.filter((log) => !unselectedEventTypes.has(log.event)),
    [data.logs, unselectedEventTypes],
  );

  const toggleEventType = useCallback((eventType: string) => {
    setUnselectedEventTypes((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
      }
      return next;
    });
  }, []);

  const toggleScope = useCallback((types: string[]) => {
    setUnselectedEventTypes((prev) => {
      const allSelected = types.every((type) => !prev.has(type));
      const next = new Set(prev);
      for (const type of types) {
        if (allSelected) {
          next.add(type);
        } else {
          next.delete(type);
        }
      }
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <ControlButton onClick={() => clearEvents(apiId)}>
          Clear events
        </ControlButton>
      </div>

      <RunTimeline logs={data.logs} />

      <div className="flex flex-col gap-3">
        <SectionLabel>Event log</SectionLabel>
        {eventTypesByScope.length > 0 && (
          <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-3">
            {eventTypesByScope.map(([scope, types]) => {
              const allSelected = types.every(
                (type) => !unselectedEventTypes.has(type),
              );
              return (
                <div key={scope} className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleScope(types)}
                    className={clsx(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                      allSelected
                        ? "bg-accent text-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {scope}
                  </button>
                  {types.map((eventType) => (
                    <label
                      key={eventType}
                      title={eventType}
                      className={clsx(
                        "flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                        !unselectedEventTypes.has(eventType)
                          ? "border-foreground/40 bg-accent text-foreground"
                          : "bg-card text-muted-foreground",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!unselectedEventTypes.has(eventType)}
                        onChange={() => toggleEventType(eventType)}
                        className="accent-foreground size-3 rounded"
                      />
                      <span>
                        {eventType.slice(scope.length + 1) || eventType}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {filteredLogs.length === 0 ? (
          <EmptyState>
            {eventTypes.length === 0
              ? "No events logged for this assistant instance."
              : "No events match the current filters."}
          </EmptyState>
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            <table className="w-full table-auto border-collapse text-left">
              <thead className="bg-muted text-muted-foreground text-[11px]">
                <tr>
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Scope</th>
                  <th className="px-4 py-2 font-medium">Event</th>
                  <th className="px-4 py-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr
                    key={`${log.event}-${index}`}
                    className="border-t text-[11px]"
                  >
                    <td className="text-muted-foreground px-4 py-2 align-top font-mono whitespace-nowrap">
                      {formatClockTime(log.time)}
                    </td>
                    <td className="text-muted-foreground px-4 py-2 align-top">
                      {eventScope(log.event)}
                    </td>
                    <td className="text-foreground px-4 py-2 align-top font-medium">
                      {log.event}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <JSONPreview value={log.data} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
