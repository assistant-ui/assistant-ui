import { Line } from "diagrammatic";

export default function RevenueForecastChart() {
  return (
    <Line
      title="Monthly revenue"
      labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
      data={[42, 45, 43, 52, 59, 62, 67, 72]}
      forecastFrom={4}
      bands={[
        {
          lower: [42, 45, 43, 52, 59, 58, 60, 62],
          upper: [42, 45, 43, 52, 59, 66, 74, 82],
        },
      ]}
      yTicks={4}
      format={(value) => `${value}k`}
    />
  );
}
