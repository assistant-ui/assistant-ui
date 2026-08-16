import { describe, expect, it } from "vitest";
import {
  chordLayout,
  dendrogram,
  packSiblings,
  partition,
  sankeyColumns,
  sankeyTwoColumn,
  squarify,
  stack,
  swarmLanes,
} from "./layout";

describe("stack", () => {
  it("accumulates levels and totals", () => {
    const { totals, levels } = stack([
      [1, 2],
      [3, 4],
    ]);
    expect(totals).toEqual([4, 6]);
    expect(levels).toEqual([
      [0, 0],
      [1, 2],
      [4, 6],
    ]);
  });
});

describe("swarmLanes", () => {
  it("never places two dots in one lane closer than the gap", () => {
    const xs = [0, 1, 2, 3, 4, 5, 20, 21, 22];
    const lanes = swarmLanes(xs, 6);
    const byLane = new Map<number, number[]>();
    xs.forEach((x, i) => {
      const lane = lanes[i]!;
      byLane.set(lane, [...(byLane.get(lane) ?? []), x]);
    });
    for (const positions of byLane.values()) {
      const sorted = [...positions].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i += 1) {
        expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(6);
      }
    }
  });
});

describe("squarify", () => {
  it("keeps every tile inside the rect and preserves area shares", () => {
    const rect = { x: 0, y: 0, w: 100, h: 60 };
    const values = [50, 30, 15, 5];
    const rects = squarify(values, rect, 0);
    const total = rect.w * rect.h;
    rects.forEach((r, i) => {
      expect(r.x).toBeGreaterThanOrEqual(-0.01);
      expect(r.y).toBeGreaterThanOrEqual(-0.01);
      expect(r.x + r.w).toBeLessThanOrEqual(rect.w + 0.01);
      expect(r.y + r.h).toBeLessThanOrEqual(rect.h + 0.01);
      expect((r.w * r.h) / total).toBeCloseTo(values[i]! / 100, 1);
    });
  });
});

describe("packSiblings", () => {
  it("packs circles without overlap", () => {
    const circles = packSiblings([10, 8, 6, 5, 4, 3]);
    for (let i = 0; i < circles.length; i += 1) {
      for (let k = i + 1; k < circles.length; k += 1) {
        const a = circles[i]!;
        const b = circles[k]!;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        expect(distance).toBeGreaterThanOrEqual(a.r + b.r - 0.01);
      }
    }
  });
});

describe("partition", () => {
  it("splits spans by value and records parents", () => {
    const slices = partition(
      {
        label: "root",
        children: [
          { label: "a", value: 3 },
          { label: "b", value: 1 },
        ],
      },
      1,
    );
    expect(slices[0]!.node.label).toBe("root");
    expect(slices[1]!.start).toBeCloseTo(0);
    expect(slices[1]!.end).toBeCloseTo(0.75);
    expect(slices[2]!.end).toBeCloseTo(1);
    expect(slices[1]!.parentIndex).toBe(0);
  });
});

describe("sankeyTwoColumn", () => {
  it("conserves flow: ribbon heights fill their source nodes", () => {
    const { nodes, ribbons } = sankeyTwoColumn(
      {
        nodes: [{ id: "a" }, { id: "b" }, { id: "x" }, { id: "y" }],
        links: [
          { source: "a", target: "x", value: 3 },
          { source: "a", target: "y", value: 1 },
          { source: "b", target: "y", value: 2 },
        ],
      },
      0,
      100,
      0,
    );
    const left = nodes.filter((n) => n.side === "left");
    const totalRibbon = ribbons.reduce((sum, r) => sum + (r.sy1 - r.sy0), 0);
    const totalNode = left.reduce((sum, n) => sum + (n.y1 - n.y0), 0);
    expect(totalRibbon).toBeCloseTo(totalNode, 5);
    expect(left[0]!.id).toBe("a");
  });

  it("ribbon ends fill both columns exactly when gaps skew the units", () => {
    const graph = {
      nodes: [{ id: "a" }, { id: "b" }, { id: "x" }, { id: "y" }, { id: "z" }],
      links: [
        { source: "a", target: "x", value: 30 },
        { source: "a", target: "y", value: 16 },
        { source: "b", target: "x", value: 8 },
        { source: "b", target: "z", value: 24 },
      ],
    };
    const { nodes, ribbons } = sankeyTwoColumn(graph, 12, 108, 8);
    for (const node of nodes) {
      const ends = ribbons
        .map((r) => (node.side === "left" ? [r.sy0, r.sy1] : [r.ty0, r.ty1]))
        .filter(([e0]) => e0! >= node.y0 - 1e-6 && e0! < node.y1);
      const covered = ends.reduce((sum, [e0, e1]) => sum + (e1! - e0!), 0);
      expect(covered).toBeCloseTo(node.y1 - node.y0, 5);
      for (const [, e1] of ends) {
        expect(e1!).toBeLessThanOrEqual(node.y1 + 1e-6);
      }
    }
  });
});

describe("sankeyColumns", () => {
  it("places intermediate nodes in a middle column", () => {
    const { nodes, ribbons } = sankeyColumns(
      {
        nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
        links: [
          { source: "a", target: "b", value: 4 },
          { source: "b", target: "c", value: 4 },
        ],
      },
      0,
      100,
      0,
    );
    expect(nodes.find((n) => n.id === "a")!.column).toBe(0);
    expect(nodes.find((n) => n.id === "b")!.column).toBe(1);
    expect(nodes.find((n) => n.id === "c")!.column).toBe(2);
    expect(ribbons).toHaveLength(2);
  });

  it("honors node.group as an explicit column", () => {
    const { nodes } = sankeyColumns(
      {
        nodes: [
          { id: "a", group: 0 },
          { id: "b", group: 2 },
        ],
        links: [{ source: "a", target: "b", value: 1 }],
      },
      0,
      40,
      0,
    );
    expect(nodes.find((n) => n.id === "b")!.column).toBe(2);
  });
});

describe("chordLayout", () => {
  it("keeps arcs and ribbons inside one turn", () => {
    const { arcs, ribbons } = chordLayout(
      ["a", "b"],
      [{ from: "a", to: "b", value: 5 }],
    );
    expect(arcs[1]!.end).toBeLessThanOrEqual(1);
    expect(ribbons[0]!.s1 - ribbons[0]!.s0).toBeCloseTo(
      arcs[0]!.end - arcs[0]!.start,
      5,
    );
  });
});

describe("dendrogram", () => {
  it("centers merges over their children, scipy indexing", () => {
    const { brackets } = dendrogram(4, [
      { a: 0, b: 1, height: 1 },
      { a: 2, b: 3, height: 2 },
      { a: 4, b: 5, height: 3 },
    ]);
    expect(brackets[0]).toMatchObject({ x1: 0, x2: 1, d1: 0, d2: 0 });
    expect(brackets[2]!.x1).toBeCloseTo(0.5);
    expect(brackets[2]!.x2).toBeCloseTo(2.5);
    expect(brackets[2]!.d1).toBe(1);
    expect(brackets[2]!.d2).toBe(2);
  });
});
