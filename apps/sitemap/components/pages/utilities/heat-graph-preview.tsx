"use client";

import { useMemo } from "react";
import { HeatGraph } from "@/components/assistant-ui/elements/heat-graph";
import { useHydrated } from "@/hooks/use-hydrated";

const DAYS = 365;

/** A seeded random walk, so the sample year looks the same on every visit. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** A year of sample activity ending today: busier on weekdays, in streaks. */
function sampleYear() {
  const random = seeded(7);
  const today = new Date();
  let momentum = 0.5;
  return Array.from({ length: DAYS }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (DAYS - 1 - index),
    );
    momentum = Math.min(1, Math.max(0, momentum + (random() - 0.5) * 0.35));
    const weekday = date.getDay() % 6 !== 0;
    const count =
      random() < (weekday ? 0.82 : 0.3)
        ? Math.round(momentum * (weekday ? 12 : 5) * random())
        : 0;
    return { date: isoDay(date), count };
  });
}

/** The kit's HeatGraph element on a sample year; the dates follow the visitor's clock, so it renders after hydration. */
export function HeatGraphPreview() {
  const hydrated = useHydrated();
  const data = useMemo(() => (hydrated ? sampleYear() : []), [hydrated]);
  return (
    <div className="mx-auto w-fit max-w-full">
      <HeatGraph data={data} />
    </div>
  );
}
