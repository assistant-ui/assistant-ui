import { describe, expect, it, vi } from "vitest";
import {
  clearThreadTitleState,
  runThreadTitleGeneration,
  type ThreadTitleState,
} from "./title-generation";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
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
