import { ProgressRing } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Quarter goals, three rings",
    setup:
      "An OKR page renders each goal as a ring — one fraction each, the watch-face grammar everyone already reads without a legend.",
    read: "Ship at 82% will close; hiring at 30% will not, and six weeks in, the ring says so plainly. A ring is a number wearing a shape, and the shape is what makes 30% feel like the emergency it is.",
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
    setup:
      "A banking app draws each savings goal as a ring, because a closed circle is the most satisfying chart a bank can show and the app team knows it.",
    read: "The emergency fund closed first — the full ring is the celebration state the design is built around. The house ring at 18% will take years and says so calmly; rings are honest about long roads without being discouraging about them.",
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
    setup:
      "A learning platform's student dashboard: one ring per module, three modules per course, completion as arc.",
    read: "HTML nearly closed, CSS at two-thirds, JS barely begun — the classic front-loaded learning curve, drawn in three arcs. The 12% ring is why the reminder emails exist, and which module they should link to.",
    chart: (
      <div className="mx-auto grid w-full max-w-96 grid-cols-3 gap-2">
        <ProgressRing value={0.95} label="html" />
        <ProgressRing value={0.62} label="css" />
        <ProgressRing value={0.12} label="js" />
      </div>
    ),
  },
];
