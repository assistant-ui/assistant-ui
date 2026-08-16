import type { Graph, Pt, TreeNode } from "./types";

export function stack(series: number[][]): {
  totals: number[];
  levels: number[][];
} {
  const length = series[0]?.length ?? 0;
  const totals = Array.from({ length }, (_, i) =>
    series.reduce((sum, s) => sum + (s[i] ?? 0), 0),
  );
  const levels: number[][] = [Array.from({ length }, () => 0)];
  for (const s of series) {
    const prev = levels[levels.length - 1]!;
    levels.push(prev.map((v, i) => v + (s[i] ?? 0)));
  }
  return { totals, levels };
}

/** Greedy swarm: sorted by position, each dot takes the innermost free lane. */
export function swarmLanes(xs: number[], minGap: number): number[] {
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const lanes: number[] = Array.from({ length: xs.length }, () => 0);
  const lastInLane = new Map<number, number>();
  for (const { x, i } of order) {
    let lane = 0;
    for (let k = 0; ; k += 1) {
      lane = k === 0 ? 0 : k % 2 === 1 ? Math.ceil(k / 2) : -k / 2;
      const last = lastInLane.get(lane);
      if (last === undefined || x - last >= minGap) break;
    }
    lanes[i] = lane;
    lastInLane.set(lane, x);
  }
  return lanes;
}

export type Rect = { x: number; y: number; w: number; h: number };

/** Squarified treemap over one list of values inside a rectangle. */
export function squarify(values: number[], rect: Rect, gap = 2): Rect[] {
  const total = values.reduce((sum, v) => sum + v, 0) || 1;
  const area = rect.w * rect.h;
  const scaled = values.map((v) => (v / total) * area);
  const out: Rect[] = Array.from({ length: values.length }, () => ({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  }));
  let free = { ...rect };
  let row: number[] = [];
  let rowIndex: number[] = [];

  const worst = (r: number[], side: number) => {
    const sum = r.reduce((a, b) => a + b, 0);
    const max = Math.max(...r);
    const min = Math.min(...r);
    const s2 = sum * sum;
    return Math.max((side * side * max) / s2, s2 / (side * side * min));
  };

  const layoutRow = (r: number[], indices: number[]) => {
    const sum = r.reduce((a, b) => a + b, 0);
    const horizontal = free.w >= free.h;
    const side = horizontal ? free.h : free.w;
    const thickness = sum / side;
    let offset = 0;
    r.forEach((a, k) => {
      const len = a / thickness;
      const target = out[indices[k]!]!;
      if (horizontal) {
        target.x = free.x;
        target.y = free.y + offset;
        target.w = thickness;
        target.h = len;
      } else {
        target.x = free.x + offset;
        target.y = free.y;
        target.w = len;
        target.h = thickness;
      }
      offset += len;
    });
    if (horizontal) {
      free = {
        x: free.x + thickness,
        y: free.y,
        w: free.w - thickness,
        h: free.h,
      };
    } else {
      free = {
        x: free.x,
        y: free.y + thickness,
        w: free.w,
        h: free.h - thickness,
      };
    }
  };

  for (let i = 0; i < scaled.length; i += 1) {
    const a = scaled[i]!;
    const side = Math.min(free.w, free.h);
    if (row.length === 0 || worst([...row, a], side) <= worst(row, side)) {
      row.push(a);
      rowIndex.push(i);
    } else {
      layoutRow(row, rowIndex);
      row = [a];
      rowIndex = [i];
    }
  }
  if (row.length > 0) layoutRow(row, rowIndex);

  return out.map((r) => ({
    x: r.x + gap / 2,
    y: r.y + gap / 2,
    w: Math.max(r.w - gap, 0.5),
    h: Math.max(r.h - gap, 0.5),
  }));
}

export type Circle = { x: number; y: number; r: number };

/** Front-chain sibling packing, then recentered on the centroid. */
export function packSiblings(radii: number[]): Circle[] {
  const circles: Circle[] = radii.map((r) => ({ x: 0, y: 0, r }));
  const n = circles.length;
  if (n === 0) return circles;
  if (n >= 1) {
    circles[0]!.x = 0;
    circles[0]!.y = 0;
  }
  if (n >= 2) {
    circles[1]!.x = circles[0]!.r + circles[1]!.r;
    circles[1]!.y = 0;
  }
  const place = (a: Circle, b: Circle, c: Circle) => {
    const da = b.r + c.r;
    const db = a.r + c.r;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dc = Math.hypot(dx, dy) || 1e-6;
    const x = (db * db + dc * dc - da * da) / (2 * db * dc);
    const y = Math.sqrt(Math.max(0, 1 - x * x));
    c.x = a.x + (dx * x - dy * y) * (db / dc);
    c.y = a.y + (dy * x + dx * y) * (db / dc);
  };
  const intersects = (a: Circle, b: Circle) => {
    const dr = a.r + b.r - 1e-6;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dr > 0 && dr * dr > dx * dx + dy * dy;
  };
  const chain: number[] = n >= 2 ? [0, 1] : [0];
  for (let i = 2; i < n; i += 1) {
    let ai = 0;
    let placed = false;
    while (!placed && ai < chain.length) {
      const a = circles[chain[ai]!]!;
      const b = circles[chain[(ai + 1) % chain.length]!]!;
      place(a, b, circles[i]!);
      placed = true;
      for (const k of chain) {
        if (
          k !== chain[ai] &&
          k !== chain[(ai + 1) % chain.length] &&
          intersects(circles[k]!, circles[i]!)
        ) {
          placed = false;
          break;
        }
      }
      if (!placed) ai += 1;
    }
    chain.splice((ai + 1) % chain.length || chain.length, 0, i);
  }
  const cx = circles.reduce((s, c) => s + c.x, 0) / n;
  const cy = circles.reduce((s, c) => s + c.y, 0) / n;
  return circles.map((c) => ({ x: c.x - cx, y: c.y - cy, r: c.r }));
}

export function nodeValue(node: TreeNode): number {
  if (node.children && node.children.length > 0) {
    return node.children.reduce((sum, child) => sum + nodeValue(child), 0);
  }
  return node.value ?? 1;
}

export type Slice = {
  node: TreeNode;
  depth: number;
  start: number;
  end: number;
  parentIndex: number;
};

/** Value-proportional partition of a tree into [0, 1) spans per depth. */
export function partition(root: TreeNode, maxDepth: number): Slice[] {
  const out: Slice[] = [];
  const walk = (
    node: TreeNode,
    depth: number,
    start: number,
    end: number,
    parentIndex: number,
  ) => {
    const index = out.length;
    out.push({ node, depth, start, end, parentIndex });
    if (depth >= maxDepth || !node.children || node.children.length === 0)
      return;
    const total = node.children.reduce((sum, c) => sum + nodeValue(c), 0) || 1;
    let cursor = start;
    for (const child of node.children) {
      const span = ((end - start) * nodeValue(child)) / total;
      walk(child, depth + 1, cursor, cursor + span, index);
      cursor += span;
    }
  };
  walk(root, 0, 0, 1, -1);
  return out;
}

export function hexbin(
  points: Pt[],
  radius: number,
  width: number,
  height: number,
): { cx: number; cy: number; count: number }[] {
  const dx = radius * Math.sqrt(3);
  const dy = radius * 1.5;
  const bins = new Map<string, { cx: number; cy: number; count: number }>();
  for (const p of points) {
    const row = Math.round(p.y / dy);
    const offset = row % 2 ? dx / 2 : 0;
    const col = Math.round((p.x - offset) / dx);
    const cx = col * dx + offset;
    const cy = row * dy;
    if (cx < 0 || cx > width || cy < 0 || cy > height) continue;
    const key = `${col}:${row}`;
    const bin = bins.get(key);
    if (bin) bin.count += 1;
    else bins.set(key, { cx, cy, count: 1 });
  }
  return [...bins.values()];
}

/** Mean and covariance ellipse of a point cloud, for density contours. */
export function densityEllipse(points: Pt[]): {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  angle: number;
} {
  const n = points.length || 1;
  const cx = points.reduce((s, p) => s + p.x, 0) / n;
  const cy = points.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - cx) ** 2;
    syy += (p.y - cy) ** 2;
    sxy += (p.x - cx) * (p.y - cy);
  }
  sxx /= n;
  syy /= n;
  sxy /= n;
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const l1 = trace / 2 + Math.sqrt(Math.max(0, (trace / 2) ** 2 - det));
  const l2 = trace / 2 - Math.sqrt(Math.max(0, (trace / 2) ** 2 - det));
  const angle = (Math.atan2(l1 - sxx, sxy || 1e-9) * 180) / Math.PI;
  return {
    cx,
    cy,
    rx: Math.sqrt(Math.max(l1, 1e-6)),
    ry: Math.sqrt(Math.max(l2, 1e-6)),
    angle: 90 - angle,
  };
}

/** Deterministic radial layout: highest-degree node centered, BFS rings out. */
export function radialNetwork(
  graph: Graph,
  cx: number,
  cy: number,
  ringGap: number,
): Map<string, Pt> {
  const degree = new Map<string, number>();
  for (const node of graph.nodes) degree.set(node.id, 0);
  for (const link of graph.links) {
    degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
  }
  const hub = [...graph.nodes].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0),
  )[0];
  const positions = new Map<string, Pt>();
  if (!hub) return positions;
  positions.set(hub.id, { x: cx, y: cy });
  const adjacency = new Map<string, string[]>();
  for (const link of graph.links) {
    adjacency.set(link.source, [
      ...(adjacency.get(link.source) ?? []),
      link.target,
    ]);
    adjacency.set(link.target, [
      ...(adjacency.get(link.target) ?? []),
      link.source,
    ]);
  }
  let frontier = [hub.id];
  const seen = new Set(frontier);
  const layers: string[][] = [];
  while (seen.size < graph.nodes.length && frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    for (const node of graph.nodes) {
      if (!seen.has(node.id) && next.length === 0) {
        seen.add(node.id);
        next.push(node.id);
      }
    }
    layers.push(next);
    frontier = next;
  }
  layers.forEach((ids, layer) => {
    const depth = layer + 1;
    const radius = (ringGap * depth) / layers.length;
    ids.forEach((id, i) => {
      const angle =
        (i / Math.max(1, ids.length)) * Math.PI * 2 -
        Math.PI / 2 +
        depth * 0.35;
      positions.set(id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius * 0.72,
      });
    });
  });
  return positions;
}

export type SankeyNode = {
  id: string;
  label: string;
  y0: number;
  y1: number;
  side: "left" | "right";
};
export type SankeyRibbon = {
  sy0: number;
  sy1: number;
  ty0: number;
  ty1: number;
  sourceIndex: number;
  source: string;
  target: string;
};

/** Two-column sankey: sources on the left, sinks on the right, value-sorted. */
export function sankeyTwoColumn(
  graph: Graph,
  top: number,
  bottom: number,
  gap: number,
): { nodes: SankeyNode[]; ribbons: SankeyRibbon[] } {
  const isTarget = new Set(graph.links.map((l) => l.target));
  const sources = graph.nodes.filter((n) => !isTarget.has(n.id));
  const sinks = graph.nodes.filter((n) => isTarget.has(n.id));
  const linkValue = (id: string, side: "source" | "target") =>
    graph.links
      .filter((l) => l[side] === id)
      .reduce((sum, l) => sum + (l.value ?? 1), 0);
  const layoutColumn = (
    list: typeof sources,
    side: "left" | "right",
    valueOf: (id: string) => number,
  ): SankeyNode[] => {
    const sorted = [...list].sort((a, b) => valueOf(b.id) - valueOf(a.id));
    const total = sorted.reduce((sum, n) => sum + valueOf(n.id), 0) || 1;
    const height = bottom - top - gap * Math.max(0, sorted.length - 1);
    let cursor = top;
    return sorted.map((node) => {
      const h = (valueOf(node.id) / total) * height;
      const laid: SankeyNode = {
        id: node.id,
        label: node.label ?? node.id,
        y0: cursor,
        y1: cursor + h,
        side,
      };
      cursor += h + gap;
      return laid;
    });
  };
  const left = layoutColumn(sources, "left", (id) => linkValue(id, "source"));
  const right = layoutColumn(sinks, "right", (id) => linkValue(id, "target"));
  const leftCursor = new Map(left.map((n) => [n.id, n.y0]));
  const rightCursor = new Map(right.map((n) => [n.id, n.y0]));
  const leftIndex = new Map(left.map((n, i) => [n.id, i]));
  const ribbons: SankeyRibbon[] = [];
  const ordered = [...graph.links].sort(
    (a, b) =>
      (leftIndex.get(a.source) ?? 0) - (leftIndex.get(b.source) ?? 0) ||
      (b.value ?? 1) - (a.value ?? 1),
  );
  const leftTotal = left.reduce((s, n) => s + (n.y1 - n.y0), 0) || 1;
  const rightTotal = right.reduce((s, n) => s + (n.y1 - n.y0), 0) || 1;
  const totalValue =
    graph.links.reduce((sum, l) => sum + (l.value ?? 1), 0) || 1;
  const leftUnit = leftTotal / totalValue;
  const rightUnit = rightTotal / totalValue;
  for (const link of ordered) {
    const sh = (link.value ?? 1) * leftUnit;
    const th = (link.value ?? 1) * rightUnit;
    const sy0 = leftCursor.get(link.source) ?? top;
    const ty0 = rightCursor.get(link.target) ?? top;
    ribbons.push({
      sy0,
      sy1: sy0 + sh,
      ty0,
      ty1: ty0 + th,
      sourceIndex: leftIndex.get(link.source) ?? 0,
      source: link.source,
      target: link.target,
    });
    leftCursor.set(link.source, sy0 + sh);
    rightCursor.set(link.target, ty0 + th);
  }
  return { nodes: [...left, ...right], ribbons };
}

export type ChordArc = { start: number; end: number };
export type ChordRibbon = {
  s0: number;
  s1: number;
  t0: number;
  t1: number;
  groupIndex: number;
};

/** Circle spans per group plus ribbon spans, all as fractions of one turn. */
export function chordLayout(
  groups: string[],
  flows: { from: string; to: string; value: number }[],
  pad = 0.02,
): { arcs: ChordArc[]; ribbons: ChordRibbon[] } {
  const total = new Map<string, number>(groups.map((g) => [g, 0]));
  for (const flow of flows) {
    total.set(flow.from, (total.get(flow.from) ?? 0) + flow.value);
    total.set(flow.to, (total.get(flow.to) ?? 0) + flow.value);
  }
  const grand = [...total.values()].reduce((a, b) => a + b, 0) || 1;
  const usable = 1 - pad * groups.length;
  const arcs: ChordArc[] = [];
  const cursorByGroup = new Map<string, number>();
  let cursor = 0;
  for (const group of groups) {
    const span = ((total.get(group) ?? 0) / grand) * usable;
    arcs.push({ start: cursor, end: cursor + span });
    cursorByGroup.set(group, cursor);
    cursor += span + pad;
  }
  const index = new Map(groups.map((g, i) => [g, i]));
  const ribbons: ChordRibbon[] = flows.map((flow) => {
    const span = (flow.value / grand) * usable;
    const s0 = cursorByGroup.get(flow.from) ?? 0;
    cursorByGroup.set(flow.from, s0 + span);
    const t0 = cursorByGroup.get(flow.to) ?? 0;
    cursorByGroup.set(flow.to, t0 + span);
    return {
      s0,
      s1: s0 + span,
      t0,
      t1: t0 + span,
      groupIndex: index.get(flow.from) ?? 0,
    };
  });
  return { arcs, ribbons };
}

export type DendroBracket = {
  x1: number;
  x2: number;
  height: number;
  d1: number;
  d2: number;
};

/**
 * Scipy-style linkage: a and b below leaves.length reference leaves; larger
 * values reference merge index minus leaves.length.
 */
export function dendrogram(
  leafCount: number,
  merges: { a: number; b: number; height: number }[],
): { xs: number[]; brackets: DendroBracket[] } {
  const xs = Array.from({ length: leafCount }, (_, i) => i);
  const clusterX: number[] = [...xs];
  const clusterH: number[] = Array.from({ length: leafCount }, () => 0);
  const brackets: DendroBracket[] = [];
  for (const merge of merges) {
    const xa = clusterX[merge.a] ?? 0;
    const xb = clusterX[merge.b] ?? 0;
    brackets.push({
      x1: xa,
      x2: xb,
      height: merge.height,
      d1: clusterH[merge.a] ?? 0,
      d2: clusterH[merge.b] ?? 0,
    });
    clusterX.push((xa + xb) / 2);
    clusterH.push(merge.height);
  }
  return { xs, brackets };
}

export type TreePoint = {
  node: TreeNode;
  x: number;
  depth: number;
  parent: number;
};

/** Tidy-enough tree: leaves spaced evenly, parents centered over children. */
export function treeLayout(root: TreeNode, maxDepth: number): TreePoint[] {
  const out: TreePoint[] = [];
  let leafCursor = 0;
  const walk = (node: TreeNode, depth: number, parent: number): number => {
    const index = out.length;
    out.push({ node, x: 0, depth, parent });
    const children =
      depth < maxDepth && node.children && node.children.length > 0
        ? node.children
        : [];
    if (children.length === 0) {
      out[index]!.x = leafCursor;
      leafCursor += 1;
      return out[index]!.x;
    }
    const xs = children.map((child) => walk(child, depth + 1, index));
    out[index]!.x = (Math.min(...xs) + Math.max(...xs)) / 2;
    return out[index]!.x;
  };
  walk(root, 0, -1);
  const max = Math.max(1, leafCursor - 1);
  for (const p of out) p.x /= max;
  return out;
}
