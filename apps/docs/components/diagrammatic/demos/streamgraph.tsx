import { Streamgraph } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Slide } from "./scenes";

export const glyph = (
  <Streamgraph
    title="Listening hours by genre"
    series={[
      { name: "pop", data: [8, 12, 16, 20, 24, 20, 16, 14, 12] },
      { name: "hip-hop", data: [6, 10, 14, 12, 16, 18, 14, 12, 10] },
      { name: "rock", data: [10, 8, 10, 14, 12, 16, 18, 16, 12] },
      { name: "lo-fi", data: [4, 6, 8, 8, 10, 12, 10, 12, 14] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Listening hours by genre across a season",
    setup:
      "A music app's year-in-review team wants the listening story to feel like weather, not accounting. Nine months of hours by genre, centered on their own flow instead of a zero line.",
    read: "The river reads as rhythm: pop swells into summer and recedes, while lo-fi quietly widens underneath — the study-season signal. There is no axis to read numbers from, and that is the form's deal; if someone needs values, this becomes a stacked area.",
    chart: (
      <Slide title="A season of listening" footer="year in review">
        <FigTooltip
          labels={[
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ]}
          series={{
            pop: [8, 10, 12, 16, 20, 24, 22, 18, 16, 14, 12, 11],
            "hip-hop": [6, 8, 10, 14, 12, 16, 18, 16, 14, 12, 10, 9],
            rock: [10, 9, 8, 10, 14, 12, 14, 16, 18, 16, 12, 11],
            electronic: [3, 4, 6, 7, 9, 11, 12, 10, 8, 7, 6, 5],
            "lo-fi": [4, 5, 6, 8, 8, 9, 10, 10, 12, 13, 14, 15],
            jazz: [3, 3, 4, 4, 5, 4, 4, 5, 6, 7, 8, 8],
          }}
          unit="h"
        >
          <Streamgraph
            title="Listening hours by genre"
            series={[
              {
                name: "pop",
                data: [8, 10, 12, 16, 20, 24, 22, 18, 16, 14, 12, 11],
              },
              {
                name: "hip-hop",
                data: [6, 8, 10, 14, 12, 16, 18, 16, 14, 12, 10, 9],
              },
              {
                name: "rock",
                data: [10, 9, 8, 10, 14, 12, 14, 16, 18, 16, 12, 11],
              },
              {
                name: "electronic",
                data: [3, 4, 6, 7, 9, 11, 12, 10, 8, 7, 6, 5],
              },
              {
                name: "lo-fi",
                data: [4, 5, 6, 8, 8, 9, 10, 10, 12, 13, 14, 15],
              },
              { name: "jazz", data: [3, 3, 4, 4, 5, 4, 4, 5, 6, 7, 8, 8] },
            ]}
          />
        </FigTooltip>
      </Slide>
    ),
  },
];
