import type { CSSProperties, ReactNode } from "react";
import {
  Bullet,
  Column,
  GroupedBar,
  Legend,
  Line,
  SmallMultiples,
  Sparkbar,
  Sparkline,
  StackedArea,
  WinLoss,
  formatCompact,
} from "diagrammatic";
import { DotWorldMap } from "diagrammatic/world";
import { Figure } from "./figure";

const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"];

export const TRAFFIC = [
  { name: "search", data: [42, 48, 51, 58, 61, 66, 64, 71, 77, 82] },
  { name: "direct", data: [30, 29, 33, 35, 34, 38, 41, 40, 43, 45] },
  { name: "referral", data: [12, 15, 14, 18, 22, 21, 25, 29, 28, 33] },
  { name: "social", data: [8, 9, 13, 12, 11, 15, 14, 18, 21, 19] },
];

export function QuickstartChart() {
  return (
    <Figure n={1} caption="Weekly sessions by channel, in thousands">
      <StackedArea
        title="Weekly sessions by channel"
        labels={WEEKS}
        series={TRAFFIC}
        yTicks={4}
        format={(v) => `${v}k`}
      />
    </Figure>
  );
}

const LATENCY = [
  { label: "edge", value: 38 },
  { label: "us-east", value: 64 },
  { label: "us-west", value: 71 },
  { label: "eu-west", value: 92 },
  { label: "ap-south", value: 148 },
  { label: "sa-east", value: 173 },
];

export function SizingChart({
  width,
  fontSize,
  n,
  caption,
}: {
  width?: number;
  fontSize?: number;
  n: number;
  caption: string;
}) {
  return (
    <Figure n={n} caption={caption}>
      <Column
        title="p50 latency by region"
        items={LATENCY}
        values
        format={(v) => `${v}ms`}
        {...(width !== undefined && { width })}
        {...(fontSize !== undefined && { fontSize })}
      />
    </Figure>
  );
}

const RELEASES = ["0.9", "0.10", "0.11", "0.12", "0.13"];
const SUITES = [
  { name: "unit", data: [412, 448, 503, 561, 590] },
  { name: "integration", data: [96, 120, 131, 155, 162] },
  { name: "browser", data: [41, 44, 58, 63, 77] },
];

const SKINS: { name: string; style: CSSProperties; note: ReactNode }[] = [
  {
    name: "Shipped defaults",
    style: {},
    note: "No stylesheet. Every color is a var() with the validated hue as its fallback.",
  },
  {
    name: "This site's chart tokens",
    style: {
      "--dg-c1": "var(--chart-1)",
      "--dg-c2": "var(--chart-2)",
      "--dg-c3": "var(--chart-3)",
      "--dg-grid": "var(--border)",
      "--dg-muted": "var(--muted-foreground)",
    } as CSSProperties,
    note: "What diagrammatic/shadcn.css does: categorical slots read --chart-*, grid reads --border.",
  },
  {
    name: "Mono ink",
    style: {
      "--dg-c1": "var(--foreground)",
      "--dg-c2": "color-mix(in oklab, var(--foreground) 55%, transparent)",
      "--dg-c3": "color-mix(in oklab, var(--foreground) 25%, transparent)",
      "--dg-font": "var(--font-mono)",
    } as CSSProperties,
    note: "Three tokens and a font. Fine for a print skin; past three series, keep the palette.",
  },
];

export function ThemeSkins() {
  return (
    <>
      {SKINS.map((skin, i) => (
        <Figure
          key={skin.name}
          n={i + 1}
          caption={`${skin.name}. ${skin.note}`}
        >
          <div style={skin.style}>
            <GroupedBar
              title="Tests per release"
              groups={RELEASES}
              series={SUITES}
              yTicks={4}
            />
          </div>
        </Figure>
      ))}
    </>
  );
}

const DAYS = Array.from({ length: 12 }, (_, i) => `M${i + 1}`);
const STARS = [
  180, 420, 760, 1500, 2600, 4100, 6900, 9800, 14200, 21500, 30100, 41800,
];

export function AxesCharts() {
  return (
    <>
      <Figure
        n={1}
        caption='yScale="log" with a count of ticks, which counts in decades'
      >
        <Line
          title="Cumulative stars"
          labels={DAYS}
          data={STARS}
          yScale="log"
          yTicks={3}
          format={formatCompact}
        />
      </Figure>
      <Figure n={2} caption="An explicit tick ladder and a target line">
        <Column
          title="Weekly deploys"
          items={[
            { label: "W1", value: 14 },
            { label: "W2", value: 19 },
            { label: "W3", value: 11 },
            { label: "W4", value: 23 },
            { label: "W5", value: 27 },
            { label: "W6", value: 21 },
            { label: "W7", value: 31 },
            { label: "W8", value: 29 },
          ]}
          yTicks={[
            { at: 0, label: "0" },
            { at: 10, label: "10" },
            { at: 20, label: "20" },
            { at: 30, label: "30" },
          ]}
          target={{ at: 25, label: "goal" }}
          highlight="max"
        />
      </Figure>
      <Figure
        n={3}
        caption="guides on both axes: a threshold in data units and a release in index units"
      >
        <Line
          title="p95 latency, ms"
          labels={HOURS}
          data={[212, 220, 231, 226, 240, 238, 251, 296, 318, 284, 262, 248]}
          yTicks={4}
          guides={[
            { at: 300, label: "SLO" },
            { at: 7, axis: "x", label: "deploy" },
          ]}
        />
      </Figure>
    </>
  );
}

const HOURS = Array.from(
  { length: 12 },
  (_, i) => `${String(i * 2).padStart(2, "0")}:00`,
);

export function LegendChart() {
  return (
    <Figure
      n={1}
      caption="legend={false} on the figure, and the DOM Legend on the page's own type"
    >
      <Legend names={TRAFFIC.map((s) => s.name)} className="mb-4 text-sm" />
      <StackedArea
        title="Weekly sessions by channel"
        labels={WEEKS}
        series={TRAFFIC}
        legend={false}
        format={(v) => `${v}k`}
      />
    </Figure>
  );
}

const SERVICES = [
  {
    name: "api",
    p95: [212, 220, 198, 240, 231, 260, 244, 238, 251, 229, 219, 205],
    wins: [1, 1, -1, 1, 1, -1, 1, 1, 1, 1],
    uptime: 99.97,
  },
  {
    name: "auth",
    p95: [88, 90, 86, 94, 91, 97, 112, 140, 128, 99, 92, 90],
    wins: [1, 1, 1, 1, -1, -1, 1, 1, 1, 1],
    uptime: 99.91,
  },
  {
    name: "search",
    p95: [340, 352, 361, 330, 318, 301, 296, 288, 276, 270, 262, 255],
    wins: [-1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    uptime: 99.99,
  },
  {
    name: "billing",
    p95: [150, 148, 151, 149, 160, 171, 182, 179, 190, 201, 214, 226],
    wins: [1, 1, 1, -1, 1, -1, -1, 1, -1, -1],
    uptime: 99.82,
  },
];

export function MicroTable() {
  return (
    <Figure
      n={1}
      caption="Sparkline, Sparkbar, and WinLoss at the height of the row's text"
    >
      <table className="w-full text-sm">
        <thead className="text-muted-foreground text-left text-xs">
          <tr>
            <th className="pb-3 font-normal">Service</th>
            <th className="pb-3 font-normal">p95, 12 h</th>
            <th className="pb-3 font-normal">Requests</th>
            <th className="pb-3 font-normal">SLO, 10 days</th>
            <th className="pb-3 text-right font-normal">Uptime</th>
          </tr>
        </thead>
        <tbody>
          {SERVICES.map((s) => (
            <tr key={s.name}>
              <td className="py-1.5 font-mono text-xs">{s.name}</td>
              <td className="py-1.5">
                <Sparkline data={s.p95} />
              </td>
              <td className="py-1.5">
                <Sparkbar data={s.p95.map((v) => 400 - v)} />
              </td>
              <td className="py-1.5">
                <WinLoss data={s.wins} />
              </td>
              <td className="py-1.5 text-right tabular-nums">{s.uptime}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Figure>
  );
}

export function InlineSparkline() {
  return (
    <Sparkline
      data={[12, 14, 13, 17, 21, 19, 24, 28, 27, 33]}
      title="Signups over ten days"
    />
  );
}

export function BulletRow() {
  return (
    <Figure
      n={2}
      caption="Bullet: a value against a target over three qualitative bands"
    >
      <Bullet
        title="Quarterly revenue against plan"
        value={4.1}
        target={4.6}
        bands={[3, 4, 5]}
        label="Revenue, $M"
        format={(v) => `$${v}M`}
      />
    </Figure>
  );
}

const REGIONS = [
  { name: "Americas", data: [20, 24, 23, 29, 34, 38, 41, 47] },
  { name: "Europe", data: [18, 19, 22, 21, 24, 27, 26, 30] },
  { name: "Asia Pacific", data: [9, 12, 17, 22, 26, 33, 41, 52] },
  { name: "Africa", data: [2, 3, 3, 4, 6, 7, 9, 12] },
];

export function SmallMultiplesChart() {
  return (
    <Figure
      n={1}
      caption="SmallMultiples: one form per panel, on one shared scale"
    >
      <SmallMultiples columns={2} title="Active seats by region, thousands">
        {REGIONS.map((region) => (
          <div key={region.name}>
            <p className="mb-1 text-xs font-medium">{region.name}</p>
            <Line
              title={region.name}
              data={region.data}
              yMax={52}
              width={300}
              aspect={2}
            />
          </div>
        ))}
      </SmallMultiples>
    </Figure>
  );
}

export function DotWorldSample() {
  return (
    <Figure
      n={4}
      caption="DotWorldMap: countries as halftone dots, colored by group, with flows between them"
    >
      <DotWorldMap
        title="Inference regions and the traffic they serve"
        groups={{
          "us-east": ["US", "CA", "MX", "BR", "AR", "CO"],
          "eu-west": ["GB", "IE", "FR", "DE", "NL", "ES", "IT", "PL", "SE"],
          "ap-south": ["IN", "SG", "ID", "AU", "JP", "KR"],
        }}
        flows={[
          { from: "US", to: "GB" },
          { from: "US", to: "BR" },
          { from: "DE", to: "IN" },
          { from: "SG", to: "AU" },
          { from: "JP", to: "US" },
        ]}
      />
    </Figure>
  );
}
