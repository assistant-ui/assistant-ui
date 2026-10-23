import { Bump } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <Bump
    title="League rank"
    series={[
      { name: "harbour", ranks: [2, 1, 1, 2, 1] },
      { name: "rovers", ranks: [1, 2, 3, 3, 3] },
      { name: "forge", ranks: [3, 3, 2, 1, 2] },
      { name: "albion", ranks: [4, 4, 4, 4, 4] },
    ]}
    labels={["2021", "2022", "2023", "2024", "2025"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "League table, first ten matchweeks",
    setup:
      "The table after ten games, drawn as rank not points. Crossings are the story: who climbed, who leaked, who never moved.",
    read: "Harbour start first and stay first. Forge climb from sixth to third. Wanderers slide from second to fifth and never find a week that reverses it. Rovers hold second after week four as if the rest of the league had agreed. Ranks hide the gap; this chart will not tell you it was eight points.",
    source: "Illustrative league, matchweeks 1 to 10.",
    chart: (
      <FigTooltip
        labels={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
        series={{
          Harbour: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          Rovers: [3, 2, 3, 2, 2, 2, 2, 2, 2, 2],
          Forge: [6, 5, 4, 4, 3, 4, 3, 3, 3, 3],
          Albion: [4, 4, 5, 5, 5, 3, 4, 4, 4, 4],
          Wanderers: [2, 3, 2, 3, 4, 5, 5, 5, 5, 5],
          Athletic: [5, 6, 6, 6, 6, 6, 6, 6, 6, 6],
        }}
      >
        <Bump
          aspect={2.2}
          title="League table after ten matchweeks"
          series={[
            { name: "Harbour", ranks: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
            { name: "Rovers", ranks: [3, 2, 3, 2, 2, 2, 2, 2, 2, 2] },
            { name: "Forge", ranks: [6, 5, 4, 4, 3, 4, 3, 3, 3, 3] },
            { name: "Albion", ranks: [4, 4, 5, 5, 5, 3, 4, 4, 4, 4] },
            { name: "Wanderers", ranks: [2, 3, 2, 3, 4, 5, 5, 5, 5, 5] },
            { name: "Athletic", ranks: [5, 6, 6, 6, 6, 6, 6, 6, 6, 6] },
          ]}
          labels={["1", "", "3", "", "5", "", "7", "", "9", "10"]}
        />
      </FigTooltip>
    ),
  },
];
