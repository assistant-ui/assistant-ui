import { BoxPlot } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const TOOL = [
  {
    label: "quill · n=28",
    low: 82,
    q1: 160,
    median: 238,
    q3: 367,
    high: 596,
    points: [
      82, 125, 136, 137, 138, 139, 157, 168, 171, 173, 182, 186, 198, 235, 242,
      248, 249, 272, 282, 322, 359, 370, 408, 410, 414, 460, 506, 596,
    ],
  },
  {
    label: "swift · n=28",
    low: 148,
    q1: 213,
    median: 298,
    q3: 410,
    high: 570,
    points: [
      148, 153, 176, 189, 191, 197, 210, 221, 230, 251, 271, 286, 286, 293, 302,
      314, 334, 345, 349, 378, 391, 417, 452, 454, 474, 482, 546, 570,
    ],
  },
  {
    label: "atlas-1 · n=28",
    low: 37,
    q1: 66,
    median: 90,
    q3: 114,
    high: 242,
    points: [
      37, 40, 41, 51, 55, 63, 65, 67, 71, 72, 75, 77, 89, 90, 91, 92, 93, 95,
      100, 103, 106, 117, 120, 141, 145, 153, 185, 242,
    ],
  },
  {
    label: "nova · n=28",
    low: 40,
    q1: 66,
    median: 100,
    q3: 134,
    high: 239,
    points: [
      40, 46, 49, 51, 59, 61, 66, 68, 74, 81, 83, 86, 87, 89, 110, 110, 116,
      116, 119, 120, 126, 137, 143, 145, 147, 183, 197, 239,
    ],
  },
];

export const glyph = (
  <BoxPlot
    title="Tool calls"
    categorical
    groups={TOOL.map(({ points: _points, label, ...box }) => ({
      ...box,
      label: label.split(" ")[0]!,
    }))}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Tool calls per eval run, every point kept",
    setup:
      "Four models, twenty-eight runs each. The box is the summary; the dots are the argument. Small multiples would be a second job. This figure is the call count that decided the cost conversation.",
    read: "swift's median is 298 and its tail clears 500. atlas-1 and nova finish the same suite with a third of the calls. quill sits in between and still has a 596 run. The dots make the tails countable people, not a whisker.",
    source: "FrontierBench tool-use split. 28 runs per model.",
    chart: (
      <FigTooltip
        labels={TOOL.map((row) => row.label)}
        entries={{
          "quill · n=28": "median 238 · p75 367 · max 596",
          "swift · n=28": "median 298 · p75 410 · max 570",
          "atlas-1 · n=28": "median 90 · p75 114 · max 242",
          "nova · n=28": "median 100 · p75 134 · max 239",
        }}
      >
        <BoxPlot
          density="figure"
          aspect={1.35}
          categorical
          title="Tool calls per run"
          yTicks={[
            { at: 0, label: "0" },
            { at: 200, label: "200" },
            { at: 400, label: "400" },
            { at: 600, label: "600" },
          ]}
          groups={TOOL}
        />
      </FigTooltip>
    ),
  },
];
