import { Line } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

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
      "The chart that decided a training run: mean response length over steps for three reward recipes, with the span where the alternating penalty was active drawn as a regions band. One frame carries three curves, an annotated regime, and the number that mattered.",
    read: "The baseline inflates unchecked and the fixed penalty overcorrects into terseness; only the alternating recipe bends inside the band and settles near the target. Multi-series, regions, and the labeled axis are all data props on one Line — the form's whole ceiling in a single figure.",
    chart: (
      <Report
        title="Response length across training"
        chip="3 recipes"
        note="Mean tokens per response, evaluated every 1k steps. Shaded span: alternating penalty active."
      >
        <Line
          title="Mean response length by recipe"
          series={[
            {
              name: "baseline",
              data: [220, 258, 305, 372, 430, 481, 522, 558, 590, 617],
            },
            {
              name: "fixed penalty",
              data: [220, 246, 262, 231, 196, 172, 158, 151, 149, 148],
            },
            {
              name: "alternating",
              data: [220, 255, 296, 351, 338, 296, 272, 266, 271, 274],
            },
          ]}
          regions={[{ from: 3, to: 6, label: "alt penalty" }]}
          labels={["0", "", "2k", "", "4k", "", "6k", "", "8k", ""]}
        />
      </Report>
    ),
  },
  {
    title: "The step variant: policy rate across nine meetings",
    setup:
      "A central bank moves its rate only on scheduled meeting days, so a smooth line would invent motion that never happened. Passing `step` makes the line hold each value until the next decision.",
    read: "A staircase up through the hiking cycle, a three-meeting pause at 4%, then the first cut. The flats are the truth: between meetings the rate simply is what it is, and interpolating would be fiction.",
    chart: (
      <Report title="Policy rate" chip="per meeting">
        <Line
          step
          title="Policy rate by meeting"
          data={[0.5, 1, 1.75, 2.5, 3.25, 4, 4, 4, 3.75]}
          labels={["", "Mar", "", "Jun", "", "Sep", "", "Dec", ""]}
          format={(v) => `${v}%`}
        />
      </Report>
    ),
  },
];
