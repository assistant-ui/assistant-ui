import { ParallelCoordinates } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Laptops across four spec axes",
    setup:
      "A buyer's guide compares three laptops across four incommensurable axes — price, battery, weight, screen — each normalized to its own scale, each machine one thread.",
    read: "Each line is one machine, and the crossings between axes are the trade-offs: the air wins battery and weight, then dives on screen. No laptop runs high across all four axes; the form's honesty is that it makes 'best overall' visibly a fiction.",
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
    setup:
      "A couple scores their apartment shortlist on rent, size, commute, and light, then threads each flat across the axes to make the argument they keep having visible.",
    read: "The cheap studio loses on every other axis at once — easier to see than to admit. The loft and the garden flat cross twice, which is the actual decision: pay for light and location, or for space and a longer train.",
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
    setup:
      "A consumer magazine profiles three cereals across sugar, fiber, protein, and price — the axes parents actually read the box for.",
    read: "The kids' cereal spikes on sugar and collapses on fiber; the lines do not lie to parents. Granola's surprise is the price axis: nutritionally between the other two, it costs nearly double both, and the thread makes the markup visible.",
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
