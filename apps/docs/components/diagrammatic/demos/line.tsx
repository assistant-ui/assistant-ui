import { Line } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const STEPS = [
  "0",
  "1k",
  "2k",
  "3k",
  "4k",
  "5k",
  "6k",
  "7k",
  "8k",
  "9k",
  "10k",
  "11k",
  "12k",
  "13k",
  "14k",
  "15k",
];

const BASELINE = [
  220, 244, 271, 301, 334, 369, 405, 441, 476, 509, 539, 566, 589, 608, 622,
  631,
];
const FIXED = [
  220, 238, 252, 248, 225, 201, 182, 169, 161, 156, 153, 151, 150, 150, 149,
  149,
];
const ALTERNATING = [
  220, 248, 282, 320, 352, 344, 310, 285, 272, 266, 269, 273, 272, 274, 273,
  275,
];

export const glyph = (
  <Line
    title="Monthly active users"
    data={[34, 46, 40, 58, 52, 66, 60, 76, 90]}
    labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]}
    format={(v) => `${v}k`}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Mean response length by training recipe",
    setup:
      "The chart that decided the run: mean tokens per response, three reward recipes, evaluated every thousand steps. The shaded span is where the alternating penalty was on.",
    read: "Baseline inflates without a ceiling. The fixed penalty overcorrects into terseness and never comes back. Only the alternating recipe bends inside the band and settles near 275, which was the target the whole time.",
    source: "Mean tokens per response, eval every 1k steps.",
    chart: (
      <FigTooltip
        labels={STEPS}
        series={{
          baseline: BASELINE,
          "fixed penalty": FIXED,
          alternating: ALTERNATING,
        }}
      >
        <Line
          density="figure"
          aspect={2.2}
          title="Mean response length by recipe"
          yTicks={[
            { at: 200, label: "200" },
            { at: 400, label: "400" },
            { at: 600, label: "600" },
          ]}
          series={[
            { name: "baseline", data: BASELINE },
            { name: "fixed penalty", data: FIXED },
            { name: "alternating", data: ALTERNATING },
          ]}
          regions={[{ from: 4, to: 9, label: "alternating penalty" }]}
          marks={[
            { series: "baseline", at: 15, label: "631" },
            { series: "alternating", at: 15, label: "275" },
            { series: "fixed penalty", at: 15, label: "149" },
          ]}
          labels={[
            "0",
            "",
            "2k",
            "",
            "4k",
            "",
            "6k",
            "",
            "8k",
            "",
            "10k",
            "",
            "12k",
            "",
            "14k",
            "",
          ]}
        />
      </FigTooltip>
    ),
  },
];
