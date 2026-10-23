import { WorldMap } from "diagrammatic/world";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";

const RATE: Record<string, number> = {
  SG: 86,
  EE: 74,
  IL: 68,
  NL: 61,
  SE: 58,
  US: 52,
  GB: 49,
  DE: 47,
  KR: 46,
  JP: 44,
  CA: 41,
  AU: 39,
  FR: 36,
  TW: 34,
  CN: 28,
  BR: 18,
  IN: 14,
  ID: 11,
  MX: 10,
  PL: 22,
  ES: 21,
  IT: 19,
  VN: 12,
  TH: 9,
  AR: 8,
  ZA: 7,
  NG: 4,
  EG: 5,
  PT: 24,
  TR: 11,
};

export const glyph = <WorldMap title="Tokens per 1k WAU" values={RATE} />;

export const examples: DemoExample[] = [
  {
    title: "Tokens per 1k weekly actives",
    setup:
      "A rate on mapped regions. Unshaded areas have no entry in this illustrative sample.",
    read: "The two darkest mapped areas have rates of 86 and 74. The next two are 68 and 61. Most shaded areas have rates below 40.",
    source: "Billed tokens per 1,000 weekly actives.",
    chart: (
      <FigTooltip
        entries={Object.fromEntries(
          Object.entries(RATE).map(([code, value]) => [code, String(value)]),
        )}
      >
        <WorldMap title="Tokens per 1k WAU" values={RATE} />
      </FigTooltip>
    ),
  },
];
