import { afterEach, expect, it, vi } from "vitest";

const STORAGE_KEY = "assistant-ui::docs:platform";

type Handler = (event: unknown) => void;

const setup = ({
  search = "",
  stored,
}: {
  search?: string;
  stored?: string;
}) => {
  const store = new Map<string, string>();
  if (stored !== undefined) store.set(STORAGE_KEY, stored);

  let currentSearch = search;

  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
    get location() {
      return {
        href: `https://docs.test/docs${currentSearch}`,
        search: currentSearch,
      };
    },
    history: {
      state: null,
      replaceState: (_state: unknown, _title: string, next: string) => {
        currentSearch = new URL(next).search;
      },
    },
    addEventListener: (_type: string, _handler: Handler) => {},
    removeEventListener: (_type: string, _handler: Handler) => {},
  };

  return { store, getSearch: () => currentSearch };
};

afterEach(() => {
  vi.resetModules();
  delete (globalThis as { window?: unknown }).window;
});

it("promotes a platform url parameter into storage", async () => {
  const { store } = setup({ search: "?platform=rn" });
  const { syncPlatformFromUrl } = await import("./context");

  syncPlatformFromUrl();

  expect(store.get(STORAGE_KEY)).toBe("rn");
});

it("leaves storage alone when the url names no platform", async () => {
  const { store } = setup({ stored: "ink" });
  const { syncPlatformFromUrl } = await import("./context");

  syncPlatformFromUrl();

  expect(store.get(STORAGE_KEY)).toBe("ink");
});

it("ignores an unknown platform in the url", async () => {
  const { store } = setup({ search: "?platform=vue", stored: "rn" });
  const { syncPlatformFromUrl } = await import("./context");

  syncPlatformFromUrl();

  expect(store.get(STORAGE_KEY)).toBe("rn");
});

it("clears the stored key when the url names the default platform", async () => {
  const { store, getSearch } = setup({
    search: "?platform=react",
    stored: "rn",
  });
  const { syncPlatformFromUrl } = await import("./context");

  syncPlatformFromUrl();

  expect(store.has(STORAGE_KEY)).toBe(false);
  expect(getSearch()).toBe("");
});
