import { ParallelCoordinates } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

export const glyph = (
  <ParallelCoordinates
    title="Laptops across four spec axes"
    axes={["price", "battery", "weight", "screen"]}
    records={[
      { name: "air", values: [22, 58, 34, 70] },
      { name: "pro", values: [54, 30, 66, 42] },
      { name: "max", values: [80, 72, 50, 86] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Laptops across four spec axes",
    setup:
      "A buyer's guide compares three laptops across four incommensurable axes — price, battery, weight, screen — each normalized to its own scale, each machine one thread.",
    read: "Each line is one machine, and the crossings between axes are the trade-offs: the air wins battery and weight, then dives on screen. No laptop runs high across all four axes; the form's honesty is that it makes 'best overall' visibly a fiction.",
    chart: (
      <Report title="Laptops across four axes" chip="3 machines">
        <ParallelCoordinates
          title="Laptops across four spec axes"
          axes={["price", "battery", "weight", "screen"]}
          records={[
            { name: "air", values: [22, 58, 34, 70] },
            { name: "pro", values: [54, 30, 66, 42] },
            { name: "max", values: [80, 72, 50, 86] },
          ]}
        />
      </Report>
    ),
  },
];
