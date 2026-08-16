import { DifferenceArea } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
  <DifferenceArea
    title="Actual revenue against forecast"
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
    title: "Actual revenue against forecast",
    setup:
      "The FP&A team overlays actual revenue on January's forecast and shades the gap, because the interesting number all year is the difference, not either line.",
    read: "The shaded gap changes sign mid-year: behind plan through spring, ahead by fall. The crossover in July is the slide that matters — and the widening green wedge after it is next January's forecast being written.",
    chart: (
      <AppCard title="Actual vs forecast" meta="FY">
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
            actual: [30, 38, 44, 41, 36, 34, 53, 60, 68, 76, 84, 92],
            forecast: [40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62],
          }}
          unit="M"
        >
          <DifferenceArea
            title="Actual revenue against forecast"
            yTicks={[
              { at: 30, label: "30" },
              { at: 60, label: "60" },
              { at: 90, label: "90" },
            ]}
            actual={{
              name: "actual",
              data: [30, 38, 44, 41, 36, 34, 53, 60, 68, 76, 84, 92],
            }}
            reference={{
              name: "forecast",
              data: [40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62],
            }}
            labels={[
              "Jan",
              "",
              "",
              "Apr",
              "",
              "",
              "Jul",
              "",
              "",
              "Oct",
              "",
              "",
            ]}
          />
        </FigTooltip>
      </AppCard>
    ),
  },
];
