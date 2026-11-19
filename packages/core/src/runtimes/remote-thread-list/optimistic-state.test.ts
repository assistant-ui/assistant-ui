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
  it("keeps a completed effect applied when its settling notification starts a stale reload", async () => {
    const state = new OptimisticState({ ids: ["a", "b"] });
    const deleteRequest = deferred();
    const reloadRequest = deferred();
    let deleteResolved = false;
    let reloadStarted = false;
    let reload: Promise<string[]> | undefined;
    const unsubscribe = state.subscribe(() => {
      if (!deleteResolved || reloadStarted) return;
      reloadStarted = true;
      reload = state.optimisticUpdate({
        execute: () => reloadRequest.promise.then(() => ["a", "b"]),
        then: (value, ids) => ({ ...value, ids }),
      });
    });

    const deletion = state.optimisticUpdate({
      execute: () =>
        deleteRequest.promise.then(() => {
          deleteResolved = true;
        }),
      optimistic: (value) => ({
        ...value,
        ids: value.ids.filter((id) => id !== "b"),
      }),
    });

    deleteRequest.resolve();
    await deletion;
    reloadRequest.resolve();
    await reload;
    unsubscribe();

    expect(state.value.ids).toEqual(["a"]);
  });

  it("drops completed effects when the settling notification throws", async () => {
    const state = new OptimisticState({ ids: ["a", "b"] });
    const deleteRequest = deferred();
    const subscriberError = new Error("subscriber failed");
    let deleteResolved = false;
    let thrown = false;
    const unsubscribe = state.subscribe(() => {
      if (!deleteResolved || thrown) return;
      thrown = true;
      throw subscriberError;
    });

    const deletion = state.optimisticUpdate({
      execute: () =>
        deleteRequest.promise.then(() => {
          deleteResolved = true;
        }),
      optimistic: (value) => ({
        ...value,
        ids: value.ids.filter((id) => id !== "b"),
      }),
    });

    deleteRequest.resolve();
    await expect(deletion).rejects.toBe(subscriberError);
    unsubscribe();

    await state.optimisticUpdate({
      execute: async () => ["a", "b"],
      then: (value, ids) => ({ ...value, ids }),
    });

    expect(state.value.ids).toEqual(["a", "b"]);
  });

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

  it("moves a reordered group after every registered transform, in the given order", async () => {
    const state = new OptimisticState<{ log: string[] }>({ log: [] });
    const request = deferred();
    const first = { current: -1 };
    const second = { current: -1 };
    const unregistered = { current: -1 };
    const append = (name: string) => (value: { log: string[] }) =>
      value.log.includes(name) ? value : { log: [...value.log, name] };

    const updates = [
      state.optimisticUpdate(
        { execute: () => request.promise, optimistic: append("first") },
        first,
      ),
      state.optimisticUpdate({
        execute: () => request.promise,
        optimistic: append("outside"),
      }),
      state.optimisticUpdate(
        { execute: () => request.promise, optimistic: append("second") },
        second,
      ),
    ];
    expect(state.value.log).toEqual(["first", "outside", "second"]);

    state.reorder([second, unregistered, first]);
    state.update(state.baseValue);

    expect(state.value.log).toEqual(["outside", "second", "first"]);
    expect(unregistered.current).toBe(-1);

    request.resolve();
    await Promise.all(updates);
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
