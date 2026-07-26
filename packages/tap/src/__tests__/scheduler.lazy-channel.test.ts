import { describe, it, expect, vi, afterEach } from "vitest";

class FakePort {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  refCount = 0;
  other!: FakePort;
  ref() {
    this.refCount++;
  }
  unref() {
    this.refCount--;
  }
  postMessage(data: unknown) {
    queueMicrotask(() => this.other.onmessage?.({ data }));
  }
}

class FakeMessageChannel {
  static instances: FakeMessageChannel[] = [];
  port1 = new FakePort();
  port2 = new FakePort();
  constructor() {
    this.port1.other = this.port2;
    this.port2.other = this.port1;
    FakeMessageChannel.instances.push(this);
  }
}

describe("scheduler lazy MessageChannel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    FakeMessageChannel.instances = [];
  });

  it("creates the channel on first schedule, not at import", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", FakeMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");
    expect(FakeMessageChannel.instances).toHaveLength(0);

    let ran = false;
    const scheduler = new UpdateScheduler(() => {
      ran = true;
    });
    scheduler.markDirty();
    expect(FakeMessageChannel.instances).toHaveLength(1);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ran).toBe(true);
  });

  it("refs the port only while a flush is pending", async () => {
    vi.resetModules();
    vi.stubGlobal("MessageChannel", FakeMessageChannel);
    const { UpdateScheduler } = await import("../core/scheduler");

    const scheduler = new UpdateScheduler(() => {});
    scheduler.markDirty();

    const [channel] = FakeMessageChannel.instances;
    expect(channel!.port1.refCount).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(channel!.port1.refCount).toBe(0);

    scheduler.markDirty();
    expect(FakeMessageChannel.instances).toHaveLength(1);
    expect(channel!.port1.refCount).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(channel!.port1.refCount).toBe(0);
  });
});
