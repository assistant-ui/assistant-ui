import { StackedBar } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report, Slide } from "./scenes";

export const glyph = (
  <StackedBar
    title="Monthly cloud cost by service"
    groups={["Jan", "Feb", "Mar", "Apr"]}
    series={[
      { name: "compute", data: [26, 33, 22, 38] },
      { name: "storage", data: [19, 22, 15, 26] },
      { name: "egress", data: [12, 17, 10, 14] },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Monthly cloud cost by service",
    setup:
      "Finance flags the cloud bill after it jumps twice in four months, and the platform lead has to explain which service did it. Four invoices, three line items each, stacked so the totals stay comparable.",
    read: "The bar tops tell the total's story: up, up, relief, worst month yet. Compute is the segment that moves the top every time; storage and egress just ride along. The March dip was a reserved-instance credit, not discipline.",
    chart: (
      <AppCard title="Cloud cost by service" meta="4 invoices">
        <StackedBar
          title="Monthly cloud cost by service"
          groups={["Jan", "Feb", "Mar", "Apr"]}
          series={[
            { name: "compute", data: [26, 33, 22, 38] },
            { name: "storage", data: [19, 22, 15, 26] },
            { name: "egress", data: [12, 17, 10, 14] },
          ]}
        />
      </AppCard>
    ),
  },
  {
    title: "Curbside waste by stream, four districts",
    setup:
      "A city sustainability office weighs every truck for a month, split by district and by stream. The council wants to know where the composting pilot should expand next.",
    read: "Similar totals, very different diets: the north district composts what the east landfills. East's landfill segment alone outweighs north's entire recycling-plus-compost stack, so the pilot's next stop writes itself.",
    chart: (
      <Paper
        kicker="City"
        title="What the trucks weighed"
        source="Source: transfer station scales"
      >
        <StackedBar
          title="Waste by stream"
          groups={["north", "east", "south", "west"]}
          series={[
            { name: "recycled", data: [34, 22, 28, 30] },
            { name: "compost", data: [28, 12, 18, 22] },
            { name: "landfill", data: [30, 55, 42, 36] },
          ]}
          format={(v) => `${v}t`}
        />
      </Paper>
    ),
  },
  {
    title: "Where four sprints actually went",
    setup:
      "An engineering manager tags the team's calendar and ticket hours for four sprints, because velocity is down and nobody can say why. Build, review, meetings: every hour lands in one of three segments.",
    read: "Total hours barely move, but the build segment shrinks sprint over sprint as review and meetings expand into it. Nothing got slower; the time just changed owners. That is a process conversation, not a performance one.",
    chart: (
      <Report title="Where the sprints went" chip="4 sprints">
        <StackedBar
          title="Team hours by activity"
          groups={["s1", "s2", "s3", "s4"]}
          series={[
            { name: "build", data: [220, 200, 175, 150] },
            { name: "review", data: [60, 75, 90, 105] },
            { name: "meetings", data: [50, 60, 72, 85] },
          ]}
          format={(v) => `${v}h`}
        />
      </Report>
    ),
  },
  {
    title: "The normalized variant: device mix by year",
    setup:
      "Passing `normalize` stretches every bar to 100%, so only composition remains. Five years of a storefront's traffic by device, for the meeting where someone asks whether the mobile redesign can wait another year.",
    read: "Mobile eats four points of share a year, every year, and tablet quietly halves. Absolute traffic grew the whole time, which the normalized form deliberately hides; that is the trade, and here it is the right one.",
    chart: (
      <AppCard title="Device mix" meta="share of traffic">
        <StackedBar
          normalize
          title="Device mix by year"
          groups={["'21", "'22", "'23", "'24", "'25"]}
          series={[
            { name: "mobile", data: [44, 50, 56, 61, 66] },
            { name: "desktop", data: [42, 38, 34, 31, 28] },
            { name: "tablet", data: [14, 12, 10, 8, 6] },
          ]}
        />
      </AppCard>
    ),
  },
  {
    title: "The normalized variant: four countries, one grid question",
    setup:
      "National electricity systems differ by an order of magnitude in size, which makes absolute comparisons useless. Normalizing to 100% lets a policy brief put Norway and Poland on the same axis honestly.",
    read: "Norway is nearly all renewables, France is a nuclear country with a renewable fringe, and Poland still runs three-quarters fossil. Same axis, four different energy identities, no unit conversion required.",
    chart: (
      <Slide title="Four grids, one axis" footer="policy brief">
        <StackedBar
          normalize
          title="Electricity mix"
          groups={["NOR", "FRA", "DEU", "POL"]}
          series={[
            { name: "renewables", data: [98, 26, 52, 27] },
            { name: "nuclear", data: [0, 65, 6, 0] },
            { name: "fossil", data: [2, 9, 42, 73] },
          ]}
        />
      </Slide>
    ),
  },
];
