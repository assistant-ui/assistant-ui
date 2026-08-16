import { Line } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report, Slide } from "./scenes";

export const glyph = (
  <Line
    title="Monthly active users"
    data={[34, 46, 40, 58, 52, 66, 60, 76, 90]}
    labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]}
    format={(v) => `${v}k`}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Monthly active users, January to September",
    setup:
      "A product team pulls the monthly active user count ahead of the September board meeting. The investor deck needs one chart that says how the year is going without a paragraph of caveats.",
    read: "Up and to the right, but not smoothly: March and July both gave back ground before the climb resumed. The trend survives both dips, which is exactly the sentence the board needs.",
    chart: (
      <AppCard title="Monthly active users" meta="Jan – Sep">
        <Line
          title="Monthly active users"
          data={[34, 46, 40, 58, 52, 66, 60, 76, 90]}
          labels={[
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
          ]}
          format={(v) => `${v}k`}
        />
      </AppCard>
    ),
  },
  {
    title: "Median home price in one metro, 2016 to 2024",
    setup:
      "A couple has watched the same neighborhood for eight years, saving screenshots of listing prices. This is the city's median sale price, one point per year, the chart every housing argument eventually reaches for.",
    read: "Flat through 2019, a pandemic jump of nearly $100k in two years, then a slow cooldown that still lands 40% above where they started watching. The line explains why waiting felt rational and cost so much.",
    chart: (
      <Paper
        kicker="Housing"
        title="The decade the waiting cost"
        source="Source: metro sales registry"
      >
        <Line
          title="Median home price"
          data={[312, 318, 326, 331, 368, 425, 462, 448, 439]}
          labels={[
            "2016",
            "2017",
            "2018",
            "2019",
            "2020",
            "2021",
            "2022",
            "2023",
            "2024",
          ]}
          format={(v) => `$${v}k`}
        />
      </Paper>
    ),
  },
  {
    title: "Resting heart rate across eight weeks of training",
    setup:
      "A runner starts a couch-to-10k plan and lets the watch do the bookkeeping. Every Sunday it logs the week's average resting heart rate, the quietest number fitness has.",
    read: "Ten beats in eight weeks, with barely any drama on the way down. The y range spans only twelve beats; stretched onto a zero baseline this progress would vanish, which is why resting-rate charts never start at zero.",
    chart: (
      <AppCard title="Resting heart rate" meta="8-week plan">
        <Line
          title="Resting heart rate"
          data={[68, 67, 65, 66, 63, 62, 60, 58]}
          labels={["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"]}
          format={(v) => `${v} bpm`}
        />
      </AppCard>
    ),
  },
  {
    title: "The step variant: policy rate across nine meetings",
    setup:
      "A central bank moves its rate only on scheduled meeting days, so a smooth line would invent motion that never happened. Passing `step` makes the line hold each value until the next decision.",
    read: "A staircase up through the hiking cycle, a three-meeting pause at 4%, then the first cut. The flats are the truth: between meetings the rate simply is what it is, and interpolating would be fiction.",
    chart: (
      <Report title="Policy rate" chip="per meeting">
        <Line
          step
          title="Policy rate by meeting"
          data={[0.5, 1, 1.75, 2.5, 3.25, 4, 4, 4, 3.75]}
          labels={["", "Mar", "", "Jun", "", "Sep", "", "Dec", ""]}
          format={(v) => `${v}%`}
        />
      </Report>
    ),
  },
  {
    title: "The step variant: seat price across eight releases",
    setup:
      "A SaaS pricing page changes only when a release ships, and the growth team wants the history on one slide. Each plateau is a price that real customers paid for months.",
    read: "Two price cuts hide inside a rising staircase: v4 and v6 both walked the price back after an ambitious hike. The step form makes the retreats legible where a smoothed line would blur them into wobble.",
    chart: (
      <Slide title="Seat price, by release" footer="pricing review · q3">
        <Line
          step
          title="Seat price across releases"
          data={[19, 19, 29, 25, 39, 35, 49, 59]}
          labels={["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"]}
          format={(v) => `$${v}`}
        />
      </Slide>
    ),
  },
  {
    title: "The regime bands: response length under the alternating penalty",
    setup:
      "A training-dynamics chart with its regimes annotated: mean response length over training steps, and a shaded `regions` band marking where the alternating length penalty was active. The band is addressable like any mark, so prose below the chart can light it up through the highlight system.",
    read: "Length climbs unchecked until the penalty regime begins, bends down inside the band, and stabilizes after it lifts — the annotation turns a wiggly line into a causal story. Region bands are data props (from, to, label), not decoration.",
    chart: (
      <Report title="Response length across training" chip="tokens">
        <Line
          title="Mean response length"
          data={[220, 262, 331, 418, 396, 322, 287, 268, 274, 279]}
          regions={[{ from: 3, to: 6, label: "alt penalty" }]}
          labels={["0", "2k", "4k", "6k", "8k"]}
          format={(v) => `${v}t`}
        />
      </Report>
    ),
  },
];
