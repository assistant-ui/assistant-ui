import { Line } from "diagrammatic";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const FORECAST = [120, 128, 134, 141, 150, 158, 163, 171, 180, 188, 195, 204];

export default function DemandForecastChart() {
  return (
    <Line
      title="GPU hours forecast, thousands"
      labels={MONTHS}
      series={[{ name: "forecast", data: FORECAST }]}
      bands={[
        {
          lower: FORECAST.map((v, i) => v - 4 - i * 2.2),
          upper: FORECAST.map((v, i) => v + 4 + i * 2.2),
        },
      ]}
      yTicks={4}
    />
  );
}
