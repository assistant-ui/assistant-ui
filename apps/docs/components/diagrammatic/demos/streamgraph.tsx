import { Streamgraph } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Listening hours by genre across a season",
    note: "The river reads as rhythm, not as numbers; lo-fi quietly widens.",
    chart: (
      <Streamgraph
        title="Listening hours by genre"
        series={[
          { name: "pop", data: [8, 12, 16, 20, 24, 20, 16, 14, 12] },
          { name: "hip-hop", data: [6, 10, 14, 12, 16, 18, 14, 12, 10] },
          { name: "rock", data: [10, 8, 10, 14, 12, 16, 18, 16, 12] },
          { name: "lo-fi", data: [4, 6, 8, 8, 10, 12, 10, 12, 14] },
        ]}
      />
    ),
  },
  {
    title: "Box office share by genre through a year",
    note: "Animation surges in summer, horror owns the fall; the stream shows the seasons trading places.",
    chart: (
      <Streamgraph
        title="Box office by genre"
        series={[
          { name: "action", data: [10, 12, 16, 22, 26, 22, 16, 12, 10] },
          { name: "animation", data: [4, 6, 10, 18, 22, 14, 8, 6, 5] },
          { name: "drama", data: [12, 10, 8, 6, 6, 8, 12, 14, 16] },
          { name: "horror", data: [3, 3, 4, 4, 6, 8, 14, 18, 8] },
        ]}
      />
    ),
  },
  {
    title: "New repositories by language, nine quarters",
    note: "TypeScript keeps thickening while the rest hold their width.",
    chart: (
      <Streamgraph
        title="New repos by language"
        series={[
          { name: "typescript", data: [8, 10, 13, 16, 18, 21, 24, 26, 28] },
          { name: "python", data: [14, 15, 16, 16, 17, 18, 18, 19, 19] },
          { name: "rust", data: [3, 4, 5, 6, 8, 9, 10, 12, 13] },
          { name: "go", data: [7, 8, 8, 9, 9, 10, 10, 10, 11] },
        ]}
      />
    ),
  },
];
