import { Line } from "diagrammatic";

export default function ResponseTimeTrendChart() {
  return (
    <Line
      trend
      title="Weekly response time"
      labels={["W1", "", "W3", "", "W5", "", "W7", "", "W9", "", "W11", ""]}
      data={[240, 210, 255, 222, 232, 198, 218, 189, 204, 181, 196, 174]}
      yTicks={4}
      format={(value) => `${value} ms`}
    />
  );
}
