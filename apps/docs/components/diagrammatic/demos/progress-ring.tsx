import { ProgressRing } from "diagrammatic";
import type { DemoExample } from "./types";

export const glyph = (
  <div className="mx-auto grid w-full max-w-96 grid-cols-3 gap-4">
    <ProgressRing value={0.82} label="ship" />
    <ProgressRing value={0.55} label="docs" />
    <ProgressRing value={0.3} label="hire" />
  </div>
);

export const examples: DemoExample[] = [
  {
    title: "Ship, this quarter",
    setup:
      "One goal, one ring. A card next to the changelog asks only whether the release still closes.",
    read: "The ring shows 41 of 50 committed issues closed, or 82%. Nine remain open.",
    source: "Closed issues over committed scope.",
    chart: (
      <div className="mx-auto w-40">
        <ProgressRing value={0.82} display="41/50" label="ship" />
      </div>
    ),
  },
];
