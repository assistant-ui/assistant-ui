import { Pictogram } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report } from "./scenes";

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
      <AppCard title="Headcount by office" meta="185 people">
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
      </AppCard>
    ),
  },
  {
    title: "Aircraft fleet by type",
    setup:
      "An airline's annual report counts the fleet the way passengers experience it: as planes, not as a number. One mark per ten aircraft.",
    read: "The narrowbody rows run off the slide while the widebody row barely starts — twelve short-haul frames for every long-haul one. The 25 787s read as 'two and a half marks', which is the exact roughness the form is for.",
    chart: (
      <Report title="Fleet by type" chip="235 aircraft">
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
      </Report>
    ),
  },
  {
    title: "Rescue dogs adopted this year",
    setup:
      "A shelter's year-end donor letter reports adoptions. A unit of five keeps the counts honest and the rows short enough to count by eye — every mark is five real dogs.",
    read: "Mixed breeds fill nine marks, three times the terrier row; the shelter's population and the adopters' preferences are both visible at once. Donors count marks in a way they never audit bars, which is why the letter uses this form.",
    chart: (
      <Paper
        kicker="Shelter"
        title="A year of adoptions"
        source="Source: shelter intake ledger"
      >
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
      </Paper>
    ),
  },
];
