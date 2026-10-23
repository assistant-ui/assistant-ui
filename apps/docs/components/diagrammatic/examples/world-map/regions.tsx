"use client";

import { useState } from "react";
import { Root, type MarkQuery } from "diagrammatic/interactive";
import { WorldMap } from "diagrammatic/world";

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

const REGIONS: Record<string, string[]> = {
  Americas: ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE"],
  Europe: [
    "GB",
    "IE",
    "FR",
    "DE",
    "NL",
    "BE",
    "ES",
    "PT",
    "IT",
    "CH",
    "AT",
    "SE",
    "NO",
    "DK",
    "FI",
    "PL",
    "CZ",
    "UA",
  ],
  "Asia Pacific": [
    "IN",
    "CN",
    "JP",
    "KR",
    "TW",
    "SG",
    "ID",
    "VN",
    "TH",
    "PH",
    "MY",
    "AU",
    "NZ",
  ],
};

export default function RegionMap() {
  const [region, setRegion] = useState<string | null>("Europe");
  const highlight: MarkQuery[] | null = region
    ? REGIONS[region]!.map((iso) => ({ series: iso }))
    : null;
  const total = region
    ? REGIONS[region]!.reduce((sum, iso) => sum + (WORKSPACES[iso] ?? 0), 0)
    : Object.values(WORKSPACES).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {[null, ...Object.keys(REGIONS)].map((name) => (
          <button
            key={name ?? "all"}
            type="button"
            aria-pressed={region === name}
            onClick={() => setRegion(name)}
            className="aria-pressed:bg-foreground aria-pressed:text-background rounded-md border px-2 py-1 text-xs"
          >
            {name ?? "World"}
          </button>
        ))}
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {total.toLocaleString("en-US")} workspaces
        </span>
      </div>
      <Root {...(highlight && { highlight })}>
        <WorldMap title="Active workspaces by region" values={WORKSPACES} />
      </Root>
    </div>
  );
}
