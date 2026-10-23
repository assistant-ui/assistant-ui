"use client";

import { useState } from "react";
import { Root } from "diagrammatic/interactive";
import { WORLD, WorldMap } from "diagrammatic/world";

const WORKSPACES: Record<string, number> = {
  US: 412,
  CA: 88,
  MX: 41,
  BR: 96,
  AR: 22,
  CL: 14,
  CO: 18,
  PE: 9,
  GB: 160,
  IE: 31,
  FR: 122,
  DE: 198,
  NL: 74,
  BE: 22,
  ES: 64,
  PT: 19,
  IT: 58,
  CH: 37,
  AT: 18,
  SE: 44,
  NO: 21,
  DK: 23,
  FI: 17,
  PL: 49,
  CZ: 16,
  UA: 21,
  TR: 26,
  IL: 33,
  AE: 24,
  SA: 12,
  EG: 9,
  NG: 17,
  KE: 11,
  ZA: 19,
  IN: 231,
  PK: 14,
  BD: 9,
  CN: 174,
  JP: 141,
  KR: 92,
  TW: 38,
  SG: 47,
  ID: 39,
  VN: 29,
  TH: 21,
  PH: 18,
  MY: 16,
  AU: 72,
  NZ: 13,
};

const NAMES = new Map(WORLD.map((country) => [country.iso, country.name]));

export default function CountryPicker() {
  const [iso, setIso] = useState("JP");

  return (
    <div>
      <Root
        highlight={{ series: iso }}
        onMarkClick={(datum) => {
          if (datum.series) setIso(datum.series);
        }}
      >
        <WorldMap title="Pick a country" values={WORKSPACES} />
      </Root>
      <p className="text-muted-foreground mt-3 text-sm">
        <span className="text-foreground font-medium">{NAMES.get(iso)}</span>
        {WORKSPACES[iso] !== undefined
          ? ` has ${WORKSPACES[iso]} active workspaces.`
          : " has no active workspaces yet."}{" "}
        Click another country.
      </p>
    </div>
  );
}
