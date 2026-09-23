import { describe, expect, it } from "vitest";
import { OptimisticState } from "./optimistic-state";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("OptimisticState", () => {
  it("preserves invocation order when optimistic updates resolve in order", async () => {
    const state = new OptimisticState({ title: "Untitled" });
    const firstRequest = deferred();
    const secondRequest = deferred();

    const firstUpdate = state.optimisticUpdate({
      execute: () => firstRequest.promise,
      optimistic: (value) => ({ ...value, title: "Project Alpha" }),
    });
    const secondUpdate = state.optimisticUpdate({
      execute: () => secondRequest.promise,
      optimistic: (value) => ({ ...value, title: "Project Beta" }),
    });

    expect(state.value.title).toBe("Project Beta");

    firstRequest.resolve();
    await firstUpdate;
    expect(state.value.title).toBe("Project Beta");

    secondRequest.resolve();
    await secondUpdate;

    expect(state.value.title).toBe("Project Beta");
  });

  it("preserves invocation order when optimistic updates resolve out of order", async () => {
    const state = new OptimisticState({ title: "Untitled" });
    const firstRequest = deferred();
    const secondRequest = deferred();

    const firstUpdate = state.optimisticUpdate({
      execute: () => firstRequest.promise,
      optimistic: (value) => ({ ...value, title: "Project Alpha" }),
    });
    const secondUpdate = state.optimisticUpdate({
      execute: () => secondRequest.promise,
      optimistic: (value) => ({ ...value, title: "Project Beta" }),
    });

    secondRequest.resolve();
    await secondUpdate;
    expect(state.value.title).toBe("Project Beta");

    firstRequest.resolve();
    await firstUpdate;

    expect(state.value.title).toBe("Project Beta");
  });

  it("preserves invocation order when the later update has a then", async () => {
    const state = new OptimisticState({ title: "Untitled", synced: false });
    const firstRequest = deferred();
    const secondRequest = deferred();

    const firstUpdate = state.optimisticUpdate({
      execute: () => firstRequest.promise,
      optimistic: (value) => ({ ...value, title: "Project Alpha" }),
    });
    const secondUpdate = state.optimisticUpdate({
      execute: () => secondRequest.promise,
      optimistic: (value) => ({ ...value, title: "Project Beta" }),
      then: (value) => ({ ...value, synced: true }),
    });

    firstRequest.resolve();
    await firstUpdate;
    expect(state.value.title).toBe("Project Beta");

    secondRequest.resolve();
    await secondUpdate;

    expect(state.value).toEqual({ title: "Project Beta", synced: true });
  });

  it("replays an earlier completed update over a stale then result", async () => {
    const state = new OptimisticState({ title: "Untitled", archived: false });
    const archiveRequest = deferred();
    const listRequest = deferred();

    const archive = state.optimisticUpdate({
      execute: () => archiveRequest.promise,
      optimistic: (value) => ({ ...value, archived: true }),
    });
    const list = state.optimisticUpdate({
      execute: () => listRequest.promise,
      then: () => ({ title: "Listed", archived: false }),
    });

    archiveRequest.resolve();
    await archive;
    listRequest.resolve();
    await list;

    expect(state.value).toEqual({ title: "Listed", archived: true });
  });

  it("drops an in-flight transform after reset", async () => {
    const state = new OptimisticState({ title: "Untitled", extra: 0 });
    const request = deferred();
    const update = state.optimisticUpdate({
      execute: () => request.promise,
      optimistic: (value) => ({ ...value, title: "Pending" }),
      then: (value) => ({ ...value, extra: 1 }),
    });

    expect(state.value.title).toBe("Pending");
    state.reset({ title: "Fresh", extra: 0 });
    expect(state.value).toEqual({ title: "Fresh", extra: 0 });

    request.resolve();
    await update;
    expect(state.value).toEqual({ title: "Fresh", extra: 0 });
  });
});
