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
      "Twelve repositories, one median per row. Lollipops keep the list readable when twelve bars would ink the page shut. The stem is not the value; the dot is.",
    read: "Payments has the shortest median at 1.4 hours. Four repos exceed the eight-hour same-day mark. Legacy billing has the longest median at 36 hours, followed by design-sys at 18.5 and docs at 14.2.",
    source: "Median hours to first non-author review across 12 repositories.",
    chart: (
      <FigTooltip
        labels={REPOS.map((row) => row.label)}
        series={{ "median hours": REPOS.map((row) => row.value) }}
      >
        <Lollipop
          aspect={2}
          title="Hours to first review"
          items={REPOS}
          highlight="legacy-billing"
          yTicks={[
            { at: 0, label: "0" },
            { at: 8, label: "8h" },
            { at: 24, label: "24h" },
          ]}
          guides={[{ at: 8, label: "same day" }]}
          format={(v) => `${v}h`}
        />
      </FigTooltip>
    ),
  },
];
