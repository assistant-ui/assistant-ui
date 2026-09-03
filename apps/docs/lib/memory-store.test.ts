import { afterEach, describe, expect, it, vi } from "vitest";

type StorageSetup = {
  values: Map<string, string>;
};

const storageKey = "aui-home-memories";

const setupStorage = ({
  throws = false,
  writeThrows = false,
} = {}): StorageSetup => {
  const values = new Map<string, string>();
  const fail = () => {
    throw new Error("blocked");
  };
  const localStorage = throws
    ? {
        getItem: fail,
        setItem: fail,
        removeItem: fail,
      }
    : {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: writeThrows
          ? fail
          : (key: string, value: string) => {
              values.set(key, value);
            },
        removeItem: (key: string) => {
          values.delete(key);
        },
      };

  vi.stubGlobal("window", {
    localStorage,
    addEventListener: vi.fn(),
  });

  return { values };
};

const loadStore = async () => {
  vi.resetModules();
  return import("./memory-store");
};

const storedMemories = (values: Map<string, string>) =>
  JSON.parse(values.get(storageKey) ?? "[]") as Array<{ text: string }>;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("memory store", () => {
  it("adds a trimmed memory", async () => {
    const { values } = setupStorage();
    const { addMemory } = await loadStore();

    const result = addMemory("  Prefers TypeScript examples.  ");

    expect(result).toMatchObject({
      change: "added",
      record: { text: "Prefers TypeScript examples." },
    });
    expect(storedMemories(values)).toEqual([
      expect.objectContaining({ text: "Prefers TypeScript examples." }),
    ]);
  });

  it("refuses a memory with no text", async () => {
    const { values } = setupStorage();
    const { addMemory } = await loadStore();

    expect(addMemory("   ")).toBeUndefined();
    expect(storedMemories(values)).toEqual([]);
  });

  it("returns the existing memory for case-insensitive duplicates", async () => {
    setupStorage();
    const { addMemory } = await loadStore();

    const first = addMemory("Prefers TypeScript examples.");
    const duplicate = addMemory("prefers typescript examples.");

    expect(duplicate).toEqual({ record: first.record, change: "existing" });
  });

  it("drops the oldest memories after twenty records", async () => {
    const { values } = setupStorage();
    const { addMemory } = await loadStore();
    const now = vi.spyOn(Date, "now");

    for (let index = 0; index < 21; index += 1) {
      now.mockReturnValue(index);
      addMemory(`Memory ${index}`);
    }

    expect(storedMemories(values).map((memory) => memory.text)).toEqual(
      Array.from({ length: 20 }, (_, index) => `Memory ${index + 1}`),
    );
  });

  it("forgets one memory", async () => {
    const { values } = setupStorage();
    const { addMemory, forgetMemory } = await loadStore();
    const memory = addMemory("Uses Next.js.");

    forgetMemory(memory.record.id);

    expect(values.has(storageKey)).toBe(false);
  });

  it("clears every memory", async () => {
    const { values } = setupStorage();
    const { addMemory, clearMemories } = await loadStore();
    addMemory("Uses Next.js.");
    addMemory("Prefers TypeScript.");

    clearMemories();

    expect(values.has(storageKey)).toBe(false);
  });

  it("keeps records that never reached storage", async () => {
    const { values } = setupStorage({ writeThrows: true });
    const { addMemory } = await loadStore();

    addMemory("They prefer TypeScript examples.");
    expect(values.size).toBe(0);

    const second = addMemory("They prefer TypeScript examples.");

    expect(second?.change).toBe("existing");
  });

  it("keeps an in-memory list when storage throws", async () => {
    setupStorage({ throws: true });
    const { addMemory, forgetMemory, clearMemories } = await loadStore();

    const memory = addMemory("Uses Next.js.");

    expect(memory).toMatchObject({
      change: "added",
      record: { text: "Uses Next.js." },
    });
    expect(() => forgetMemory(memory.record.id)).not.toThrow();
    expect(() => clearMemories()).not.toThrow();
  });
});
