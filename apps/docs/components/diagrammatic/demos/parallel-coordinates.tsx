import { ParallelCoordinates } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Laptops across four spec axes",
    note: "Each line is one machine; the crossings between axes are the trade-offs.",
    chart: (
      <ParallelCoordinates
        title="Laptops across four spec axes"
        axes={["price", "battery", "weight", "screen"]}
        records={[
          { name: "air", values: [22, 58, 34, 70] },
          { name: "pro", values: [54, 30, 66, 42] },
          { name: "max", values: [80, 72, 50, 86] },
        ]}
      />
    ),
  },
  {
    title: "Three apartments on the shortlist",
    note: "The cheap one loses on every other axis at once, which is easier to see than to admit.",
    chart: (
      <ParallelCoordinates
        title="Apartments on the shortlist"
        axes={["rent", "size", "commute", "light"]}
        records={[
          { name: "loft", values: [78, 66, 30, 88] },
          { name: "garden", values: [52, 74, 62, 46] },
          { name: "studio", values: [24, 22, 78, 30] },
        ]}
      />
    ),
  },
  {
    title: "Breakfast cereals, nutrition against price",
    note: "The kids' cereal spikes on sugar and collapses on fiber; the lines don't lie to parents.",
    chart: (
      <ParallelCoordinates
        title="Cereals across four axes"
        axes={["sugar", "fiber", "protein", "price"]}
        records={[
          { name: "frosted", values: [88, 12, 18, 34] },
          { name: "granola", values: [52, 64, 58, 76] },
          { name: "bran", values: [18, 90, 44, 40] },
        ]}
      />
    ),
  },
];
