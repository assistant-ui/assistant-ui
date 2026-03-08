import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@modelcontextprotocol/ext-apps", () => {
  class App {
    ontoolinput: unknown;
    ontoolinputpartial: unknown;
    ontoolresult: unknown;
    ontoolcancelled: unknown;
    onhostcontextchanged: unknown;
    onteardown: unknown;
    oncalltool: unknown;
    onlisttools: unknown;

    connect() {
      return new Promise<void>(() => {});
    }

    getHostContext() {
      return null;
    }
    callServerTool() {
      return Promise.resolve({ content: [] });
    }
    openLink() {
      return Promise.resolve();
    }
    requestDisplayMode({ mode }: { mode: string }) {
      return Promise.resolve({ mode });
    }
    sendSizeChanged() {}
    sendMessage() {
      return Promise.resolve();
    }
    updateModelContext() {
      return Promise.resolve();
    }
    sendLog() {}
    getHostCapabilities() {
      return undefined;
    }
    setupSizeChangedNotifications() {
      return () => {};
    }
  }

  return { App };
});

import { MCPBridge } from "./bridge";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("MCPBridge.connect timeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects instead of hanging forever when no host responds", async () => {
    vi.useFakeTimers();

    const bridge = new MCPBridge(undefined, undefined, {
      connectTimeoutMs: 25,
    });

    const outcomePromise = Promise.race([
      bridge.connect().then(
        () => ({ type: "resolved" as const }),
        (err) => ({ type: "rejected" as const, err }),
      ),
      delay(30).then(() => ({ type: "hung" as const })),
    ]);

    await vi.advanceTimersByTimeAsync(30);

    const outcome = await outcomePromise;

    // Without a timeout guard, `connect()` would hang and the test would see `{ type: "hung" }`.
    expect(outcome.type).toBe("rejected");
    if (outcome.type === "rejected") {
      expect(String(outcome.err)).toMatch(/timeout|timed out/i);
    }
  });
});
