import { ALL_SLOTS, MOBILE_SLOTS, takeSlot } from "./trusted-by";

function drain(visible: readonly number[], turns: number) {
  let queue: readonly number[] = [];
  const taken: number[] = [];
  for (let turn = 0; turn < turns; turn += 1) {
    const next = takeSlot(queue, visible);
    queue = next.queue;
    taken.push(next.slot);
  }
  return taken;
}

describe("takeSlot", () => {
  it("only ever picks a slot the layout renders", () => {
    for (const slot of drain(MOBILE_SLOTS, 60)) {
      expect(MOBILE_SLOTS).toContain(slot);
    }
  });

  it("gives every visible slot a turn before repeating one", () => {
    const cycle = drain(ALL_SLOTS, ALL_SLOTS.length);
    expect([...cycle].sort((a, b) => a - b)).toEqual(ALL_SLOTS);
  });

  it("drops queued slots the viewport no longer renders", () => {
    const stale = [8, 4, 3, 2];
    const { slot, queue } = takeSlot(stale, MOBILE_SLOTS);
    expect(slot).toBe(2);
    expect(queue).toEqual([]);
  });

  it("refills from the visible set once the queue empties", () => {
    const { slot, queue } = takeSlot([], MOBILE_SLOTS);
    expect(MOBILE_SLOTS).toContain(slot);
    expect([...queue, slot].sort((a, b) => a - b)).toEqual(MOBILE_SLOTS);
  });

  it("keeps the mobile set inside the rendered slot range", () => {
    expect(ALL_SLOTS).toEqual(expect.arrayContaining(MOBILE_SLOTS));
  });
});
