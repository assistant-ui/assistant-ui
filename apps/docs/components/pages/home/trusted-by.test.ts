import {
  ALL_SLOTS,
  MOBILE_SLOTS,
  rotateSlot,
  slotState,
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

describe("slotState", () => {
  const [a, b, c] = CATALOGUE as [
    (typeof CATALOGUE)[number],
    (typeof CATALOGUE)[number],
    (typeof CATALOGUE)[number],
  ];
  const settled = { current: a, previous: null, entered: true };

  it("cross fades a painted slot", () => {
    expect(slotState(settled, b, { hidden: false, changed: false })).toEqual({
      current: b,
      previous: a,
      entered: false,
    });
  });

  it("keeps the last painted logo when a fade is still in flight", () => {
    const midFade = { current: b, previous: a, entered: false };
    expect(slotState(midFade, c, { hidden: false, changed: false })).toEqual({
      current: c,
      previous: a,
      entered: false,
    });
  });

  it("adopts the logo outright while the layout is not painting the slot", () => {
    expect(slotState(settled, b, { hidden: true, changed: false })).toEqual({
      current: b,
      previous: null,
      entered: true,
    });
  });

  it("drops a stale layer when a slot is hidden mid fade", () => {
    const midFade = { current: b, previous: a, entered: false };
    expect(slotState(midFade, b, { hidden: true, changed: false })).toEqual({
      current: b,
      previous: null,
      entered: true,
    });
  });

  it("never paints one logo twice, at either breakpoint or across the change", () => {
    let shown = seeded;
    let queue: readonly number[] = [];
    const state = new Map(
      ALL_SLOTS.map((slot) => [
        slot,
        { current: shown[slot]!, previous: null, entered: true } as ReturnType<
          typeof slotState
        >,
      ]),
    );
    const layers = (source: typeof state, slots: readonly number[]) =>
      slots.flatMap((slot) => {
        const slotLayers = source.get(slot)!;
        return slotLayers.previous
          ? [slotLayers.current.alt, slotLayers.previous.alt]
          : [slotLayers.current.alt];
      });

    for (let turn = 0; turn < 60; turn += 1) {
      // HOLD_MIN_MS outlasts the fade plus its drop, so every slot is settled
      // again before the next swap.
      for (const slot of ALL_SLOTS) {
        state.set(slot, { ...state.get(slot)!, previous: null, entered: true });
      }

      const taken = takeSlot(queue, MOBILE_SLOTS);
      queue = taken.queue;
      shown = rotateSlot(
        CATALOGUE,
        shown,
        MOBILE_SLOTS,
        taken.slot,
        (count) => turn % count,
      );
      for (const slot of ALL_SLOTS) {
        state.set(
          slot,
          slotState(state.get(slot)!, shown[slot]!, {
            hidden: !MOBILE_SLOTS.includes(slot),
            changed: false,
          }),
        );
      }

      const narrow = layers(state, MOBILE_SLOTS);
      expect(new Set(narrow).size).toBe(narrow.length);

      const widened = new Map(state);
      for (const slot of ALL_SLOTS) {
        widened.set(
          slot,
          slotState(widened.get(slot)!, shown[slot]!, {
            hidden: false,
            changed: true,
          }),
        );
      }
      const wide = layers(widened, ALL_SLOTS);
      expect(new Set(wide).size).toBe(wide.length);
    }
  });
});
