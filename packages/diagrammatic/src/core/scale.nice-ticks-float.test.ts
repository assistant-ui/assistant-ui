import { describe, expect, it } from "vitest";
import { niceStep, niceTicks } from "./scale";

describe("niceTicks floating-point edges", () => {
  it("terminates when the span is one ULP", () => {
    expect(niceTicks(1, 1 + Number.EPSILON).map((tick) => tick.at)).toEqual([
      1,
    ]);
  });

  it("keeps a fractional lower endpoint on the ladder", () => {
    expect(niceTicks(1.1, 1.5, 4).map((tick) => tick.at)).toEqual([
      1.1, 1.2, 1.3, 1.4, 1.5,
    ]);
  });

  it("keeps a negative fractional lower endpoint on the ladder", () => {
    expect(niceTicks(-7.6, -7.2, 4).map((tick) => tick.at)).toEqual([
      -7.6, -7.5, -7.4, -7.3, -7.2,
    ]);
  });

  it("keeps a clean tick within the lower endpoint tolerance", () => {
    expect(niceTicks(1.1 + 5e-11, 1.5, 4).map((tick) => tick.at)).toEqual([
      1.1, 1.2, 1.3, 1.4, 1.5,
    ]);
  });

  it("keeps a fractional upper endpoint at a large index", () => {
    expect(niceTicks(9999999.7, 10000000.1, 4).map((tick) => tick.at)).toEqual([
      9999999.7, 9999999.8, 9999999.9, 10000000, 10000000.1,
    ]);
  });

  it("keeps a seeded sweep on the ladder and within its domain", () => {
    let seed = 0xdecafbad;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed;
    };

    for (let sample = 0; sample < 256; sample++) {
      const loMillis = ((random() % 201) - 100) * 100;
      const hiMillis = loMillis + (random() % 901) + 100;
      const lo = loMillis / 1000;
      const hi = hiMillis / 1000;
      const count = 3 + (random() % 6);
      const step = niceStep((hi - lo) / count);
      const inverse = Math.round(1 / step);
      const values = niceTicks(lo, hi, count).map((tick) => tick.at);
      let expectedCount = 0;
      for (
        let index = Math.trunc((loMillis * inverse) / 1000) - 1;
        index <= Math.trunc((hiMillis * inverse) / 1000) + 1;
        index++
      ) {
        const multiple = index * 1000;
        if (multiple >= loMillis * inverse && multiple <= hiMillis * inverse)
          expectedCount++;
      }

      expect(
        values,
        `sample ${sample}: ${lo}..${hi}, step ${step}`,
      ).toHaveLength(expectedCount);
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
