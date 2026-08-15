import { ProgressRing } from "diagrammatic";

export function ProgressRingDemo() {
  return (
    <div className="mx-auto grid w-full max-w-96 grid-cols-3 gap-2">
      <ProgressRing value={0.82} label="ship" />
      <ProgressRing value={0.55} label="docs" />
      <ProgressRing value={0.3} label="hire" />
    </div>
  );
}
