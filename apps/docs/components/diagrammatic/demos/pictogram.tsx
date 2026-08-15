import { Pictogram } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Headcount by office",
    note: "One mark for every ten people; partial units read as partial marks.",
    chart: (
      <Pictogram
        title="Headcount by office"
        items={[
          { label: "berlin", value: 85 },
          { label: "tokyo", value: 60 },
          { label: "austin", value: 35 },
        ]}
        unit={10}
        unitLabel="people"
      />
    ),
  },
  {
    title: "Aircraft fleet by type",
    note: "Counting planes as planes; the narrowbody rows dwarf the widebody one.",
    chart: (
      <Pictogram
        title="Fleet by type"
        items={[
          { label: "A320", value: 120 },
          { label: "737", value: 90 },
          { label: "787", value: 25 },
        ]}
        unit={10}
        unitLabel="aircraft"
      />
    ),
  },
  {
    title: "Rescue dogs adopted this year",
    note: "A unit of five keeps the counts honest and the rows short enough to count by eye.",
    chart: (
      <Pictogram
        title="Adoptions by breed group"
        items={[
          { label: "mixed", value: 45 },
          { label: "shepherd", value: 25 },
          { label: "terrier", value: 15 },
        ]}
        unit={5}
        unitLabel="dogs"
      />
    ),
  },
];
