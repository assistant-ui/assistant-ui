import { afterEach, describe, expect, it, vi } from "vitest";
import { animatePendingDots } from "./pending";

afterEach(() => {
  vi.unstubAllGlobals();
});

const dots = () => {
  const host = document.createElement("span");
  const cancel = vi.fn();
  const animate = vi.fn<Element["animate"]>(
    () => ({ cancel }) as unknown as Animation,
  );
  for (let index = 0; index < 3; index++) {
    const dot = document.createElement("span");
    dot.animate = animate;
    host.append(dot);
  }
  return { host, animate, cancel };
};

describe("animatePendingDots", () => {
  it("pulses each dot in turn and cancels the pulses on cleanup", () => {
    const { host, animate, cancel } = dots();
    const stop = animatePendingDots(host);
    expect(animate.mock.calls.map(([, options]) => options)).toEqual([
      expect.objectContaining({ delay: 0, iterations: Infinity }),
      expect.objectContaining({ delay: 150, iterations: Infinity }),
      expect.objectContaining({ delay: 300, iterations: Infinity }),
    ]);
    stop();
    expect(cancel).toHaveBeenCalledTimes(3);
  });

  it("leaves the dots still under reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    const { host, animate } = dots();
    animatePendingDots(host)();
    expect(animate).not.toHaveBeenCalled();
  });
});
