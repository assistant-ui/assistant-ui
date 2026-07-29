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

  it("still throws when a resource re-dirties itself on every run", async () => {
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
  });

  it("resets per-burst run counts once a flush fully drains", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // The SAME scheduler driven through many separate, fully-drained bursts:
    // each burst must start its run count fresh, so no number of sequential
    // bursts may trip the loop guard. (Pins runCounts.clear() on drain —
    // with fresh schedulers per burst the clear would be untestable.)
    let runs = 0;
    const scheduler = new UpdateScheduler(() => {
      runs += 1;
    });

    for (let burst = 0; burst < 60; burst++) {
      scheduler.markDirty();
      const [channel] = ControlledMessageChannel.instances;
      expect(() => pump(channel!)).not.toThrow();
    }
    expect(runs).toBe(60);
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

  it("throws past MAX_TOTAL_TASKS_PER_BURST but keeps the remainder queued", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // Contract of the burst-wide backstop: it fires loudly, but unlike the
    // pre-fix behavior it does not drop the pending queue — the remainder
    // drains on the next flush.
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
    expect(() => pump(channel!)).toThrow(/Maximum update depth exceeded/);
    const ranBeforeAbort = ran.length;
    expect(ranBeforeAbort).toBeLessThan(10001);

    // The remainder stays queued; the next flush (triggered by any later
    // markDirty, as in production) continues it instead of dropping it.
    schedulers[10000]!.markDirty();
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

  it("throws on an unbounded cascade of fresh schedulers (burst-wide backstop)", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // Each task queues a brand-new scheduler, so the per-scheduler guard
    // never trips (every instance runs once) — only the burst-wide task cap
    // prevents the macrotask from being monopolized forever.
    const makeCascadeScheduler = (): InstanceType<typeof UpdateScheduler> =>
      new UpdateScheduler(() => {
        makeCascadeScheduler().markDirty();
      });
    makeCascadeScheduler().markDirty();

    const [channel] = ControlledMessageChannel.instances;
    expect(() => pump(channel!)).toThrow(/Maximum update depth exceeded/);
  });
});
