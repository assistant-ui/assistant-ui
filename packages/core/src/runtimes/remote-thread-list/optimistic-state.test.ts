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

  it("does not replay pending updates after reset", async () => {
    const state = new OptimisticState({ title: "Untitled" });
    const request = deferred();

    const update = state.optimisticUpdate({
      execute: () => request.promise,
      optimistic: (value) => ({ ...value, title: "Old backend title" }),
    });

    expect(state.value.title).toBe("Old backend title");

    state.reset({ title: "New backend title" });
    request.resolve();
    await update;

    expect(state.value.title).toBe("New backend title");
  });

  it("does not queue an update when execute resets the state", async () => {
    const state = new OptimisticState({ title: "Untitled" });
    const request = deferred();

    const update = state.optimisticUpdate({
      execute: () => {
        state.reset({ title: "New backend title" });
        return request.promise;
      },
      optimistic: (value) => ({ ...value, title: "Old backend title" }),
    });

    expect(state.value.title).toBe("New backend title");
    request.resolve();
    await update;

    expect(state.value.title).toBe("New backend title");
  });
});
