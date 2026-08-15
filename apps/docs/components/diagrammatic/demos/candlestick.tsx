import { Candlestick } from "diagrammatic";

export function CandlestickDemo() {
  return (
    <Candlestick
      title="Two trading weeks"
      data={[
        { open: 138, close: 152, low: 132, high: 156 },
        { open: 152, close: 146, low: 142, high: 158 },
        { open: 146, close: 160, low: 144, high: 164 },
        { open: 160, close: 172, low: 156, high: 176 },
        { open: 172, close: 164, low: 160, high: 178 },
        { open: 164, close: 158, low: 152, high: 168 },
        { open: 158, close: 170, low: 154, high: 174 },
        { open: 170, close: 182, low: 166, high: 188 },
        { open: 182, close: 176, low: 170, high: 186 },
        { open: 176, close: 190, low: 172, high: 196 },
      ]}
      labels={["M", "T", "W", "T", "F", "M", "T", "W", "T", "F"]}
      format={(v) => `$${v}`}
    />
  );
}
