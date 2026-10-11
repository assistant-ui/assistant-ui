import { afterEach, describe, expect, it, vi } from "vitest";
import { createSnapshotSaver } from "./snapshotSaver";

type Call = {
  snapshot: unknown;
  resolve: () => void;
  reject: () => void;
};

const recorder = () => {
  const calls: Call[] = [];
  const record = vi.fn(
    (snapshot: unknown) =>
      new Promise<void>((resolve, reject) => {
        calls.push({
          snapshot,
          resolve: () => resolve(),
          reject: () => reject(new Error("rejected")),
        });
      }),
  );
  return { calls, record, snapshots: () => calls.map((call) => call.snapshot) };
};

const settle = async () => {
  for (let tick = 0; tick < 10; tick++) await Promise.resolve();
};

afterEach(() => {
  vi.useRealTimers();
});

describe("createSnapshotSaver", () => {
  it("saves 500 ms after the last change, only what differs from the newest entry", () => {
    vi.useFakeTimers();
    const { record, snapshots } = recorder();
    let value = { n: 0 };
    const saver = createSnapshotSaver(value, record);
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    expect(snapshots()).toEqual([]);
    value = { n: 1 };
    saver.schedule(() => value);
    vi.advanceTimersByTime(499);
    value = { n: 2 };
    saver.schedule(() => value);
    vi.advanceTimersByTime(499);
    expect(snapshots()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(snapshots()).toEqual([{ n: 2 }]);
  });

  it("keeps one record in flight and saves a change made meanwhile once it settles", async () => {
    vi.useFakeTimers();
    const { calls, snapshots, record } = recorder();
    let value = 0;
    const saver = createSnapshotSaver(value, record);
    value = 1;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    value = 2;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    expect(snapshots()).toEqual([1]);
    calls[0]!.resolve();
    await settle();
    expect(snapshots()).toEqual([1, 2]);
  });

  it("waits for a change still settling before it saves after a record lands", async () => {
    vi.useFakeTimers();
    const { calls, snapshots, record } = recorder();
    let value = 0;
    const saver = createSnapshotSaver(value, record);
    value = 1;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    value = 2;
    saver.schedule(() => value);
    calls[0]!.resolve();
    await settle();
    expect(snapshots()).toEqual([1]);
    vi.advanceTimersByTime(500);
    expect(snapshots()).toEqual([1, 2]);
  });

  it("saves a revert to the newest entry made while a different snapshot is in flight", async () => {
    vi.useFakeTimers();
    const { calls, snapshots, record } = recorder();
    let value = "a";
    const saver = createSnapshotSaver(value, record);
    value = "b";
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    value = "a";
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[0]!.resolve();
    await settle();
    expect(snapshots()).toEqual(["b", "a"]);
  });

  it("marks a snapshot that cannot be recorded, once the marker is accepted", async () => {
    vi.useFakeTimers();
    const { calls, snapshots, record } = recorder();
    let value = 0;
    const saver = createSnapshotSaver(value, record);
    value = 1;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[0]!.reject();
    await settle();
    expect(snapshots()).toEqual([1, null]);
    calls[1]!.resolve();
    await settle();
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    await settle();
    expect(snapshots()).toEqual([1, null]);
  });

  it("marks a change that fails after a marker that was still in flight", async () => {
    vi.useFakeTimers();
    const { calls, snapshots, record } = recorder();
    let value = 0;
    const saver = createSnapshotSaver(value, record);
    value = 1;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[0]!.resolve();
    await settle();
    value = 2;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[1]!.reject();
    await settle();
    value = 3;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[2]!.reject();
    await settle();
    calls[3]!.reject();
    await settle();
    expect(snapshots()).toEqual([1, 2, null, 3, null]);
  });

  it("marks a change that fails after a slow snapshot sent past an accepted marker", async () => {
    vi.useFakeTimers();
    const { calls, snapshots, record } = recorder();
    let value = 0;
    const saver = createSnapshotSaver(value, record);
    value = 1;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[0]!.reject();
    await settle();
    calls[1]!.resolve();
    await settle();
    value = 2;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    value = 3;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[2]!.resolve();
    await settle();
    calls[3]!.reject();
    await settle();
    expect(snapshots()).toEqual([1, null, 2, 3, null]);
  });

  it("sends a rejected marker again only after a newer snapshot is tried", async () => {
    vi.useFakeTimers();
    const { calls, snapshots, record } = recorder();
    let value = 0;
    const saver = createSnapshotSaver(value, record);
    value = 1;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[0]!.reject();
    await settle();
    calls[1]!.reject();
    await settle();
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    await settle();
    expect(snapshots()).toEqual([1, null]);
    value = 2;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[2]!.reject();
    await settle();
    expect(snapshots()).toEqual([1, null, 2, null]);
  });

  it("tries a snapshot that failed before again after another one was accepted", async () => {
    vi.useFakeTimers();
    const { calls, snapshots, record } = recorder();
    let value = 0;
    const saver = createSnapshotSaver(value, record);
    value = 1;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[0]!.reject();
    await settle();
    calls[1]!.resolve();
    await settle();
    value = 2;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    calls[2]!.resolve();
    await settle();
    value = 1;
    saver.schedule(() => value);
    vi.advanceTimersByTime(500);
    expect(snapshots()).toEqual([1, null, 2, 1]);
  });

  it("marks a snapshot that is not plain JSON even when it serializes like the newest entry", () => {
    vi.useFakeTimers();
    const nan = recorder();
    createSnapshotSaver<unknown>([["/x", null]], nan.record).schedule(() => [
      ["/x", Number.NaN],
    ]);
    const missing = recorder();
    createSnapshotSaver<unknown>({}, missing.record).schedule(() => ({
      a: undefined,
    }));
    const instance = recorder();
    createSnapshotSaver<unknown>(
      "1970-01-01T00:00:00.000Z",
      instance.record,
    ).schedule(() => new Date(0));
    vi.advanceTimersByTime(500);
    expect(nan.snapshots()).toEqual([null]);
    expect(missing.snapshots()).toEqual([null]);
    expect(instance.snapshots()).toEqual([null]);
  });

  it("marks a snapshot that cannot be serialized and a recorder that throws", async () => {
    vi.useFakeTimers();
    const { snapshots, record } = recorder();
    const saver = createSnapshotSaver<unknown>(0, record);
    saver.schedule(() => ({ big: BigInt(1) }));
    vi.advanceTimersByTime(500);
    expect(snapshots()).toEqual([null]);

    const throwing = vi.fn((snapshot: unknown) => {
      if (snapshot !== null) throw new Error("not recordable");
    });
    const other = createSnapshotSaver<number>(0, throwing);
    other.schedule(() => 1);
    vi.advanceTimersByTime(500);
    await settle();
    expect(throwing.mock.calls.map(([snapshot]) => snapshot)).toEqual([
      1,
      null,
    ]);
  });

  it("saves a waiting change on flush, and a change behind a record in flight once it settles", async () => {
    vi.useFakeTimers();
    const { snapshots, record } = recorder();
    let value = 0;
    const saver = createSnapshotSaver(value, record);
    saver.flush();
    expect(snapshots()).toEqual([]);
    value = 1;
    saver.schedule(() => value);
    saver.flush();
    expect(snapshots()).toEqual([1]);

    const next = recorder();
    const inFlight = createSnapshotSaver<number>(0, next.record);
    value = 1;
    inFlight.schedule(() => value);
    vi.advanceTimersByTime(500);
    value = 2;
    inFlight.schedule(() => value);
    inFlight.flush();
    expect(next.snapshots()).toEqual([1]);
    next.calls[0]!.resolve();
    await settle();
    expect(next.snapshots()).toEqual([1, 2]);
  });
});
