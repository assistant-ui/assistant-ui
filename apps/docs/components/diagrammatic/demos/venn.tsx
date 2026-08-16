import { Venn } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { AppCard } from "./scenes";

export const glyph = (
  <Venn
    title="Web and app users"
    a={{ label: "web only", value: 4200 }}
    b={{ label: "app only", value: 3100 }}
    overlap={1300}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Web and app users",
    setup:
      "A product team debates whether web and app are 'the same users on two surfaces' or two audiences. Two circles, three honest numbers, and the debate has a referee.",
    read: "The overlap is 1,300 of 8,600 — fifteen percent. These are mostly two audiences, and the roadmap's 'seamless cross-device sync' pitch just met the population it actually serves. The circles are sized to their counts; the geometry is the finding.",
    chart: (
      <AppCard title="Web × app" meta="8.6k users">
        <FigTooltip entries={{ "web only": "4.2k", "app only": "3.1k" }}>
          <Venn
            title="Web and app users"
            a={{ label: "web only", value: 4200 }}
            b={{ label: "app only", value: 3100 }}
            overlap={1300}
          />
        </FigTooltip>
      </AppCard>
    ),
  },
];
