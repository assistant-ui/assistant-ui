import { claimXuluxStorage } from "./xulux-local-storage";

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
  it("adopts existing ownerless data for the first authenticated user", () => {
    const storage = createStorage({
      "xulux:threads": '[{"title":"Existing thread"}]',
      "xulux:learn:course": '{"threadId":"thread_existing"}',
    });

    expect(claimXuluxStorage(storage, "user_current")).toBe(true);

    expect(storage.getItem("xulux:threads")).not.toBeNull();
    expect(storage.getItem("xulux:learn:course")).not.toBeNull();
    expect(storage.getItem("xulux:storage-owner")).toBe("user_current");
  });

  it("clears Xulux data when the authenticated user changes", () => {
    const storage = createStorage({
      "xulux:storage-owner": "user_previous",
      "xulux:threads": '[{"title":"Private thread"}]',
      "xulux:learn:course": '{"threadId":"thread_previous"}',
      unrelated: "keep",
    });

    expect(claimXuluxStorage(storage, "user_current")).toBe(true);

    expect(storage.getItem("xulux:threads")).toBeNull();
    expect(storage.getItem("xulux:learn:course")).toBeNull();
    expect(storage.getItem("xulux:storage-owner")).toBe("user_current");
    expect(storage.getItem("unrelated")).toBe("keep");
  });

  it("keeps data for the same authenticated user", () => {
    const storage = createStorage({
      "xulux:storage-owner": "user_current",
      "xulux:threads": '[{"title":"Current thread"}]',
    });

    expect(claimXuluxStorage(storage, "user_current")).toBe(true);

    expect(storage.getItem("xulux:threads")).not.toBeNull();
  });

  it("reports unavailable storage without throwing", () => {
    const storage = createStorage();
    storage.setItem = () => {
      throw new Error("Storage unavailable");
    };

    expect(claimXuluxStorage(storage, "user_current")).toBe(false);
  });
});
