import { Dumbbell } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

export const glyph = (
  <Dumbbell
    title="Page load score, before and after"
    items={[
      { label: "home", from: 38, to: 84 },
      { label: "search", from: 52, to: 76 },
      { label: "checkout", from: 66, to: 58 },
      { label: "profile", from: 30, to: 54 },
      { label: "api docs", from: 44, to: 92 },
    ]}
    fromLabel="before"
    toLabel="after"
  />
);

export const examples: DemoExample[] = [
  {
    title: "Page load score, before and after",
    setup:
      "A performance sprint ends, and the report shows each page's score as a barbell: the pale dot is before, the dark dot after, the bar between them is the work.",
    read: "Api docs jumped 48 points and home 46 — the wins the sprint will be remembered for. Checkout is the bar that points the wrong way: it regressed mid-sprint and hid inside the team's average until this chart refused to average.",
    chart: (
      <Report
        title="Page scores, before / after"
        chip="sprint"
        note="Lighthouse performance scores before and after the sprint."
      >
        <FigTooltip
          labels={[
            "home",
            "search",
            "checkout",
            "profile",
            "api docs",
            "pricing",
            "blog",
            "dashboard",
            "settings",
          ]}
          series={{
            before: [38, 52, 66, 30, 44, 48, 61, 35, 57],
            after: [84, 76, 58, 54, 92, 71, 78, 62, 66],
          }}
        >
          <Dumbbell
            title="Page load score, before and after"
            items={[
              { label: "home", from: 38, to: 84 },
              { label: "search", from: 52, to: 76 },
              { label: "checkout", from: 66, to: 58 },
              { label: "profile", from: 30, to: 54 },
              { label: "api docs", from: 44, to: 92 },
              { label: "pricing", from: 48, to: 71 },
              { label: "blog", from: 61, to: 78 },
              { label: "dashboard", from: 35, to: 62 },
              { label: "settings", from: 57, to: 66 },
            ]}
            fromLabel="before"
            toLabel="after"
          />
        </FigTooltip>
      </Report>
    ),
  },
];
