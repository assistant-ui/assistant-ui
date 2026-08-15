import { DifferenceArea } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Actual revenue against forecast",
    note: "The shaded gap changes sign mid-year; the crossover is the slide that matters.",
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
    note: "Below the norm all winter, above it after the March storms; the area is the drought debt.",
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
    note: "This year wins the holidays and loses the summer; the gaps say when, not just whether.",
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
