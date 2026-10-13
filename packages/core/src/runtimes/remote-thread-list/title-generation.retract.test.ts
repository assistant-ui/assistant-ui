import { describe, expect, it, vi } from "vitest";
import {
  clearThreadTitleState,
  finishThreadTitleRename,
  runThreadTitleGeneration,
  startThreadTitleRename,
  type ThreadTitleState,
} from "./title-generation";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const flushMicrotasks = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

const setup = () => {
  const states = new Map<string, ThreadTitleState>();
  const server = { title: undefined as string | undefined };
  const applied: (string | undefined)[] = [];
  const rename = vi.fn(async (title: string) => {
    server.title = title;
  });
  const applyTitle = vi.fn(async (title: string | undefined) => {
    applied.push(title);
  });
  const start = (
    automatic: boolean,
    title: string | undefined,
    gate: ReturnType<typeof deferred>,
  ) =>
    runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic,
      generate: async (onTitle) => {
        await gate.promise;
        if (title !== undefined) server.title = title;
        await onTitle(title);
      },
      rename,
      applyTitle,
    });
  return { states, server, applied, rename, applyTitle, start };
};

describe("title generation retraction", () => {
  it.each(["rejects", "streams no text"])(
    "S1 restores a superseded automatic title when explicit generation %s",
    async (ending) => {
      const h = setup();
      const aGate = deferred();
      const eGate = deferred();
      const automatic = h.start(true, "Automatic", aGate);
      const explicit = runThreadTitleGeneration({
        states: h.states,
        threadId: "t1",
        automatic: false,
        generate: async (onTitle) => {
          await eGate.promise;
          if (ending === "rejects") throw new Error("generation failed");
          await onTitle(undefined);
        },
        rename: h.rename,
        applyTitle: h.applyTitle,
      });
      const settledExplicit = explicit.then(
        () => undefined,
        (error: unknown) => error,
      );

      aGate.resolve();
      await Promise.resolve();
      eGate.resolve();
      expect(await settledExplicit).toEqual(
        ending === "rejects" ? new Error("generation failed") : undefined,
      );
      await automatic;

      expect(h.applied).toEqual(["Automatic"]);
      expect(h.rename).not.toHaveBeenCalled();
      expect(h.server.title).toBe("Automatic");
    },
  );

  it("S2 keeps an explicit title that persisted before rejection", async () => {
    const h = setup();
    const aGate = deferred();
    const eGate = deferred();
    const automatic = h.start(true, "Automatic", aGate);
    const explicit = runThreadTitleGeneration({
      states: h.states,
      threadId: "t1",
      automatic: false,
      generate: async (onTitle) => {
        await eGate.promise;
        h.server.title = "Explicit";
        await onTitle("Explicit");
        throw new Error("stream failed");
      },
      rename: h.rename,
      applyTitle: h.applyTitle,
    });
    const rejected = expect(explicit).rejects.toThrow("stream failed");
    aGate.resolve();
    await Promise.resolve();
    eGate.resolve();
    await rejected;
    await automatic;

    expect(h.applied).toEqual(["Explicit"]);
    expect(h.rename).toHaveBeenCalledExactlyOnceWith("Explicit");
    expect(h.server.title).toBe("Explicit");
  });

  it("S5 restores a retained rename after a pending rename fails", async () => {
    const h = setup();
    const manual = startThreadTitleRename(h.states, "t1", "Manual");
    h.server.title = "Manual";
    finishThreadTitleRename(h.states, "t1", manual, true);
    const pending = startThreadTitleRename(h.states, "t1", "Pending");
    const eGate = deferred();
    eGate.resolve();
    const generate = vi.fn(
      async (onTitle: (title: string | undefined) => Promise<void>) => {
        h.server.title = "Automatic";
        await onTitle("Automatic");
      },
    );
    const automatic = runThreadTitleGeneration({
      states: h.states,
      threadId: "t1",
      automatic: true,
      generate,
      rename: h.rename,
      applyTitle: h.applyTitle,
    });
    const explicit = h.start(false, undefined, eGate);
    finishThreadTitleRename(h.states, "t1", pending, false);
    await Promise.all([automatic, explicit]);

    expect(generate).toHaveBeenCalledOnce();
    expect(h.rename).toHaveBeenCalledExactlyOnceWith("Manual");
    expect(h.applied).toEqual(["Manual"]);
    expect(h.server.title).toBe("Manual");

    const next = vi.fn(
      async (onTitle: (title: string | undefined) => Promise<void>) => {
        h.server.title = "Next automatic";
        await onTitle("Next automatic");
      },
    );
    const runNext = () =>
      runThreadTitleGeneration({
        states: h.states,
        threadId: "t1",
        automatic: true,
        generate: next,
        rename: h.rename,
        applyTitle: h.applyTitle,
      });
    await runNext();
    expect(next).not.toHaveBeenCalled();
    expect(h.server.title).toBe("Manual");
    await runNext();
    expect(next).toHaveBeenCalledOnce();
  });

  it("S6 reasserts a manual rename completed during the automatic stream", async () => {
    const h = setup();
    const aGate = deferred();
    const eGate = deferred();
    const streamed = deferred();
    const automatic = runThreadTitleGeneration({
      states: h.states,
      threadId: "t1",
      automatic: true,
      generate: async (onTitle) => {
        await aGate.promise;
        h.server.title = "Automatic";
        await onTitle("Automatic");
        streamed.resolve();
      },
      rename: h.rename,
      applyTitle: h.applyTitle,
    });
    const manual = startThreadTitleRename(h.states, "t1", "Manual");
    h.server.title = "Manual";
    finishThreadTitleRename(h.states, "t1", manual, true);
    const explicit = h.start(false, undefined, eGate);
    aGate.resolve();
    await streamed.promise;
    await flushMicrotasks();
    expect(h.applied).toEqual([]);
    eGate.resolve();
    await Promise.all([automatic, explicit]);

    expect(h.rename).toHaveBeenCalledExactlyOnceWith("Manual");
    expect(h.applied).toEqual(["Manual"]);
    expect(h.server.title).toBe("Manual");
  });

  it.each([true, false])(
    "S7 handles a rename issued during explicit generation (renamed: %s)",
    async (renamed) => {
      const h = setup();
      const aGate = deferred();
      const eGate = deferred();
      const streamed = deferred();
      const automatic = runThreadTitleGeneration({
        states: h.states,
        threadId: "t1",
        automatic: true,
        generate: async (onTitle) => {
          await aGate.promise;
          h.server.title = "Automatic";
          streamed.resolve();
          await onTitle("Automatic");
        },
        rename: h.rename,
        applyTitle: h.applyTitle,
      });
      const explicit = runThreadTitleGeneration({
        states: h.states,
        threadId: "t1",
        automatic: false,
        generate: async () => {
          await eGate.promise;
          throw new Error("explicit failed");
        },
        rename: h.rename,
        applyTitle: h.applyTitle,
      });
      const rejected = expect(explicit).rejects.toThrow("explicit failed");
      const manual = startThreadTitleRename(h.states, "t1", "Manual");
      aGate.resolve();
      await streamed.promise;
      if (renamed) h.server.title = "Manual";
      finishThreadTitleRename(h.states, "t1", manual, renamed);
      await flushMicrotasks();
      expect(h.applied).toEqual([]);
      eGate.resolve();
      await rejected;
      await automatic;

      expect(h.applied.at(-1)).toBe(renamed ? "Manual" : "Automatic");
      expect(h.server.title).toBe(renamed ? "Manual" : "Automatic");
      if (renamed) {
        expect(h.rename).toHaveBeenCalledWith("Manual");
      } else {
        expect(h.rename).not.toHaveBeenCalled();
      }
    },
  );

  it("S8 rolls back to an older completed explicit generation", async () => {
    const h = setup();
    const done = deferred();
    done.resolve();
    await h.start(false, "First explicit", done);
    h.applied.length = 0;
    const aGate = deferred();
    const eGate = deferred();
    const automatic = h.start(true, "Automatic", aGate);
    const explicit = h.start(false, undefined, eGate);
    aGate.resolve();
    await Promise.resolve();
    eGate.resolve();
    await Promise.all([automatic, explicit]);

    expect(h.applied).toEqual(["Automatic"]);
    expect(h.rename).not.toHaveBeenCalled();
    expect(h.server.title).toBe("Automatic");
  });

  it("S9 waits for both nested explicit outcomes before restoring the automatic title", async () => {
    const h = setup();
    const aGate = deferred();
    const e1Gate = deferred();
    const e2Gate = deferred();
    const automatic = h.start(true, "Automatic", aGate);
    const e1 = h.start(false, undefined, e1Gate);
    const e2 = h.start(false, undefined, e2Gate);
    aGate.resolve();
    e1Gate.resolve();
    await e1;
    expect(h.applied).toEqual([]);
    e2Gate.resolve();
    await Promise.all([automatic, e2]);

    expect(h.applied).toEqual(["Automatic"]);
    expect(h.rename).not.toHaveBeenCalled();
    expect(h.server.title).toBe("Automatic");
  });

  it("S9 still waits on the older explicit when only the newer one retracts", async () => {
    const h = setup();
    const aGate = deferred();
    const e1Gate = deferred();
    const e2Gate = deferred();
    const automatic = h.start(true, "Automatic", aGate);
    const e1 = h.start(false, "First explicit", e1Gate);
    const e2 = h.start(false, undefined, e2Gate);
    aGate.resolve();
    e2Gate.resolve();
    await e2;
    expect(h.applied).toEqual([]);
    e1Gate.resolve();
    await Promise.all([automatic, e1]);

    expect(h.applied).toEqual(["First explicit"]);
    expect(h.rename).toHaveBeenCalledExactlyOnceWith("First explicit");
    expect(h.server.title).toBe("First explicit");
  });

  it("S10 starts a waiting automatic once after explicit retraction", async () => {
    const h = setup();
    const eGate = deferred();
    const explicit = h.start(false, undefined, eGate);
    const generate = vi.fn(
      async (onTitle: (title: string | undefined) => Promise<void>) => {
        h.server.title = "Automatic";
        await onTitle("Automatic");
      },
    );
    const automatic = runThreadTitleGeneration({
      states: h.states,
      threadId: "t1",
      automatic: true,
      generate,
      rename: h.rename,
      applyTitle: h.applyTitle,
    });
    expect(generate).not.toHaveBeenCalled();
    eGate.resolve();
    await Promise.all([automatic, explicit]);

    expect(generate).toHaveBeenCalledOnce();
    expect(h.applied).toEqual(["Automatic"]);
    expect(h.rename).not.toHaveBeenCalled();
    expect(h.server.title).toBe("Automatic");
  });

  it("S11 does not affect a cleared thread", async () => {
    const h = setup();
    const eGate = deferred();
    const explicit = h.start(false, undefined, eGate);
    clearThreadTitleState(h.states, "t1");
    eGate.resolve();
    await explicit;

    expect(h.states.size).toBe(0);
    expect(h.rename).not.toHaveBeenCalled();
    expect(h.applyTitle).not.toHaveBeenCalled();
  });
});
