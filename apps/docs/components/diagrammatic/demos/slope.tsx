import { Slope } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Share of media time, 2020 against 2025",
    setup:
      "A media researcher has two surveys, five years apart, and one slide to show what happened between them. Two columns, one line per medium: the slope chart strips the story to its verbs.",
    read: "Video more than doubles while TV halves, and their lines cross mid-chart — the handover, drawn. Social and music barely tilt, which is its own finding: the revolution took time from television, not from everything.",
    chart: (
      <Slope
        title="Share of media time"
        items={[
          { label: "video", from: 30, to: 68 },
          { label: "social", from: 60, to: 50 },
          { label: "music", from: 45, to: 40 },
          { label: "tv", from: 70, to: 30 },
        ]}
        highlight="video"
        labels={["2020", "2025"]}
      />
    ),
  },
  {
    title: "Commute mode share, 2015 against 2025",
    setup:
      "A city's transport office compares the census question 'how do you usually get to work' across a decade. Four modes enter, and one line that did not exist meaningfully in 2015 leaves at the top of the chart.",
    read: "Remote work triples and every physical mode pays for it — car most in absolute points, transit most in proportion. The steepness ranks the disruption at a glance, which is what slopes are for.",
    chart: (
      <Slope
        title="Commute mode share"
        items={[
          { label: "car", from: 62, to: 48 },
          { label: "transit", from: 24, to: 18 },
          { label: "bike", from: 6, to: 10 },
          { label: "remote", from: 8, to: 24 },
        ]}
        highlight="remote"
        labels={["2015", "2025"]}
      />
    ),
  },
  {
    title: "Course pass rates before and after the redesign",
    setup:
      "A department rebuilt four intro courses around problem sessions and needs to show the dean whether it worked. Pass rates, one line per course, before and after.",
    read: "Three courses climb and algebra climbs most — fourteen points. Statistics slips, and the slope makes the outlier impossible to bury in an average: the redesign works, except where it doesn't, and now that course has a name.",
    chart: (
      <Slope
        title="Pass rate by course"
        items={[
          { label: "algebra", from: 64, to: 78 },
          { label: "physics", from: 58, to: 66 },
          { label: "chemistry", from: 71, to: 74 },
          { label: "statistics", from: 69, to: 62 },
        ]}
        highlight="algebra"
        labels={["before", "after"]}
      />
    ),
  },
];
