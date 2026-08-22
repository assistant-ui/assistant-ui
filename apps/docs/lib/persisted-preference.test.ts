import { afterEach, expect, it } from "vitest";
import { createPersistedPreference } from "./persisted-preference";

type Flavor = "base" | "radix";

type Handler = (event: unknown) => void;

type SetupOptions = {
  search?: string;
  stored?: string;
  storageThrows?: boolean;
  url?: boolean;
};

const setup = ({
  search = "",
  stored,
  storageThrows = false,
  url = true,
}: SetupOptions = {}) => {
  const store = new Map<string, string>();
  if (stored !== undefined) store.set("flavor", stored);

  const listeners = new Map<string, Set<Handler>>();
  let currentSearch = search;

  const localStorage = storageThrows
    ? {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      }
    : {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      };

  const window = {
    localStorage,
    get location() {
      return {
        href: `https://docs.test/page${currentSearch}`,
        search: currentSearch,
      };
    },
    history: {
      state: { marker: 1 },
      replaceState: (_state: unknown, _title: string, next: string) => {
        currentSearch = new URL(next).search;
      },
    },
    addEventListener: (type: string, handler: Handler) => {
      const set = listeners.get(type) ?? new Set<Handler>();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, handler: Handler) => {
      listeners.get(type)?.delete(handler);
    },
  };

  (globalThis as { window?: unknown }).window = window;

  const preference = createPersistedPreference<Flavor>({
    key: "flavor",
    fallback: "base",
    read: (raw) => (raw === "base" || raw === "radix" ? raw : null),
    ...(url
      ? {
          url: {
            param: "view",
            read: (raw: string) =>
              raw === "radix-ui" ? "radix" : raw === "base-ui" ? "base" : null,
            write: (value: Flavor) => (value === "radix" ? "radix-ui" : null),
          },
        }
      : {}),
  });

  let notifications = 0;
  preference.subscribe(() => {
    notifications += 1;
  });

  const emit = (type: string, event: unknown) => {
    for (const handler of listeners.get(type) ?? []) handler(event);
  };

  return {
    preference,
    store,
    emit,
    localStorage,
    getSearch: () => currentSearch,
    setSearch: (next: string) => {
      currentSearch = next;
    },
    getNotifications: () => notifications,
  };
};

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

it("falls back when nothing is stored", () => {
  expect(setup().preference.get()).toBe("base");
});

it("reads a stored value", () => {
  expect(setup({ stored: "radix" }).preference.get()).toBe("radix");
});

it("ignores a stored value it cannot parse", () => {
  expect(setup({ stored: "solid" }).preference.get()).toBe("base");
});

it("falls back to the stored value when the url parameter is unparseable", () => {
  expect(
    setup({ stored: "radix", search: "?view=solid" }).preference.get(),
  ).toBe("radix");
});

it("lets a url parameter outrank the stored value", () => {
  expect(
    setup({ stored: "base", search: "?view=radix-ui" }).preference.get(),
  ).toBe("radix");
});

it("persists a non-fallback value and mirrors it into the url", () => {
  const { preference, store, getSearch } = setup();

  preference.set("radix");

  expect(preference.get()).toBe("radix");
  expect(store.get("flavor")).toBe("radix");
  expect(getSearch()).toBe("?view=radix-ui");
});

it("clears the stored key and the url parameter when set back to the fallback", () => {
  const { preference, store, getSearch } = setup({
    stored: "radix",
    search: "?view=radix-ui",
  });

  preference.set("base");

  expect(preference.get()).toBe("base");
  expect(store.has("flavor")).toBe(false);
  expect(getSearch()).toBe("");
});

it("refreshes on a storage event for its own key only", () => {
  const { preference, store, emit, localStorage } = setup();

  store.set("flavor", "radix");
  emit("storage", { storageArea: localStorage, key: "unrelated" });
  expect(preference.get()).toBe("base");

  emit("storage", { storageArea: localStorage, key: "flavor" });
  expect(preference.get()).toBe("radix");
});

it("re-reads the url on popstate", () => {
  const { preference, emit, getSearch } = setup();
  expect(preference.get()).toBe("base");

  preference.set("radix");
  expect(getSearch()).toBe("?view=radix-ui");

  emit("popstate", {});
  expect(preference.get()).toBe("radix");
});

it("keeps the selection for the session when storage is blocked", () => {
  const { preference, getSearch } = setup({ storageThrows: true });

  preference.set("radix");

  expect(preference.get()).toBe("radix");
  expect(getSearch()).toBe("?view=radix-ui");
});

it("holds a stable snapshot between notifications", () => {
  const { preference, store, getNotifications } = setup();
  const before = getNotifications();

  store.set("flavor", "radix");

  expect(preference.get()).toBe("base");
  expect(getNotifications()).toBe(before);
});

it("reports the fallback as the server snapshot", () => {
  expect(setup({ stored: "radix" }).preference.getServerSnapshot()).toBe(
    "base",
  );
});

it("works without a url mapping", () => {
  const { preference, store, getSearch } = setup({ url: false });

  preference.set("radix");

  expect(store.get("flavor")).toBe("radix");
  expect(getSearch()).toBe("");
});

it("keeps a url-less selection across popstate when storage is blocked", () => {
  const { preference, emit } = setup({ url: false, storageThrows: true });

  preference.set("radix");
  emit("popstate", {});

  expect(preference.get()).toBe("radix");
});

it("re-reads the url when a later subscriber joins", () => {
  const { preference, setSearch } = setup({});
  expect(preference.get()).toBe("base");

  setSearch("?view=radix-ui");
  preference.subscribe(() => {});

  expect(preference.get()).toBe("radix");
});

it("keeps a url-less selection when a later subscriber joins and storage is blocked", () => {
  const { preference } = setup({ url: false, storageThrows: true });

  preference.set("radix");
  preference.subscribe(() => {});

  expect(preference.get()).toBe("radix");
});
