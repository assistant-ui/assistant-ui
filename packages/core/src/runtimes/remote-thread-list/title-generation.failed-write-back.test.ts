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
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const fakeServer = () => {
  const states = new Map<string, ThreadTitleState>();
  let serverTitle: string | undefined;
  let listTitle: string | undefined;
  const rename = vi.fn(async (title: string) => {
    serverTitle = title;
  });
  const readTitle = vi.fn(async () => serverTitle);
  const applyTitle = vi.fn(async (title: string | undefined) => {
    listTitle = title;
  });
  const run = (
    automatic: boolean,
    title: string,
    open?: Promise<void>,
    close?: Promise<void>,
    afterTitle?: () => void,
  ) =>
    runThreadTitleGeneration({
      states,
      threadId: "t1",
      automatic,
      generate: async (onTitle) => {
        await open;
        serverTitle = title;
        await onTitle(title);
        afterTitle?.();
        await close;
      },
      rename,
      readTitle,
      applyTitle,
    });

  const manualRename = (title: string) => {
    const claim = startThreadTitleRename(states, "t1", title);
    listTitle = title;
    serverTitle = title;
    finishThreadTitleRename(states, "t1", claim, true);
  };

  return {
    states,
    rename,
    readTitle,
    applyTitle,
    run,
    manualRename,
    set serverTitle(title: string | undefined) {
      serverTitle = title;
    },
    get serverTitle() {
      return serverTitle;
    },
    set listTitle(title: string | undefined) {
      listTitle = title;
    },
    get listTitle() {
      return listTitle;
    },
  };
};

const startWriteBack = async (
  server: ReturnType<typeof fakeServer>,
  path: "reassertion" | "repair",
) => {
  const streamOpen = deferred();
  const generation = server.run(true, "Generated", streamOpen.promise);
  const persisted = server.states.get("t1")!.latestGeneration!.persisted;
  if (path === "reassertion") server.manualRename("Winner");
  else await server.run(false, "Winner");
  streamOpen.resolve();
  return { generation, persisted };
};

describe.each(["reassertion", "repair"] as const)(
  "failed title write-back: %s",
  (path) => {
    it("does not read the server when the write-back succeeds", async () => {
      const server = fakeServer();
      const { generation, persisted } = await startWriteBack(server, path);

      await generation;
      expect(server.listTitle).toBe("Winner");
      expect(server.listTitle).toBe(server.serverTitle);
      await expect(persisted).resolves.toBe("Winner");
      expect(server.rename).toHaveBeenCalledExactlyOnceWith("Winner");
      expect(server.readTitle).not.toHaveBeenCalled();
    });

    it.each(["Server title", undefined])(
      "reconciles the list and persisted title with the server value %s",
      async (serverTitle) => {
        const server = fakeServer();
        const error = new Error("write-back failed");
        server.rename.mockImplementation(async () => {
          server.serverTitle = serverTitle;
          throw error;
        });
        const { generation, persisted } = await startWriteBack(server, path);

        await expect(generation).rejects.toBe(error);
        expect(server.listTitle).toBe(server.serverTitle);
        expect(server.listTitle).toBe(serverTitle);
        await expect(persisted).resolves.toBe(serverTitle);
        expect(server.rename).toHaveBeenCalledExactlyOnceWith("Winner");
        expect(server.readTitle).toHaveBeenCalledOnce();
      },
    );

    it("keeps a winner that reached the server after the generated write", async () => {
      const server = fakeServer();
      const error = new Error("write-back failed");
      const written = deferred();
      const close = deferred();
      const generation = server.run(
        true,
        "Generated",
        undefined,
        close.promise,
        written.resolve,
      );
      await written.promise;
      const persisted = server.states.get("t1")!.latestGeneration!.persisted;
      if (path === "reassertion") server.manualRename("Winner");
      else await server.run(false, "Winner");
      server.rename.mockRejectedValue(error);
      close.resolve();

      await expect(generation).rejects.toBe(error);
      expect(server.listTitle).toBe("Winner");
      expect(server.listTitle).toBe(server.serverTitle);
      await expect(persisted).resolves.toBe("Winner");
      expect(server.rename).toHaveBeenCalledExactlyOnceWith("Winner");
      expect(server.readTitle).toHaveBeenCalledOnce();
    });

    it("keeps the list and original error when reading the server fails", async () => {
      const server = fakeServer();
      const error = new Error("write-back failed");
      server.rename.mockRejectedValue(error);
      server.readTitle.mockRejectedValue(new Error("read failed"));
      const { generation, persisted } = await startWriteBack(server, path);

      await expect(generation).rejects.toBe(error);
      expect(server.listTitle).toBe("Winner");
      await expect(persisted).resolves.toBe("Generated");
      expect(server.rename).toHaveBeenCalledExactlyOnceWith("Winner");
      expect(server.readTitle).toHaveBeenCalledOnce();
    });

    it("preserves the rename error if applying the server title fails", async () => {
      const server = fakeServer();
      const error = new Error("write-back failed");
      server.rename.mockImplementation(async () => {
        server.serverTitle = "Server title";
        server.applyTitle.mockRejectedValue(new Error("apply failed"));
        throw error;
      });
      const { generation, persisted } = await startWriteBack(server, path);

      await expect(generation).rejects.toBe(error);
      await expect(persisted).resolves.toBe("Server title");
      expect(server.rename).toHaveBeenCalledExactlyOnceWith("Winner");
    });

    it.each([
      ["rename", "write"],
      ["rename", "read"],
      ["completed rename", "write"],
      ["completed rename", "read"],
      ["explicit generation", "write"],
      ["explicit generation", "read"],
      ["automatic generation", "write"],
      ["automatic generation", "read"],
      ["removed thread", "write"],
      ["removed thread", "read"],
    ] as const)("keeps a newer %s during the %s", async (successor, phase) => {
      const server = fakeServer();
      const error = new Error("write-back failed");
      const started = deferred();
      const release = deferred();
      server.rename.mockImplementation(async () => {
        if (phase === "write") {
          started.resolve();
          await release.promise;
        }
        throw error;
      });
      server.readTitle.mockImplementation(async () => {
        const title = server.serverTitle;
        started.resolve();
        await release.promise;
        return title;
      });
      const { generation, persisted } = await startWriteBack(server, path);
      const rejected = expect(generation).rejects.toBe(error);
      await started.promise;
      if (successor === "completed rename") {
        server.manualRename("Newer");
        release.resolve();
        await rejected;
      } else if (successor === "rename") {
        const claim = startThreadTitleRename(server.states, "t1", "Newer");
        server.listTitle = "Newer";
        release.resolve();
        server.serverTitle = "Newer";
        finishThreadTitleRename(server.states, "t1", claim, true);
        await rejected;
      } else if (successor === "removed thread") {
        clearThreadTitleState(server.states, "t1");
        server.manualRename("Newer");
        release.resolve();
        await rejected;
      } else {
        const applied = deferred();
        const close = deferred();
        const automatic = successor === "automatic generation";
        if (automatic && path === "reassertion") {
          await server.run(true, "Skipped");
        }
        const newer = server.run(
          automatic,
          "Newer",
          undefined,
          close.promise,
          applied.resolve,
        );
        await applied.promise;
        release.resolve();
        close.resolve();
        await newer;
        await rejected;
      }

      expect(server.listTitle).toBe("Newer");
      expect(server.listTitle).toBe(server.serverTitle);
      await expect(persisted).resolves.toBe("Generated");
      expect(server.rename).toHaveBeenCalledExactlyOnceWith("Winner");
      expect(server.readTitle).toHaveBeenCalledTimes(phase === "read" ? 1 : 0);
    });

    it.each(["write", "read"])(
      "reconciles when a newer generation rejects during the %s",
      async (phase) => {
        const server = fakeServer();
        const error = new Error("write-back failed");
        const started = deferred();
        const release = deferred();
        server.rename.mockImplementation(async () => {
          if (phase === "write") {
            started.resolve();
            await release.promise;
          }
          throw error;
        });
        server.readTitle.mockImplementation(async () => {
          started.resolve();
          await release.promise;
          return server.serverTitle;
        });
        const { generation } = await startWriteBack(server, path);
        const rejected = expect(generation).rejects.toBe(error);
        await started.promise;
        const successorError = new Error("generation failed");
        const successor = runThreadTitleGeneration({
          states: server.states,
          threadId: "t1",
          automatic: false,
          generate: async () => {
            throw successorError;
          },
          rename: server.rename,
          readTitle: server.readTitle,
          applyTitle: server.applyTitle,
        });
        await expect(successor).rejects.toBe(successorError);
        release.resolve();
        await rejected;

        expect(server.listTitle).toBe("Generated");
        expect(server.listTitle).toBe(server.serverTitle);
        expect(server.rename).toHaveBeenCalledExactlyOnceWith("Winner");
        expect(server.readTitle).toHaveBeenCalledTimes(
          phase === "read" ? 2 : 1,
        );
      },
    );

    it("reconciles after a newer explicit generation rejects during the failed write", async () => {
      const server = fakeServer();
      const error = new Error("write-back failed");
      const successorError = new Error("generation failed");
      const started = deferred();
      const releaseWrite = deferred();
      const failed = deferred();
      const releaseSuccessor = deferred();
      server.rename.mockImplementation(async () => {
        server.serverTitle = "Server title";
        started.resolve();
        await releaseWrite.promise;
        failed.resolve();
        throw error;
      });
      const { generation, persisted } = await startWriteBack(server, path);
      const rejected = expect(generation).rejects.toBe(error);
      await started.promise;
      const successor = runThreadTitleGeneration({
        states: server.states,
        threadId: "t1",
        automatic: false,
        generate: async () => {
          await releaseSuccessor.promise;
          throw successorError;
        },
        rename: server.rename,
        readTitle: server.readTitle,
        applyTitle: server.applyTitle,
      });
      releaseWrite.resolve();
      await failed.promise;
      releaseSuccessor.resolve();
      await expect(successor).rejects.toBe(successorError);
      await rejected;

      expect(server.listTitle).toBe("Server title");
      expect(server.listTitle).toBe(server.serverTitle);
      await expect(persisted).resolves.toBe("Server title");
      expect(server.readTitle).toHaveBeenCalledOnce();
    });

    it("reconciles after a newer rename is rejected during the failed write", async () => {
      const server = fakeServer();
      const error = new Error("write-back failed");
      const started = deferred();
      const releaseWrite = deferred();
      const failed = deferred();
      server.rename.mockImplementation(async () => {
        server.serverTitle = "Server title";
        started.resolve();
        await releaseWrite.promise;
        failed.resolve();
        throw error;
      });
      const { generation, persisted } = await startWriteBack(server, path);
      const rejected = expect(generation).rejects.toBe(error);
      await started.promise;
      const claim = startThreadTitleRename(server.states, "t1", "Newer");
      server.listTitle = "Newer";
      releaseWrite.resolve();
      await failed.promise;
      server.listTitle = "Winner";
      finishThreadTitleRename(server.states, "t1", claim, false);
      await rejected;

      expect(server.listTitle).toBe("Server title");
      expect(server.listTitle).toBe(server.serverTitle);
      await expect(persisted).resolves.toBe("Server title");
      expect(server.readTitle).toHaveBeenCalledOnce();
    });
  },
);

it("reconciles a failed repair for a claim that arrives after reassertion", async () => {
  const server = fakeServer();
  const error = new Error("repair failed");
  server.applyTitle.mockImplementationOnce(async () => {
    server.manualRename("Later");
  });
  server.rename
    .mockImplementationOnce(async (title) => {
      server.serverTitle = title;
    })
    .mockImplementationOnce(async () => {
      server.serverTitle = "Server title";
      throw error;
    });
  const { generation, persisted } = await startWriteBack(server, "reassertion");

  await expect(generation).rejects.toBe(error);
  expect(server.listTitle).toBe("Server title");
  expect(server.listTitle).toBe(server.serverTitle);
  await expect(persisted).resolves.toBe("Server title");
  expect(server.rename.mock.calls).toEqual([["Winner"], ["Later"]]);
  expect(server.readTitle).toHaveBeenCalledOnce();
});
