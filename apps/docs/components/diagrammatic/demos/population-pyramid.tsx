import { PopulationPyramid } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const BANDS = [
  "80+",
  "70–79",
  "60–69",
  "50–59",
  "40–49",
  "30–39",
  "20–29",
  "10–19",
  "0–9",
];
const MEN = [2.4, 6.8, 8.1, 8.4, 7.6, 7.2, 6.1, 5.4, 4.7];
const WOMEN = [4.6, 8.4, 8.8, 8.5, 7.5, 7.0, 5.8, 5.1, 4.5];

export const glyph = (
  <PopulationPyramid
    title="Japan 2023"
    bands={BANDS}
    left={{ name: "men", data: MEN }}
    right={{ name: "women", data: WOMEN }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Japan, 2023",
    setup:
      "Two named sides of one census. Ten-year bands, men left, women right. The silhouette is the pension argument.",
    read: "The base is already narrower than the 40s. Women outnumber men from 60 upward, and the 80+ bar is almost two-to-one. This is not a stable country; it is an inverted pyramid with a working-age waist.",
    source: "Statistics Bureau of Japan, Population Estimates 2023. Millions.",
    chart: (
      <FigTooltip labels={BANDS} series={{ men: MEN, women: WOMEN }} unit="m">
        <PopulationPyramid
          density="figure"
          aspect={1.25}
          title="Japan 2023"
          bands={BANDS}
          left={{ name: "men", data: MEN }}
          right={{ name: "women", data: WOMEN }}
        />
      </FigTooltip>
    ),
  },
];
