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
    title: "Laptops across five spec axes",
    setup:
      "A buyer's guide compares six laptops across five incommensurable axes — price, battery, weight, screen, gpu — each normalized to its own scale, each machine one thread.",
    read: "Each line is one machine, and the crossings between axes are the trade-offs: the air wins battery and weight, then dives on screen and gpu; the max runs high everywhere except the price axis, where high means expensive. No thread runs high across all five; the form's honesty is that it makes 'best overall' visibly a fiction.",
    chart: (
      <Report title="Laptops across five axes" chip="6 machines">
        <ParallelCoordinates
          title="Laptops across five spec axes"
          axes={["price", "battery", "weight", "screen", "gpu"]}
          records={[
            { name: "air", values: [22, 58, 34, 70, 18] },
            { name: "pro", values: [54, 30, 66, 42, 60] },
            { name: "max", values: [80, 72, 50, 86, 88] },
            { name: "go", values: [12, 44, 16, 30, 10] },
            { name: "book", values: [38, 52, 42, 58, 35] },
            { name: "ultra", values: [92, 40, 78, 90, 95] },
          ]}
        />
      </Report>
    ),
  },
];
