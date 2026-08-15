import { Gantt } from "diagrammatic";

export function GanttDemo() {
  return (
    <Gantt
      title="Release plan"
      rows={[
        { label: "design", from: 0, to: 26, state: "done" },
        { label: "api", from: 20, to: 48, state: "done" },
        { label: "frontend", from: 40, to: 78, state: "active" },
        { label: "qa", from: 8, to: 34, state: "done" },
        { label: "beta", from: 32, to: 62, state: "planned" },
        { label: "launch", from: 74, to: 90, state: "planned" },
      ]}
      today={52}
      labels={["Apr", "May", "Jun", "Jul"]}
    />
  );
}
