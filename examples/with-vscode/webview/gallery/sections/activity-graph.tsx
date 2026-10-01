import type { ComponentProps } from "react";
import { ActivityGraph } from "@assistant-ui/ui/components/assistant-ui/elements/activity-graph.tsx";
import { HeatGraph } from "@assistant-ui/ui/components/assistant-ui/elements/heat-graph.tsx";
import { defineSections } from "../types";

type DataPoint = ComponentProps<typeof ActivityGraph>["data"][number];

const START = new Date(2026, 1, 2);
const DAYS = 182;
const dayAfter = (from: Date, offset: number) =>
  new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
const END = dayAfter(START, DAYS - 1);

const countFor = (date: Date, i: number) => {
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const wave = Math.abs(Math.sin(i * 0.21)) + Math.abs(Math.cos(i * 0.07));
  return weekend ? Math.round(wave * 2) : Math.round(wave * 9) + ((i * 7) % 3);
};

const DATA: DataPoint[] = Array.from({ length: DAYS }, (_, i) => {
  const date = dayAfter(START, i);
  return { date, count: countFor(date, i) };
});

const TOTAL = DATA.reduce((sum, point) => sum + point.count, 0);

const today = new Date();
const YEAR: DataPoint[] = Array.from({ length: 365 }, (_, i) => {
  const date = dayAfter(today, -i);
  return { date, count: countFor(date, i) };
});

export default defineSections([
  {
    id: "activity-graph",
    title: "Activity graph",
    category: "content",
    notes: "Six months of daily counts on a fixed window.",
    render: () => (
      <ActivityGraph
        data={DATA}
        start={START}
        end={END}
        title="Agent runs"
        total={`${TOTAL.toLocaleString("en-US")} in 6 months`}
      />
    ),
  },
  {
    id: "heat-graph",
    title: "Heat graph",
    category: "content",
    notes:
      "The trailing year of counts with month and day labels and a legend.",
    render: () => <HeatGraph data={YEAR} />,
  },
]);
