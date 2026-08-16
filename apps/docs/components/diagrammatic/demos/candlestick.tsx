import { Candlestick } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

export const glyph = (
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

export const examples: DemoExample[] = [
  {
    title: "Coffee futures around a frost report",
    setup:
      "A commodities desk replays the week Brazil's frost forecast hit the wire. Three quiet sessions, then the gap: Thursday opens far above Wednesday's close, with no trading in between.",
    read: "The gap up on day four is the news arriving overnight — price moved while the market slept, and the empty space between candles is the evidence. The fade that follows is supply chains doing arithmetic once the panic priced in.",
    chart: (
      <Paper
        kicker="Commodities"
        title="The frost gap"
        source="Source: exchange settlement data"
      >
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
      </Paper>
    ),
  },
];
