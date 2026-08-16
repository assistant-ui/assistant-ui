import { DotWorldMap, WorldMap } from "diagrammatic/world";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { AppCard, Report } from "./scenes";

const USAGE: Record<string, number> = {
  CN: 64,
  US: 37,
  JP: 14,
  BR: 9.9,
  DE: 8.7,
  IN: 7.5,
  ID: 6.9,
  ES: 5.5,
  FR: 5.2,
  VN: 4.4,
  GB: 3.8,
  CA: 3.8,
  TW: 3.6,
  KR: 3.2,
  AU: 2.8,
  NL: 2.4,
  PL: 2.1,
  RU: 1.8,
  MX: 1.6,
  IT: 1.4,
  TR: 1.2,
  TH: 1.1,
  AR: 0.9,
  SE: 0.9,
  ZA: 0.8,
  EG: 0.7,
  PT: 0.7,
  NG: 0.6,
};

export const glyph = <WorldMap title="Token usage by country" values={USAGE} />;

export const examples: DemoExample[] = [
  {
    title: "Token usage by country, on real geography",
    setup:
      "The geography section of a public data page: real Natural Earth country outlines, each nation shaded by its share of token traffic and addressed by ISO code. The geometry ships pre-projected in a separate `diagrammatic/world` entry, so only pages that draw the planet pay for it.",
    read: "Two darks and a long pale tail: china and the united states carry half the traffic between them, japan anchors a clear third place, and the visible band across western europe and southeast asia is the product's second market forming in real time. Hover any country for its exact figure — unshaded means unmeasured, not zero.",
    chart: (
      <Report
        title="Token usage by geography"
        chip="T tokens"
        note="Total tokens per country, trailing 60 days. Unshaded countries: below reporting threshold."
      >
        <FigTooltip
          entries={{
            CN: "64T",
            US: "37T",
            JP: "14T",
            BR: "9.9T",
            DE: "8.7T",
            IN: "7.5T",
            ID: "6.9T",
            ES: "5.5T",
            FR: "5.2T",
            VN: "4.4T",
            GB: "3.8T",
            CA: "3.8T",
            TW: "3.6T",
            KR: "3.2T",
            AU: "2.8T",
            NL: "2.4T",
            PL: "2.1T",
            RU: "1.8T",
            MX: "1.6T",
            IT: "1.4T",
            TR: "1.2T",
            TH: "1.1T",
            AR: "0.9T",
            SE: "0.9T",
            ZA: "0.8T",
            EG: "0.7T",
            PT: "0.7T",
            NG: "0.6T",
          }}
        >
          <WorldMap title="Token usage by country" values={USAGE} />
        </FigTooltip>
      </Report>
    ),
  },
  {
    title: "The dotted variant: multi-cluster training",
    setup:
      "The same offline geometry sampled into a halftone dot grid — the map every infra company draws when training spans regions. Named clusters color their countries from the palette in group order, and `flows` draws symbol trails along lifted arcs, each trail blending from its source cluster's color into its target's.",
    read: "The primary cluster sits in the united states, the standby in canada one short hop north, and the async replica rides the long arc to australia — the trail's color shift is the handoff drawn in flight. Hover a country for its role or an arc for its round-trip time; the grey halftone world is context, not data.",
    chart: (
      <AppCard title="Multi-cluster training" meta="3 regions">
        <FigTooltip
          entries={{
            US: "primary · 4×H200",
            CA: "standby · 2×H200",
            AU: "async replica · 2×H100",
            NZ: "edge cache",
            "US → CA": "38ms RTT",
            "US → AU": "142ms RTT",
            "AU → NZ": "52ms RTT",
          }}
        >
          <DotWorldMap
            title="Multi-cluster training topology"
            groups={{
              primary: ["US"],
              standby: ["CA"],
              "async replica": ["AU", "NZ"],
            }}
            flows={[
              { from: "US", to: "CA" },
              { from: "US", to: "AU" },
              { from: "AU", to: "NZ" },
            ]}
          />
        </FigTooltip>
      </AppCard>
    ),
  },
];
