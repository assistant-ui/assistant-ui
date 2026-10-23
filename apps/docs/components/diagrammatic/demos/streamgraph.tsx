import { Streamgraph } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const WEEKS = Array.from({ length: 16 }, (_, i) => `w${i + 1}`);
const DOCS = [12, 13, 12, 14, 15, 16, 18, 22, 28, 34, 31, 26, 22, 20, 19, 18];
const PLAYGROUND = [6, 6, 7, 7, 8, 9, 12, 18, 32, 24, 16, 12, 10, 9, 9, 8];
const FORUM = [4, 4, 5, 5, 6, 7, 9, 14, 26, 18, 12, 9, 8, 7, 7, 6];
const CODE_HOST = [8, 8, 9, 9, 10, 11, 12, 14, 16, 15, 14, 13, 12, 12, 11, 11];

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
    title: "Traffic around the v2 launch",
    setup:
      "Sixteen weeks of unique visitors across four surfaces, centered on their own flow. Week 9 is the v2 launch. The form is here because the event is a shape, not a number.",
    read: "Playground and forum peak in week 9 at 32 and 26, then fall to 24 and 18 in week 10. Docs peaks one week later at 34, then declines to 18 by week 16, still above its week 1 count of 12. Code host rises from 14 in week 8 to 16 in week 9.",
    source: "Unique visitors by surface, week 1 is eight weeks before launch.",
    chart: (
      <FigTooltip
        labels={WEEKS}
        series={{
          docs: DOCS,
          playground: PLAYGROUND,
          forum: FORUM,
          "code host": CODE_HOST,
        }}
      >
        <Streamgraph
          aspect={2.2}
          title="Traffic around the v2 launch"
          series={[
            { name: "docs", data: DOCS },
            { name: "playground", data: PLAYGROUND },
            { name: "forum", data: FORUM },
            { name: "code host", data: CODE_HOST },
          ]}
          regions={[{ from: 7.5, to: 9.5, label: "v2 launch" }]}
        />
      </FigTooltip>
    ),
  },
];
