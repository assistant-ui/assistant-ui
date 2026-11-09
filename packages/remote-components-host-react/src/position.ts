import type {
  Placement,
  Rect,
  Side,
} from "@assistant-ui/remote-components-protocol";

export interface PositionInput {
  /** Anchor rect in host viewport coordinates. */
  anchor: Rect;
  /** Size of the floating element. */
  floating: { width: number; height: number };
  viewport: { width: number; height: number };
  placement: Placement;
  /** Gap between anchor and floating element. */
  offset: number;
  /** Minimum distance from the viewport edge. */
  padding: number;
}

export interface PositionResult {
  x: number;
  y: number;
  /** Side actually used after flipping. */
  side: Side;
  /** Space available on the chosen side along the main axis. */
  available: number;
  /** Height the floating element may take (it scrolls beyond this). */
  maxHeight: number;
}

const OPPOSITE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/**
 * Positions a floating element next to an anchor:
 *   1. place on `placement.side` with `offset`;
 *   2. flip to the opposite side if it overflows there and the opposite side
 *      has more room;
 *   3. cap the height to the room on that side (the element scrolls);
 *   4. align on the cross axis (`start` / `center` / `end`), then shift to
 *      stay `padding` inside the viewport.
 * Pure function; unit-tested.
 */
export function computePosition(input: PositionInput): PositionResult {
  const { anchor: a, floating: f, viewport: vp, offset, padding } = input;
  const vertical =
    input.placement.side === "top" || input.placement.side === "bottom";

  const space: Record<Side, number> = {
    top: a.y - offset - padding,
    bottom: vp.height - (a.y + a.height) - offset - padding,
    left: a.x - offset - padding,
    right: vp.width - (a.x + a.width) - offset - padding,
  };
  const need = vertical ? f.height : f.width;
  let side = input.placement.side;
  if (space[side] < need && space[OPPOSITE[side]] > space[side])
    side = OPPOSITE[side];

  // Taller than the room on the chosen side (or the viewport): cap it; the
  // floating element scrolls.
  const maxHeight = Math.max(
    0,
    vertical ? space[side] : vp.height - 2 * padding,
  );
  const height = Math.min(f.height, maxHeight);

  let x: number;
  let y: number;
  switch (side) {
    case "bottom":
      y = a.y + a.height + offset;
      break;
    case "top":
      y = a.y - offset - height;
      break;
    case "right":
      x = a.x + a.width + offset;
      break;
    case "left":
      x = a.x - offset - f.width;
      break;
  }

  const align = input.placement.align;
  if (vertical) {
    x =
      align === "start"
        ? a.x
        : align === "end"
          ? a.x + a.width - f.width
          : a.x + (a.width - f.width) / 2;
    x = clamp(x, padding, vp.width - padding - f.width);
  } else {
    y =
      align === "start"
        ? a.y
        : align === "end"
          ? a.y + a.height - height
          : a.y + (a.height - height) / 2;
    y = clamp(y!, padding, vp.height - padding - height);
  }
  return { x: x!, y: y!, side, available: Math.max(0, space[side]), maxHeight };
}

/** Clamps into [min, max]; when the range is empty, prefers `min` (keeps the start edge visible). */
function clamp(v: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(v, min), max);
}
