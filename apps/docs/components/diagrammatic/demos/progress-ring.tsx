import { ProgressRing } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
  <div className="mx-auto grid w-full max-w-96 grid-cols-3 gap-4">
    <ProgressRing value={0.82} label="ship" />
    <ProgressRing value={0.55} label="docs" />
    <ProgressRing value={0.3} label="hire" />
  </div>
);

export const examples: DemoExample[] = [
  {
    title: "Quarter goals, three rings",
    setup:
      "An OKR page renders each goal as a ring — one fraction each, the watch-face grammar everyone already reads without a legend.",
    read: "Ship at 82% will close; hiring at 30% will not, and six weeks in, the ring says so plainly. A ring is a number wearing a shape, and the shape is what makes 30% feel like the emergency it is.",
    chart: (
      <AppCard title="Quarter goals" meta="week 6">
        <div className="mx-auto grid w-full max-w-96 grid-cols-3 gap-4">
          <ProgressRing value={0.82} label="ship" />
          <ProgressRing value={0.55} label="docs" />
          <ProgressRing value={0.3} label="hire" />
        </div>
      </AppCard>
    ),
  },
];
