"use client";

import { useMemo, useState } from "react";
import { Area, Bar, Line } from "diagrammatic";
import {
  Fit,
  Root,
  Tooltip,
  Zoom,
  getSeriesColor,
  type MarkDatum,
  type MarkQuery,
} from "diagrammatic/interactive";
import { Chart, validateSpec, type ChartSpec } from "diagrammatic/spec";
import { WorldMap } from "diagrammatic/world";
import { cn } from "@/lib/utils";
import { Figure } from "./figure";

const tip =
  "bg-popover text-popover-foreground rounded-surface border-foreground/10 pointer-events-none w-max border px-2.5 py-1.5 text-xs shadow-md";

const MODELS = [
  { label: "atlas-1", value: 49.1 },
  { label: "nova", value: 46.3 },
  { label: "swift", value: 45.8 },
  { label: "atlas-0", value: 40.2 },
  { label: "quill", value: 31.6 },
  { label: "pico", value: 27.9 },
];

export function TooltipBar() {
  return (
    <Figure n={2} caption="Root and Tooltip around a server-safe Bar">
      <Root>
        <Bar
          title="Benchmark score"
          items={MODELS}
          format={(v) => v.toFixed(1)}
        />
        <Tooltip side="top">
          {({ datum }) => {
            const item = MODELS[datum.index ?? -1];
            if (!item) return null;
            return (
              <div className={tip}>
                <span className="font-medium">{item.label}</span>{" "}
                <span className="tabular-nums">{item.value.toFixed(1)}</span>
              </div>
            );
          }}
        </Tooltip>
      </Root>
    </Figure>
  );
}

const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"];
const TRAFFIC = [
  { name: "search", data: [42, 48, 51, 58, 61, 66, 64, 71, 77, 82] },
  { name: "direct", data: [30, 29, 33, 35, 34, 38, 41, 40, 43, 45] },
  { name: "referral", data: [12, 15, 14, 18, 22, 21, 25, 29, 28, 33] },
  { name: "social", data: [8, 9, 13, 12, 11, 15, 14, 18, 21, 19] },
];

export function HighlightSample() {
  const [selected, setSelected] = useState<string | null>(null);
  const [clicked, setClicked] = useState<MarkDatum | null>(null);
  const highlight: MarkQuery | null = selected ? { series: selected } : null;

  return (
    <Figure
      n={1}
      caption="A controlled highlight driven by buttons, hover highlight by series, a tooltip keyed by index, and onMarkClick"
    >
      <div className="mb-4 flex flex-wrap gap-1.5">
        {[null, ...TRAFFIC.map((s) => s.name)].map((name) => (
          <button
            key={name ?? "all"}
            type="button"
            aria-pressed={selected === name}
            onClick={() => setSelected(name)}
            className={cn(
              "rounded-control border-foreground/10 border px-2.5 py-1 text-xs transition-colors",
              selected === name
                ? "bg-foreground text-background"
                : "hover:bg-foreground/[0.05]",
            )}
          >
            {name ?? "All"}
          </button>
        ))}
      </div>
      <Root
        {...(highlight && { highlight })}
        highlightOnHover="series"
        onMarkClick={(datum) => setClicked(datum)}
      >
        <Line
          title="Weekly sessions by channel"
          labels={WEEKS}
          series={TRAFFIC}
          format={(v) => `${v}k`}
        />
        <Tooltip side="top" sideOffset={12}>
          {({ datum }) => {
            const i = datum.index;
            if (i === undefined) return null;
            return (
              <div className={tip}>
                <div className="text-muted-foreground mb-1">{WEEKS[i]}</div>
                {TRAFFIC.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        background: getSeriesColor(datum.element, s.name),
                      }}
                    />
                    <span className="flex-1">{s.name}</span>
                    <span className="tabular-nums">{s.data[i]}k</span>
                  </div>
                ))}
              </div>
            );
          }}
        </Tooltip>
      </Root>
      <p className="text-muted-foreground mt-4 text-xs tabular-nums">
        {clicked
          ? `onMarkClick: series ${clicked.series ?? "none"}, index ${clicked.index ?? "none"}`
          : "Click a point to read its address."}
      </p>
    </Figure>
  );
}

const VALUES: Record<string, number> = {
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

export function ZoomWorld() {
  return (
    <Figure
      n={1}
      caption="Zoom with a function child: the map redraws through the view window, so hairlines keep their width. Scroll to zoom about the pointer, drag to pan, and double-click to reset."
    >
      <Zoom max={8} className="rounded-document overflow-hidden">
        {(view) => (
          <WorldMap
            title="Active workspaces by country"
            values={VALUES}
            view={view}
          />
        )}
      </Zoom>
    </Figure>
  );
}

const SIGNUPS = [12, 14, 13, 17, 21, 19, 24, 28, 27, 33, 31, 36, 41, 39, 45];

export function FitSample() {
  return (
    <Figure
      n={3}
      caption="Fit measures its box and hands the width down; resize the window to watch type hold at 11px"
    >
      <Fit>
        {({ width }) => (
          <Area
            title="Daily signups"
            data={SIGNUPS}
            width={width}
            aspect={3}
            yTicks={3}
          />
        )}
      </Fit>
    </Figure>
  );
}

const INITIAL_SPEC = `{
  "v": "dg/1",
  "type": "funnel",
  "title": "Checkout funnel, last 7 days",
  "unit": "compact",
  "rates": true,
  "items": [
    { "label": "Cart", "value": 48200 },
    { "label": "Checkout", "value": 21400 },
    { "label": "Payment", "value": 13900 },
    { "label": "Order", "value": 11250 }
  ]
}`;

export function SpecPlayground() {
  const [source, setSource] = useState(INITIAL_SPEC);
  const result = useMemo((): { spec: ChartSpec } | { error: string } => {
    try {
      return { spec: validateSpec(JSON.parse(source)) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [source]);

  return (
    <figure className="not-prose my-8">
      <div className="grid gap-2 lg:grid-cols-2">
        <label className="flex flex-col">
          <span className="sr-only">Chart spec JSON</span>
          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
            className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document focus-visible:outline-ring min-h-80 flex-1 resize-y p-4 font-mono text-xs leading-relaxed [font-variant-ligatures:none] focus-visible:outline-2"
          />
        </label>
        <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex flex-col justify-center p-6">
          {"spec" in result ? (
            <Fit>
              {({ width }) => (
                <Chart
                  spec={{ ...result.spec, width: result.spec.width ?? width }}
                />
              )}
            </Fit>
          ) : (
            <p className="text-destructive font-mono text-xs [font-variant-ligatures:none]">
              {result.error}
            </p>
          )}
        </div>
      </div>
      <figcaption className="text-muted-foreground mt-3 text-xs leading-relaxed">
        <span className="tabular-nums">fig. 01 · </span>
        Edit the JSON. validateSpec checks the type and required fields, and
        Chart draws the result.
      </figcaption>
    </figure>
  );
}
