import { StackedArea } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Report, Terminal } from "./scenes";

export const glyph = (
  <StackedArea
    title="Site traffic by channel"
    labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
    series={[
      { name: "search", data: [16, 20, 18, 24, 26, 24, 30, 34] },
      { name: "direct", data: [10, 12, 16, 14, 18, 22, 20, 24] },
      { name: "social", data: [8, 8, 10, 12, 10, 14, 16, 14] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Site traffic by acquisition channel",
    setup:
      "A marketing lead needs one chart for the quarterly review that shows both the total and who is contributing it. Eight months of sessions, split by how visitors arrived.",
    read: "The top edge is the total, and it is healthy. Inside it, search still carries half, and social is the only band that visibly widens. The middle band rides a wobbly baseline, so read direct from the bottom band and the total; the middle is for shape only.",
    chart: (
      <Report title="Traffic by channel" chip="8 months">
        <StackedArea
          title="Site traffic by channel"
          labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
          series={[
            { name: "search", data: [16, 20, 18, 24, 26, 24, 30, 34] },
            { name: "direct", data: [10, 12, 16, 14, 18, 22, 20, 24] },
            { name: "social", data: [8, 8, 10, 12, 10, 14, 16, 14] },
          ]}
        />
      </Report>
    ),
  },
  {
    title: "Grid generation mix across one day",
    setup:
      "A grid operator's dashboard shows the day's generation stacked by source, because demand must always equal the top edge. This is a sunny weekday in spring.",
    read: "Solar swells through midday and gas fills the morning and evening shoulders around it; the famous duck-curve shape is the gas band's waistline. Wind hums along flat underneath, indifferent to the sun.",
    chart: (
      <Terminal title="grid mix — live">
        <StackedArea
          title="Generation mix"
          labels={["00", "04", "08", "12", "16", "20", "24"]}
          series={[
            { name: "gas", data: [14, 13, 10, 6, 8, 15, 16] },
            { name: "wind", data: [9, 10, 8, 7, 8, 9, 10] },
            { name: "solar", data: [0, 0, 6, 16, 12, 2, 0] },
          ]}
        />
      </Terminal>
    ),
  },
  {
    title: "Support tickets by severity, eight weeks",
    setup:
      "A support manager's weekly ticket count looks stable, which is why nobody upstairs is worried. She stacks it by severity to show why she is.",
    read: "The total is flat; the composition is not. High-severity grows from a sliver to a visible band while low-severity shrinks to make room. Same workload on paper, much worse week in practice — a story only the stack can tell.",
    chart: (
      <AppCard title="Tickets by severity" meta="8 weeks">
        <StackedArea
          title="Tickets by severity"
          labels={["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"]}
          series={[
            { name: "low", data: [42, 40, 38, 36, 34, 30, 28, 26] },
            { name: "medium", data: [18, 20, 19, 22, 24, 25, 26, 27] },
            { name: "high", data: [4, 5, 6, 8, 9, 12, 14, 15] },
          ]}
        />
      </AppCard>
    ),
  },
];
