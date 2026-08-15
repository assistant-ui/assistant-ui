import { Streamgraph } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Listening hours by genre across a season",
    setup:
      "A music app's year-in-review team wants the listening story to feel like weather, not accounting. Nine months of hours by genre, centered on their own flow instead of a zero line.",
    read: "The river reads as rhythm: pop swells into summer and recedes, while lo-fi quietly widens underneath — the study-season signal. There is no axis to read numbers from, and that is the form's deal; if someone needs values, this becomes a stacked area.",
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
    setup:
      "A film desk illustrates the release calendar's seasons: a year of box office, by genre, drawn as a stream because the piece is about rhythm, not receipts.",
    read: "Animation surges when school lets out, horror owns the run-up to Halloween, and drama waits for awards season — the genres visibly trading the audience back and forth. The stream shows the seasons changing hands better than any table of grosses.",
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
    setup:
      "A developer-relations team tracks new public repos by language to see where the ecosystem's energy is going, and picks a stream because the story is momentum over precision.",
    read: "TypeScript keeps thickening quarter after quarter while the others roughly hold their width; the whole river widens, but one current is doing the widening. Rust's band grows too, from a trickle to a stripe you can name without a label.",
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
