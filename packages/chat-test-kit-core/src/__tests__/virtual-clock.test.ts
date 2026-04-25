import { describe, expect, it } from "vitest";

import { VirtualClock } from "../replayer/clock";

describe("VirtualClock", () => {
  it("starts at 0", () => {
    expect(new VirtualClock().now()).toBe(0);
  });

  it("advance() moves time forward and runs due timers in fire order", () => {
    const clock = new VirtualClock();
    const events: string[] = [];
    clock.setTimeout(() => events.push("a@10"), 10);
    clock.setTimeout(() => events.push("b@5"), 5);
    clock.setTimeout(() => events.push("c@10"), 10);

    clock.advance(10);
    expect(events).toEqual(["b@5", "a@10", "c@10"]);
    expect(clock.now()).toBe(10);
  });

  it("clearTimeout cancels a pending timer", () => {
    const clock = new VirtualClock();
    const events: string[] = [];
    const handle = clock.setTimeout(() => events.push("nope"), 5);
    clock.clearTimeout(handle);
    clock.advance(10);
    expect(events).toEqual([]);
  });

  it("a timer scheduled inside another timer fires within the same advance call", () => {
    const clock = new VirtualClock();
    const events: string[] = [];
    clock.setTimeout(() => {
      events.push("first");
      clock.setTimeout(() => events.push("nested"), 1);
    }, 1);
    clock.advance(2);
    expect(events).toEqual(["first", "nested"]);
    expect(clock.now()).toBe(2);
  });

  it("advance(0) drains 0-delay timers", () => {
    const clock = new VirtualClock();
    const events: string[] = [];
    clock.setTimeout(() => events.push("now"), 0);
    clock.advance(0);
    expect(events).toEqual(["now"]);
  });
});
