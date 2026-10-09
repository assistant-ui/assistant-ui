/** Width, in canvas units, that every card is scaled down to fit. */
export const COLUMN_WIDTH = 480;
/** Layout width used when a group's on-page width cannot be measured. */
export const DEFAULT_WIDTH = 1024;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type View = { x: number; y: number; zoom: number };

/**
 * Cards render their variant at the group's true on-page width and are
 * scaled down uniformly so every card in a row shares one column width.
 */
export const cardScale = (
  groupWidth: number,
  column = COLUMN_WIDTH,
): { width: number; scale: number } => {
  const width =
    Number.isFinite(groupWidth) && groupWidth > 0
      ? Math.round(groupWidth)
      : DEFAULT_WIDTH;
  return { width, scale: Math.min(1, column / width) };
};

export const clampZoom = (zoom: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** Centers the content and zooms out (never in past 100%) until it fits. */
export const fitView = (content: Size, viewport: Size, padding = 48): View => {
  if (content.width <= 0 || content.height <= 0) return { x: 0, y: 0, zoom: 1 };
  const zoom = clampZoom(
    Math.min(
      (viewport.width - padding * 2) / content.width,
      (viewport.height - padding * 2) / content.height,
      1,
    ),
  );
  return {
    x: (viewport.width - content.width * zoom) / 2,
    y: Math.max(padding, (viewport.height - content.height * zoom) / 2),
    zoom,
  };
};

/** Zooms by `factor` while keeping `point` (in viewport coordinates) fixed. */
export const zoomAt = (view: View, factor: number, point: Point): View => {
  const zoom = clampZoom(view.zoom * factor);
  const ratio = zoom / view.zoom;
  return {
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
    zoom,
  };
};

export type GridPosition = { row: number; col: number };

/**
 * Moves through rows of cards: left and right stay in the row, up and down
 * jump to the card in the next row whose center is closest horizontally.
 */
export const navigate = (
  rows: readonly (readonly number[])[],
  from: GridPosition,
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
): GridPosition => {
  const row = rows[from.row];
  if (!row) return from;
  if (key === "ArrowLeft")
    return { row: from.row, col: Math.max(0, from.col - 1) };
  if (key === "ArrowRight")
    return { row: from.row, col: Math.min(row.length - 1, from.col + 1) };
  const step = key === "ArrowUp" ? -1 : 1;
  let target = from.row + step;
  while (target >= 0 && target < rows.length && rows[target]!.length === 0)
    target += step;
  const next = rows[target];
  if (!next) return from;
  const center = row[from.col] ?? 0;
  let col = 0;
  next.forEach((value, index) => {
    if (Math.abs(value - center) < Math.abs(next[col]! - center)) col = index;
  });
  return { row: target, col };
};
