import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ABSTRACT_TILES, HEX_TILES, type Tile } from "../../core/tiles";
import { round } from "../../core/geometry";
import { frame } from "../svg";
import { Choropleth } from "./choropleth";
import { DotMap } from "./dot-map";
import { FlowMap } from "./flow-map";
import { SymbolMap } from "./symbol-map";

const tiles: Tile[] = [
  { col: 0, row: 0, x: 300, y: -100 },
  { col: 1, row: 1, x: 600, y: 150 },
];

function layout(html: string) {
  const viewBox = /viewBox="([^"]+)"/.exec(html)?.[1]?.split(" ").map(Number);
  const transform =
    /<g transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)"/.exec(
      html,
    );
  expect(viewBox).toHaveLength(4);
  expect(transform).not.toBeNull();
  const [vx = NaN, vy = NaN, vw = NaN, vh = NaN] = viewBox!;
  const tx = Number(transform![1]);
  const ty = Number(transform![2]);
  const scale = Number(transform![3]);
  const X = (x: number) => tx + x * scale;
  const Y = (y: number) => ty + y * scale;
  return { vx, vy, vw, vh, scale, X, Y };
}

function expectTilesInside(html: string) {
  const { vx, vy, vw, vh, X, Y } = layout(html);
  for (const tile of tiles) {
    expect(X(tile.x)).toBeGreaterThanOrEqual(vx);
    expect(Y(tile.y)).toBeGreaterThanOrEqual(vy);
    expect(X(tile.x + 10.4)).toBeLessThanOrEqual(vx + vw);
    expect(Y(tile.y + 10.8)).toBeLessThanOrEqual(vy + vh);
  }
}

function expectPointInside(html: string, x: number, y: number) {
  const { vx, vy, vw, vh } = layout(html);
  expect(x).toBeGreaterThanOrEqual(vx);
  expect(x).toBeLessThanOrEqual(vx + vw);
  expect(y).toBeGreaterThanOrEqual(vy);
  expect(y).toBeLessThanOrEqual(vy + vh);
}

describe("tile hosts with custom tiles", () => {
  it("Choropleth fits custom tiles", () => {
    const html = renderToStaticMarkup(
      <Choropleth values={[1, 2]} tiles={tiles} />,
    );
    expectTilesInside(html);
  });

  it("Choropleth fits a custom hex tile including its radius", () => {
    const hex: Tile = {
      col: 0,
      row: 0,
      x: 300,
      y: -100,
      kind: "hex",
      size: 40,
    };
    const html = renderToStaticMarkup(
      <Choropleth values={[1]} tiles={[hex]} />,
    );
    const { vx, vy, vw, vh, X, Y } = layout(html);
    const rx = (40 * Math.sqrt(3)) / 2;
    expect(X(hex.x - rx)).toBeGreaterThanOrEqual(vx);
    expect(X(hex.x + rx)).toBeLessThanOrEqual(vx + vw);
    expect(Y(hex.y - 40)).toBeGreaterThanOrEqual(vy);
    expect(Y(hex.y + 40)).toBeLessThanOrEqual(vy + vh);
  });

  it("DotMap fits custom tiles and dots", () => {
    const html = renderToStaticMarkup(<DotMap counts={[1, 1]} tiles={tiles} />);
    expectTilesInside(html);
    const dots = [
      ...html.matchAll(
        /<circle cx="([-\d.]+)" cy="([-\d.]+)"[^>]*data-part="mark"/g,
      ),
    ];
    expect(dots).toHaveLength(2);
    for (const dot of dots)
      expectPointInside(html, Number(dot[1]), Number(dot[2]));
  });

  it("FlowMap fits custom tiles, origin, and routes", () => {
    const html = renderToStaticMarkup(
      <FlowMap
        origin={{ col: 0, row: 0 }}
        routes={[{ col: 1, row: 1, value: 1 }]}
        tiles={tiles}
      />,
    );
    expectTilesInside(html);
    const route =
      /<path d="M([-\d.]+) ([-\d.]+) Q[-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)"/.exec(
        html,
      );
    expect(route).not.toBeNull();
    expectPointInside(html, Number(route![1]), Number(route![2]));
    expectPointInside(html, Number(route![3]), Number(route![4]));
  });

  it("SymbolMap fits custom tiles and symbols", () => {
    const html = renderToStaticMarkup(
      <SymbolMap marks={[{ col: 1, row: 1, value: 1 }]} tiles={tiles} />,
    );
    expectTilesInside(html);
    const symbol =
      /<g data-part="mark"[^>]*><circle cx="([-\d.]+)" cy="([-\d.]+)"/.exec(
        html,
      );
    expect(symbol).not.toBeNull();
    expectPointInside(html, Number(symbol![1]), Number(symbol![2]));
  });

  it("SymbolMap keeps main's narrow full-view scale with a top-row mark", () => {
    const html = renderToStaticMarkup(
      <SymbolMap width={120} marks={[{ col: 4, row: 0, value: 1 }]} />,
    );
    expect(layout(html).scale).toBe(0.2075);
  });
});

describe("tile host transforms inside the designed canvas", () => {
  const hosts = [
    {
      name: "Choropleth",
      labels: true,
      render: (tiles?: Tile[]) =>
        renderToStaticMarkup(
          <Choropleth values={[1, 2]} {...(tiles ? { tiles } : {})} />,
        ),
    },
    {
      name: "DotMap",
      labels: false,
      render: (tiles?: Tile[]) =>
        renderToStaticMarkup(
          <DotMap counts={[1, 2]} {...(tiles ? { tiles } : {})} />,
        ),
    },
    {
      name: "FlowMap",
      labels: true,
      render: (tiles?: Tile[]) =>
        renderToStaticMarkup(
          <FlowMap
            origin={{ col: 4, row: 1 }}
            routes={[{ col: 7, row: 3, value: 1 }]}
            {...(tiles ? { tiles } : {})}
          />,
        ),
    },
    {
      name: "SymbolMap",
      labels: true,
      render: (tiles?: Tile[]) =>
        renderToStaticMarkup(
          <SymbolMap
            marks={[{ col: 4, row: 1, value: 1 }]}
            {...(tiles ? { tiles } : {})}
          />,
        ),
    },
  ];
  const tileSets = [
    { name: "default", tiles: undefined },
    { name: "hex preset", tiles: HEX_TILES },
    {
      name: "filtered default preset",
      tiles: ABSTRACT_TILES.filter((tile) => tile.col > 3 && tile.col < 12),
    },
    {
      name: "filtered hex preset",
      tiles: HEX_TILES.filter((tile) => tile.col >= 4 && tile.col <= 7),
    },
    { name: "small custom set", tiles: [{ col: 0, row: 0, x: 50, y: 50 }] },
  ];

  for (const host of hosts) {
    for (const tileSet of tileSets) {
      it(`${host.name} keeps the original transform for ${tileSet.name}`, () => {
        const F = frame({}, 5 / 3, { labels: host.labels });
        const u = Math.min((F.right - F.left) / 200, (F.bottom - F.top) / 120);
        const tx = F.left + (F.right - F.left - 200 * u) / 2;
        const ty = F.top + (F.bottom - F.top - 120 * u) / 2;
        const transform = /<g transform="([^"]+)"/.exec(
          host.render(tileSet.tiles),
        )?.[1];
        expect(transform).toBe(
          `translate(${round(tx)} ${round(ty)}) scale(${u})`,
        );
      });
    }
  }
});
