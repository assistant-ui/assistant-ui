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
    read: "Baseline inflates without a ceiling. The fixed penalty overcorrects into terseness and never comes back. Only the alternating recipe bends inside the penalty window and lands in the 250 to 300 token band, which was the target the whole time.",
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
          bands={[
            {
              lower: Array.from({ length: STEPS.length }, () => 250),
              upper: Array.from({ length: STEPS.length }, () => 300),
            },
          ]}
          series={[
            { name: "baseline", data: BASELINE },
            { name: "fixed penalty", data: FIXED },
            { name: "alternating", data: ALTERNATING },
          ]}
          regions={[{ from: 4, to: 9, label: "alternating penalty" }]}
          guides={[{ at: 275, label: "target 275" }]}
          marks={[
            { series: "alternating", at: 4, label: "penalty on" },
            { series: "alternating", at: 9, label: "off" },
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
  {
    title: "Loop gain against frequency",
    setup:
      "A compensation review on the servo. Frequency is decades, not a timeline. Magnitude stays in decibels so the paper is log only on x.",
    read: "The gain crosses −3 dB at 2 kHz. The 20 dB/decade slope after the pole is the integrator the firmware asked for. Nothing here is a time series.",
    source: "Closed-loop magnitude, 10 Hz to 100 kHz. Bench, 12 Aug.",
    chart: (
      <Line
        density="figure"
        aspect={2.1}
        title="Loop gain"
        xs={[
          10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000,
          50_000, 100_000,
        ]}
        xScale="log"
        data={[28, 28, 27.5, 26, 23, 17, 9, 2, -8, -14, -20, -28, -34]}
        xTicks={[
          { at: 10, label: "10" },
          { at: 100, label: "100" },
          { at: 1_000, label: "1k" },
          { at: 10_000, label: "10k" },
          { at: 100_000, label: "100k" },
        ]}
        yTicks={[
          { at: 20, label: "20 dB" },
          { at: 0, label: "0" },
          { at: -20, label: "−20" },
        ]}
        guides={[
          { at: 0, label: "0 dB" },
          { at: -3, label: "−3 dB" },
        ]}
        marks={[{ at: 7, label: "2 kHz" }]}
        labels={[
          "10 Hz",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "100 kHz",
        ]}
      />
    ),
  },
  {
    title: "Progression-free survival",
    setup:
      "Oncology readout. The step is the Kaplan-Meier estimator. Short ticks are censored patients, not events. The band is the Greenwood interval.",
    read: "Median PFS is just after month 9. The last third of the ticks sit on a flat tail: those patients are still on study, not cured by the chart.",
    source: "Investigator PFS, n = 86. Censoring at last contact.",
    chart: (
      <Line
        density="figure"
        aspect={2.1}
        step
        title="Progression-free survival"
        data={[
          1, 0.97, 0.94, 0.88, 0.81, 0.74, 0.68, 0.61, 0.54, 0.49, 0.45, 0.42,
          0.4, 0.38, 0.37, 0.36,
        ]}
        bands={[
          {
            lower: [
              1, 0.93, 0.89, 0.81, 0.73, 0.65, 0.58, 0.51, 0.44, 0.39, 0.35,
              0.32, 0.3, 0.28, 0.27, 0.26,
            ],
            upper: [
              1, 1, 0.99, 0.95, 0.89, 0.83, 0.78, 0.71, 0.64, 0.59, 0.55, 0.52,
              0.5, 0.48, 0.47, 0.46,
            ],
          },
        ]}
        guides={[{ at: 0.5, label: "median" }]}
        marks={[
          { at: 3, kind: "censor" },
          { at: 5, kind: "censor" },
          { at: 8, kind: "censor" },
          { at: 11, kind: "censor" },
          { at: 13, kind: "censor" },
          { at: 15, kind: "censor" },
        ]}
        yTicks={[
          { at: 1, label: "1.0" },
          { at: 0.5, label: "0.5" },
          { at: 0, label: "0" },
        ]}
        labels={[
          "0",
          "",
          "3",
          "",
          "6",
          "",
          "9",
          "",
          "12",
          "",
          "15",
          "",
          "18",
          "",
          "21",
          "",
        ]}
      />
    ),
  },
];
