import { Line } from "diagrammatic";

export function LineDemo() {
  return (
    <Line
      title="Monthly active users"
      data={[34, 46, 40, 58, 52, 66, 60, 76, 90]}
      labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]}
      format={(v) => `${v}k`}
    />
  );
}
