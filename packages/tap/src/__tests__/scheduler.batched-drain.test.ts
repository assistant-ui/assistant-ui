import { describe, it, expect, vi, afterEach } from "vitest";

import { ControlledMessageChannel, pump } from "./controlled-channel";

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

    // The offender is dropped but left dirty on purpose: the flag gates
    // publishing so the root never emits un-applied state, and the next
    // markDirty re-queues it to drain consistently.
    expect(scheduler.isDirty).toBe(true);
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

    // A dirties B and B dirties A: both hit the run limit and are skipped
    // (kept queued, retried each pass), so the ring degrades to a loud
    // error per flush while the rest of the queue keeps flushing.
    let a: InstanceType<typeof UpdateScheduler>;
    let b: InstanceType<typeof UpdateScheduler>;
    a = new UpdateScheduler(() => b.markDirty());
    b = new UpdateScheduler(() => a.markDirty());
    a.markDirty();

    const [channel] = ControlledMessageChannel.instances;
    expect(() => pump(channel!)).toThrow(/Maximum update depth exceeded/);

    // Both offenders were dropped in the first pass, so the queue is clean
    // and later, unrelated work flushes normally.
    let ran = false;
    new UpdateScheduler(() => {
      ran = true;
    }).markDirty();
    expect(() => pump(channel!)).not.toThrow();
    expect(ran).toBe(true);
  });

  it("drains a 2500-scheduler batch silently across chunked passes", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // Bigger than one pass (1000) but under the burst bound: chunks
    // continue silently on follow-up macrotasks, no depth error.
    const ran: number[] = [];
    const schedulers = Array.from(
      { length: 2500 },
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
    expect(ran).toHaveLength(2500);
  });

  it("drains a 4000-scheduler batch silently across chunked passes", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // Finite batches never hit the per-scheduler guard because each
    // scheduler runs exactly once; under the burst bound they chunk
    // silently, no depth error.
    const ran: number[] = [];
    const schedulers = Array.from(
      { length: 4000 },
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
    expect(ran).toHaveLength(4000);
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
      { length: 4000 },
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
    expect(ran).toHaveLength(4000);
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

  it("drains a 6001-scheduler batch silently across chunked passes", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", ControlledMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    // Finite batches of any size drain silently: chunking across
    // macrotask passes has no total bound on this path.
    const ran: number[] = [];
    const schedulers = Array.from(
      { length: 6001 },
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
    expect(ran).toHaveLength(6001);
  });
});
