// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Tool } from "assistant-stream";
import {
  createWebMcpApprovalGate,
  type WebMcpPendingApproval,
} from "./approval-gate";
import { useWebMcpApprovals } from "./useWebMcpApprovals";

const tool = { type: "frontend", execute: async () => "ok" } as unknown as Tool<
  any,
  any
>;

let latest: readonly WebMcpPendingApproval[];

const Probe = () => {
  latest = useWebMcpApprovals();
  return null;
};

afterEach(cleanup);

describe("useWebMcpApprovals", () => {
  it("starts empty", () => {
    render(<Probe />);
    expect(latest).toEqual([]);
  });

  it("reflects pending approvals pushed by the gate and their resolution", async () => {
    const gate = createWebMcpApprovalGate({
      allowAlwaysMemory: new Set<string>(),
    });
    render(<Probe />);

    let decision!: Promise<unknown>;
    act(() => {
      decision = gate({
        toolName: "search",
        tool,
        args: { q: "cats" },
        abortSignal: undefined,
      });
    });

    expect(latest).toHaveLength(1);
    expect(latest[0]!.toolName).toBe("search");
    expect(latest[0]!.args).toEqual({ q: "cats" });

    act(() => {
      latest[0]!.respond({ optionId: "allow-once" });
    });
    await act(async () => {
      await decision;
    });
    expect(latest).toEqual([]);
  });

  it("keeps a stable empty snapshot across re-renders", () => {
    const view = render(<Probe />);
    const first = latest;
    view.rerender(<Probe />);
    expect(latest).toBe(first);
  });
});
