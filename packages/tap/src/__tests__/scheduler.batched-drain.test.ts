import { describe, it, expect, vi, afterEach } from "vitest";

// A MessageChannel whose deliveries are pumped manually, so flush passes can
// be stepped through synchronously (and expected errors asserted) instead of
// relying on un-catchable async callbacks.
class ControlledPort {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  pending = 0;
  other!: ControlledPort;
  ref() {}
  unref() {}
  postMessage(_data: unknown) {
    // port2.postMessage delivers to port1.onmessage in a real channel.
    this.other.pending++;
  }
}

class ControlledMessageChannel {
  static instances: ControlledMessageChannel[] = [];
  port1 = new ControlledPort();
  port2 = new ControlledPort();
  constructor() {
    this.port1.other = this.port2;
    this.port2.other = this.port1;
    ControlledMessageChannel.instances.push(this);
  }
}

const pump = (channel: ControlledMessageChannel) => {
  const port = channel.port1;
  while (port.pending > 0) {
    port.pending--;
    port.onmessage?.({ data: null });
  }
};

describe("scheduler batched draining", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    ControlledMessageChannel.instances = [];
  });

  it("drains more than 50 dirty schedulers in a single flush instead of throwing", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    const ran: number[] = [];
    const schedulers = Array.from(
      { length: 120 },
      (_, i) =>
        new UpdateScheduler(() => {
          ran.push(i);
        }),
    );
    for (const scheduler of schedulers) {
      scheduler.markDirty();
    }

    const [channel] = ControlledMessageChannel.instances;
    expect(() => pump(channel!)).not.toThrow();
    expect(ran).toHaveLength(120);
  });

  it("still throws when a resource re-dirties itself on every run, then recovers", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    const scheduler: InstanceType<typeof UpdateScheduler> = new UpdateScheduler(
      () => {
        scheduler.markDirty();
      },
    );
    scheduler.markDirty();

    const [channel] = ControlledMessageChannel.instances;
    expect(() => pump(channel!)).toThrow(/Maximum update depth exceeded/);

    // The looping scheduler is dropped instead of permanently poisoning the
    // queue: later, unrelated work must flush normally.
    let ran = false;
    const other = new UpdateScheduler(() => {
      ran = true;
    });
    other.markDirty();
    expect(() => pump(channel!)).not.toThrow();
    expect(ran).toBe(true);
  });

  it("terminates a ring of mutually re-dirtying schedulers", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // A dirties B and B dirties A. Dropping only the current scheduler
    // rebuilds the identical cycle next flush, so the loop abort must clear
    // the queue — afterwards the app must keep flushing normally.
    let a: InstanceType<typeof UpdateScheduler>;
    let b: InstanceType<typeof UpdateScheduler>;
    a = new UpdateScheduler(() => b.markDirty());
    b = new UpdateScheduler(() => a.markDirty());
    a.markDirty();

    const [channel] = ControlledMessageChannel.instances;
    expect(() => pump(channel!)).toThrow(/Maximum update depth exceeded/);
    expect(() => pump(channel!)).not.toThrow();

    let ran = false;
    new UpdateScheduler(() => {
      ran = true;
    }).markDirty();
    expect(() => pump(channel!)).not.toThrow();
    expect(ran).toBe(true);
  });

  it("drains a 6000-scheduler batch in one flush", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // Finite batches never hit the per-scheduler guard because each
    // scheduler runs exactly once. (6000 < MAX_TOTAL_TASKS_PER_BURST; the
    // burst-wide cap is pinned separately below.)
    const ran: number[] = [];
    const schedulers = Array.from(
      { length: 6000 },
      (_, i) =>
        new UpdateScheduler(() => {
          ran.push(i);
        }),
    );
    for (const scheduler of schedulers) {
      scheduler.markDirty();
    }

    const [channel] = ControlledMessageChannel.instances;
    expect(() => pump(channel!)).not.toThrow();
    expect(ran).toHaveLength(6000);
  });

  it("yields silently past MAX_TOTAL_TASKS_PER_BURST and keeps draining", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // The burst-wide cap is a yield boundary, not an error: oversized but
    // finite batches drain across flushes without any throw.
    const ran: number[] = [];
    const schedulers = Array.from(
      { length: 10001 },
      (_, i) =>
        new UpdateScheduler(() => {
          ran.push(i);
        }),
    );
    for (const scheduler of schedulers) {
      scheduler.markDirty();
    }

    const [channel] = ControlledMessageChannel.instances;
    expect(() => pump(channel!)).not.toThrow();
    expect(ran).toHaveLength(10001);
  });

  it("drains synchronously inside flushTapSync", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler, flushTapSync } = await import("../core/scheduler");

    const ran: number[] = [];
    const schedulers = Array.from(
      { length: 120 },
      (_, i) =>
        new UpdateScheduler(() => {
          ran.push(i);
        }),
    );

    flushTapSync(() => {
      for (const scheduler of schedulers) {
        scheduler.markDirty();
      }
    });

    // Everything must have landed before flushTapSync returned — no deferred
    // macrotask remainder (not even a channel gets created for leftovers).
    expect(ran).toHaveLength(120);
    const [channel] = ControlledMessageChannel.instances;
    if (channel) {
      pump(channel);
    }
    expect(ran).toHaveLength(120);
  });

  it("throws past the burst cap inside flushTapSync instead of hanging", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler, flushTapSync } = await import("../core/scheduler");

    // There is no next macrotask to yield to inside flushTapSync, so an
    // oversized batch hits a hard ceiling and reports instead of blocking
    // the thread indefinitely.
    const schedulers = Array.from(
      { length: 10001 },
      (_, i) => new UpdateScheduler(() => {}),
    );

    expect(() =>
      flushTapSync(() => {
        for (const scheduler of schedulers) {
          scheduler.markDirty();
        }
      }),
    ).toThrow(/Maximum update depth exceeded/);
  });

  it("throws inside flushTapSync when a resource re-dirties itself", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler, flushTapSync } = await import("../core/scheduler");

    const scheduler: InstanceType<typeof UpdateScheduler> = new UpdateScheduler(
      () => {
        scheduler.markDirty();
      },
    );

    expect(() =>
      flushTapSync(() => {
        scheduler.markDirty();
      }),
    ).toThrow(/Maximum update depth exceeded/);
  });

  it("terminates an unbounded fresh-scheduler cascade after MAX_CAP_STREAK aborts", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // Each task queues a brand-new scheduler, so every flush saturates the
    // burst-wide cap and reschedules. After MAX_CAP_STREAK consecutive
    // saturated flushes the queue must be dropped — the cascade gets a
    // terminal state instead of wedging the tab with endless throws.
    const makeCascadeScheduler = (): InstanceType<typeof UpdateScheduler> =>
      new UpdateScheduler(() => {
        makeCascadeScheduler().markDirty();
      });
    makeCascadeScheduler().markDirty();

    const [channel] = ControlledMessageChannel.instances;
    // Saturated flushes yield silently and auto-continue; after
    // MAX_CAP_STREAK (10) in a row the cascade is treated as a runaway: it
    // throws and stops rescheduling. pump() drives every chained flush, so
    // this first pump runs all 10 silent yields before the give-up throw.
    expect(() => pump(channel!)).toThrow(/Maximum update depth exceeded/);
    // Nothing is rescheduled after the give-up.
    expect(() => pump(channel!)).not.toThrow();

    // The remainder is not dropped: any later markDirty triggers a flush
    // that runs it (and throws again, since the cascade is unbounded).
    new UpdateScheduler(() => {}).markDirty();
    expect(() => pump(channel!)).toThrow(/Maximum update depth exceeded/);
  });
});
