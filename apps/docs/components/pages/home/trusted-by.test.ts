import {
  ALL_SLOTS,
  MOBILE_SLOTS,
  reconcileShown,
  rotateSlot,
  takeSlot,
} from "./trusted-by";

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

describe("reconcileShown", () => {
  it("keeps only active slots in a narrow seed", () => {
    const shown = reconcileShown(CATALOGUE, seeded, MOBILE_SLOTS);
    expect(MOBILE_SLOTS.map((slot) => shown[slot]!.alt)).toEqual([
      "logo-0",
      "logo-1",
      "logo-2",
      "logo-5",
      "logo-6",
      "logo-7",
    ]);
    expect([3, 4, 8].map((slot) => shown[slot])).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("fills only newly visible slots when widening", () => {
    const narrow = reconcileShown(CATALOGUE, seeded, MOBILE_SLOTS);
    const wide = reconcileShown(CATALOGUE, narrow, ALL_SLOTS);
    expect(MOBILE_SLOTS.map((slot) => wide[slot])).toEqual(
      MOBILE_SLOTS.map((slot) => narrow[slot]),
    );
    expect([3, 4, 8].map((slot) => wide[slot]!.alt)).toEqual([
      "logo-3",
      "logo-4",
      "logo-8",
    ]);
  });
});

function offScreen(shown: ReturnType<typeof rotateSlot>) {
  const onScreen = new Set(MOBILE_SLOTS.map((slot) => shown[slot]!.alt));
  return CATALOGUE.filter((logo) => !onScreen.has(logo.alt));
}

describe("rotateSlot", () => {
  it("draws from every logo the narrow layout is not painting", () => {
    const narrow = reconcileShown(CATALOGUE, seeded, MOBILE_SLOTS);
    const pool = offScreen(narrow);
    const drawn = pool.map(
      (_, index) =>
        rotateSlot(CATALOGUE, narrow, MOBILE_SLOTS, 0, () => index)[0]!,
    );
    expect(drawn.map((logo) => logo.alt).sort()).toEqual(
      pool.map((logo) => logo.alt).sort(),
    );
  });

  it("keeps every slot distinct across narrow rotations", () => {
    let shown = reconcileShown(CATALOGUE, seeded, MOBILE_SLOTS);
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
      const visibleLogos = shown.filter((logo) => logo !== undefined);
      expect(new Set(visibleLogos.map((logo) => logo.alt)).size).toBe(
        visibleLogos.length,
      );
    }
  });

  it("eventually paints every catalogue logo on the narrow layout", () => {
    let shown = reconcileShown(CATALOGUE, seeded, MOBILE_SLOTS);
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

  it("leaves the shown set untouched when every logo is visible", () => {
    expect(rotateSlot(seeded, seeded, ALL_SLOTS, 0, () => 0)).toBe(seeded);
  });
});
