import { Bump } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <Bump
    title="Framework popularity rank"
    series={[
      { name: "react", ranks: [2, 1, 1, 2, 1] },
      { name: "jquery", ranks: [1, 2, 3, 3, 3] },
      { name: "vue", ranks: [3, 3, 2, 1, 2] },
      { name: "angular", ranks: [4, 4, 4, 4, 4] },
    ]}
    labels={["2021", "2022", "2023", "2024", "2025"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Premier League table, first ten matchweeks",
    setup:
      "The table after ten games, drawn as rank not points. Crossings are the story: who climbed, who leaked, who never moved.",
    read: "Liverpool start first and stay first. Forest climb from sixth to third. City slide from second to fifth and never find a week that reverses it. Arsenal hold second after week four as if the rest of the league had agreed. Ranks hide the gap; this chart will not tell you it was eight points.",
    source: "Premier League 2024/25, matchweeks 1 to 10.",
    chart: (
      <FigTooltip
        labels={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
        series={{
          Liverpool: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          Arsenal: [3, 2, 3, 2, 2, 2, 2, 2, 2, 2],
          Forest: [6, 5, 4, 4, 3, 4, 3, 3, 3, 3],
          Chelsea: [4, 4, 5, 5, 5, 3, 4, 4, 4, 4],
          City: [2, 3, 2, 3, 4, 5, 5, 5, 5, 5],
          Newcastle: [5, 6, 6, 6, 6, 6, 6, 6, 6, 6],
        }}
      >
        <Bump
          density="figure"
          aspect={2.2}
          title="Premier League table after ten matchweeks"
          series={[
            { name: "Liverpool", ranks: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
            { name: "Arsenal", ranks: [3, 2, 3, 2, 2, 2, 2, 2, 2, 2] },
            { name: "Forest", ranks: [6, 5, 4, 4, 3, 4, 3, 3, 3, 3] },
            { name: "Chelsea", ranks: [4, 4, 5, 5, 5, 3, 4, 4, 4, 4] },
            { name: "City", ranks: [2, 3, 2, 3, 4, 5, 5, 5, 5, 5] },
            { name: "Newcastle", ranks: [5, 6, 6, 6, 6, 6, 6, 6, 6, 6] },
          ]}
          labels={["1", "", "3", "", "5", "", "7", "", "9", "10"]}
        />
      </FigTooltip>
    ),
  },
];
