import { describe, expect, it } from "vitest";
import {
  PROGRESS_CEILING,
  createProgressSimulation,
} from "./progress-simulation";

const run = (seed: number, totalMs: number, stepMs = 137) => {
  const engine = createProgressSimulation(seed);
  const samples: number[] = [];
  for (let t = 0; t < totalMs; t += stepMs)
    samples.push(engine.advance(stepMs));
  return samples;
};

const seeds = Array.from({ length: 20 }, (_, i) => i + 1);

describe("createProgressSimulation", () => {
  it("is deterministic for a seed", () => {
    expect(run(7, 60_000)).toEqual(run(7, 60_000));
    expect(run(7, 60_000)).not.toEqual(run(8, 60_000));
  });

  it("never goes backwards and stays under the ceiling", () => {
    for (const seed of seeds) {
      const samples = run(seed, 600_000);
      for (let i = 1; i < samples.length; i++) {
        expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]!);
      }
      expect(samples.at(-1)).toBeLessThan(PROGRESS_CEILING);
    }
  });

  it("moves first, then stalls for at least a second now and then", () => {
    for (const seed of seeds) {
      const samples = run(seed, 300_000, 100);
      expect(samples[9]).toBeGreaterThan(0);
      let longest = 0;
      let current = 0;
      for (let i = 1; i < samples.length; i++) {
        current = samples[i] === samples[i - 1] ? current + 100 : 0;
        longest = Math.max(longest, current);
      }
      expect(longest).toBeGreaterThanOrEqual(1_000);
    }
  });

  it("is past halfway after a minute", () => {
    for (const seed of seeds) {
      expect(run(seed, 60_000).at(-1)).toBeGreaterThan(0.5);
    }
  });
});
