import { Horizon } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

export const glyph = (
  <Horizon
    title="Server load across 24 hours"
    data={[
      2, 3.5, 5, 4.2, 6, 7.5, 6.2, 8, 9.5, 8.5, 7, 9, 6.5, 5, 6, 4.5, 3, 4,
    ]}
    bands={3}
    labels={["00", "06", "12", "18", "24"]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Server load across 24 hours, folded three times",
    setup:
      "A dashboard has forty servers and forty rows of vertical space, so each load chart gets one short band. The horizon form folds a tall line into layers: the darker the band, the higher the fold.",
    read: "The dark blocks around hours 8 and 11 are the load peaks, readable in a strip a line chart could not survive in. Readers need the key — dark means folded, not different — so keep the fold count at two or three.",
    chart: (
      <Terminal title="fleet load — 24h">
        <FigTooltip
          labels={[
            "0h00",
            "0h45",
            "1h30",
            "2h15",
            "3h00",
            "3h45",
            "4h30",
            "5h15",
            "6h00",
            "6h45",
            "7h30",
            "8h15",
            "9h00",
            "9h45",
            "10h30",
            "11h15",
            "12h00",
            "12h45",
            "13h30",
            "14h15",
            "15h00",
            "15h45",
            "16h30",
            "17h15",
            "18h00",
            "18h45",
            "19h30",
            "20h15",
            "21h00",
            "21h45",
            "22h30",
            "23h15",
          ]}
          series={{
            load: [
              2, 2.4, 3, 3.6, 4.4, 5, 4.2, 5.4, 7, 8.6, 9.5, 8.8, 7.4, 8.2, 9.2,
              9.6, 8.4, 7, 6.2, 6.8, 7.4, 6.4, 5.4, 5, 5.6, 6.2, 5.2, 4.4, 3.8,
              3.2, 2.8, 2.4,
            ],
          }}
          unit="k rps"
        >
          <Horizon
            title="Server load across 24 hours"
            data={[
              2, 2.4, 3, 3.6, 4.4, 5, 4.2, 5.4, 7, 8.6, 9.5, 8.8, 7.4, 8.2, 9.2,
              9.6, 8.4, 7, 6.2, 6.8, 7.4, 6.4, 5.4, 5, 5.6, 6.2, 5.2, 4.4, 3.8,
              3.2, 2.8, 2.4,
            ]}
            bands={3}
            labels={["00", "06", "12", "18", "24"]}
          />
        </FigTooltip>
      </Terminal>
    ),
  },
];
