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

  it("drains more than MAX_FLUSH_LIMIT dirty schedulers across passes instead of throwing", async () => {
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

  it("resets per-burst run counts after a fully drained pass", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // A burst slightly above one pass budget, issued back-to-back: 75 dirty
    // schedulers drain in two passes (50 + 25), after which runCounts is
    // cleared, so separate bursts must not accumulate re-run counts.
    const ran: number[] = [];
    const make = (i: number) =>
      new UpdateScheduler(() => {
        ran.push(i);
      });

    for (let burst = 0; burst < 40; burst++) {
      const schedulers = Array.from({ length: 75 }, (_, i) =>
        make(burst * 75 + i),
      );
      for (const scheduler of schedulers) {
        scheduler.markDirty();
      }
      const [channel] = ControlledMessageChannel.instances;
      pump(channel!);
    }

    expect(ran).toHaveLength(40 * 75);
  });

  it("drains batches far larger than one pass budget with no total-size ceiling", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // Finite batches never re-run a scheduler, so they must drain no matter
    // how many passes they need (6000 tasks = 120 passes at 50/pass).
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

  it("drains synchronously across passes inside flushTapSync", async () => {
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
});
