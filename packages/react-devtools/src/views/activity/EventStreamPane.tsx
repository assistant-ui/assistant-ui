import { Fragment } from "react";
import type { EventLogEntry } from "../../data/types";
import { previousSameScope, useEventLogFilters } from "./activityNodes";
import { EventLogRow, ScopeFilterBar } from "./EventLogRow";

export const EventStreamPane = ({
  logs,
}: {
  logs: readonly EventLogEntry[];
}) => {
  const {
    eventTypes,
    eventTypesByScope,
    filteredLogs,
    query,
    setQuery,
    showDiffs,
    setShowDiffs,
    toggleEventType,
    toggleScope,
    unselectedEventTypes,
  } = useEventLogFilters(logs);

  return (
    <div className="flex flex-col">
      {eventTypes.length ? (
        <div className="border-border shrink-0 border-b">
          <ScopeFilterBar
            eventTypesByScope={eventTypesByScope}
            unselectedEventTypes={unselectedEventTypes}
            toggleScope={toggleScope}
            toggleEventType={toggleEventType}
          />
          <div className="border-border flex items-center gap-2 border-t px-3 py-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter events…"
              className="border-border bg-background text-foreground placeholder:text-muted-foreground h-7 flex-1 rounded-md border px-2 text-[12px]"
            />
            <label className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-[11px]">
              <input
                type="checkbox"
                checked={showDiffs}
                onChange={() => setShowDiffs((prev) => !prev)}
                className="accent-foreground size-3 rounded"
              />
              Diffs
            </label>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col px-3 pb-3">
        {filteredLogs.length === 0 ? (
          <div className="text-muted-foreground py-6 text-center text-[12px]">
            {eventTypes.length === 0
              ? "No events logged for this assistant instance."
              : "No events match the current filters."}
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const previous = showDiffs
              ? previousSameScope(filteredLogs, index)
              : undefined;
            return (
              <Fragment key={`${log.event}-${log.time.getTime()}-${index}`}>
                {log.event === "thread.runStart" && index > 0 ? (
                  <div className="text-muted-foreground border-border/70 flex items-center gap-2 border-t py-2 text-[10px]">
                    new run
                  </div>
                ) : null}
                <EventLogRow
                  log={log}
                  previous={previous}
                  showDiff={showDiffs}
                />
              </Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
