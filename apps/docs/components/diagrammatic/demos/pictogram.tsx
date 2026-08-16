import { Pictogram } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "Headcount by office",
    setup:
      "An internal all-hands slide shows where the company actually sits. One mark per ten people, because 'Berlin: 85' lands differently when you can count it.",
    read: "Berlin's rows dwarf Austin's — and the half-mark at the end of each row is the honest remainder, not decoration. Unit charts trade precision for feel; at town-hall scale, feel wins.",
    chart: (
      <AppCard title="Headcount by office" meta="295 people">
        <FigTooltip
          labels={["berlin", "tokyo", "london", "nyc", "austin", "remote"]}
          series={{ people: [85, 60, 50, 45, 35, 20] }}
        >
          <Pictogram
            title="Headcount by office"
            items={[
              { label: "berlin", value: 85 },
              { label: "tokyo", value: 60 },
              { label: "london", value: 50 },
              { label: "nyc", value: 45 },
              { label: "austin", value: 35 },
              { label: "remote", value: 20 },
            ]}
            unit={10}
            unitLabel="people"
          />
        </FigTooltip>
      </AppCard>
    ),
  },
];
