import { DifferenceArea } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <DifferenceArea
    title="Actual against forecast"
    actual={{
      name: "actual",
      data: [30, 44, 56, 48, 40, 34, 46, 62, 74, 84],
    }}
    reference={{
      name: "forecast",
      data: [40, 42, 44, 46, 48, 50, 52, 54, 56, 58],
    }}
    labels={["Jan", "Apr", "Jul", "Oct"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Actual requests against the Friday forecast",
    setup:
      "Thirty weekdays of checkout POSTs. The interesting number is the gap, not either line.",
    read: "The shade flips in the third week, the day the sale started. After that the green wedge is capacity we did not buy. The July crossover on the old revenue costume is gone; this is the week the queue backed up.",
    source:
      "Checkout POST per day versus the Friday forecast. 7 Jul to 15 Aug.",
    chart: (
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
          actual: [
            14.2, 13.8, 15.1, 14.6, 13.2, 14.0, 13.6, 14.8, 15.4, 14.1, 22.6,
            24.1, 23.4, 21.8, 19.6, 18.4, 17.2, 16.8, 16.1, 15.4, 15.0, 14.6,
            14.8, 15.2, 14.9, 14.4, 14.1, 13.9, 14.0, 13.7,
          ],
          forecast: [
            14.5, 14.6, 14.7, 14.6, 14.4, 14.3, 14.2, 14.4, 14.5, 14.4, 14.6,
            14.7, 14.6, 14.5, 14.4, 14.3, 14.4, 14.5, 14.6, 14.5, 14.4, 14.3,
            14.4, 14.6, 14.5, 14.4, 14.3, 14.4, 14.5, 14.4,
          ],
        }}
        unit="k"
      >
        <DifferenceArea
          density="figure"
          aspect={2.2}
          title="Checkout POSTs against forecast"
          yTicks={[
            { at: 14, label: "14k" },
            { at: 18, label: "18k" },
            { at: 24, label: "24k" },
          ]}
          actual={{
            name: "actual",
            data: [
              14.2, 13.8, 15.1, 14.6, 13.2, 14.0, 13.6, 14.8, 15.4, 14.1, 22.6,
              24.1, 23.4, 21.8, 19.6, 18.4, 17.2, 16.8, 16.1, 15.4, 15.0, 14.6,
              14.8, 15.2, 14.9, 14.4, 14.1, 13.9, 14.0, 13.7,
            ],
          }}
          reference={{
            name: "forecast",
            data: [
              14.5, 14.6, 14.7, 14.6, 14.4, 14.3, 14.2, 14.4, 14.5, 14.4, 14.6,
              14.7, 14.6, 14.5, 14.4, 14.3, 14.4, 14.5, 14.6, 14.5, 14.4, 14.3,
              14.4, 14.6, 14.5, 14.4, 14.3, 14.4, 14.5, 14.4,
            ],
          }}
          labels={[
            "7 Jul",
            "",
            "",
            "",
            "",
            "14 Jul",
            "",
            "",
            "",
            "",
            "21 Jul",
            "",
            "",
            "",
            "",
            "28 Jul",
            "",
            "",
            "",
            "",
            "4 Aug",
            "",
            "",
            "",
            "",
            "11 Aug",
            "",
            "",
            "",
            "",
          ]}
        />
      </FigTooltip>
    ),
  },
];
