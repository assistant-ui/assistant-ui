import { Candlestick } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "A stock's two trading weeks, daily candles",
    note: "Four values per day: body for open and close, wick for the range.",
    chart: (
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
    ),
  },
  {
    title: "A crypto unwind, ten sessions",
    note: "Long red bodies and short wicks: sellers in control with barely a bounce.",
    chart: (
      <Candlestick
        title="Ten sessions of decline"
        data={[
          { open: 3400, close: 3320, low: 3280, high: 3440 },
          { open: 3320, close: 3180, low: 3140, high: 3350 },
          { open: 3180, close: 3240, low: 3120, high: 3280 },
          { open: 3240, close: 3060, low: 3020, high: 3260 },
          { open: 3060, close: 2900, low: 2860, high: 3090 },
          { open: 2900, close: 2960, low: 2840, high: 3000 },
          { open: 2960, close: 2780, low: 2740, high: 2980 },
          { open: 2780, close: 2620, low: 2560, high: 2800 },
          { open: 2620, close: 2700, low: 2580, high: 2740 },
          { open: 2700, close: 2540, low: 2500, high: 2720 },
        ]}
        labels={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
        format={(v) => `$${v}`}
      />
    ),
  },
  {
    title: "Coffee futures around a frost report",
    note: "Quiet candles, one huge gap up on the news, then a fade as supply clears.",
    chart: (
      <Candlestick
        title="Coffee futures"
        data={[
          { open: 182, close: 185, low: 179, high: 188 },
          { open: 185, close: 183, low: 180, high: 189 },
          { open: 184, close: 187, low: 181, high: 190 },
          { open: 205, close: 228, low: 202, high: 236 },
          { open: 228, close: 241, low: 222, high: 248 },
          { open: 241, close: 232, low: 226, high: 246 },
          { open: 232, close: 224, low: 218, high: 238 },
          { open: 224, close: 218, low: 212, high: 230 },
        ]}
        labels={["M", "T", "W", "T", "F", "M", "T", "W"]}
        format={(v) => `${v}¢`}
      />
    ),
  },
];
