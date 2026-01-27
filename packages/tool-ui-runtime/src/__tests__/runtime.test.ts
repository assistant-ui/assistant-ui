import { describe, it, expect } from "vitest";

import { ToolUIRuntimeImpl } from "../core/runtime";
import type { ToolUICallContext } from "../core/instance";

function makeContext(id: string): ToolUICallContext {
  return {
    toolCallId: id,
    toolName: "test_tool",
    args: { foo: "bar" },
  };
}

describe("ToolUIRuntime", () => {
  it("creates and tracks a new instance on mount", () => {
    const runtime = new ToolUIRuntimeImpl({
      registry: {
        register() {},
        unregister() {},
        resolve() {
          return undefined;
        },
        list() {
          return [];
        },
      },
      createSandbox() {
        throw new Error("sandbox not expected");
      },
    });

    const context = makeContext("call-1");

    const instance = runtime.mount(context);

    expect(instance.id).toBe("call-1");

    const list = runtime.list();
    expect(list.length).toBe(1);
    expect(list[0]).toBe(instance);

    const state = instance.getState();
    expect(state.context.toolName).toBe("test_tool");
    expect(state.lifecycle).toBe("active");
  });

  it("updates instance result when update is called", () => {
    const runtime = new ToolUIRuntimeImpl({
      registry: {
        register() {},
        unregister() {},
        resolve() {
          return undefined;
        },
        list() {
          return [];
        },
      },
      createSandbox() {
        throw new Error("sandbox not expected");
      },
    });

    const instance = runtime.mount(makeContext("call-2"));

    runtime.update("call-2", { answer: 42 });

    const state = instance.getState();
    expect(state.result).toEqual({ answer: 42 });
    expect(state.lifecycle).toBe("active");
  });

  it("throws if update is called on non-active instance", () => {
    const runtime = new ToolUIRuntimeImpl({
      registry: {
        register() {},
        unregister() {},
        resolve() {
          return undefined;
        },
        list() {
          return [];
        },
      },
      createSandbox() {
        throw new Error("sandbox not expected");
      },
    });

    const _instance = runtime.mount(makeContext("call-3"));

    runtime.close("call-3");

    expect(() => {
      runtime.update("call-3", {});
    }).toThrow();
  });

  it("removes instance on close", () => {
    const runtime = new ToolUIRuntimeImpl({
      registry: {
        register() {},
        unregister() {},
        resolve() {
          return undefined;
        },
        list() {
          return [];
        },
      },
      createSandbox() {
        throw new Error("sandbox not expected");
      },
    });

    runtime.mount(makeContext("call-4"));

    expect(runtime.list().length).toBe(1);

    runtime.close("call-4");

    expect(runtime.list().length).toBe(0);
  });

  it("get returns the correct instance", () => {
    const runtime = new ToolUIRuntimeImpl({
      registry: {
        register() {},
        unregister() {},
        resolve() {
          return undefined;
        },
        list() {
          return [];
        },
      },
      createSandbox() {
        throw new Error("sandbox not expected");
      },
    });

    const instance = runtime.mount(makeContext("call-5"));

    const fetched = runtime.get("call-5");

    expect(fetched).toBe(instance);
  });
});
