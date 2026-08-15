import { DotPlot, formatCompact } from "diagrammatic";

export function DotPlotDemo() {
  return (
    <DotPlot
      title="Median salary by role"
      items={[
        { label: "staff", value: 176_000 },
        { label: "senior", value: 144_000 },
        { label: "pm", value: 122_000 },
        { label: "mid", value: 94_000 },
        { label: "junior", value: 68_000 },
        { label: "intern", value: 44_000 },
      ]}
      ticks={[50_000, 100_000, 150_000]}
      format={(v) => `$${formatCompact(v)}`}
    />
  );
}
