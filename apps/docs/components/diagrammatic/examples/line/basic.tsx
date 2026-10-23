import { Line } from "diagrammatic";

export default function ActiveUsersChart() {
  return (
    <Line
      title="Monthly active users"
      labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]}
      data={[34, 46, 40, 58, 52, 66, 60, 76, 90]}
      format={(v) => `${v}k`}
    />
  );
}
