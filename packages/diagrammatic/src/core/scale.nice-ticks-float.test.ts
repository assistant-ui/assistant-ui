import { describe, expect, it } from "vitest";
import { niceStep, niceTicks } from "./scale";

describe("niceTicks floating-point edges", () => {
  it("terminates when the span is one ULP", () => {
    expect(niceTicks(1, 1 + Number.EPSILON).map((tick) => tick.at)).toEqual([
      1,
    ]);
  });

  it("keeps a seeded sweep on the ladder and within its domain", () => {
    let seed = 0xdecafbad;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed;
    };

    for (let sample = 0; sample < 256; sample++) {
      const lo = ((random() % 201) - 100) / 10;
      const hi = lo + ((random() % 901) + 100) / 1000;
      const count = 3 + (random() % 6);
      const step = niceStep((hi - lo) / count);
      const inverse = 1 / step;
      const first = Math.ceil(lo / step);
      const last = Math.floor((hi + step * 1e-9) / step);
      const values = niceTicks(lo, hi, count).map((tick) => tick.at);

      expect(values).toHaveLength(Math.max(0, last - first + 1));
      for (const value of values) {
        expect(value).toBeGreaterThanOrEqual(lo - step * 1e-9);
        expect(value).toBeLessThanOrEqual(hi + step * 1e-9);
        expect(value).toBe(Math.round(value * inverse) / inverse);
      }
    }
  });

  it("terminates when a step cannot advance at 1e16", () => {
    let calls = 0;
    const ticks = niceTicks(1e16, 1e16 + 2, 4, (value) => {
      if (++calls > 10) throw new Error("Tick generation did not terminate");
      return String(value);
    });
    expect(ticks.map((tick) => tick.at)).toEqual([1e16]);
  });
});
