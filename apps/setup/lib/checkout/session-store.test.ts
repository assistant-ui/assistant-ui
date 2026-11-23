import { afterEach, describe, expect, it, vi } from "vitest";

const storageKey = "aui-setup-session";

const setupStorage = () => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    },
    addEventListener: vi.fn(),
  });
  return values;
};

const loadStore = async () => {
  vi.resetModules();
  return import("./session-store");
};

const dispatchSessionStorage = () => {
  const listener = vi
    .mocked(window.addEventListener)
    .mock.calls.find(([type]) => type === "storage")![1] as (
    event: StorageEvent,
  ) => void;
  listener({
    key: storageKey,
    storageArea: window.localStorage,
  } as StorageEvent);
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("setup session store", () => {
  it("reads the agent's link and setup from the setup page fragment", async () => {
    setupStorage();
    const store = await loadStore();
    expect(
      store.parseAgentFragment("#link=abcdEFGH1234&setup=zyxw9876ABCD"),
    ).toEqual({ link: "abcdEFGH1234", setup: "zyxw9876ABCD" });
    expect(store.parseAgentFragment("#link=abcdEFGH1234")).toEqual({
      link: "abcdEFGH1234",
    });
    expect(store.parseAgentFragment("#link=a/b")).toBeNull();
    expect(store.parseAgentFragment("#intro")).toBeNull();
    expect(store.parseAgentFragment("")).toBeNull();
  });

  it("joins the setup an agent started and keeps it across a reload", async () => {
    const values = setupStorage();
    let store = await loadStore();
    const joined = store.joinAgentLink("abcdEFGH1234", "zyxw9876ABCD");
    expect(joined).toMatchObject({
      id: "zyxw9876ABCD",
      link: "abcdEFGH1234",
      products: ["assistant-ui"],
    });
    expect(store.sessionLinkUrl(joined!)).toBe(
      "https://checkout.assistant-ui.com/abcdEFGH1234",
    );
    expect(JSON.parse(values.get(storageKey)!)).toMatchObject({
      link: "abcdEFGH1234",
    });
    // Joining the same link again keeps the session.
    expect(store.joinAgentLink("abcdEFGH1234")).toBe(joined);
    store = await loadStore();
    expect(store.getCheckoutSession()).toEqual(joined);
  });

  it("names a setup without an id after its link and refuses a malformed link", async () => {
    setupStorage();
    const store = await loadStore();
    expect(store.joinAgentLink("a/b")).toBeNull();
    expect(store.joinAgentLink("abcdEFGH1234")?.id).toBe("agent-abcdEFGH1234");
  });

  it("replaces a session on another link", async () => {
    setupStorage();
    const store = await loadStore();
    store.joinAgentLink("abcdEFGH1234", "zyxw9876ABCD");
    expect(store.joinAgentLink("bbbbCCCC1234", "yyyy9876ABCD")).toMatchObject({
      id: "yyyy9876ABCD",
      link: "bbbbCCCC1234",
    });
  });

  it("follows the setup the agent created on the link", async () => {
    setupStorage();
    const store = await loadStore();
    store.adoptAgentSetup("ignored", ["cloud"]);
    expect(store.getCheckoutSession()).toBeNull();
    store.joinAgentLink("abcdEFGH1234");
    store.adoptAgentSetup("zyxw9876ABCD", ["assistant-ui", "cloud"]);
    expect(store.getCheckoutSession()).toMatchObject({
      id: "zyxw9876ABCD",
      products: ["assistant-ui", "cloud"],
    });
    store.adoptAgentSetup("zyxw9876ABCD", []);
    expect(store.getCheckoutSession()?.products).toEqual(["assistant-ui"]);
  });

  it("records products that joined and ends the session", async () => {
    const values = setupStorage();
    const store = await loadStore();
    store.joinAgentLink("abcdEFGH1234");
    store.addCheckoutProducts(["assistant-ui", "cloud"]);
    expect(store.getCheckoutSession()?.products).toEqual([
      "assistant-ui",
      "cloud",
    ]);
    store.endCheckout();
    expect(store.getCheckoutSession()).toBeNull();
    expect(values.has(storageKey)).toBe(false);
  });

  it("restores a stored session and drops one without a link", async () => {
    const values = setupStorage();
    values.set(
      storageKey,
      JSON.stringify({ id: "s1", link: "abcdEFGH1234", products: [] }),
    );
    let store = await loadStore();
    expect(store.getCheckoutSession()).toMatchObject({
      id: "s1",
      products: ["assistant-ui"],
    });
    values.set(storageKey, JSON.stringify({ id: "s1", products: [] }));
    store = await loadStore();
    expect(store.getCheckoutSession()).toBeNull();
  });

  it("follows replacement and removal of a session in another tab", async () => {
    const values = setupStorage();
    const store = await loadStore();
    store.joinAgentLink("abcdEFGH1234", "zyxw9876ABCD");
    const listener = vi.fn();
    const unsubscribe = store.subscribeCheckoutSession(listener);
    values.set(
      storageKey,
      JSON.stringify({ id: "other", link: "bbbbCCCC1234", products: [] }),
    );
    dispatchSessionStorage();
    expect(store.getCheckoutSession()?.id).toBe("other");
    values.delete(storageKey);
    dispatchSessionStorage();
    expect(store.getCheckoutSession()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("permits a sign-in round trip only while the session is stored", async () => {
    const values = setupStorage();
    const store = await loadStore();
    const session = store.joinAgentLink("abcdEFGH1234", "zyxw9876ABCD")!;
    const url = store.sessionLinkUrl(session);
    expect(store.canRestoreCheckoutSession(session.id, url)).toBe(true);
    expect(store.canRestoreCheckoutSession("another", url)).toBe(false);
    expect(
      store.canRestoreCheckoutSession(session.id, store.checkoutUrl("x")),
    ).toBe(false);
    values.delete(storageKey);
    expect(store.canRestoreCheckoutSession(session.id, url)).toBe(false);
  });

  it("refuses a sign-in round trip when browser storage is blocked", async () => {
    setupStorage();
    const store = await loadStore();
    const session = store.joinAgentLink("abcdEFGH1234")!;
    const url = store.sessionLinkUrl(session);
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("blocked");
      },
    });
    expect(store.canRestoreCheckoutSession(session.id, url)).toBe(false);
  });
});
