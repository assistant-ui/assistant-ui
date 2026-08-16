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

export type NetworkLabel = {
  id: string;
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end";
  dominantBaseline: "auto" | "hanging" | "central";
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type LabelSlot = {
  dx: number;
  dy: number;
  textAnchor: NetworkLabel["textAnchor"];
  dominantBaseline: NetworkLabel["dominantBaseline"];
};

const LABEL_SLOTS: LabelSlot[] = [
  { dx: 1, dy: 0, textAnchor: "start", dominantBaseline: "central" },
  { dx: 1, dy: 1, textAnchor: "start", dominantBaseline: "hanging" },
  { dx: 0, dy: 1, textAnchor: "middle", dominantBaseline: "hanging" },
  { dx: -1, dy: 1, textAnchor: "end", dominantBaseline: "hanging" },
  { dx: -1, dy: 0, textAnchor: "end", dominantBaseline: "central" },
  { dx: -1, dy: -1, textAnchor: "end", dominantBaseline: "auto" },
  { dx: 0, dy: -1, textAnchor: "middle", dominantBaseline: "auto" },
  { dx: 1, dy: -1, textAnchor: "start", dominantBaseline: "auto" },
];

type NetworkLabelNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
};

function labelMetrics(text: string, fontSize: number) {
  return { w: Math.max(1, text.length) * fontSize * 0.62, h: fontSize * 1.2 };
}

function slotBox(
  node: NetworkLabelNode,
  slot: LabelSlot,
  fontSize: number,
): Omit<NetworkLabel, "id"> {
  const { w, h } = labelMetrics(node.label, fontSize);
  const reach = node.r + 2.4;
  const x = node.x + slot.dx * reach;
  const y = node.y + slot.dy * reach;
  const left =
    slot.textAnchor === "start"
      ? x
      : slot.textAnchor === "end"
        ? x - w
        : x - w / 2;
  const right = left + w;
  const top =
    slot.dominantBaseline === "hanging"
      ? y
      : slot.dominantBaseline === "central"
        ? y - h / 2
        : y - h * 0.8;
  const bottom = top + h;
  return {
    x,
    y,
    textAnchor: slot.textAnchor,
    dominantBaseline: slot.dominantBaseline,
    left,
    right,
    top,
    bottom,
  };
}

function boxHitsCircle(
  box: { left: number; right: number; top: number; bottom: number },
  x: number,
  y: number,
  r: number,
): number {
  const nx = Math.max(box.left, Math.min(x, box.right));
  const ny = Math.max(box.top, Math.min(y, box.bottom));
  return Math.max(0, r - Math.hypot(x - nx, y - ny));
}

function boxHitsBox(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

function octantIndex(dx: number, dy: number): number {
  const angle = Math.atan2(dy, dx);
  return ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
}

function openOctant(
  x: number,
  y: number,
  others: readonly NetworkLabelNode[],
): number {
  if (others.length === 0) return 6;
  const angles = others
    .map((node) => Math.atan2(node.y - y, node.x - x))
    .sort((a, b) => a - b);
  let bestMid = angles[0]! + Math.PI;
  let bestSpan = -1;
  for (let i = 0; i < angles.length; i += 1) {
    const a = angles[i]!;
    const b = angles[(i + 1) % angles.length]!;
    const span = i === angles.length - 1 ? b + Math.PI * 2 - a : b - a;
    if (span > bestSpan) {
      bestSpan = span;
      bestMid = a + span / 2;
    }
  }
  return octantIndex(Math.cos(bestMid), Math.sin(bestMid));
}

function nearestClearance(
  node: NetworkLabelNode,
  nodes: readonly NetworkLabelNode[],
): number {
  let gap = Infinity;
  for (const other of nodes) {
    if (other.id === node.id) continue;
    gap = Math.min(
      gap,
      Math.hypot(other.x - node.x, other.y - node.y) - node.r - other.r,
    );
  }
  return gap;
}

/**
 * Labels the largest marks, plus a smaller mark only when its nearest
 * neighbor leaves room for the name. Crowded leaves stay unlabeled.
 */
export function placeNetworkLabels(
  nodes: readonly NetworkLabelNode[],
  bounds: { x0: number; y0: number; x1: number; y1: number },
  fontSize: number,
): Map<string, NetworkLabel> {
  if (nodes.length === 0) return new Map();
  const cx = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
  const cy = nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length;
  const maxR = Math.max(...nodes.map((node) => node.r));
  const forced = new Set(
    [...nodes]
      .sort((a, b) => b.r - a.r || a.id.localeCompare(b.id))
      .filter((node) => node.r >= maxR * 0.72)
      .slice(0, 3)
      .map((node) => node.id),
  );
  const order = [...nodes].sort((a, b) => {
    const fa = forced.has(a.id) ? 1 : 0;
    const fb = forced.has(b.id) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    if (a.r !== b.r) return b.r - a.r;
    return (
      Math.hypot(b.x - cx, b.y - cy) - Math.hypot(a.x - cx, a.y - cy) ||
      a.id.localeCompare(b.id)
    );
  });
  const placed: NetworkLabel[] = [];
  const byId = new Map<string, NetworkLabel>();
  for (const node of order) {
    const preferred =
      Math.hypot(node.x - cx, node.y - cy) < 1
        ? openOctant(
            node.x,
            node.y,
            nodes.filter((other) => other.id !== node.id),
          )
        : octantIndex(node.x - cx, node.y - cy);
    let best: NetworkLabel | undefined;
    let bestScore = Infinity;
    for (let i = 0; i < LABEL_SLOTS.length; i += 1) {
      const slot = LABEL_SLOTS[i]!;
      const box = slotBox(node, slot, fontSize);
      const steps = Math.min((i - preferred + 8) % 8, (preferred - i + 8) % 8);
      let score = steps * 4 + (slot.dx !== 0 && slot.dy !== 0 ? 1.5 : 0);
      score +=
        Math.max(0, bounds.x0 - box.left) * 80 +
        Math.max(0, box.right - bounds.x1) * 80 +
        Math.max(0, bounds.y0 - box.top) * 80 +
        Math.max(0, box.bottom - bounds.y1) * 80;
      for (const other of nodes) {
        const r = other.id === node.id ? other.r * 0.35 : other.r + 1.2;
        const hit = boxHitsCircle(box, other.x, other.y, r);
        if (hit > 0) score += 90 + hit * 40;
      }
      for (const label of placed) {
        const hit = boxHitsBox(box, {
          left: label.left - 0.8,
          right: label.right + 0.8,
          top: label.top - 0.6,
          bottom: label.bottom + 0.6,
        });
        if (hit > 0) score += 40 + hit * 8;
      }
      if (score < bestScore) {
        bestScore = score;
        best = { id: node.id, ...box };
      }
    }
    const isolated =
      nearestClearance(node, nodes) >=
      Math.max(fontSize * 5, labelMetrics(node.label, fontSize).w);
    if (best && (forced.has(node.id) || (isolated && bestScore < 24))) {
      placed.push(best);
      byId.set(node.id, best);
    }
  }
  return byId;
}

export type SankeyNode = {
  id: string;
  label: string;
  y0: number;
  y1: number;
  side: "left" | "right";
  column: number;
};
export type SankeyRibbon = {
  sy0: number;
  sy1: number;
  ty0: number;
  ty1: number;
  sourceColumn: number;
  targetColumn: number;
  sourceIndex: number;
  source: string;
  target: string;
};

function sankeyNodeColumns(graph: Graph): Map<string, number> {
  if (graph.nodes.some((node) => node.group !== undefined)) {
    return new Map(graph.nodes.map((node) => [node.id, node.group ?? 0]));
  }
  const incoming = new Map<string, string[]>();
  for (const node of graph.nodes) incoming.set(node.id, []);
  for (const link of graph.links) {
    incoming.get(link.target)?.push(link.source);
  }
  const rank = new Map<string, number>();
  const visiting = new Set<string>();
  const walk = (id: string): number => {
    const cached = rank.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = incoming.get(id) ?? [];
    const next = parents.length === 0 ? 0 : Math.max(...parents.map(walk)) + 1;
    rank.set(id, next);
    visiting.delete(id);
    return next;
  };
  for (const node of graph.nodes) walk(node.id);
  return rank;
}

/** One column per topological rank, or per `node.group` when any node sets it. */
export function sankeyColumns(
  graph: Graph,
  top: number,
  bottom: number,
  gap: number,
): { nodes: SankeyNode[]; ribbons: SankeyRibbon[] } {
  const columns = sankeyNodeColumns(graph);
  const lastColumn = Math.max(0, ...columns.values());
  const linkValue = (id: string, side: "source" | "target") =>
    graph.links
      .filter((l) => l[side] === id)
      .reduce((sum, l) => sum + (l.value ?? 1), 0);
  const valueOf = (id: string) =>
    Math.max(linkValue(id, "source"), linkValue(id, "target"), 1);
  const byColumn = new Map<number, typeof graph.nodes>();
  for (const node of graph.nodes) {
    const col = columns.get(node.id) ?? 0;
    byColumn.set(col, [...(byColumn.get(col) ?? []), node]);
  }
  const nodes: SankeyNode[] = [];
  const index = new Map<string, number>();
  for (const [col, list] of [...byColumn.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    const sorted = [...list].sort((a, b) => valueOf(b.id) - valueOf(a.id));
    const total = sorted.reduce((sum, n) => sum + valueOf(n.id), 0) || 1;
    const height = bottom - top - gap * Math.max(0, sorted.length - 1);
    let cursor = top;
    for (const node of sorted) {
      const h = (valueOf(node.id) / total) * height;
      const laid: SankeyNode = {
        id: node.id,
        label: node.label ?? node.id,
        y0: cursor,
        y1: cursor + h,
        column: col,
        side: col === 0 ? "left" : "right",
      };
      index.set(node.id, nodes.length);
      nodes.push(laid);
      cursor += h + gap;
    }
  }
  const outCursor = new Map(nodes.map((n) => [n.id, n.y0]));
  const inCursor = new Map(nodes.map((n) => [n.id, n.y0]));
  const unit = new Map<number, number>();
  for (const [col, list] of byColumn) {
    const pixels = list.reduce((sum, n) => {
      const laid = nodes.find((node) => node.id === n.id);
      return sum + (laid ? laid.y1 - laid.y0 : 0);
    }, 0);
    const values = list.reduce((sum, n) => sum + valueOf(n.id), 0) || 1;
    unit.set(col, (pixels || 1) / values);
  }
  const ordered = [...graph.links].sort(
    (a, b) =>
      (index.get(a.source) ?? 0) - (index.get(b.source) ?? 0) ||
      (b.value ?? 1) - (a.value ?? 1),
  );
  const ribbons: SankeyRibbon[] = [];
  for (const link of ordered) {
    const sourceCol = columns.get(link.source) ?? 0;
    const targetCol = columns.get(link.target) ?? lastColumn;
    const v = link.value ?? 1;
    const sh = v * (unit.get(sourceCol) ?? 1);
    const th = v * (unit.get(targetCol) ?? 1);
    const sy0 = outCursor.get(link.source) ?? top;
    const ty0 = inCursor.get(link.target) ?? top;
    ribbons.push({
      sy0,
      sy1: sy0 + sh,
      ty0,
      ty1: ty0 + th,
      sourceColumn: sourceCol,
      targetColumn: targetCol,
      sourceIndex: index.get(link.source) ?? 0,
      source: link.source,
      target: link.target,
    });
    outCursor.set(link.source, sy0 + sh);
    inCursor.set(link.target, ty0 + th);
  }
  return { nodes, ribbons };
}

/** Two-column sankey: sources on the left, sinks on the right, value-sorted. */
export function sankeyTwoColumn(
  graph: Graph,
  top: number,
  bottom: number,
  gap: number,
): { nodes: SankeyNode[]; ribbons: SankeyRibbon[] } {
  return sankeyColumns(graph, top, bottom, gap);
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
