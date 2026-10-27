"use client";

import { Line } from "diagrammatic";
import { Root, Tooltip } from "diagrammatic/interactive";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const REQUESTS = [12.4, 13.1, 12.8, 14.6, 15.2, 9.8, 8.9];

export default function RequestsChart() {
  return (
    <Root>
      <Line
        title="Requests per second, thousands"
        labels={DAYS}
        data={REQUESTS}
        yTicks={3}
      />
      <Tooltip side="top">
        {({ datum }) => {
          const i = datum.index;
          if (i === undefined) return null;
          return (
            <div className="bg-popover text-popover-foreground w-max rounded-lg border px-2.5 py-1.5 text-xs shadow-md">
              <span className="text-muted-foreground">{DAYS[i]}</span>{" "}
              <span className="font-medium tabular-nums">
                {REQUESTS[i]}k rps
              </span>
            </div>
          );
        }}
      </Tooltip>
    </Root>
  );
}
