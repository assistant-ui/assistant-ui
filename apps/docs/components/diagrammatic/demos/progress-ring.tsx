import { ProgressRing } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Quarter goals, three rings",
    note: "One fraction each; the ring is a number wearing a shape.",
    chart: (
      <div className="mx-auto grid w-full max-w-96 grid-cols-3 gap-2">
        <ProgressRing value={0.82} label="ship" />
        <ProgressRing value={0.55} label="docs" />
        <ProgressRing value={0.3} label="hire" />
      </div>
    ),
  },
  {
    title: "Savings goals, three accounts",
    note: "The emergency fund closed first; the house ring will take years and says so calmly.",
    chart: (
      <div className="mx-auto grid w-full max-w-96 grid-cols-3 gap-2">
        <ProgressRing value={1} label="emergency" />
        <ProgressRing value={0.44} label="travel" />
        <ProgressRing value={0.18} label="house" />
      </div>
    ),
  },
  {
    title: "A course, module by module",
    note: "Three rings on a student dashboard; the last one is why the reminder emails exist.",
    chart: (
      <div className="mx-auto grid w-full max-w-96 grid-cols-3 gap-2">
        <ProgressRing value={0.95} label="html" />
        <ProgressRing value={0.62} label="css" />
        <ProgressRing value={0.12} label="js" />
      </div>
    ),
  },
];
