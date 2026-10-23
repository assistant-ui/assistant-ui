import { Chart, validateSpec } from "diagrammatic/spec";

const modelOutput = `{
  "v": "dg/1",
  "type": "line",
  "title": "Weekly active users",
  "unit": "compact",
  "labels": ["W1", "W2", "W3", "W4", "W5", "W6"],
  "data": [1200, 1350, 1310, 1580, 1720, 1910],
  "yTicks": 3
}`;

export default function SpecChart() {
  return <Chart spec={validateSpec(JSON.parse(modelOutput))} />;
}
