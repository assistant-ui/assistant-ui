import { PopulationPyramid } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper, Report, Slide } from "./scenes";

export const glyph = (
  <PopulationPyramid
    title="Age structure"
    bands={["70+", "60s", "50s", "40s", "30s", "20s", "10s", "0-9"]}
    left={{ name: "men", data: [22, 38, 56, 68, 76, 60, 42, 22] }}
    right={{ name: "women", data: [28, 42, 58, 64, 70, 56, 40, 24] }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Age structure of a stable country",
    setup:
      "A statistics office publishes its census as the classic pyramid: men left, women right, a bar per decade of life. Demographers read these silhouettes the way sailors read clouds.",
    read: "A gentle barrel — wide working decades, tapering ends, no missing cohorts. The slight female surplus in the top bands is longevity doing what it always does. Nothing dramatic, which for a pension system is the best possible news.",
    chart: (
      <Paper
        kicker="Census"
        title="The shape of a nation"
        source="Source: national statistics office"
      >
        <PopulationPyramid
          title="Age structure"
          bands={["70+", "60s", "50s", "40s", "30s", "20s", "10s", "0-9"]}
          left={{ name: "men", data: [22, 38, 56, 68, 76, 60, 42, 22] }}
          right={{ name: "women", data: [28, 42, 58, 64, 70, 56, 40, 24] }}
        />
      </Paper>
    ),
  },
  {
    title: "A retirement town",
    setup:
      "A county planner charts a coastal retirement town before the school-budget vote, because the argument is demographic and the pyramid makes demography visceral.",
    read: "Top-heavy and thin at the base: the 60s and 70+ bands dominate while the child bands are slivers. The school district closed for a reason the silhouette states plainly — and the home-care shortage the shape predicts is next decade's agenda item.",
    chart: (
      <Report title="A retirement town" chip="census">
        <PopulationPyramid
          title="Retirement town"
          bands={["70+", "60s", "50s", "40s", "30s", "20s", "10s", "0-9"]}
          left={{ name: "men", data: [58, 72, 54, 30, 20, 14, 10, 8] }}
          right={{ name: "women", data: [74, 78, 56, 32, 22, 15, 11, 8] }}
        />
      </Report>
    ),
  },
  {
    title: "A college town in term time",
    setup:
      "The same census form, pointed at a university town in October. Term-time population counts students where they sleep, and the pyramid shows what that does to a place.",
    read: "One enormous cohort in the twenties — nearly half the town — then the shape empties in both directions. Everything about the local economy hangs off that bulge, and every landlord already knew.",
    chart: (
      <Slide title="A college town in October" footer="planning office">
        <PopulationPyramid
          title="College town"
          bands={["70+", "60s", "50s", "40s", "30s", "20s", "10s", "0-9"]}
          left={{ name: "men", data: [10, 14, 18, 22, 30, 88, 26, 12] }}
          right={{ name: "women", data: [12, 16, 20, 24, 32, 94, 28, 12] }}
        />
      </Slide>
    ),
  },
];
