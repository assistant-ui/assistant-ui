import { Violin } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <Violin
    title="Review hours"
    groups={[
      { label: "payments", widths: [1, 4, 9, 13, 10, 5, 2], median: 0.35 },
      { label: "growth", widths: [2, 6, 12, 15, 13, 8, 3], median: 0.55 },
      { label: "legacy", widths: [1, 3, 7, 11, 14, 9, 3], median: 0.72 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Hours to first review, four teams",
    setup:
      "The density profile is the job. Sales-shaped queues have two humps; a box would have called them calm. Each label carries n.",
    read: "Payments is a single peak under four hours. Growth is wider. Legacy is bimodal: a same-day cluster and a two-day pile, which is the staff-vs-contractor split. The dots inside the neck are the people, not the kernel.",
    source: "First non-author review, March 2025. n on each label.",
    chart: (
      <FigTooltip
        labels={[
          "payments · n=86",
          "growth · n=64",
          "platform · n=51",
          "legacy · n=38",
        ]}
        entries={{
          "payments · n=86": "median 3.2h",
          "growth · n=64": "median 6.4h",
          "platform · n=51": "median 5.1h",
          "legacy · n=38": "median 14h",
        }}
      >
        <Violin
          density="figure"
          aspect={1.45}
          title="Hours to first review"
          categorical
          groups={[
            {
              label: "payments · n=86",
              widths: [1, 4, 11, 16, 12, 6, 3, 1, 0.4, 0.2, 0.1],
              median: 0.22,
              points: [
                0.8, 1.1, 1.4, 1.6, 1.9, 2.1, 2.4, 2.6, 2.8, 3.0, 3.2, 3.4, 3.7,
                4.0, 4.4, 4.9, 5.6, 6.4, 7.8, 9.2,
              ],
            },
            {
              label: "growth · n=64",
              widths: [0.4, 1, 3, 6, 10, 13, 12, 9, 6, 3, 1],
              median: 0.48,
              points: [
                2.2, 2.8, 3.4, 3.9, 4.4, 4.9, 5.4, 5.8, 6.2, 6.6, 7.1, 7.6, 8.2,
                9.0, 10.2, 12.0, 14.4, 16.8, 19.0, 22.0,
              ],
            },
            {
              label: "platform · n=51",
              widths: [0.6, 2, 5, 9, 12, 13, 11, 7, 4, 2, 0.6],
              median: 0.4,
              points: [
                1.6, 2.2, 2.8, 3.3, 3.8, 4.2, 4.6, 5.0, 5.4, 5.8, 6.4, 7.0, 7.8,
                8.8, 10.0, 11.6, 13.4, 15.2, 17.8, 21.0,
              ],
            },
            {
              label: "legacy · n=38",
              widths: [2, 5, 7, 4, 3, 3, 5, 8, 7, 4, 2],
              median: 0.62,
              points: [
                1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 12.0, 13.4, 14.0, 14.6, 15.2,
                16.0, 17.2, 18.8, 21.0, 24.0, 28.0, 32.0, 36.0, 42.0,
              ],
            },
          ]}
        />
      </FigTooltip>
    ),
  },
];
