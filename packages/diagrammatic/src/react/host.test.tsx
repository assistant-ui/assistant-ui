import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Area } from "./charts/area";
import { Bar } from "./charts/bar";
import { Column } from "./charts/column";
import { Histogram } from "./charts/histogram";
import { Pie } from "./charts/pie";
import { Scatter } from "./charts/scatter";
import { Line } from "./charts/line";
import { SplitBar } from "./charts/split-bar";
import { CHAR_RATIO } from "../core/text";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_WIDTH,
  PAD,
  frame,
  resolveFontSize,
  typeScale,
  typeSize,
} from "./svg";

const DAYS = [12, 18, 15, 24, 30, 26, 34];
const SERIES = [
  { name: "search", data: DAYS },
  { name: "direct", data: [8, 9, 12, 11, 16, 14, 19] },
];

describe("size", () => {
  it("renders at the default width and shrinks to a narrower host", () => {
    const html = renderToStaticMarkup(<Area data={DAYS} />);
    expect(html).toContain(`width="${DEFAULT_WIDTH}"`);
    expect(html).toContain('height="384"');
    expect(html).toContain('viewBox="0 0 640 384"');
    expect(html).toContain("max-width:100%");
    expect(html).toContain("height:auto");
    expect(html).toContain("display:block");
  });

  it("renders at a stated pixel width, height following aspect", () => {
    const html = renderToStaticMarkup(
      <Area data={DAYS} width={480} aspect={2} />,
    );
    expect(html).toContain('width="480"');
    expect(html).toContain('height="240"');
    expect(html).toContain('viewBox="0 0 480 240"');
  });

  it("keeps a stated height over the derived one", () => {
    const html = renderToStaticMarkup(
      <Area data={DAYS} width={420} height={90} />,
    );
    expect(html).toContain('height="90"');
    expect(html).toContain('viewBox="0 0 420 90"');
  });

  it("falls back to the default width on a size that is not one", () => {
    const html = renderToStaticMarkup(<Area data={DAYS} width={-5} />);
    expect(html).toContain('width="640"');
  });
});

describe("type", () => {
  it("prints from one root size, every role in em of it", () => {
    const html = renderToStaticMarkup(
      <Line data={DAYS} labels={["a", "b"]} yTicks={3} />,
    );
    expect(html).toContain(`font-size="${DEFAULT_FONT_SIZE}"`);
    expect(html).toContain('font-size="1.1em"');
    for (const match of html.matchAll(/<text[^>]*font-size="([^"]+)"/g)) {
      expect(match[1]).toMatch(/em$/);
    }
  });

  it("inherits the host font and lines numerals up", () => {
    const html = renderToStaticMarkup(<Area data={DAYS} />);
    expect(html).toContain("font-family:var(--dg-font, inherit)");
    expect(html).toContain("font-variant-numeric:tabular-nums");
  });

  it("grows the frame allowances with the type", () => {
    const small = frame({ fontSize: 11 }, 5 / 3, {
      labels: true,
      legend: true,
    });
    const large = frame({ fontSize: 16 }, 5 / 3, {
      labels: true,
      legend: true,
    });
    expect(large.bottom).toBeLessThan(small.bottom);
    expect(large.top).toBeGreaterThan(small.top);
    expect(large.left).toBeGreaterThan(small.left);
    expect(typeScale(16).value.px).toBeGreaterThan(typeScale(11).value.px);
  });

  it("sizes the value gutter from the printed ticks", () => {
    const short = frame({}, 5 / 3, { ticks: [{ at: 1, label: "1" }] });
    const long = frame({}, 5 / 3, {
      ticks: [{ at: 1_000_000, label: "1,000,000" }],
    });
    expect(long.left).toBeGreaterThan(short.left);
    expect(frame({}, 5 / 3, { ticks: true }).left).toBeGreaterThan(PAD);
  });

  it("holds an untrusted size inside the band", () => {
    expect(resolveFontSize(400)).toBe(48);
    expect(resolveFontSize(0.5)).toBe(6);
    expect(resolveFontSize(Number.NaN)).toBe(DEFAULT_FONT_SIZE);
    expect(resolveFontSize(undefined)).toBe(DEFAULT_FONT_SIZE);
  });

  it("derives a chart's own printed sizes from the same knob", () => {
    const T = typeScale(12);
    expect(typeSize(T, 2)).toEqual({ px: 24, fontSize: "2em" });
    expect(typeSize(typeScale(11), 1.5).px).toBe(16.5);
  });

  it("renders the same figure at every host width", () => {
    const wide = renderToStaticMarkup(
      <Area data={DAYS} labels={["a", "b"]} width={960} />,
    );
    const narrow = renderToStaticMarkup(
      <Area data={DAYS} labels={["a", "b"]} width={320} />,
    );
    expect(wide).toContain('font-size="11"');
    expect(narrow).toContain('font-size="11"');
  });
});

describe("tick counts", () => {
  it("draws no value axis until one is asked for", () => {
    expect(renderToStaticMarkup(<Area data={DAYS} />)).not.toContain(
      'data-part="grid"><line',
    );
    const asked = renderToStaticMarkup(<Area data={DAYS} yTicks={4} />);
    expect(asked).toContain('data-part="grid"');
    expect(asked).toContain("30");
  });

  it("resolves a count on the chart's own domain", () => {
    const html = renderToStaticMarkup(
      <Column items={[{ label: "a", value: 900 }]} yTicks={4} />,
    );
    for (const label of ["200", "400", "600", "800"]) {
      expect(html).toContain(`>${label}</text>`);
    }
  });

  it("counts in decades on log paper", () => {
    const html = renderToStaticMarkup(
      <Scatter
        points={[
          { x: 1, y: 2 },
          { x: 1000, y: 5000 },
        ]}
        xScale="log"
        yScale="log"
        xTicks={3}
        yTicks={3}
      />,
    );
    expect(html).toContain(">1k</text>");
    expect(html).toContain(">100</text>");
  });

  it("gives the histogram the same pair", () => {
    const html = renderToStaticMarkup(
      <Histogram bins={[2, 9, 14, 6, 1]} yTicks={3} />,
    );
    expect(html).toContain('data-part="grid"');
    expect(html).toContain(">10</text>");
  });

  it("still takes an explicit ladder, which widens the domain", () => {
    const html = renderToStaticMarkup(
      <Area data={DAYS} yTicks={[{ at: 50, label: "target" }]} />,
    );
    expect(html).toContain(">target</text>");
  });
});

describe("area series", () => {
  it("draws one filled band per series, each on its own token", () => {
    const html = renderToStaticMarkup(<Area series={SERIES} />);
    expect(html).toContain("var(--dg-c1, #3b82f6)");
    expect(html).toContain("var(--dg-c2, #059669)");
    expect(html).toContain('data-series="search"');
    expect(html).toContain('data-series="direct"');
  });

  it("names the series in a legend and addresses every point", () => {
    const html = renderToStaticMarkup(<Area series={SERIES} />);
    expect(html).toContain('data-part="legend"');
    expect(html).toContain('data-i="6"');
  });

  it("keeps the single-series figure on ink", () => {
    const one = renderToStaticMarkup(<Area data={DAYS} labels={["a", "b"]} />);
    expect(one).not.toContain('data-part="legend"');
    expect(one).not.toContain("var(--dg-c1");
    expect(one).toContain(">34</text>");
  });
});

describe("split bar", () => {
  it("takes a share past two parts", () => {
    const html = renderToStaticMarkup(
      <SplitBar
        items={[
          { label: "pro", value: 62 },
          { label: "team", value: 30 },
          { label: "free", value: 8 },
        ]}
      />,
    );
    expect([...html.matchAll(/data-part="mark"/g)]).toHaveLength(3);
    expect(html).toContain('data-series="free"');
    expect(html).toContain("var(--dg-c3, #8b5cf6)");
  });

  it("floors a sliver so it stays visible and hoverable", () => {
    const html = renderToStaticMarkup(
      <SplitBar
        items={[
          { label: "bulk", value: 999 },
          { label: "rest", value: 1 },
        ]}
      />,
    );
    const widths = [...html.matchAll(/width="([\d.]+)"/g)].map((m) =>
      Number(m[1]),
    );
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(0.3);
  });

  it("keeps the two-part figure exactly as it was", () => {
    const html = renderToStaticMarkup(
      <SplitBar
        a={{ label: "yes", value: 60 }}
        b={{ label: "no", value: 40 }}
      />,
    );
    expect(html).toContain('x="0"');
    expect(html).toContain('width="35.3"');
    expect(html).toContain('x="36.7"');
    expect(html).toContain('width="23.3"');
  });
});

describe("legends", () => {
  const SLICES = [
    { label: "pro", value: 62 },
    { label: "team", value: 30 },
  ];

  it("draws the pie legend by default", () => {
    const html = renderToStaticMarkup(<Pie items={SLICES} inner={0.64} />);
    expect(html).toContain('data-part="legend"');
    expect(html).toContain(">pro</text>");
  });

  it("hands the pie's legend to the host on request", () => {
    const html = renderToStaticMarkup(
      <Pie
        items={SLICES}
        inner={0.64}
        legend={false}
        center="92"
        centerLabel="orgs"
      />,
    );
    expect(html).not.toContain('data-part="legend"');
    expect(html).not.toContain(">pro</text>");
    expect(html).toContain(">92</text>");
  });

  it("centers the ring once the legend is gone", () => {
    const withLegend = renderToStaticMarkup(<Pie items={SLICES} />);
    const alone = renderToStaticMarkup(<Pie items={SLICES} />);
    const startX = (html: string) => Number(html.match(/d="M([\d.]+) /)![1]);
    expect(startX(alone.replace(withLegend, withLegend))).toBeGreaterThan(0);
    const centered = renderToStaticMarkup(
      <Pie items={SLICES} legend={false} />,
    );
    expect(startX(centered)).toBe(320);
    expect(startX(withLegend)).toBeLessThan(320);
  });
});

describe("scatter categories", () => {
  const POINTS = [
    { x: 4, y: 9, series: "hot" },
    { x: 8, y: 3, series: "cool" },
    { x: 12, y: 6, series: "hot" },
  ];

  it("colors and names a category per point", () => {
    const html = renderToStaticMarkup(<Scatter points={POINTS} />);
    expect(html).toContain("var(--dg-c1, #3b82f6)");
    expect(html).toContain("var(--dg-c2, #059669)");
    expect(html).toContain('data-series="hot"');
    expect(html).toContain('data-part="legend"');
  });

  it("keeps one color and no legend without categories", () => {
    const html = renderToStaticMarkup(
      <Scatter points={POINTS.map(({ x, y }) => ({ x, y }))} />,
    );
    expect(html).not.toContain("data-series");
    expect(html).not.toContain('data-part="legend"');
  });
});

describe("text that does not fit", () => {
  const LONG = "anthropic/claude-opus-5-20260101-preview";

  it("cuts a row label to its margin instead of clipping it", () => {
    const html = renderToStaticMarkup(
      <Bar items={[{ label: LONG, value: 12 }]} />,
    );
    expect(html).not.toContain(LONG);
    expect(html).toContain("…");
    expect(html).not.toMatch(/<text[^>]*x="-/);
  });

  it("cuts legend names to hold the box", () => {
    const html = renderToStaticMarkup(
      <Line
        series={[
          { name: "checkout-service-latency-p99", data: [1, 2, 3] },
          { name: "search-service-latency-p99", data: [2, 3, 4] },
          { name: "billing-service-latency-p99", data: [3, 4, 5] },
          { name: "identity-service-latency-p99", data: [4, 5, 6] },
        ]}
      />,
    );
    const ends = [...html.matchAll(/<text x="([\d.]+)"[^>]*>([^<]+)</g)].map(
      ([, x, name]) =>
        Number(x) + name!.length * DEFAULT_FONT_SIZE * CHAR_RATIO,
    );
    expect(Math.max(...ends)).toBeLessThanOrEqual(DEFAULT_WIDTH - PAD);
  });

  it("leaves a legend that already fits untouched", () => {
    const html = renderToStaticMarkup(
      <Line
        series={[
          { name: "search", data: [1, 2, 3] },
          { name: "direct", data: [2, 3, 4] },
        ]}
      />,
    );
    expect(html).toContain(">search<");
    expect(html).not.toContain("…");
  });

  it("keeps an end value inside the box", () => {
    const html = renderToStaticMarkup(
      <Line
        data={[1, 2, 3, 4_000_000]}
        format={(v) => v.toLocaleString("en-US")}
      />,
    );
    const label = html.match(/<text x="([\d.]+)"[^>]*>4,000,000</)!;
    expect(Number(label[1]) + textEnd("4,000,000")).toBeLessThanOrEqual(
      DEFAULT_WIDTH - PAD + 0.5,
    );
  });
});

const textEnd = (text: string) =>
  (text.length * typeScale().value.px * CHAR_RATIO) / 2;

describe("summary", () => {
  it("carries a summary into the figure for assistive tech", () => {
    const html = renderToStaticMarkup(
      <Column
        items={[{ label: "a", value: 1 }]}
        title="Signups"
        summary="Signups per day, rising through the quarter."
      />,
    );
    expect(html).toContain(
      "<desc>Signups per day, rising through the quarter.</desc>",
    );
  });
});

describe("view window", () => {
  it("draws the whole box by default", () => {
    expect(
      renderToStaticMarkup(<Column items={[{ label: "a", value: 1 }]} />),
    ).toContain('viewBox="0 0 640 384"');
  });

  it("crops to a window given in fractions of the box", () => {
    const html = renderToStaticMarkup(
      <Column
        items={[{ label: "a", value: 1 }]}
        view={{ x: 0.25, y: 0.5, w: 0.5, h: 0.5 }}
      />,
    );
    expect(html).toContain('viewBox="160 192 320 192"');
  });
});

describe("micro forms", () => {
  const PARTS = [
    { label: "pro", value: 62 },
    { label: "free", value: 38 },
  ];

  it("sits inline by default", () => {
    const html = renderToStaticMarkup(<SplitBar items={PARTS} />);
    expect(html).toContain("display:inline-block");
  });

  it("fills the host as a row on request", () => {
    const html = renderToStaticMarkup(<SplitBar items={PARTS} block />);
    expect(html).toContain("display:block");
    expect(html).toContain("width:100%");
    expect(html).toContain('preserveAspectRatio="none"');
  });
});
