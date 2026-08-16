import { Slope } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

export const glyph = (
  <Slope
    title="Share of media time"
    items={[
      { label: "video", from: 30, to: 68 },
      { label: "social", from: 60, to: 50 },
      { label: "music", from: 45, to: 41 },
      { label: "tv", from: 70, to: 30 },
    ]}
    highlight="video"
    labels={["2020", "2025"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Share of media time, 2020 against 2025",
    setup:
      "A media researcher has two surveys, five years apart, and one slide to show what happened between them. Two columns, one line per medium: the slope chart strips the story to its verbs.",
    read: "Video more than doubles while TV halves, and their lines cross mid-chart — the handover, drawn. Podcasts nearly triple from a low base, print quietly collapses, and social and music barely tilt — which is its own finding: the revolution took time from television and paper, not from everything.",
    chart: (
      <Paper
        kicker="Media"
        title="How media time moved"
        source="Source: five-year panel survey"
      >
        <FigTooltip
          labels={[
            "video",
            "social",
            "music",
            "tv",
            "gaming",
            "podcasts",
            "print",
          ]}
          series={{
            "2020": [30, 60, 45, 70, 25, 8, 20],
            "2025": [68, 50, 41, 30, 35, 21, 8],
          }}
          unit="%"
        >
          <Slope
            title="Share of media time"
            items={[
              { label: "video", from: 30, to: 68 },
              { label: "social", from: 60, to: 50 },
              { label: "music", from: 45, to: 41 },
              { label: "tv", from: 70, to: 30 },
              { label: "gaming", from: 25, to: 35 },
              { label: "podcasts", from: 8, to: 21 },
              { label: "print", from: 20, to: 8 },
            ]}
            highlight="video"
            labels={["2020", "2025"]}
          />
        </FigTooltip>
      </Paper>
    ),
  },
];
