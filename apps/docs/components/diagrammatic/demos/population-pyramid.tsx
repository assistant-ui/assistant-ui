import { PopulationPyramid } from "diagrammatic";
import type { DemoExample } from "./types";
import { Paper } from "./scenes";

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
];
