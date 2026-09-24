import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("getPlatformSwitchHref", () => {
  const load = async () => (await import("./context")).getPlatformSwitchHref;

  it("maps the three installation pages onto each other", async () => {
    const getPlatformSwitchHref = await load();
    expect(getPlatformSwitchHref("/docs/installation", "rn")).toBe(
      "/docs/react-native",
    );
    expect(getPlatformSwitchHref("/docs/react-native", "ink")).toBe(
      "/docs/ink",
    );
    expect(getPlatformSwitchHref("/docs/ink", "react")).toBe(
      "/docs/installation",
    );
  });

  it("enters Assistant Cloud through its own root", async () => {
    const getPlatformSwitchHref = await load();
    expect(getPlatformSwitchHref("/docs/ink", "cloud")).toBe("/docs/cloud");
    expect(getPlatformSwitchHref("/docs/cloud", "react")).toBe(
      "/docs/installation",
    );
    expect(getPlatformSwitchHref("/docs/cloud/ai-sdk", "rn")).toBeNull();
  });

  it("treats a library like Tap as a peer of the installation pages", async () => {
    const getPlatformSwitchHref = await load();
    expect(getPlatformSwitchHref("/docs/installation", "tap")).toBe(
      "/docs/tap",
    );
    expect(getPlatformSwitchHref("/docs/tap", "rn")).toBe("/docs/react-native");
    expect(getPlatformSwitchHref("/docs/store/scopes", "react")).toBeNull();
    expect(getPlatformSwitchHref("/docs/react-native/hooks", "tap")).toBeNull();
  });

  it("keeps the suffix between the two platform folders", async () => {
    const getPlatformSwitchHref = await load();
    expect(getPlatformSwitchHref("/docs/react-native/hooks", "ink")).toBe(
      "/docs/ink/hooks",
    );
    expect(getPlatformSwitchHref("/docs/ink/adapters", "rn")).toBe(
      "/docs/react-native/adapters",
    );
  });

  it("has no equivalent for shared or react-only pages, so the caller keeps or falls back", async () => {
    const getPlatformSwitchHref = await load();
    expect(getPlatformSwitchHref("/docs", "rn")).toBeNull();
    expect(getPlatformSwitchHref("/docs/architecture", "ink")).toBeNull();
    expect(getPlatformSwitchHref("/docs/guides/attachments", "rn")).toBeNull();
    expect(
      getPlatformSwitchHref("/docs/react-native/hooks", "react"),
    ).toBeNull();
  });
});
