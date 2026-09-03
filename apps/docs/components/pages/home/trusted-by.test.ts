import { ALL_SLOTS, MOBILE_SLOTS, rotateSlot, takeSlot } from "./trusted-by";

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

const CATALOGUE = Array.from({ length: 12 }, (_, index) => ({
  src: `/${index}.svg`,
  alt: `logo-${index}`,
  href: `https://${index}.example`,
}));

const seeded: ReturnType<typeof rotateSlot> = CATALOGUE.slice(
  0,
  ALL_SLOTS.length,
);

function offScreen(shown: ReturnType<typeof rotateSlot>) {
  const onScreen = new Set(MOBILE_SLOTS.map((slot) => shown[slot]!.alt));
  return CATALOGUE.filter((logo) => !onScreen.has(logo.alt));
}

describe("rotateSlot", () => {
  it("draws from every logo the narrow layout is not painting", () => {
    const pool = offScreen(seeded);
    const drawn = pool.map(
      (_, index) =>
        rotateSlot(CATALOGUE, seeded, MOBILE_SLOTS, 0, () => index)[0]!,
    );
    expect(drawn.map((logo) => logo.alt).sort()).toEqual(
      pool.map((logo) => logo.alt).sort(),
    );
  });

  it("trades places with a logo parked in a slot the narrow layout hides", () => {
    const parked = seeded[3]!;
    const index = offScreen(seeded).findIndex(
      (logo) => logo.alt === parked.alt,
    );
    const next = rotateSlot(CATALOGUE, seeded, MOBILE_SLOTS, 0, () => index);
    expect(next[0]).toBe(parked);
    expect(next[3]).toBe(seeded[0]);
  });

  it("keeps every slot distinct so widening never doubles a logo", () => {
    let shown = seeded;
    let queue: readonly number[] = [];
    for (let turn = 0; turn < 60; turn += 1) {
      const taken = takeSlot(queue, MOBILE_SLOTS);
      queue = taken.queue;
      shown = rotateSlot(
        CATALOGUE,
        shown,
        MOBILE_SLOTS,
        taken.slot,
        (count) => turn % count,
      );
      expect(new Set(shown.map((logo) => logo.alt)).size).toBe(shown.length);
    }
  });

  it("paints every logo in the catalogue on the narrow layout", () => {
    let shown = seeded;
    let queue: readonly number[] = [];
    const seen = new Set(MOBILE_SLOTS.map((slot) => shown[slot]!.alt));
    for (let turn = 0; turn < 60; turn += 1) {
      const taken = takeSlot(queue, MOBILE_SLOTS);
      queue = taken.queue;
      shown = rotateSlot(
        CATALOGUE,
        shown,
        MOBILE_SLOTS,
        taken.slot,
        (count) => turn % count,
      );
      for (const slot of MOBILE_SLOTS) seen.add(shown[slot]!.alt);
    }
    expect(seen.size).toBe(CATALOGUE.length);
  });

  it("leaves the shown set untouched when every logo is already on screen", () => {
    expect(rotateSlot(seeded, seeded, ALL_SLOTS, 0, () => 0)).toBe(seeded);
  });
});
