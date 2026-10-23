import { Line } from "diagrammatic";

export default function RetentionChart() {
  return (
    <Line
      step
      title="Share of trial workspaces still active"
      labels={["0", "", "", "30d", "", "", "60d", "", "", "90d"]}
      series={[
        {
          name: "with onboarding",
          data: [1, 0.94, 0.9, 0.86, 0.84, 0.82, 0.81, 0.8, 0.79, 0.79],
        },
        {
          name: "without",
          data: [1, 0.88, 0.79, 0.71, 0.66, 0.62, 0.6, 0.57, 0.55, 0.54],
        },
      ]}
      marks={[
        { series: "with onboarding", at: 4, kind: "censor" },
        { series: "with onboarding", at: 7, kind: "censor" },
        { series: "without", at: 5, kind: "censor" },
      ]}
      yTicks={[
        { at: 0.5, label: "50%" },
        { at: 0.75, label: "75%" },
        { at: 1, label: "100%" },
      ]}
    />
  );
}
