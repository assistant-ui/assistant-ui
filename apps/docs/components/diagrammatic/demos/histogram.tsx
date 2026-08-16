import { Histogram } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Slide, Terminal } from "./scenes";

export const glyph = (
  <Histogram
    title="API response times"
    bins={[6, 12, 22, 38, 58, 78, 92, 84, 66, 46, 30, 18, 10, 5]}
    marker={{ at: 6.9, label: "median 392ms" }}
    labels={["0", "200ms", "400ms", "600ms", "800ms"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "API response times, one day of requests",
    setup:
      "The ops channel lights up every time checkout feels slow, so an SRE dumps a day of requests and buckets them by response time. The average says 420ms and explains nothing; the shape is the actual answer.",
    read: "Most requests land near 400ms, but the long right tail is where the pages come from: a few hundred requests living past 700ms. The dashed median line keeps the tail honest; without it the outliers would set the story.",
    chart: (
      <Terminal title="api latency — 24h">
        <FigTooltip
          series={{
            requests: [6, 12, 22, 38, 58, 78, 92, 84, 66, 46, 30, 18, 10, 5],
          }}
        >
          <Histogram
            title="API response times"
            bins={[6, 12, 22, 38, 58, 78, 92, 84, 66, 46, 30, 18, 10, 5]}
            marker={{ at: 6.9, label: "median 392ms" }}
            labels={["0", "200ms", "400ms", "600ms", "800ms"]}
          />
        </FigTooltip>
      </Terminal>
    ),
  },
  {
    title: "The smooth variant: two commutes in one city",
    setup:
      "A transit agency surveys door-to-desk commute times and the histogram looks lumpy. Smoothing it reveals why: the city does not have one commute, it has two.",
    read: "Two humps, one near 25 minutes and one near 55, with a valley between. The transit crowd and the drivers never meet in the middle, and any single 'average commute' quoted from this data describes almost nobody.",
    chart: (
      <Slide title="Two commutes, one city" footer="transit agency survey">
        <Histogram
          smooth
          title="Commute times"
          bins={[4, 18, 42, 58, 46, 24, 14, 12, 22, 40, 52, 44, 26, 12, 5, 2]}
          marker={{ at: 7.2, label: "median 41 min" }}
          labels={["10", "30", "50", "70", "90 min"]}
        />
      </Slide>
    ),
  },
];
