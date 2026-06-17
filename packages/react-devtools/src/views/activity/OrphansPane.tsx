import { formatClockTime } from "../../utils/common";
import type { RunEventEntry } from "../runs/types";
import { EventLogRow } from "./EventLogRow";

export const OrphansPane = ({
  events,
}: {
  events: readonly RunEventEntry[];
}) => (
  <div className="flex flex-col px-3 pb-3">
    {events.map((entry, index) => (
      <EventLogRow
        key={`${entry.event}-${entry.time.getTime()}-${index}`}
        log={{
          time: entry.time,
          event: entry.event,
          data: entry.data,
        }}
        timeLabel={formatClockTime(entry.time)}
      />
    ))}
  </div>
);
