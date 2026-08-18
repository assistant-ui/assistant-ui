import { Candlestick } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

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
      "A commodities desk replays the three weeks around Brazil's frost forecast hitting the wire. Seven quiet sessions, then the gap: Wednesday opens far above Tuesday's close, with no trading in between.",
    read: "The gap up in week two is the news arriving overnight, and it clears the 200¢ line the desk had treated as a ceiling. Price moved while the market slept. Two more green sessions ride the panic to the high; the fade after that is supply chains doing arithmetic.",
    source: "Exchange settlement, four weeks around the Brazil frost wire.",
    chart: (
      <FigTooltip
        labels={[
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Mon",
        ]}
        series={{
          open: [
            178, 180, 179, 182, 185, 184, 187, 205, 228, 241, 232, 224, 218,
            221, 216, 213,
          ],
          close: [
            180, 179, 182, 185, 183, 187, 186, 228, 241, 232, 224, 218, 221,
            216, 213, 214,
          ],
          high: [
            183, 184, 185, 188, 189, 190, 191, 236, 248, 246, 238, 230, 226,
            224, 219, 218,
          ],
          low: [
            175, 176, 177, 179, 180, 181, 183, 202, 222, 226, 218, 212, 214,
            211, 208, 209,
          ],
        }}
        unit="¢"
      >
        <Candlestick
          density="figure"
          aspect={2.2}
          title="Coffee futures"
          yTicks={[
            { at: 180, label: "180¢" },
            { at: 210, label: "210¢" },
            { at: 240, label: "240¢" },
          ]}
          guides={[{ at: 200, label: "pre-frost 200¢" }]}
          data={[
            { open: 178, close: 180, low: 175, high: 183 },
            { open: 180, close: 179, low: 176, high: 184 },
            { open: 179, close: 182, low: 177, high: 185 },
            { open: 182, close: 185, low: 179, high: 188 },
            { open: 185, close: 183, low: 180, high: 189 },
            { open: 184, close: 187, low: 181, high: 190 },
            { open: 187, close: 186, low: 183, high: 191 },
            { open: 205, close: 228, low: 202, high: 236 },
            { open: 228, close: 241, low: 222, high: 248 },
            { open: 241, close: 232, low: 226, high: 246 },
            { open: 232, close: 224, low: 218, high: 238 },
            { open: 224, close: 218, low: 212, high: 230 },
            { open: 218, close: 221, low: 214, high: 226 },
            { open: 221, close: 216, low: 211, high: 224 },
            { open: 216, close: 213, low: 208, high: 219 },
            { open: 213, close: 214, low: 209, high: 218 },
          ]}
          labels={[
            "M",
            "",
            "W",
            "",
            "F",
            "M",
            "",
            "W",
            "",
            "F",
            "M",
            "",
            "W",
            "",
            "F",
            "",
          ]}
          format={(v) => `${v}¢`}
        />
      </FigTooltip>
    ),
  },
];
