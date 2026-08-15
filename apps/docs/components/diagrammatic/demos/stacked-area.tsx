import { StackedArea } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Site traffic by acquisition channel",
    note: "Search still carries half the total; social is the band that grows.",
    chart: (
      <StackedArea
        title="Site traffic by channel"
        labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
        series={[
          { name: "search", data: [16, 20, 18, 24, 26, 24, 30, 34] },
          { name: "direct", data: [10, 12, 16, 14, 18, 22, 20, 24] },
          { name: "social", data: [8, 8, 10, 12, 10, 14, 16, 14] },
        ]}
      />
    ),
  },
  {
    title: "Grid generation mix across one day",
    note: "Solar swells through midday while gas fills the morning and evening shoulders.",
    chart: (
      <StackedArea
        title="Generation mix"
        labels={["00", "04", "08", "12", "16", "20", "24"]}
        series={[
          { name: "gas", data: [14, 13, 10, 6, 8, 15, 16] },
          { name: "wind", data: [9, 10, 8, 7, 8, 9, 10] },
          { name: "solar", data: [0, 0, 6, 16, 12, 2, 0] },
        ]}
      />
    ),
  },
  {
    title: "Support tickets by severity, eight weeks",
    note: "The total is flat; what changes is how much of it is high-severity.",
    chart: (
      <StackedArea
        title="Tickets by severity"
        labels={["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"]}
        series={[
          { name: "low", data: [42, 40, 38, 36, 34, 30, 28, 26] },
          { name: "medium", data: [18, 20, 19, 22, 24, 25, 26, 27] },
          { name: "high", data: [4, 5, 6, 8, 9, 12, 14, 15] },
        ]}
      />
    ),
  },
];
