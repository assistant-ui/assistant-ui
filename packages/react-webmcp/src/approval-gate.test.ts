import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Tool } from "assistant-stream";
import {
  DEFAULT_APPROVAL_OPTIONS,
  createWebMcpApprovalGate,
  createWebMcpApprovalStore,
  type WebMcpApprovalGateConfig,
} from "./approval-gate";

const tool = { type: "frontend", execute: async () => "ok" } as unknown as Tool<
  any,
  any
>;

const makeGate = (config: WebMcpApprovalGateConfig = {}) => {
  const store = createWebMcpApprovalStore();
  const gate = createWebMcpApprovalGate({
    store,
    allowAlwaysMemory: new Set<string>(),
    ...config,
  });
  return { gate, store: config.store ?? store };
};

const request = (overrides: { abortSignal?: AbortSignal } = {}) => ({
  toolName: "search",
  tool,
  args: { q: "cats" },
  abortSignal: overrides.abortSignal,
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createWebMcpApprovalGate", () => {
  it("pushes a pending approval with tool name, args, and default options", async () => {
    const { gate, store } = makeGate();
    const decision = gate(request());

    const pending = store.getSnapshot();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.toolName).toBe("search");
    expect(pending[0]!.args).toEqual({ q: "cats" });
    expect(pending[0]!.options).toBe(DEFAULT_APPROVAL_OPTIONS);
    expect(typeof pending[0]!.id).toBe("string");

    pending[0]!.respond({ optionId: "allow-once" });
    await expect(decision).resolves.toEqual({ approved: true });
    expect(store.getSnapshot()).toHaveLength(0);
  });

  it("notifies store subscribers on push and on resolution", async () => {
    const { gate, store } = makeGate();
    const listener = vi.fn();
    store.subscribe(listener);

    const decision = gate(request());
    expect(listener).toHaveBeenCalledTimes(1);

    store.getSnapshot()[0]!.respond({ approved: true });
    await decision;
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("awaits requestUserInteraction before queueing", async () => {
    const order: string[] = [];
    const requestUserInteraction = vi.fn(async () => {
      order.push("interaction");
    });
    const { gate, store } = makeGate({ requestUserInteraction });

    const decision = gate(request());
    expect(store.getSnapshot()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getSnapshot()).toHaveLength(1);
    order.push("queued");

    expect(requestUserInteraction).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["interaction", "queued"]);

    store.getSnapshot()[0]!.respond({ approved: true });
    await decision;
  });

  it("still prompts when requestUserInteraction rejects", async () => {
    const { gate, store } = makeGate({
      requestUserInteraction: async () => {
        throw new Error("denied");
      },
    });

    const decision = gate(request());
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getSnapshot()).toHaveLength(1);
    store.getSnapshot()[0]!.respond({ approved: true });
    await expect(decision).resolves.toEqual({ approved: true });
  });

  it("resolves kind-based options through resolveToolApprovalResponse", async () => {
    const { gate, store } = makeGate();

    const decision = gate(request());
    store.getSnapshot()[0]!.respond({ optionId: "reject-once", reason: "no" });
    await expect(decision).resolves.toEqual({ approved: false, reason: "no" });
  });

  it("accepts a plain boolean response", async () => {
    const { gate, store } = makeGate();

    const decision = gate(request());
    store.getSnapshot()[0]!.respond({ approved: false, reason: "nope" });
    await expect(decision).resolves.toEqual({
      approved: false,
      reason: "nope",
    });
  });

  it("throws to the responder for an unknown optionId and keeps the approval pending", async () => {
    const { gate, store } = makeGate();

    const decision = gate(request());
    expect(() =>
      store.getSnapshot()[0]!.respond({ optionId: "missing" }),
    ).toThrow('no option with id "missing"');
    expect(store.getSnapshot()).toHaveLength(1);

    store.getSnapshot()[0]!.respond({ approved: true });
    await expect(decision).resolves.toEqual({ approved: true });
  });

  it("requires an explicit approved value for a custom _-prefixed kind", async () => {
    const options = [{ id: "escalate", kind: "_escalate" }] as const;
    const { gate, store } = makeGate({ approvalOptions: options });

    const decision = gate(request());
    expect(() =>
      store.getSnapshot()[0]!.respond({ optionId: "escalate" }),
    ).toThrow('custom kind "_escalate"');
    expect(store.getSnapshot()).toHaveLength(1);

    store.getSnapshot()[0]!.respond({ optionId: "escalate", approved: true });
    await expect(decision).resolves.toEqual({ approved: true });
  });

  it("remembers allow-always and short-circuits the next call for the same tool", async () => {
    const { gate, store } = makeGate();

    const first = gate(request());
    store.getSnapshot()[0]!.respond({ optionId: "allow-always" });
    await expect(first).resolves.toEqual({ approved: true });

    await expect(gate(request())).resolves.toEqual({ approved: true });
    expect(store.getSnapshot()).toHaveLength(0);

    const other = gate({ ...request(), toolName: "other" });
    expect(store.getSnapshot()).toHaveLength(1);
    store.getSnapshot()[0]!.respond({ approved: false });
    await other;
  });

  it("does not remember allow-once", async () => {
    const { gate, store } = makeGate();

    const first = gate(request());
    store.getSnapshot()[0]!.respond({ optionId: "allow-once" });
    await first;

    void gate(request());
    expect(store.getSnapshot()).toHaveLength(1);
    store.getSnapshot()[0]!.respond({ approved: false });
  });

  it('bypasses the queue entirely with approval: "never"', async () => {
    const { gate, store } = makeGate({ approval: "never" });

    await expect(gate(request())).resolves.toEqual({ approved: true });
    expect(store.getSnapshot()).toHaveLength(0);
  });

  it("consults the predicate with name, tool, and args", async () => {
    const predicate = vi.fn((name: string) => name === "dangerous");
    const { gate, store } = makeGate({ approval: predicate });

    await expect(gate(request())).resolves.toEqual({ approved: true });
    expect(predicate).toHaveBeenCalledWith("search", tool, { q: "cats" });
    expect(store.getSnapshot()).toHaveLength(0);

    const gated = gate({ ...request(), toolName: "dangerous" });
    expect(store.getSnapshot()).toHaveLength(1);
    store.getSnapshot()[0]!.respond({ approved: true });
    await expect(gated).resolves.toEqual({ approved: true });
  });

  it("expires after the default 120s timeout", async () => {
    const { gate, store } = makeGate();

    const decision = gate(request());
    await vi.advanceTimersByTimeAsync(119_999);
    expect(store.getSnapshot()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(decision).resolves.toEqual({
      approved: false,
      resolution: "expired",
    });
    expect(store.getSnapshot()).toHaveLength(0);
  });

  it("honors a custom approvalTimeoutMs", async () => {
    const { gate } = makeGate({ approvalTimeoutMs: 500 });

    const decision = gate(request());
    await vi.advanceTimersByTimeAsync(500);
    await expect(decision).resolves.toEqual({
      approved: false,
      resolution: "expired",
    });
  });

  it("cancels a pending approval when the AbortSignal fires", async () => {
    const controller = new AbortController();
    const { gate, store } = makeGate();

    const decision = gate(request({ abortSignal: controller.signal }));
    expect(store.getSnapshot()).toHaveLength(1);

    controller.abort();
    await expect(decision).resolves.toEqual({
      approved: false,
      resolution: "cancelled",
    });
    expect(store.getSnapshot()).toHaveLength(0);
  });

  it("resolves cancelled immediately for an already-aborted signal without queueing", async () => {
    const controller = new AbortController();
    controller.abort();
    const { gate, store } = makeGate();

    await expect(
      gate(request({ abortSignal: controller.signal })),
    ).resolves.toEqual({ approved: false, resolution: "cancelled" });
    expect(store.getSnapshot()).toHaveLength(0);
  });

  it("ignores a respond call after the approval expired", async () => {
    const { gate, store } = makeGate({ approvalTimeoutMs: 10 });

    const decision = gate(request());
    const pending = store.getSnapshot()[0]!;
    await vi.advanceTimersByTimeAsync(10);
    await expect(decision).resolves.toEqual({
      approved: false,
      resolution: "expired",
    });

    expect(() => pending.respond({ approved: true })).not.toThrow();
  });
});
