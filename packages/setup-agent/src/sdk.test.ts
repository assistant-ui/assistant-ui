import { describe, expect, it, vi } from "vitest";
import * as sdk from "./sdk";
import { initialCheckoutState } from "./protocol";
import type { Checkout } from "./protocol";
import type { CheckoutClient } from "./client";

describe("setup-agent/sdk", () => {
  it("exports the pieces a CLI embeds setup with", () => {
    expect(Object.keys(sdk).sort()).toEqual(
      [
        "BROWSER_CLOSE_GRACE_MS",
        "BROWSER_REOPEN_GUARD_MS",
        "agentInstructions",
        "answerNeed",
        "connectCheckout",
        "createBrowserGate",
        "createSetupId",
        "diffEvents",
        "followSetup",
        "formatTerminalQuestion",
        "gateEvent",
        "needKey",
        "openUrl",
        "parseSetupUrl",
        "pendingNeeds",
        "runAgentSetup",
        "runSetupCommand",
        "setupBriefing",
        "setupPageUrl",
        "startSetupSession",
        "terminalQuestion",
        "wireAnswer",
      ].sort(),
    );
    expect(sdk.BROWSER_REOPEN_GUARD_MS).toBe(30_000);
  });

  it("runs a whole agent setup: session, briefing, then a stream that opens the page on the first question", async () => {
    vi.useFakeTimers({ now: 5_000_000 });
    try {
      let state: Checkout.State = initialCheckoutState();
      const listeners = new Set<() => void>();
      const calls: [string, unknown][] = [];
      const commands = new Proxy(
        {},
        {
          get: (_, name: string) => async (params: unknown) => {
            calls.push([name, params]);
            if (name === "checkout/create") {
              const { id, products } = params as {
                id: string;
                products: Checkout.Product[];
              };
              state = { ...state, id, products, createdAt: Date.now() };
            }
            if (name === "checkout/begin-plan")
              state = { ...state, status: "planning" };
          },
        },
      );
      const client = {
        get state() {
          return state;
        },
        subscribe: (listener: () => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        commands,
        dispose: vi.fn(),
      } as unknown as CheckoutClient;
      const connect = vi.fn(async () => client);
      const open = vi.fn();
      let out = "";
      const lines: unknown[] = [];
      const { session, stream } = await sdk.runAgentSetup({
        server: "https://checkout.test",
        setupAppUrl: "https://setup.test",
        products: [{ slug: "assistant-ui", name: "assistant-ui" }],
        command: "npx my-tool setup",
        name: "my-tool setup",
        env: {},
        connect,
        open,
        write: (text) => (out += text),
        stream: {
          print: (events) => lines.push(...events),
          agent: { cwd: "/app" },
        },
      });
      expect(out).toMatch(/^my-tool setup is running\./);
      expect(out).toContain(
        `npx my-tool setup https://checkout.test/${session.linkId} stream`,
      );
      expect(open).not.toHaveBeenCalled();
      expect(calls.map(([name]) => name)).toEqual([
        "checkout/create",
        "checkout/begin-plan",
        "agent/intro",
        "agent/hello",
      ]);

      state = {
        ...state,
        inputs: [
          {
            id: "q1",
            phase: "planning",
            kind: "text",
            prompt: "Which project?",
            optional: false,
            status: "open",
            createdAt: Date.now(),
          },
        ],
      };
      for (const listener of listeners) listener();
      await vi.advanceTimersByTimeAsync(300);
      expect(open).toHaveBeenCalledWith(session.browserUrl);
      expect(lines).toEqual([
        expect.objectContaining({ event: "browser.opened", id: "q1" }),
      ]);
      await stream.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
