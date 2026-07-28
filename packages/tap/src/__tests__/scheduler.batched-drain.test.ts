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

  it("resets the saturated-pass counter after a fully drained pass", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // A burst slightly above one pass budget, issued twice back-to-back:
    // 75 dirty schedulers drain in two passes (50 + 25), so the counter must
    // reset rather than accumulate across separate bursts.
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
});
