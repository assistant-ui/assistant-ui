import { Slope } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

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
    title: "Weekly media use, 2020 against 2025",
    setup:
      "Two surveys, five years apart, show the percentage of respondents using each medium weekly. Two columns and one line per medium make the shifts visible.",
    read: "Video rises from 30 to 68 while TV falls from 70 to 30, so their lines cross. Podcasts rise from 8 to 21, more than doubling, while print falls from 20 to 8. Social and music decline by 10 and 4 points respectively.",
    source: "Surveys, percent of respondents using each medium weekly.",
    chart: (
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
          aspect={2.2}
          title="Weekly media use"
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
    ),
  },
];
