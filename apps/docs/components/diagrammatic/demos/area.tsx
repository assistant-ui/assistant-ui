import { Area } from "diagrammatic";

export function AreaDemo() {
  return (
    <Area
      title="Cumulative signups"
      data={[2200, 4000, 3400, 5200, 6400, 5800, 7400, 7000, 8800]}
      labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]}
    />
  );
}
