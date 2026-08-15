import { Line } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Monthly active users, January to September",
    note: "Growth with two dips; the trend survives both.",
    chart: (
      <Line
        title="Monthly active users"
        data={[34, 46, 40, 58, 52, 66, 60, 76, 90]}
        labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]}
        format={(v) => `${v}k`}
      />
    ),
  },
  {
    title: "Median home price in one metro, 2016 to 2024",
    note: "Flat through 2019, a pandemic jump, then a slow cooldown.",
    chart: (
      <Line
        title="Median home price"
        data={[312, 318, 326, 331, 368, 425, 462, 448, 439]}
        labels={[
          "2016",
          "2017",
          "2018",
          "2019",
          "2020",
          "2021",
          "2022",
          "2023",
          "2024",
        ]}
        format={(v) => `$${v}k`}
      />
    ),
  },
  {
    title: "Resting heart rate across eight weeks of training",
    note: "A slow decline is the whole story; the y range is only twelve beats.",
    chart: (
      <Line
        title="Resting heart rate"
        data={[68, 67, 65, 66, 63, 62, 60, 58]}
        labels={["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"]}
        format={(v) => `${v} bpm`}
      />
    ),
  },
];
