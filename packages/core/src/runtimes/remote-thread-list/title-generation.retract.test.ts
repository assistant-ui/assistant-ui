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
      readTitle: async () => server.title,
      automatic,
      generate: async (onTitle) => {
        await gate.promise;
        if (title !== undefined) {
          server.title = title;
          await onTitle(title);
        }
      },
      rename,
      applyTitle,
    });
  return { states, server, applied, rename, applyTitle, start };
};

describe("title generation retraction", () => {
  it.each(["rejects", "streams no text"])(
    "restores a superseded automatic title when explicit generation %s",
    async (ending) => {
      const h = setup();
      const aGate = deferred();
      const eGate = deferred();
      const automatic = h.start(true, "Automatic", aGate);
      const explicit = runThreadTitleGeneration({
        states: h.states,
        threadId: "t1",
        readTitle: async () => h.server.title,
        automatic: false,
        generate: async () => {
          await eGate.promise;
          if (ending === "rejects") throw new Error("generation failed");
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

  it("keeps an explicit title that persisted before rejection", async () => {
    const h = setup();
    const aGate = deferred();
    const eGate = deferred();
    const automatic = h.start(true, "Automatic", aGate);
    const explicit = runThreadTitleGeneration({
      states: h.states,
      threadId: "t1",
      readTitle: async () => h.server.title,
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

  it.each([
    {
      schedule: "Older writer finishes first",
      secondTitle: "Second",
      firstLast: false,
    },
    {
      schedule: "Older writer finishes last",
      secondTitle: "Second",
      firstLast: true,
    },
    {
      schedule: "Newer writer streams no text",
      secondTitle: undefined,
      firstLast: false,
    },
  ])(
    "$schedule restores the newest persisted automatic title",
    async ({ secondTitle, firstLast }) => {
      const h = setup();
      const firstGate = deferred();
      const secondGate = deferred();
      const explicitGate = deferred();
      const firstRename = vi.fn(async (title: string) => h.rename(title));
      const secondRename = vi.fn(async (title: string) => h.rename(title));
      const first = runThreadTitleGeneration({
        states: h.states,
        threadId: "t1",
        readTitle: async () => h.server.title,
        automatic: true,
        generate: async (onTitle) => {
          await firstGate.promise;
          h.server.title = "First";
          await onTitle("First");
        },
        rename: firstRename,
        applyTitle: h.applyTitle,
      });
      const second = runThreadTitleGeneration({
        states: h.states,
        threadId: "t1",
        readTitle: async () => h.server.title,
        automatic: true,
        generate: async (onTitle) => {
          await secondGate.promise;
          if (secondTitle !== undefined) {
            h.server.title = secondTitle;
            await onTitle(secondTitle);
          }
        },
        rename: secondRename,
        applyTitle: h.applyTitle,
      });
      const explicit = h.start(false, undefined, explicitGate);
      if (firstLast) {
        secondGate.resolve();
        await flushMicrotasks();
        firstGate.resolve();
      } else {
        firstGate.resolve();
        await flushMicrotasks();
        secondGate.resolve();
      }
      await flushMicrotasks();
      expect(h.applied).toEqual([]);
      explicitGate.resolve();
      await Promise.all([first, second, explicit]);

      const expected = secondTitle ?? "First";
      expect(h.applied).toEqual([expected]);
      expect(h.server.title).toBe(expected);
      if (secondTitle === undefined) {
        expect(firstRename).not.toHaveBeenCalled();
      } else {
        expect(firstRename).toHaveBeenCalledExactlyOnceWith(secondTitle);
      }
      expect(secondRename).not.toHaveBeenCalled();
    },
  );

  it("restores a retained rename after a pending rename fails", async () => {
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
      readTitle: async () => h.server.title,
      automatic: true,
      generate,
      rename: h.rename,
      applyTitle: h.applyTitle,
    });
    const explicit = h.start(false, undefined, eGate);
    finishThreadTitleRename(h.states, "t1", pending, false);
    await Promise.all([automatic, explicit]);

    expect(generate).not.toHaveBeenCalled();
    expect(h.rename).not.toHaveBeenCalled();
    expect(h.applied).toEqual([]);
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
        readTitle: async () => h.server.title,
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

  it("reasserts a manual rename completed during the automatic stream", async () => {
    const h = setup();
    const aGate = deferred();
    const eGate = deferred();
    const streamed = deferred();
    const automatic = runThreadTitleGeneration({
      states: h.states,
      threadId: "t1",
      readTitle: async () => h.server.title,
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
    "handles a rename issued during explicit generation (renamed: %s)",
    async (renamed) => {
      const h = setup();
      const aGate = deferred();
      const eGate = deferred();
      const streamed = deferred();
      const automatic = runThreadTitleGeneration({
        states: h.states,
        threadId: "t1",
        readTitle: async () => h.server.title,
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
        readTitle: async () => h.server.title,
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

  it("rolls back to an older completed explicit generation", async () => {
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

  it("waits for both nested explicit outcomes before restoring the automatic title", async () => {
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

  it("still waits on the older explicit when only the newer one retracts", async () => {
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

  it("starts a waiting automatic once after explicit retraction", async () => {
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
      readTitle: async () => h.server.title,
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

  it("starts a waiting automatic when its explicit retracts behind an older persisted explicit", async () => {
    const h = setup();
    const olderAutomaticGate = deferred();
    const firstExplicitGate = deferred();
    const secondExplicitGate = deferred();
    const olderAutomatic = h.start(true, "Older automatic", olderAutomaticGate);
    const firstExplicit = h.start(false, "First explicit", firstExplicitGate);
    firstExplicitGate.resolve();
    await firstExplicit;

    const secondExplicit = h.start(false, undefined, secondExplicitGate);
    const generate = vi.fn(
      async (onTitle: (title: string | undefined) => Promise<void>) => {
        h.server.title = "Waiting automatic";
        await onTitle("Waiting automatic");
      },
    );
    const waitingAutomatic = runThreadTitleGeneration({
      states: h.states,
      threadId: "t1",
      readTitle: async () => h.server.title,
      automatic: true,
      generate,
      rename: h.rename,
      applyTitle: h.applyTitle,
    });
    expect(generate).not.toHaveBeenCalled();
    secondExplicitGate.resolve();
    await secondExplicit;
    await waitingAutomatic;
    olderAutomaticGate.resolve();
    await olderAutomatic;

    expect(generate).toHaveBeenCalledOnce();
    expect(h.applied.at(-1)).toBe("Waiting automatic");
    expect(h.server.title).toBe("Waiting automatic");
  });

  it("keeps a newer explicit title when an older explicit run retracts", async () => {
    const h = setup();
    const firstExplicitGate = deferred();
    const secondExplicitGate = deferred();
    const firstExplicit = h.start(false, undefined, firstExplicitGate);
    const generate = vi.fn(
      async (onTitle: (title: string | undefined) => Promise<void>) => {
        h.server.title = "Automatic";
        await onTitle("Automatic");
      },
    );
    const automatic = runThreadTitleGeneration({
      states: h.states,
      threadId: "t1",
      readTitle: async () => h.server.title,
      automatic: true,
      generate,
      rename: h.rename,
      applyTitle: h.applyTitle,
    });
    const secondExplicit = h.start(false, "E2 title", secondExplicitGate);
    secondExplicitGate.resolve();
    await secondExplicit;
    expect(generate).not.toHaveBeenCalled();
    firstExplicitGate.resolve();
    await Promise.all([firstExplicit, automatic]);

    expect(generate).not.toHaveBeenCalled();
    expect(h.applied.at(-1)).toBe("E2 title");
    expect(h.server.title).toBe("E2 title");
  });

  it("does not affect a cleared thread", async () => {
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

  it("keeps the newest ordered title across seeded schedules", async () => {
    const seeds = [
      1, 7, 13, 29, 43, 61, 79, 97, 127, 149, 173, 199, 223, 251, 283, 317, 349,
      383, 421, 457, 499, 541, 587, 631,
    ];
    let schedules = 0;

    for (const seed of seeds) {
      for (const mode of [0, 1, 2, 3]) {
        schedules += 1;
        let randomState = (seed ^ Math.imul(mode + 1, 0x9e3779b9)) >>> 0;
        const random = (limit: number) => {
          randomState ^= randomState << 13;
          randomState ^= randomState >>> 17;
          randomState ^= randomState << 5;
          return (randomState >>> 0) % limit;
        };
        const states = new Map<string, ThreadTitleState>();
        const server = { title: "Initial" as string | undefined };
        let listTitle: string | undefined = "Initial";
        const renames: string[] = [];
        const allowedTitles = new Set<string>();
        const persistedGenerations: {
          order: number;
          title: string;
          persistedAt: number;
        }[] = [];
        const completedRenames: {
          order: number;
          title: string;
          overlapped: boolean;
          settledAt: number;
        }[] = [];
        const trace: string[] = [];
        let nextOrder = 0;
        let eventSeq = 0;
        const generationCount = mode === 3 ? 1 + random(3) : 3;
        const renameCount = random(3);
        const automatic = Array.from(
          { length: generationCount },
          (_, index) =>
            mode === 0 ||
            (mode === 1 && index < 2) ||
            (mode === 2 && index !== 1) ||
            (mode === 3 && random(2) === 0),
        );
        const titles = automatic.map((_, index) =>
          index === 0 || random(4) !== 0
            ? `G${seed}-${mode}-${index}`
            : undefined,
        );
        const gates = Array.from({ length: generationCount }, deferred);
        const runs: Promise<void>[] = [];
        const openGenerations: number[] = [];
        const openClaims: {
          claim: ReturnType<typeof startThreadTitleRename>;
          order: number;
          overlapped: boolean;
        }[] = [];
        let nextGeneration = 0;
        let nextRename = 0;

        while (
          nextGeneration < generationCount ||
          nextRename < renameCount ||
          openGenerations.length > 0 ||
          openClaims.length > 0
        ) {
          eventSeq += 1;
          const actions = [
            ...(nextGeneration < generationCount ? ["start generation"] : []),
            ...(nextRename < renameCount ? ["start rename"] : []),
            ...(openGenerations.length > 0 ? ["finish generation"] : []),
            ...(openClaims.length > 0 ? ["finish rename"] : []),
          ];
          const action = actions[random(actions.length)];
          if (action === "start generation") {
            const index = nextGeneration++;
            const order = ++nextOrder;
            trace.push(
              `start ${automatic[index] ? "A" : "E"}${index}@${order}`,
            );
            openGenerations.push(index);
            runs.push(
              runThreadTitleGeneration({
                states,
                threadId: "t1",
                readTitle: async () => server.title,
                automatic: automatic[index]!,
                generate: async (onTitle) => {
                  await gates[index]!.promise;
                  const title = titles[index];
                  if (title !== undefined) {
                    trace.push(`write ${title}@${order}`);
                    server.title = title;
                    allowedTitles.add(title);
                    persistedGenerations.push({
                      order,
                      title,
                      persistedAt: ++eventSeq,
                    });
                  }
                  if (title !== undefined) await onTitle(title);
                },
                rename: async (title) => {
                  renames.push(title);
                  server.title = title;
                },
                applyTitle: async (title) => {
                  listTitle = title;
                },
              }),
            );
          } else if (action === "start rename") {
            const index = nextRename++;
            const overlapped = openClaims.length > 0;
            for (const open of openClaims) open.overlapped = true;
            const claim = startThreadTitleRename(
              states,
              "t1",
              `M${seed}-${mode}-${index}`,
            );
            const order = ++nextOrder;
            trace.push(`start M${index}@${order}`);
            openClaims.push({
              claim,
              order,
              overlapped,
            });
          } else if (action === "finish generation") {
            const index = openGenerations.splice(
              random(openGenerations.length),
              1,
            )[0]!;
            trace.push(`release G${index}`);
            gates[index]!.resolve();
          } else {
            const [entry] = openClaims.splice(random(openClaims.length), 1);
            const { claim, order, overlapped } = entry!;
            const renamed = random(3) !== 0;
            trace.push(`finish ${claim.title} ${renamed}`);
            if (renamed) {
              server.title = claim.title;
              listTitle = claim.title;
              allowedTitles.add(claim.title);
              completedRenames.push({
                order,
                title: claim.title,
                overlapped,
                settledAt: eventSeq,
              });
            }
            finishThreadTitleRename(states, "t1", claim, renamed);
          }
          await flushMicrotasks();
        }
        await Promise.all(runs);

        const latestGeneration = persistedGenerations.reduce(
          (winner, candidate) =>
            candidate.order > winner.order ? candidate : winner,
          { order: 0, title: "Initial", persistedAt: 0 },
        );
        const latestRename = completedRenames.reduce<
          (typeof completedRenames)[number] | null
        >((winner, candidate) => {
          if (winner === null) return candidate;
          const later =
            winner.overlapped && candidate.overlapped
              ? candidate.settledAt > winner.settledAt
              : candidate.order > winner.order;
          return later ? candidate : winner;
        }, null);
        const expected =
          latestRename !== null &&
          (latestRename.order > latestGeneration.order ||
            (latestRename.overlapped &&
              latestRename.settledAt > latestGeneration.persistedAt))
            ? latestRename.title
            : latestGeneration.title;
        expect(
          listTitle,
          `seed ${seed}, mode ${mode}: list; ${trace.join(" -> ")}`,
        ).toBe(expected);
        expect(server.title, `seed ${seed}, mode ${mode}: server`).toBe(
          expected,
        );
        expect(listTitle, `seed ${seed}, mode ${mode}`).toBe(server.title);
        for (const title of renames) {
          expect(
            allowedTitles.has(title),
            `seed ${seed}, mode ${mode}: ${title}`,
          ).toBe(true);
        }
      }
    }
    expect(schedules).toBe(96);
  });
});
