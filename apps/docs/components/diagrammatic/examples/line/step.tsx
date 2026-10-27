import { Line } from "diagrammatic";

export default function SeatCountChart() {
  return (
    <Line
      step
      title="Paid seats"
      labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"]}
      data={[40, 40, 55, 55, 55, 80, 80, 80, 120, 120]}
      yTicks={4}
    />
  );
}
