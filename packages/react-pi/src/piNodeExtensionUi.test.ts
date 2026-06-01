import { describe, expect, it, vi } from "vitest";
import {
  createSupervisorUiBridge,
  PiUnsupportedHostUiError,
  type SupervisorUiBridgeDeps,
} from "./piNodeExtensionUi";
import type { PiHostUiRequest } from "./piTypes";

const harness = (over: Partial<SupervisorUiBridgeDeps> = {}) => {
  const emitted: PiHostUiRequest[] = [];
  const resolved: string[] = [];
  let n = 0;
  let toolCallId: string | undefined;
  const bridge = createSupervisorUiBridge({
    nextRequestId: () => `r${++n}`,
    currentToolCallId: () => toolCallId,
    emitRequest: (request) => emitted.push(request),
    emitResolved: (id) => resolved.push(id),
    ...over,
  });
  return {
    bridge,
    emitted,
    resolved,
    setToolCallId: (id: string | undefined) => {
      toolCallId = id;
    },
  };
};

describe("createSupervisorUiBridge — blocking dialogs", () => {
  it("emits a confirm request and resolves true on confirmed", async () => {
    const { bridge, emitted, resolved } = harness();
    const answer = bridge.ui.confirm("Run?", "Proceed?");
    expect(emitted[0]).toEqual({
      id: "r1",
      kind: "confirm",
      title: "Run?",
      message: "Proceed?",
    });
    expect(bridge.pending()).toHaveLength(1);

    expect(bridge.resolve({ requestId: "r1", confirmed: true })).toBe(true);
    expect(await answer).toBe(true);
    expect(bridge.pending()).toHaveLength(0);
    expect(resolved).toEqual(["r1"]);
  });

  it("treats a dismissed confirm as false (no cancelled channel)", async () => {
    const { bridge } = harness();
    const answer = bridge.ui.confirm("Run?", "Proceed?");
    bridge.resolve({ requestId: "r1", dismissed: true });
    expect(await answer).toBe(false);
  });

  it("stamps toolCallId only under single-tool causality", async () => {
    const { bridge, emitted, setToolCallId } = harness();
    setToolCallId("tc-42");
    void bridge.ui.confirm("Edit file?", "ok?");
    expect(emitted[0]).toMatchObject({ toolCallId: "tc-42" });

    setToolCallId(undefined);
    void bridge.ui.confirm("Another?", "ok?");
    expect("toolCallId" in emitted[1]!).toBe(false);
  });

  it("resolves select/input with a value and dismiss with undefined", async () => {
    const { bridge, emitted } = harness();
    const selected = bridge.ui.select("Pick", ["a", "b"]);
    expect(emitted[0]).toMatchObject({ kind: "select", options: ["a", "b"] });
    bridge.resolve({ requestId: "r1", value: "b" });
    expect(await selected).toBe("b");

    const typed = bridge.ui.input("Name?", "placeholder");
    expect(emitted[1]).toMatchObject({
      kind: "input",
      placeholder: "placeholder",
    });
    bridge.resolve({ requestId: "r2", dismissed: true });
    expect(await typed).toBeUndefined();
  });

  it("supports the editor dialog with a prefill", async () => {
    const { bridge, emitted } = harness();
    const edited = bridge.ui.editor("Edit", "draft");
    expect(emitted[0]).toMatchObject({ kind: "editor", prefill: "draft" });
    bridge.resolve({ requestId: "r1", value: "final" });
    expect(await edited).toBe("final");
  });

  it("dismisses via an AbortSignal and records timeoutMs on the request", async () => {
    const { bridge, emitted } = harness();
    const controller = new AbortController();
    const answer = bridge.ui.confirm("Run?", "ok?", {
      signal: controller.signal,
      timeout: 5000,
    });
    expect(emitted[0]).toMatchObject({ timeoutMs: 5000 });
    controller.abort();
    expect(await answer).toBe(false);
    expect(bridge.pending()).toHaveLength(0);
  });

  it("auto-dismisses after the timeout elapses", async () => {
    vi.useFakeTimers();
    try {
      const { bridge } = harness();
      const selected = bridge.ui.select("Pick", ["a"], { timeout: 1000 });
      vi.advanceTimersByTime(1000);
      expect(await selected).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("dismissAll settles every pending request", async () => {
    const { bridge } = harness();
    const a = bridge.ui.confirm("A", "?");
    const b = bridge.ui.select("B", ["x"]);
    expect(bridge.pending()).toHaveLength(2);
    bridge.dismissAll();
    expect(await a).toBe(false);
    expect(await b).toBeUndefined();
    expect(bridge.pending()).toHaveLength(0);
  });

  it("ignores a response for an unknown/already-resolved request", () => {
    const { bridge } = harness();
    expect(bridge.resolve({ requestId: "nope", confirmed: true })).toBe(false);
  });
});

describe("createSupervisorUiBridge — degradation table", () => {
  it("rejects custom() with a typed unsupported error", async () => {
    const { bridge } = harness();
    await expect(bridge.ui.custom(() => ({}) as never)).rejects.toBeInstanceOf(
      PiUnsupportedHostUiError,
    );
  });

  it("forwards notify to the sink with a default type", () => {
    const onNotify = vi.fn();
    const { bridge } = harness({ onNotify });
    bridge.ui.notify("hello");
    expect(onNotify).toHaveBeenCalledWith("hello", "info");
  });

  it("answers inert reads instead of throwing", () => {
    const { bridge } = harness();
    expect(bridge.ui.getEditorText()).toBe("");
    expect(bridge.ui.getToolsExpanded()).toBe(false);
    expect(bridge.ui.getAllThemes()).toEqual([]);
    expect(bridge.ui.getTheme("x")).toBeUndefined();
    expect(bridge.ui.setTheme("x").success).toBe(false);
    expect(() => bridge.ui.setStatus("k", "v")).not.toThrow();
    expect(bridge.ui.onTerminalInput(() => undefined)()).toBeUndefined();
  });
});
