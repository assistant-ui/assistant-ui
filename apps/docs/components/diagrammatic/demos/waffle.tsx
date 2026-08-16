import { Waffle } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Slide } from "./scenes";

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
    title: "Earth's water, out of a hundred cells",
    setup:
      "A science-class poster answers 'why do we worry about water on a blue planet' with one grid: all of Earth's water, one hundred cells.",
    read: "Fresh liquid water is one cell. One. The ocean's 97 make scarcity countable in a way percentages never manage — the entire freshwater argument lives in the corner of the grid, and every student finds it.",
    chart: (
      <Slide title="Earth's water" footer="one cell = 1%">
        <FigTooltip entries={{ ocean: "97%", ice: "2%", fresh: "1%" }}>
          <Waffle
            title="Earth's water"
            items={[
              { label: "ocean", value: 97 },
              { label: "ice", value: 2 },
              { label: "fresh", value: 1 },
            ]}
          />
        </FigTooltip>
      </Slide>
    ),
  },
];
