import { Lollipop } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const REPOS = [
  { label: "payments", value: 1.4 },
  { label: "checkout", value: 2.1 },
  { label: "api", value: 2.8 },
  { label: "mobile", value: 3.6 },
  { label: "web", value: 4.2 },
  { label: "search", value: 5.1 },
  { label: "growth", value: 6.4 },
  { label: "data", value: 7.8 },
  { label: "infra", value: 9.6 },
  { label: "docs", value: 14.2 },
  { label: "design-sys", value: 18.5 },
  { label: "legacy-billing", value: 36.0 },
];

export const glyph = (
  <Lollipop
    title="Hours to first review"
    items={REPOS.slice(0, 6)}
    format={(v) => `${v}h`}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Hours to first review, by repo",
    setup:
      "Twelve repositories, one median. Lollipops keep the list readable when twelve bars would ink the page shut. The stem is not the value; the dot is.",
    read: "Payments is reviewed in 1.4 hours. Legacy billing sits at 36, a working week of silence. Design-sys and docs are the quiet queue nobody staffs. Cutting the three longest still leaves a ladder, which is why this is a lollipop and not a highlight reel.",
    source: "First non-author review, last 60 days. n = 1,042 PRs.",
    chart: (
      <FigTooltip
        labels={REPOS.map((row) => row.label)}
        series={{ "median hours": REPOS.map((row) => row.value) }}
      >
        <Lollipop
          density="figure"
          aspect={2}
          title="Hours to first review"
          items={REPOS}
          highlight="legacy-billing"
          format={(v) => `${v}h`}
        />
      </FigTooltip>
    ),
  },
];
