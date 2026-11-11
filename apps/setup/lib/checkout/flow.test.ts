import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("setup flow", () => {
  it("connects to an agent's setup and keeps it for the same link", async () => {
    setupStorage();
    const s = await load();
    expect(s.connectAgentSetup("abcdEFGH1234", "zyxw9876ABCD")).toMatchObject({
      id: "zyxw9876ABCD",
      link: "abcdEFGH1234",
    });
    s.connectAgentSetup("abcdEFGH1234");
    expect(s.getCheckoutSession()?.id).toBe("zyxw9876ABCD");
  });

  it("ends the session when a setup is abandoned or finished", async () => {
    setupStorage();
    const s = await load();
    s.connectAgentSetup("abcdEFGH1234");
    s.abandonCheckout();
    expect(s.getCheckoutSession()).toBeNull();
    s.connectAgentSetup("abcdEFGH1234");
    s.finishCheckout();
    expect(s.getCheckoutSession()).toBeNull();
  });
});
