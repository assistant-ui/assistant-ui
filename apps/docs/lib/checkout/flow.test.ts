import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/analytics")>()),
  track: vi.fn(),
}));

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

const load = async () => {
  vi.resetModules();
  const [flow, session] = await Promise.all([
    import("./flow"),
    import("./session-store"),
  ]);
  return { ...flow, ...session };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("checkout flow", () => {
  it("ends a running setup before connecting to an agent's setup", async () => {
    setupStorage();
    const s = await load();
    s.startCheckout(["cloud"]);
    expect(s.connectAgentSetup("abcdEFGH1234", "zyxw9876ABCD")).toMatchObject({
      id: "zyxw9876ABCD",
      origin: "agent",
      link: "abcdEFGH1234",
    });
    // Connecting again to the same link keeps the session.
    s.connectAgentSetup("abcdEFGH1234");
    expect(s.getCheckoutSession()?.id).toBe("zyxw9876ABCD");
  });

  it("ends the session when a setup is abandoned or finished", async () => {
    setupStorage();
    const s = await load();
    s.startCheckout(["assistant-ui"]);
    s.abandonCheckout();
    expect(s.getCheckoutSession()).toBeNull();
    s.startCheckout(["assistant-ui"]);
    s.finishCheckout();
    expect(s.getCheckoutSession()).toBeNull();
  });
});
