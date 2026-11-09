import type { SizeReport } from "@assistant-ui/remote-components-protocol";

/**
 * Breaks resize feedback loops.
 *
 * Width flows host → remote and height flows back, so a loop needs host
 * layout where width depends on height: an `overflow: auto` box whose
 * scrollbar appears when the remote is tall and disappears when it is
 * short at the narrower width. Inline, the browser resolves this within one
 * layout (it keeps the scrollbar). Across a frame each step is a message
 * round trip, so the guard does the same thing explicitly:
 *
 *   if the reported width flips between two values at least `flips` times
 *   within `windowMs`, pin the height to the larger height seen. The slot
 *   then keeps the taller size, the scrollbar stays, and the width settles.
 *
 * The pin is released when the width moves outside the oscillating pair
 * (the host really changed) or the content changes at an unchanged width.
 */
export class SizeGuard {
  private history: { width: number; height: number; at: number }[] = [];
  private pin: {
    height: number;
    widths: number[];
    heights: Map<number, number>;
  } | null = null;

  private readonly windowMs: number;
  private readonly flips: number;

  constructor(windowMs = 1000, flips = 4) {
    this.windowMs = windowMs;
    this.flips = flips;
  }

  get pinned(): boolean {
    return this.pin !== null;
  }

  /** Records a report and returns the height the slot should use. */
  report(size: SizeReport, now: number): number {
    const { width, height } = size;
    if (this.pin !== null) {
      const w = this.pin.widths.find((x) => close(x, width));
      const seen = w === undefined ? undefined : this.pin.heights.get(w);
      if (w === undefined || (seen !== undefined && !close(seen, height))) {
        this.pin = null;
        this.history = [];
      } else {
        if (seen === undefined) this.pin.heights.set(w, height);
        return Math.max(this.pin.height, height);
      }
    }
    this.history.push({ width, height, at: now });
    this.history = this.history.filter((e) => now - e.at <= this.windowMs);
    let flips = 0;
    const h = this.history;
    for (let i = 2; i < h.length; i++) {
      if (
        close(h[i]!.width, h[i - 2]!.width) &&
        !close(h[i]!.width, h[i - 1]!.width)
      )
        flips++;
    }
    if (flips >= this.flips) {
      const last = h[h.length - 1]!;
      const prev = h[h.length - 2]!;
      const heights = new Map<number, number>([
        [last.width, last.height],
        [prev.width, prev.height],
      ]);
      this.pin = {
        height: Math.max(...h.map((e) => e.height)),
        widths: [last.width, prev.width],
        heights,
      };
      this.history = [];
      return Math.max(this.pin.height, height);
    }
    return height;
  }

  reset(): void {
    this.history = [];
    this.pin = null;
  }
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}
