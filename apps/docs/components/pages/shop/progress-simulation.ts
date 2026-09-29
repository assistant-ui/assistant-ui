export const PROGRESS_CEILING = 0.92;

const MOVING_TAU_MS = 20_000;
const BURST_TAU_MS = 5_000;

type Phase = "moving" | "stall" | "burst";

export function createProgressSimulation(seed = 1) {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let r = Math.imul(state ^ (state >>> 15), 1 | state);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const between = (min: number, max: number) => min + random() * (max - min);
  let value = 0;
  let phase: Phase = "moving";
  let remaining = between(3_000, 8_000);
  const nextPhase = () => {
    if (phase !== "stall") {
      phase = "stall";
      remaining =
        random() < 0.15 ? between(6_000, 10_000) : between(1_000, 6_000);
    } else if (random() < 0.35) {
      phase = "burst";
      remaining = between(100, 300);
    } else {
      phase = "moving";
      remaining = between(2_000, 8_000);
    }
  };
  return {
    get value() {
      return value;
    },
    advance(elapsedMs: number) {
      let left = elapsedMs;
      while (left > 0) {
        const slice = Math.min(left, remaining);
        if (phase !== "stall") {
          const tau = phase === "moving" ? MOVING_TAU_MS : BURST_TAU_MS;
          value += (PROGRESS_CEILING - value) * (1 - Math.exp(-slice / tau));
        }
        left -= slice;
        remaining -= slice;
        if (remaining <= 0) nextPhase();
      }
      return value;
    },
  };
}
