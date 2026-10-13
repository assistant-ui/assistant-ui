import { describe, expect, it, vi } from "vitest";
import {
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
  let write = async (title: string) => {
    serverTitle = title;
  };
  const rename = vi.fn(async (title: string) => write(title));

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
      applyTitle: async (next) => {
        listTitle = next;
      },
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
    run,
    manualRename,
    setWrite: (next: typeof write) => {
      write = next;
    },
    setServerTitle: (title: string) => {
      serverTitle = title;
    },
    setListTitle: (title: string) => {
      listTitle = title;
    },
    get serverTitle() {
      return serverTitle;
    },
    get listTitle() {
      return listTitle;
    },
  };
};

describe("failed title write-back", () => {
  it("restores the generated title when reasserting a manual rename fails", async () => {
    const server = fakeServer();
    const streamOpen = deferred();
    const error = new Error("write-back failed");
    server.setWrite(async () => {
      throw error;
    });

    const generation = server.run(true, "Generated", streamOpen.promise);
    server.manualRename("Manual");
    streamOpen.resolve();

    await expect(generation).rejects.toBe(error);
    expect(server.rename).toHaveBeenCalledExactlyOnceWith("Manual");
    expect(server.serverTitle).toBe("Generated");
    expect(server.listTitle).toBe(server.serverTitle);
  });

  it("restores the generated title when a lost-race repair fails", async () => {
    const server = fakeServer();
    const streamOpen = deferred();
    const error = new Error("repair failed");
    const automatic = server.run(true, "Automatic", streamOpen.promise);
    await server.run(false, "Explicit");
    server.setWrite(async () => {
      throw error;
    });

    streamOpen.resolve();
    await expect(automatic).rejects.toBe(error);
    expect(server.rename).toHaveBeenCalledExactlyOnceWith("Explicit");
    expect(server.serverTitle).toBe("Automatic");
    expect(server.listTitle).toBe(server.serverTitle);
  });

  it("keeps a newer rename in flight when reassertion fails", async () => {
    const server = fakeServer();
    const streamOpen = deferred();
    const writeStarted = deferred();
    const writeOpen = deferred();
    const error = new Error("write-back failed");
    server.setWrite(async () => {
      writeStarted.resolve();
      await writeOpen.promise;
      throw error;
    });

    const generation = server.run(true, "Generated", streamOpen.promise);
    server.manualRename("First");
    streamOpen.resolve();
    await writeStarted.promise;

    const newer = startThreadTitleRename(server.states, "t1", "Newer");
    server.setListTitle("Newer");
    writeOpen.resolve();
    await expect(generation).rejects.toBe(error);
    expect(server.listTitle).toBe("Newer");

    server.setServerTitle("Newer");
    finishThreadTitleRename(server.states, "t1", newer, true);
    expect(server.rename).toHaveBeenCalledExactlyOnceWith("First");
    expect(server.listTitle).toBe(server.serverTitle);
  });

  it("keeps a newer explicit generation in flight when repair fails", async () => {
    const server = fakeServer();
    const streamOpen = deferred();
    const writeStarted = deferred();
    const writeOpen = deferred();
    const newerOpen = deferred();
    const newerApplied = deferred();
    const error = new Error("repair failed");
    const automatic = server.run(true, "Automatic", streamOpen.promise);
    await server.run(false, "Explicit");
    server.setWrite(async () => {
      writeStarted.resolve();
      await writeOpen.promise;
      throw error;
    });

    streamOpen.resolve();
    await writeStarted.promise;
    const newer = server.run(
      false,
      "Newer",
      undefined,
      newerOpen.promise,
      newerApplied.resolve,
    );
    await newerApplied.promise;
    expect(server.listTitle).toBe("Newer");
    writeOpen.resolve();
    await expect(automatic).rejects.toBe(error);
    newerOpen.resolve();
    await newer;

    expect(server.rename).toHaveBeenCalledExactlyOnceWith("Explicit");
    expect(server.serverTitle).toBe("Newer");
    expect(server.listTitle).toBe(server.serverTitle);
  });
});
