import { DifferenceArea } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Actual revenue against forecast",
    setup:
      "The FP&A team overlays actual revenue on January's forecast and shades the gap, because the interesting number all year is the difference, not either line.",
    read: "The shaded gap changes sign mid-year: behind plan through spring, ahead by fall. The crossover in July is the slide that matters — and the widening green wedge after it is next January's forecast being written.",
    chart: (
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
    ),
  },
  {
    title: "Reservoir level against the seasonal norm",
    setup:
      "A water authority plots this year's reservoir level against the 30-year norm, shading the difference, because 'below normal' has a size and the public deserves to see it.",
    read: "Below the norm all winter — the shaded deficit is the drought debt — then the March storms flip the sign in three weeks. The area of each shaded region is volume, so the chart doubles as the water budget it reports on.",
    chart: (
      <DifferenceArea
        title="Reservoir level against norm"
        actual={{
          name: "level",
          data: [52, 48, 45, 44, 50, 68, 82, 86, 80, 72],
        }}
        reference={{
          name: "norm",
          data: [60, 62, 64, 66, 68, 70, 72, 70, 66, 62],
        }}
        labels={["Oct", "Dec", "Feb", "Apr", "Jun"]}
      />
    ),
  },
  {
    title: "Store visits against last year",
    setup:
      "A retail chain compares this year's weekly visits with the same weeks last year, shading who's winning, because year-over-year is the only comparison retail truly trusts.",
    read: "This year wins the holidays and loses the summer — the gaps say when, not just whether. The summer deficit coincides with the road works outside the flagship store; the November surge is the loyalty relaunch paying its way.",
    chart: (
      <DifferenceArea
        title="Visits against last year"
        actual={{
          name: "this year",
          data: [62, 58, 54, 46, 42, 40, 48, 60, 74, 88],
        }}
        reference={{
          name: "last year",
          data: [56, 54, 56, 52, 50, 48, 50, 54, 62, 74],
        }}
        labels={["Mar", "May", "Jul", "Sep", "Nov"]}
      />
    ),
  },
];
