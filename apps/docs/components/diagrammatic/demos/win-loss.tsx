import { WinLoss } from "diagrammatic";

const SEASONS = [
  { label: "s24", results: [1, 1, -1, 1, -1, 1, 1, 1, -1, 1, 1, -1] },
  { label: "s25", results: [-1, 1, 1, -1, 1, -1, -1, 1, 1, 1, -1, 1] },
];

export function WinLossDemo() {
  return (
    <div className="mx-auto flex w-full max-w-56 flex-col gap-4 font-mono text-xs">
      {SEASONS.map((season) => (
        <div key={season.label} className="flex items-center gap-3">
          <span className="text-foreground/55 w-8">{season.label}</span>
          <WinLoss data={season.results} title={`season ${season.label}`} />
        </div>
      ))}
    </div>
  );
}
