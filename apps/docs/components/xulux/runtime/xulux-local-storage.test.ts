import {
  claimXuluxStorage,
  createXuluxUserStorage,
  readXuluxThreads,
  updateXuluxPendingUserMessage,
  writeXuluxThreads,
} from "./xulux-local-storage";
import type { XuluxStoredThread } from "./types";

beforeEach(() => {
  let queue = Promise.resolve();
  vi.stubGlobal("navigator", {
    locks: {
      request: (_name: string, callback: () => unknown) => {
        const result = queue.then(callback);
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("claimXuluxStorage", () => {
  it("adopts existing ownerless data for the first authenticated user", async () => {
    const storage = createStorage({
      "xulux:threads": '[{"title":"Existing thread"}]',
      "xulux:learn:course": '{"threadId":"thread_existing"}',
    });

    await expect(claimXuluxStorage(storage, "user_current")).resolves.toBe(
      true,
    );

    expect(storage.getItem("xulux:threads")).toBeNull();
    expect(storage.getItem("xulux:user:user_current:threads")).not.toBeNull();
    expect(
      storage.getItem("xulux:user:user_current:learn:course"),
    ).not.toBeNull();
    expect(storage.getItem("xulux:storage-owner")).toBe("user_current");
  });

  it("migrates legacy data to its existing owner", async () => {
    const storage = createStorage({
      "xulux:storage-owner": "user_previous",
      "xulux:threads": '[{"title":"Private thread"}]',
      "xulux:learn:course": '{"threadId":"thread_previous"}',
      unrelated: "keep",
    });

    await expect(claimXuluxStorage(storage, "user_current")).resolves.toBe(
      true,
    );

    expect(storage.getItem("xulux:threads")).toBeNull();
    expect(storage.getItem("xulux:learn:course")).toBeNull();
    expect(storage.getItem("xulux:user:user_previous:threads")).not.toBeNull();
    expect(storage.getItem("xulux:storage-owner")).toBe("user_previous");
    expect(storage.getItem("unrelated")).toBe("keep");
  });

  it("keeps data for the same authenticated user", async () => {
    const storage = createStorage({
      "xulux:storage-owner": "user_current",
      "xulux:threads": '[{"title":"Current thread"}]',
    });

    await expect(claimXuluxStorage(storage, "user_current")).resolves.toBe(
      true,
    );

    expect(storage.getItem("xulux:user:user_current:threads")).not.toBeNull();
  });

  it("serializes first-use migration across different accounts", async () => {
    const storage = createStorage({
      "xulux:threads": '[{"title":"Existing thread"}]',
    });

    await expect(
      Promise.all([
        claimXuluxStorage(storage, "user_first"),
        claimXuluxStorage(storage, "user_second"),
      ]),
    ).resolves.toEqual([true, true]);

    expect(
      createXuluxUserStorage(storage, "user_first").getItem("xulux:threads"),
    ).not.toBeNull();
    expect(
      createXuluxUserStorage(storage, "user_second").getItem("xulux:threads"),
    ).toBeNull();
  });

  it("uses isolated storage without migrating legacy data when Web Locks is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    const storage = createStorage({
      "xulux:threads": '[{"title":"Existing thread"}]',
    });

    await expect(claimXuluxStorage(storage, "user_current")).resolves.toBe(
      true,
    );

    expect(storage.getItem("xulux:threads")).not.toBeNull();
    expect(
      createXuluxUserStorage(storage, "user_current").getItem("xulux:claim"),
    ).toBe("user_current");

    vi.stubGlobal("navigator", {
      locks: {
        request: (_name: string, callback: () => unknown) => callback(),
      },
    });
    await expect(claimXuluxStorage(storage, "user_second")).resolves.toBe(true);
    expect(
      createXuluxUserStorage(storage, "user_second").getItem("xulux:threads"),
    ).toBeNull();
  });

  it("reports unavailable storage without throwing", async () => {
    const storage = createStorage();
    storage.setItem = () => {
      throw new Error("Storage unavailable");
    };

    await expect(claimXuluxStorage(storage, "user_current")).resolves.toBe(
      false,
    );
  });
});

describe("user-bound Xulux storage", () => {
  it("keeps a late write scoped to the user that started it", () => {
    const storage = createStorage();
    vi.stubGlobal("window", {
      localStorage: storage,
      dispatchEvent: vi.fn(),
    });
    const firstThread: XuluxStoredThread = {
      remoteId: "thread_first",
      status: "regular",
      custom: {
        sessionId: "user_first.123e4567-e89b-42d3-a456-426614174000",
        xuluxStatus: "idle",
        updatedAt: 1,
      },
    };
    const secondThread: XuluxStoredThread = {
      remoteId: "thread_second",
      status: "regular",
      custom: {
        sessionId: "user_second.123e4567-e89b-42d3-a456-426614174001",
        xuluxStatus: "idle",
        updatedAt: 2,
      },
    };

    writeXuluxThreads("user_first", [firstThread]);
    writeXuluxThreads("user_second", [secondThread]);
    updateXuluxPendingUserMessage("user_first", "thread_first", "late result");

    expect(readXuluxThreads("user_first")[0]?.custom.pendingUserMessage).toBe(
      "late result",
    );
    expect(readXuluxThreads("user_second")).toEqual([secondThread]);
  });
});
