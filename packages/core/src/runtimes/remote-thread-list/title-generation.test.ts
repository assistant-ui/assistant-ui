import { describe, expect, it, vi } from "vitest";
import {
  clearThreadTitleState,
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

const flushMicrotasks = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

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

  it("reasserts only after generate resolves, never mid-stream", async () => {
    const states = new Map<string, ThreadTitleState>();
    const order: string[] = [];
    const streamOpen = deferred<void>();

    const generation = runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: true,
      generate: async (onTitle) => {
        await streamOpen.promise;
        await onTitle("Generated");
        order.push("generate-resolved");
      },
      rename: async () => {
        order.push("rename");
      },
      applyTitle: async () => {
        order.push("applyTitle");
      },
    });

    const claim = startThreadTitleRename(states, "t1", "Manual");
    finishThreadTitleRename(states, "t1", claim, true);
    streamOpen.resolve();
    await generation;

    expect(order).toEqual(["generate-resolved", "rename", "applyTitle"]);
  });

  it("reasserts the newer claim when a rename starts during the reassert", async () => {
    const states = new Map<string, ThreadTitleState>();
    const applied: (string | undefined)[] = [];
    const renamed: string[] = [];
    const streamOpen = deferred<void>();

    const generation = runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: true,
      generate: async (onTitle) => {
        await streamOpen.promise;
        await onTitle("Generated");
      },
      rename: async (title) => {
        renamed.push(title);
        if (renamed.length === 1) {
          const second = startThreadTitleRename(states, "t1", "Second");
          finishThreadTitleRename(states, "t1", second, true);
        }
      },
      applyTitle: async (title) => {
        applied.push(title);
      },
    });

    const first = startThreadTitleRename(states, "t1", "First");
    finishThreadTitleRename(states, "t1", first, true);
    streamOpen.resolve();
    await generation;

    expect(renamed).toEqual(["First", "Second"]);
    expect(applied).toEqual(["Second"]);
  });

  it("keeps an earlier manual title when a newer rename fails", async () => {
    const states = new Map<string, ThreadTitleState>();
    const applied: (string | undefined)[] = [];
    const generate = vi.fn(async (onTitle: (t: string) => Promise<void>) => {
      await onTitle("Generated");
    });

    const first = startThreadTitleRename(states, "t1", "First manual title");
    finishThreadTitleRename(states, "t1", first, true);
    const second = startThreadTitleRename(states, "t1", "Second manual title");

    const generation = runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: true,
      generate,
      rename: noop,
      applyTitle: async (title) => {
        applied.push(title);
      },
    });

    finishThreadTitleRename(states, "t1", second, false);
    await generation;

    expect(generate).not.toHaveBeenCalled();
    expect(applied).toEqual([]);
  });

  it("drops per-thread state when the thread is deleted", async () => {
    const states = new Map<string, ThreadTitleState>();
    const claim = startThreadTitleRename(states, "t1", "Manual");
    finishThreadTitleRename(states, "t1", claim, true);
    expect(states.size).toBe(1);

    clearThreadTitleState(states, "t1");
    expect(states.size).toBe(0);
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

  it("reasserts the explicit title when the superseded run persists last", async () => {
    const states = new Map<string, ThreadTitleState>();
    const streamOpen = deferred<void>();
    let server: string | undefined;
    const runOf = (automatic: boolean, title: string, open?: Promise<void>) =>
      runThreadTitleGeneration({
        states,
        threadId: "t1",
        automatic,
        generate: async (onTitle) => {
          if (open) await open;
          await onTitle(title);
          server = title;
        },
        rename: async (next) => {
          server = next;
        },
        applyTitle: noop,
      });

    const automatic = runOf(true, "Automatic", streamOpen.promise);
    await runOf(false, "Explicit");
    expect(server).toBe("Explicit");

    streamOpen.resolve();
    await automatic;

    expect(server).toBe("Explicit");
  });

  it("leaves the explicit title alone when the superseded run persists first", async () => {
    const states = new Map<string, ThreadTitleState>();
    const automaticStream = deferred<void>();
    const explicitStream = deferred<void>();
    let server: string | undefined;
    const runOf = (automatic: boolean, title: string, open: Promise<void>) =>
      runThreadTitleGeneration({
        states,
        threadId: "t1",
        automatic,
        generate: async (onTitle) => {
          await open;
          await onTitle(title);
          server = title;
        },
        rename: async (next) => {
          server = next;
        },
        applyTitle: noop,
      });

    const automatic = runOf(true, "Automatic", automaticStream.promise);
    const explicit = runOf(false, "Explicit", explicitStream.promise);

    automaticStream.resolve();
    explicitStream.resolve();
    await Promise.all([automatic, explicit]);

    expect(server).toBe("Explicit");
  });

  it("keeps a rename that lands after the superseding explicit generation", async () => {
    const states = new Map<string, ThreadTitleState>();
    const streamOpen = deferred<void>();
    let server: string | undefined;
    const runOf = (automatic: boolean, title: string, open?: Promise<void>) =>
      runThreadTitleGeneration({
        states,
        threadId: "t1",
        automatic,
        generate: async (onTitle) => {
          if (open) await open;
          await onTitle(title);
          server = title;
        },
        rename: async (next) => {
          server = next;
        },
        applyTitle: noop,
      });

    const automatic = runOf(true, "Automatic", streamOpen.promise);
    await runOf(false, "Explicit");

    const claim = startThreadTitleRename(states, "t1", "Manual");
    server = "Manual";
    finishThreadTitleRename(states, "t1", claim, true);

    streamOpen.resolve();
    await automatic;

    expect(server).toBe("Manual");
  });

  it("keeps a rename that lands while the superseded run waits to reassert", async () => {
    const states = new Map<string, ThreadTitleState>();
    const automaticStream = deferred<void>();
    const explicitStream = deferred<void>();
    let server: string | undefined;
    const runOf = (automatic: boolean, title: string, open: Promise<void>) =>
      runThreadTitleGeneration({
        states,
        threadId: "t1",
        automatic,
        generate: async (onTitle) => {
          await open;
          await onTitle(title);
          server = title;
        },
        rename: async (next) => {
          server = next;
        },
        applyTitle: noop,
      });

    const automatic = runOf(true, "Automatic", automaticStream.promise);
    const explicit = runOf(false, "Explicit", explicitStream.promise);

    automaticStream.resolve();
    await flushMicrotasks();

    const claim = startThreadTitleRename(states, "t1", "Manual");
    server = "Manual";
    finishThreadTitleRename(states, "t1", claim, true);

    explicitStream.resolve();
    await Promise.all([automatic, explicit]);

    expect(server).toBe("Manual");
  });

  it("keeps a rename that lands while the superseded run reasserts", async () => {
    const states = new Map<string, ThreadTitleState>();
    const streamOpen = deferred<void>();
    const renameOpen = deferred<void>();
    let server: string | undefined;
    let blocked = false;
    const rename = async (next: string) => {
      if (!blocked) {
        blocked = true;
        await renameOpen.promise;
      }
      server = next;
    };

    const automatic = runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: true,
      generate: async (onTitle) => {
        await streamOpen.promise;
        await onTitle("Automatic");
        server = "Automatic";
      },
      rename,
      applyTitle: noop,
    });

    await runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: false,
      generate: async (onTitle) => {
        await onTitle("Explicit");
        server = "Explicit";
      },
      rename,
      applyTitle: noop,
    });

    streamOpen.resolve();
    await flushMicrotasks();

    const claim = startThreadTitleRename(states, "t1", "Manual");
    server = "Manual";
    finishThreadTitleRename(states, "t1", claim, true);

    renameOpen.resolve();
    await automatic;

    expect(server).toBe("Manual");
  });

  it("skips a claim a newer explicit generation has outranked", async () => {
    const states = new Map<string, ThreadTitleState>();
    const streamOpen = deferred<void>();
    const renamed: string[] = [];
    const runOf = (automatic: boolean, title: string, open?: Promise<void>) =>
      runThreadTitleGeneration({
        states,
        threadId: "t1",
        automatic,
        generate: async (onTitle) => {
          if (open) await open;
          await onTitle(title);
        },
        rename: async (next) => {
          renamed.push(next);
        },
        applyTitle: noop,
      });

    const automatic = runOf(true, "Automatic", streamOpen.promise);
    await runOf(false, "Explicit");

    const claim = startThreadTitleRename(states, "t1", "Manual");
    finishThreadTitleRename(states, "t1", claim, true);

    await runOf(false, "Newer");

    streamOpen.resolve();
    await automatic;

    expect(renamed).toEqual(["Newer"]);
  });

  it("does not reassert when the superseded run persisted nothing", async () => {
    const states = new Map<string, ThreadTitleState>();
    const streamOpen = deferred<void>();
    const rename = vi.fn(noop);

    const automatic = runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: true,
      generate: async (onTitle) => {
        await streamOpen.promise;
        await onTitle(undefined);
      },
      rename,
      applyTitle: noop,
    });

    await runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic: false,
      generate: async (onTitle) => {
        await onTitle("Explicit");
      },
      rename,
      applyTitle: noop,
    });

    streamOpen.resolve();
    await automatic;

    expect(rename).not.toHaveBeenCalled();
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
