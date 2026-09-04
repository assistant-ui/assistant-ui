import { describe, expect, it, vi } from "vitest";
import {
  finishThreadTitleRename,
  runThreadTitleGeneration,
  startThreadTitleRename,
  type ThreadTitleState,
} from "./title-generation";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const noop = async () => {};

describe("runThreadTitleGeneration", () => {
  it("reasserts a rename that lands while the generated stream is open", async () => {
    const states = new Map<string, ThreadTitleState>();
    const applied: (string | undefined)[] = [];
    const rename = vi.fn(noop);
    const streamOpen = deferred<void>();

    const generation = runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: true,
      generate: async (onTitle) => {
        await streamOpen.promise;
        await onTitle("Generated");
      },
      rename,
      applyTitle: async (title) => {
        applied.push(title);
      },
    });

    const claim = startThreadTitleRename(states, "t1", "Manual");
    finishThreadTitleRename(states, "t1", claim, true);
    streamOpen.resolve();
    await generation;

    expect(applied).toEqual(["Manual"]);
    expect(rename).toHaveBeenCalledTimes(1);
    expect(rename).toHaveBeenCalledWith("Manual");
  });

  it("applies the generated title when the rename fails", async () => {
    const states = new Map<string, ThreadTitleState>();
    const applied: (string | undefined)[] = [];
    const rename = vi.fn(noop);
    const streamOpen = deferred<void>();

    const generation = runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: true,
      generate: async (onTitle) => {
        await streamOpen.promise;
        await onTitle("Generated");
      },
      rename,
      applyTitle: async (title) => {
        applied.push(title);
      },
    });

    const claim = startThreadTitleRename(states, "t1", "Manual");
    finishThreadTitleRename(states, "t1", claim, false);
    streamOpen.resolve();
    await generation;

    expect(applied).toEqual(["Generated"]);
    expect(rename).not.toHaveBeenCalled();
  });

  it("skips the next automatic generation after a completed rename, once", async () => {
    const states = new Map<string, ThreadTitleState>();
    const generate = vi.fn(async (onTitle: (t: string) => Promise<void>) => {
      await onTitle("Generated");
    });
    const run = () =>
      runThreadTitleGeneration({
        states,
        threadId: "t1",
        automatic: true,
        generate,
        rename: noop,
        applyTitle: noop,
      });

    const claim = startThreadTitleRename(states, "t1", "Manual");
    finishThreadTitleRename(states, "t1", claim, true);

    await run();
    expect(generate).not.toHaveBeenCalled();

    await run();
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("lets an explicit generation supersede an in-flight automatic one", async () => {
    const states = new Map<string, ThreadTitleState>();
    const applied: (string | undefined)[] = [];
    const streamOpen = deferred<void>();
    const applyTitle = async (title: string | undefined) => {
      applied.push(title);
    };

    const automatic = runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: true,
      generate: async (onTitle) => {
        await streamOpen.promise;
        await onTitle("Automatic");
      },
      rename: noop,
      applyTitle,
    });

    await runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: false,
      generate: async (onTitle) => {
        await onTitle("Explicit");
      },
      rename: noop,
      applyTitle,
    });

    streamOpen.resolve();
    await automatic;

    expect(applied).toEqual(["Explicit"]);
  });

  it("drops per-thread state once nothing is in flight", async () => {
    const states = new Map<string, ThreadTitleState>();
    await runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: true,
      generate: async (onTitle) => {
        await onTitle("Generated");
      },
      rename: noop,
      applyTitle: noop,
    });

    expect(states.size).toBe(0);
  });
});
