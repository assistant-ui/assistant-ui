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
  const store = config.store ?? createWebMcpApprovalStore();
  const gate = createWebMcpApprovalGate({
    allowAlwaysMemory: new Set<string>(),
    ...config,
    store,
  });
  return { gate, store };
};

const request = (
  overrides: { toolName?: string; abortSignal?: AbortSignal } = {},
) => ({
  toolName: overrides.toolName ?? "search",
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

  it('bypasses the queue entirely with approval: "never"', async () => {
    const { gate, store } = makeGate({ approval: "never" });

    await expect(gate(request())).resolves.toEqual({ approved: true });
    expect(store.getSnapshot()).toHaveLength(0);
  });
});

describe("createWebMcpApprovalGate allow-always memory", () => {
  it("remembers allow-always and short-circuits the next call for the same tool", async () => {
    const { gate, store } = makeGate();

    const first = gate(request());
    store.getSnapshot()[0]!.respond({ optionId: "allow-always" });
    await expect(first).resolves.toEqual({ approved: true });

    await expect(gate(request())).resolves.toEqual({ approved: true });
    expect(store.getSnapshot()).toHaveLength(0);

    const other = gate(request({ toolName: "other" }));
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

  it("scopes a grant to the memory it was given: another memory still prompts", async () => {
    const store = createWebMcpApprovalStore();
    const first = makeGate({ store });
    const granted = first.gate(request());
    store.getSnapshot()[0]!.respond({ optionId: "allow-always" });
    await expect(granted).resolves.toEqual({ approved: true });

    const second = makeGate({ store });
    const decision = second.gate(request());
    expect(store.getSnapshot()).toHaveLength(1);
    store.getSnapshot()[0]!.respond({ approved: false });
    await expect(decision).resolves.toEqual({ approved: false });
  });

  it("re-prompts once the granted name is dropped from the memory", async () => {
    const memory = new Set<string>();
    const { gate, store } = makeGate({ allowAlwaysMemory: memory });

    const granted = gate(request({ toolName: "do_thing" }));
    store.getSnapshot()[0]!.respond({ optionId: "allow-always" });
    await granted;
    expect(memory.has("do_thing")).toBe(true);

    memory.delete("do_thing");

    const decision = gate(request({ toolName: "do_thing" }));
    expect(store.getSnapshot()).toHaveLength(1);
    store.getSnapshot()[0]!.respond({ approved: true });
    await expect(decision).resolves.toEqual({ approved: true });
  });

  it("leaves already-queued siblings with their own prompt when one grants allow-always", async () => {
    const { gate, store } = makeGate();
    const first = gate(request({ toolName: "y" }));
    const sibling = gate(request({ toolName: "y" }));
    expect(store.getSnapshot()).toHaveLength(2);

    store.getSnapshot()[0]!.respond({ optionId: "allow-always" });
    await expect(first).resolves.toEqual({ approved: true });

    expect(store.getSnapshot()).toHaveLength(1);
    store.getSnapshot()[0]!.respond({ approved: true });
    await sibling;
  });
});

describe("createWebMcpApprovalGate settlement", () => {
  it("expires after the 120s timeout", async () => {
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

  it("ignores a valid respond call after the approval expired", async () => {
    const { gate, store } = makeGate();

    const decision = gate(request());
    const pending = store.getSnapshot()[0]!;
    await vi.advanceTimersByTimeAsync(120_000);
    await expect(decision).resolves.toEqual({
      approved: false,
      resolution: "expired",
    });

    expect(() => pending.respond({ approved: true })).not.toThrow();
  });

  it("ignores an invalid-optionId respond call after the approval expired", async () => {
    const { gate, store } = makeGate();

    const decision = gate(request());
    const pending = store.getSnapshot()[0]!;
    await vi.advanceTimersByTimeAsync(120_000);
    await decision;

    expect(() => pending.respond({ optionId: "missing" })).not.toThrow();
  });

  it("settles only once when respond is called twice", async () => {
    const { gate, store } = makeGate();

    const decision = gate(request());
    const pending = store.getSnapshot()[0]!;
    pending.respond({ approved: true });
    pending.respond({ approved: false, reason: "second" });

    await expect(decision).resolves.toEqual({ approved: true });
    expect(store.getSnapshot()).toHaveLength(0);
  });

  it("lets respond win over a later abort and detaches the abort listener", async () => {
    const controller = new AbortController();
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");
    const { gate, store } = makeGate();

    const decision = gate(request({ abortSignal: controller.signal }));
    store.getSnapshot()[0]!.respond({ approved: true });
    controller.abort();

    await expect(decision).resolves.toEqual({ approved: true });
    expect(store.getSnapshot()).toHaveLength(0);
    expect(removeSpy).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("lets abort win over a later respond", async () => {
    const controller = new AbortController();
    const { gate, store } = makeGate();

    const decision = gate(request({ abortSignal: controller.signal }));
    const pending = store.getSnapshot()[0]!;
    controller.abort();
    await expect(decision).resolves.toEqual({
      approved: false,
      resolution: "cancelled",
    });

    expect(() => pending.respond({ approved: true })).not.toThrow();
    expect(store.getSnapshot()).toHaveLength(0);
  });

  it("treats an abort after expiry as a no-op", async () => {
    const controller = new AbortController();
    const { gate, store } = makeGate();

    const decision = gate(request({ abortSignal: controller.signal }));
    await vi.advanceTimersByTimeAsync(120_000);
    await expect(decision).resolves.toEqual({
      approved: false,
      resolution: "expired",
    });

    controller.abort();
    expect(store.getSnapshot()).toHaveLength(0);
  });

  it("detaches every abort listener it attaches across concurrent approvals", async () => {
    const controller = new AbortController();
    const addSpy = vi.spyOn(controller.signal, "addEventListener");
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");
    const { gate, store } = makeGate();

    const decisions = [0, 1, 2].map(() =>
      gate(request({ abortSignal: controller.signal })),
    );
    expect(store.getSnapshot()).toHaveLength(3);

    controller.abort();
    await Promise.all(decisions);
    expect(store.getSnapshot()).toHaveLength(0);
    expect(addSpy.mock.calls.length).toBe(removeSpy.mock.calls.length);
  });

  it("gives each concurrent same-name call its own decision", async () => {
    const { gate, store } = makeGate();
    const first = gate(request({ toolName: "x" }));
    const second = gate(request({ toolName: "x" }));
    const third = gate(request({ toolName: "x" }));
    expect(store.getSnapshot()).toHaveLength(3);

    const [p0, p1, p2] = store.getSnapshot();
    p1!.respond({ optionId: "reject-once", reason: "no1" });
    p2!.respond({ approved: true });
    p0!.respond({ optionId: "allow-once" });

    await expect(second).resolves.toEqual({ approved: false, reason: "no1" });
    await expect(third).resolves.toEqual({ approved: true });
    await expect(first).resolves.toEqual({ approved: true });
    expect(store.getSnapshot()).toHaveLength(0);
  });
});

describe("createWebMcpApprovalGate user-attention request", () => {
  it("queues the approval before requesting attention", async () => {
    const requestUserInteraction = vi.fn(async () => {});
    const { gate, store } = makeGate({ requestUserInteraction });

    const decision = gate(request());
    expect(store.getSnapshot()).toHaveLength(1);
    expect(requestUserInteraction).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(0);
    expect(requestUserInteraction).toHaveBeenCalledTimes(1);

    store.getSnapshot()[0]!.respond({ approved: true });
    await expect(decision).resolves.toEqual({ approved: true });
  });

  it("still prompts when requestUserInteraction rejects", async () => {
    const { gate, store } = makeGate({
      requestUserInteraction: async () => {
        throw new Error("attention denied");
      },
    });

    const decision = gate(request());
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getSnapshot()).toHaveLength(1);

    store.getSnapshot()[0]!.respond({ approved: true });
    await expect(decision).resolves.toEqual({ approved: true });
  });

  it("still prompts when requestUserInteraction throws synchronously", async () => {
    const { gate, store } = makeGate({
      requestUserInteraction: (() => {
        throw new Error("attention exploded");
      }) as () => Promise<void>,
    });

    const decision = gate(request());
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getSnapshot()).toHaveLength(1);

    store.getSnapshot()[0]!.respond({ approved: true });
    await expect(decision).resolves.toEqual({ approved: true });
  });

  it("bounds the wait with the timeout even while the attention request hangs", async () => {
    const { gate, store } = makeGate({
      requestUserInteraction: () => new Promise<void>(() => {}),
    });

    const decision = gate(request());
    expect(store.getSnapshot()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(120_000);
    await expect(decision).resolves.toEqual({
      approved: false,
      resolution: "expired",
    });
    expect(store.getSnapshot()).toHaveLength(0);
  });

  it("cancels the queued approval when the signal aborts during the attention request", async () => {
    const controller = new AbortController();
    const { gate, store } = makeGate({
      requestUserInteraction: async () => {
        controller.abort();
      },
    });

    const decision = gate(request({ abortSignal: controller.signal }));
    await vi.advanceTimersByTimeAsync(0);

    await expect(decision).resolves.toEqual({
      approved: false,
      resolution: "cancelled",
    });
    expect(store.getSnapshot()).toHaveLength(0);
  });
});
