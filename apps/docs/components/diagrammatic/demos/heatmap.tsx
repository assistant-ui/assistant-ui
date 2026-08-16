import { Heatmap } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, hour) =>
  hour % 3 === 0 ? String(hour) : "",
);

const PUNCH: number[][] = DAYS.map((_, day) =>
  Array.from({ length: 24 }, (_, hour) => {
    const weekend = day >= 5;
    if (weekend) {
      if (hour >= 10 && hour <= 14)
        return day === 5 ? 6 + (hour === 11 ? 4 : 0) : 2;
      if (hour === 21 || hour === 22) return 3;
      return hour >= 8 && hour <= 18 ? 1 : 0;
    }
    if (hour >= 9 && hour <= 11) return [14, 18, 22][hour - 9]!;
    if (hour >= 12 && hour <= 14) return [16, 20, 24][hour - 12]!;
    if (hour >= 15 && hour <= 18) return [26, 31, 22, 14][hour - 15]!;
    if (hour === 21 || hour === 22) return day === 3 ? 11 : 7;
    if (hour === 8) return 5;
    return hour >= 7 && hour <= 23 ? 2 : 0;
  }),
);

export const glyph = (
  <Heatmap
    title="Commits"
    mark="dot"
    matrix={{
      rows: DAYS,
      cols: ["0", "6", "12", "18"],
      values: PUNCH.map((row) => [row[0]!, row[6]!, row[12]!, row[18]!]),
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Commits by weekday and hour",
    setup:
      "Seven days, twenty-four hours, a dot per cell. The punchcard is the job Heatmap already owns.",
    read: "The afternoon column from 15h to 16h is the release train. Thursday night is the only late cluster. Saturday morning exists; Sunday almost does not. Empty hours stay empty.",
    source: "git commits on origin/main, last 12 weeks. n = 1,486.",
    chart: (
      <FigTooltip
        matrix={{
          rows: DAYS,
          columns: Array.from({ length: 24 }, (_, hour) => `${hour}h`),
          values: PUNCH,
        }}
      >
        <Heatmap
          density="figure"
          aspect={1.7}
          mark="dot"
          title="Commits by weekday and hour"
          matrix={{ rows: DAYS, cols: HOURS, values: PUNCH }}
        />
      </FigTooltip>
    ),
  },
];
