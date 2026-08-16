import { DifferenceArea } from "diagrammatic";
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
      </AppCard>
    ),
  },
];
