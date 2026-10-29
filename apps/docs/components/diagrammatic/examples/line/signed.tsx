import { Line } from "diagrammatic";

const DAYS = Array.from({ length: 20 }, (_, i) =>
  i % 5 === 0 ? `D${i + 1}` : "",
);

export default function DailyPnlChart() {
  return (
    <Line
      signed
      title="Daily trading P&L"
      labels={DAYS}
      data={[6, 5, 3, 0, -3, -5, -4, -1, 2, 4, 6, 7, 5, 2, -1, -3, -2, 1, 4, 6]}
      yTicks={4}
      format={(value) => `${value}k`}
    />
  );
}
