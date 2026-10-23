"use client";

import { Legend } from "diagrammatic";
import { Root, Tooltip } from "diagrammatic/interactive";
import { DotWorldMap, WORLD } from "diagrammatic/world";

const NAMES = new Map(WORLD.map((country) => [country.iso, country.name]));
const REGIONS = {
  "us-east": ["US", "CA", "MX", "BR", "AR", "CO", "CL"],
  "eu-west": ["GB", "IE", "FR", "DE", "NL", "ES", "IT", "PL", "SE", "NO"],
  "ap-south": ["IN", "SG", "ID", "AU", "JP", "KR", "TH", "VN"],
};
const REGION_OF = new Map(
  Object.entries(REGIONS).flatMap(([region, list]) =>
    list.map((iso) => [iso, region]),
  ),
);

export default function InferenceRegionsMap() {
  return (
    <div data-dg-motion="">
      <Legend names={Object.keys(REGIONS)} className="mb-3 text-xs" />
      <Root highlightOnHover="series">
        <DotWorldMap
          title="Inference regions and the countries they serve"
          groups={REGIONS}
          flows={[
            { from: "BR", to: "US" },
            { from: "GB", to: "US" },
            { from: "IN", to: "DE" },
            { from: "AU", to: "SG" },
            { from: "JP", to: "US" },
            { from: "DE", to: "SG" },
          ]}
        />
        <Tooltip side="top">
          {({ datum }) => {
            if (!datum.series) return null;
            const text = datum.series2
              ? `${NAMES.get(datum.series)} to ${NAMES.get(datum.series2)}`
              : `${NAMES.get(datum.series) ?? datum.series}, ${REGION_OF.get(datum.series) ?? "not served"}`;
            return (
              <div className="bg-popover text-popover-foreground w-max rounded-lg border px-2.5 py-1.5 text-xs shadow-md">
                {text}
              </div>
            );
          }}
        </Tooltip>
      </Root>
    </div>
  );
}
