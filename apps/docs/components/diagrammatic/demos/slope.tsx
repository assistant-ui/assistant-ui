import { Slope } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Share of media time, 2020 against 2025",
    note: "Video more than doubles while TV halves; the crossing is the story.",
    chart: (
      <Slope
        title="Share of media time"
        items={[
          { label: "video", from: 30, to: 68 },
          { label: "social", from: 60, to: 50 },
          { label: "music", from: 45, to: 40 },
          { label: "tv", from: 70, to: 30 },
        ]}
        highlight="video"
        labels={["2020", "2025"]}
      />
    ),
  },
  {
    title: "Commute mode share, 2015 against 2025",
    note: "Remote work is the new line at the top; every physical mode paid for it.",
    chart: (
      <Slope
        title="Commute mode share"
        items={[
          { label: "car", from: 62, to: 48 },
          { label: "transit", from: 24, to: 18 },
          { label: "bike", from: 6, to: 10 },
          { label: "remote", from: 8, to: 24 },
        ]}
        highlight="remote"
        labels={["2015", "2025"]}
      />
    ),
  },
  {
    title: "Course pass rates before and after the redesign",
    note: "Three courses improve; statistics slips, and the slope says by how much.",
    chart: (
      <Slope
        title="Pass rate by course"
        items={[
          { label: "algebra", from: 64, to: 78 },
          { label: "physics", from: 58, to: 66 },
          { label: "chemistry", from: 71, to: 74 },
          { label: "statistics", from: 69, to: 62 },
        ]}
        highlight="algebra"
        labels={["before", "after"]}
      />
    ),
  },
];
