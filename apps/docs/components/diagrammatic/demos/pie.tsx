import { Pie } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Browser share of sessions",
    note: "Four slices is the ceiling; past that, angles stop being comparable.",
    chart: (
      <Pie
        title="Browser share of sessions"
        items={[
          { label: "chrome", value: 42 },
          { label: "safari", value: 27 },
          { label: "edge", value: 19 },
          { label: "other", value: 12 },
        ]}
      />
    ),
  },
  {
    title: "Where a concert ticket goes",
    note: "The artist's slice is real but not the biggest; the fees slice explains the anger.",
    chart: (
      <Pie
        title="Ticket price breakdown"
        items={[
          { label: "venue", value: 34 },
          { label: "artist", value: 30 },
          { label: "fees", value: 24 },
          { label: "tax", value: 12 },
        ]}
        format={(v) => `${v}%`}
      />
    ),
  },
  {
    title: "An average weekday, in hours",
    note: "The whole is fixed at 24, which is exactly when a pie is honest.",
    chart: (
      <Pie
        title="A weekday in hours"
        items={[
          { label: "sleep", value: 8 },
          { label: "work", value: 8 },
          { label: "screens", value: 5 },
          { label: "everything else", value: 3 },
        ]}
        format={(v) => `${v}h`}
      />
    ),
  },
];
