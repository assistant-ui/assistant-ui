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

    // The dropped offender is not left dirty: a stale isDirty would stall
    // its root's publishing and re-burn 50 runs on every later markDirty.
    expect(scheduler.isDirty).toBe(false);

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

    // A dirties B and B dirties A: both cross the per-scheduler run limit
    // in turn and are dropped individually, so the ring terminates while
    // unrelated work keeps flushing afterwards.
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

  it("drains a 10001-scheduler batch in one flush", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // Finite batches never hit the per-scheduler guard because each
    // scheduler runs exactly once, so batches of any size drain in one pass.
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

  it("drains synchronously inside flushTapSync even for huge batches", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler, flushTapSync } = await import("../core/scheduler");

    const ran: number[] = [];
    const schedulers = Array.from(
      { length: 10001 },
      (_, i) =>
        new UpdateScheduler(() => {
          ran.push(i);
        }),
    );

    // Everything must land before flushTapSync returns — no deferral and no
    // ceiling, since the per-scheduler guard bounds any single scheduler.
    flushTapSync(() => {
      for (const scheduler of schedulers) {
        scheduler.markDirty();
      }
    });
    expect(ran).toHaveLength(10001);
  });

  it("throws inside flushTapSync when the queue never shrinks (runaway)", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler, flushTapSync } = await import("../core/scheduler");

    // Finite sync batches of any size finish first (their queue always
    // shrinks); only a runaway — fresh schedulers minted mid-drain — hits
    // the sync ceiling.
    const makeCascadeScheduler = (): InstanceType<typeof UpdateScheduler> =>
      new UpdateScheduler(() => {
        makeCascadeScheduler().markDirty();
      });

    expect(() =>
      flushTapSync(() => {
        makeCascadeScheduler().markDirty();
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

  it("terminates an unbounded fresh-scheduler cascade at the absolute task ceiling", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // Each task queues a brand-new scheduler, so the per-scheduler guard
    // never trips (every instance runs once). Only the absolute per-flush
    // task ceiling stops the pass; the remainder stays queued and the next
    // triggered flush continues (and reports again).
    const makeCascadeScheduler = (): InstanceType<typeof UpdateScheduler> =>
      new UpdateScheduler(() => {
        makeCascadeScheduler().markDirty();
      });
    makeCascadeScheduler().markDirty();

    const [channel] = ControlledMessageChannel.instances;
    expect(() => pump(channel!)).toThrow(/Maximum update depth exceeded/);
    // No automatic continuation after the ceiling abort.
    expect(() => pump(channel!)).not.toThrow();
    new UpdateScheduler(() => {}).markDirty();
    expect(() => pump(channel!)).toThrow(/Maximum update depth exceeded/);
  });
});
