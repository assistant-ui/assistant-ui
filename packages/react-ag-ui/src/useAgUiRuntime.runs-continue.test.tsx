// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ThreadHistoryAdapter } from "@assistant-ui/core";
import { AbstractAgent, HttpAgent, type RunAgentInput } from "@ag-ui/client";
import { useAgUiRuntime } from "./useAgUiRuntime";
import { implementsConnect } from "./runtime/implementsConnect";

class RejoinableAgent extends HttpAgent {
  protected override connect(input: RunAgentInput) {
    return this.run(input);
  }
}

const createHistory = () => {
  const setRunsContinueOnServer = vi.fn();
  const history: ThreadHistoryAdapter = {
    load: vi.fn().mockResolvedValue({ messages: [] }),
    append: vi.fn().mockResolvedValue(undefined),
    unstable_setRunsContinueOnServer: setRunsContinueOnServer,
  };
  return { history, setRunsContinueOnServer };
};

afterEach(() => {
  cleanup();
});

describe("useAgUiRuntime runs that continue on the server", () => {
  it("detects an agent that overrides connect()", () => {
    expect(implementsConnect(new RejoinableAgent({ url: "http://x" }))).toBe(
      true,
    );
    expect(implementsConnect(new HttpAgent({ url: "http://x" }))).toBe(false);
    expect(
      implementsConnect({ runAgent: vi.fn() } as unknown as AbstractAgent),
    ).toBe(false);
  });

  it("tells the history adapter that a rejoinable agent's runs continue on the server", async () => {
    const { history, setRunsContinueOnServer } = createHistory();
    renderHook(() =>
      useAgUiRuntime({
        agent: new RejoinableAgent({ url: "http://x" }),
        adapters: { history },
      }),
    );
    await waitFor(() =>
      expect(setRunsContinueOnServer).toHaveBeenLastCalledWith(true),
    );
  });

  it("reports false for an agent without connect()", async () => {
    const { history, setRunsContinueOnServer } = createHistory();
    renderHook(() =>
      useAgUiRuntime({
        agent: new HttpAgent({ url: "http://x" }),
        adapters: { history },
      }),
    );
    await waitFor(() =>
      expect(setRunsContinueOnServer).toHaveBeenLastCalledWith(false),
    );
  });
});
