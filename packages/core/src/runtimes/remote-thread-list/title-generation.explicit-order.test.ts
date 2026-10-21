import { describe, expect, it, vi } from "vitest";
import {
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

const createServer = () => {
  const server = {
    title: undefined as string | undefined,
    generate: async (
      title: string,
      streamOpen: Promise<void>,
      onTitle: (title: string | undefined) => Promise<void>,
    ) => {
      server.title = title;
      await streamOpen;
      await onTitle(title);
    },
    rename: async (title: string) => {
      server.title = title;
    },
  };
  return server;
};

describe("runThreadTitleGeneration explicit order", () => {
  it("keeps the explicit title on the list and server when automatic generation starts during it", async () => {
    const states = new Map<string, ThreadTitleState>();
    const server = createServer();
    const explicitOpen = deferred();
    const automaticStreamOpen = deferred();
    let listTitle: string | undefined;

    const explicit = runThreadTitleGeneration({
      states,
      threadId: "t1",
      readTitle: async () => server.title,
      automatic: false,
      generate: async (onTitle) => {
        await explicitOpen.promise;
        await server.generate("Explicit title", Promise.resolve(), onTitle);
      },
      rename: server.rename,
      applyTitle: async (title) => {
        listTitle = title;
      },
    });
    const automaticGenerate = vi.fn(async (onTitle) => {
      await server.generate(
        "Automatic title",
        automaticStreamOpen.promise,
        onTitle,
      );
    });
    const automaticRename = vi.fn(server.rename);
    const automaticApplyTitle = vi.fn(async (title: string | undefined) => {
      listTitle = title;
    });
    const automatic = runThreadTitleGeneration({
      states,
      threadId: "t1",
      readTitle: async () => server.title,
      automatic: true,
      generate: automaticGenerate,
      rename: automaticRename,
      applyTitle: automaticApplyTitle,
    });

    explicitOpen.resolve();
    await explicit;
    automaticStreamOpen.resolve();
    await automatic;

    expect(listTitle).toBe("Explicit title");
    expect(server.title).toBe("Explicit title");
    expect(automaticGenerate).not.toHaveBeenCalled();
    expect(automaticRename).not.toHaveBeenCalled();
    expect(automaticApplyTitle).not.toHaveBeenCalled();
  });

  it("allows automatic generation after explicit generation finishes", async () => {
    const states = new Map<string, ThreadTitleState>();
    const server = createServer();
    let listTitle: string | undefined;
    const applyTitle = async (title: string | undefined) => {
      listTitle = title;
    };

    await runThreadTitleGeneration({
      states,
      threadId: "t1",
      readTitle: async () => server.title,
      automatic: false,
      generate: (onTitle) =>
        server.generate("Explicit title", Promise.resolve(), onTitle),
      rename: server.rename,
      applyTitle,
    });
    const automaticGenerate = vi.fn((onTitle) =>
      server.generate("Automatic title", Promise.resolve(), onTitle),
    );
    await runThreadTitleGeneration({
      states,
      threadId: "t1",
      readTitle: async () => server.title,
      automatic: true,
      generate: automaticGenerate,
      rename: server.rename,
      applyTitle,
    });

    expect(automaticGenerate).toHaveBeenCalledOnce();
    expect(listTitle).toBe("Automatic title");
    expect(server.title).toBe("Automatic title");
  });

  it("generates an automatic title after the in-flight explicit generation rejects", async () => {
    const states = new Map<string, ThreadTitleState>();
    const server = createServer();
    const explicitOpen = deferred();
    let listTitle: string | undefined;

    const explicit = runThreadTitleGeneration({
      states,
      threadId: "t1",
      readTitle: async () => server.title,
      automatic: false,
      generate: async () => {
        await explicitOpen.promise;
        throw new Error("Explicit generation failed");
      },
      rename: server.rename,
      applyTitle: async (title) => {
        listTitle = title;
      },
    });
    const automaticGenerate = vi.fn((onTitle) =>
      server.generate("Automatic title", Promise.resolve(), onTitle),
    );
    const automatic = runThreadTitleGeneration({
      states,
      threadId: "t1",
      readTitle: async () => server.title,
      automatic: true,
      generate: automaticGenerate,
      rename: server.rename,
      applyTitle: async (title) => {
        listTitle = title;
      },
    });

    expect(automaticGenerate).not.toHaveBeenCalled();
    explicitOpen.resolve();
    await expect(explicit).rejects.toThrow("Explicit generation failed");
    await automatic;

    expect(automaticGenerate).toHaveBeenCalledOnce();
    expect(listTitle).toBe("Automatic title");
    expect(server.title).toBe("Automatic title");
  });

  it("generates an automatic title after the in-flight explicit generation streams no title", async () => {
    const states = new Map<string, ThreadTitleState>();
    const server = createServer();
    const explicitOpen = deferred();
    let listTitle: string | undefined;

    const explicit = runThreadTitleGeneration({
      states,
      threadId: "t1",
      readTitle: async () => server.title,
      automatic: false,
      generate: async (onTitle) => {
        await explicitOpen.promise;
        await onTitle(undefined);
      },
      rename: server.rename,
      applyTitle: async (title) => {
        listTitle = title;
      },
    });
    const automaticGenerate = vi.fn((onTitle) =>
      server.generate("Automatic title", Promise.resolve(), onTitle),
    );
    const automatic = runThreadTitleGeneration({
      states,
      threadId: "t1",
      readTitle: async () => server.title,
      automatic: true,
      generate: automaticGenerate,
      rename: server.rename,
      applyTitle: async (title) => {
        listTitle = title;
      },
    });

    expect(automaticGenerate).not.toHaveBeenCalled();
    explicitOpen.resolve();
    await explicit;
    await automatic;

    expect(automaticGenerate).toHaveBeenCalledOnce();
    expect(listTitle).toBe("Automatic title");
    expect(server.title).toBe("Automatic title");
  });
});
