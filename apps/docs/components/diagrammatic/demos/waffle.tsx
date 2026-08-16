import { Waffle } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper, Report, Slide } from "./scenes";

export const glyph = (
  <Waffle
    title="How often teams deploy"
    items={[
      { label: "daily", value: 38 },
      { label: "weekly", value: 27 },
      { label: "monthly", value: 22 },
      { label: "never", value: 13 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Survey: how often teams deploy",
    setup:
      "A DevOps report turns its headline survey question into a hundred cells, one per percentage point, because 'thirty-eight percent' is abstract and thirty-eight squares are not.",
    read: "You can literally count the daily deployers — 38 cells — and the 13-cell 'never' block sits in the corner like the industry's guilty conscience. Waffles beat pies when readers need to verify the number by eye.",
    chart: (
      <Report
        title="How teams deploy"
        chip="survey"
        note="Share of 1,200 respondents; one cell per percentage point."
      >
        <Waffle
          title="How often teams deploy"
          items={[
            { label: "daily", value: 38 },
            { label: "weekly", value: 27 },
            { label: "monthly", value: 22 },
            { label: "never", value: 13 },
          ]}
        />
      </Report>
    ),
  },
  {
    title: "How the city lives",
    setup:
      "A housing bureau presents household composition from the census. A hundred households, drawn as a hundred cells, so a policy audience argues about the city and not about the chart.",
    read: "Living alone is a third of the grid now — the cohort the two-bedroom housing stock wasn't built for. Each cell is one household in a hundred; the planners can point at the exact rows their zoning reform is aimed at.",
    chart: (
      <Paper
        kicker="Census"
        title="How the city lives"
        source="Source: municipal census"
      >
        <Waffle
          title="Household types"
          items={[
            { label: "alone", value: 33 },
            { label: "couple", value: 28 },
            { label: "family", value: 26 },
            { label: "shared", value: 13 },
          ]}
        />
      </Paper>
    ),
  },
  {
    title: "Earth's water, out of a hundred cells",
    setup:
      "A science-class poster answers 'why do we worry about water on a blue planet' with one grid: all of Earth's water, one hundred cells.",
    read: "Fresh liquid water is one cell. One. The ocean's 97 make scarcity countable in a way percentages never manage — the entire freshwater argument lives in the corner of the grid, and every student finds it.",
    chart: (
      <Slide title="Earth's water" footer="one cell = 1%">
        <Waffle
          title="Earth's water"
          items={[
            { label: "ocean", value: 97 },
            { label: "ice", value: 2 },
            { label: "fresh", value: 1 },
          ]}
        />
      </Slide>
    ),
  },
];
