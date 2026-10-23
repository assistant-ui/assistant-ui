import { Venn } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

export const glyph = (
  <Venn
    title="Web and iOS"
    a={{ label: "web", value: 48_200 }}
    b={{ label: "iOS", value: 31_400 }}
    overlap={6_100}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Web and iOS, last 28 days",
    setup:
      "Two circles. Three labeled counts. Area is illustrative; the numbers carry the truth.",
    read: "6.1k people used both, about 8% of the 73.5k union. Web-only has 42.1k users, compared with 25.3k on iOS only.",
    source:
      "Unique users, last 28 days. Overlap counts the same person on both surfaces.",
    chart: (
      <FigTooltip
        entries={{
          web: "48.2k",
          iOS: "31.4k",
          both: "6.1k",
          "web only": "42.1k",
          "iOS only": "25.3k",
        }}
      >
        <Venn
          aspect={1.25}
          title="Web and iOS users"
          a={{ label: "web", value: 48_200 }}
          b={{ label: "iOS", value: 31_400 }}
          overlap={6_100}
        />
      </FigTooltip>
    ),
  },
];
