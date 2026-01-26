import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolUIRendererManager } from "../renderer/manager";
import { ToolUIRegistryImpl } from "../registry/registry";
import { ToolUIInstanceImpl } from "../core/instance";
import type { ToolUISandbox } from "../sandbox/types";
import type { ToolUIRenderOutput } from "../renderer/types";

function makeInstance(id = "call-1") {
  const instance = new ToolUIInstanceImpl(id, {
    toolCallId: id,
    toolName: "get_weather",
    args: { city: "SF" },
  });

  instance.resolve();
  instance.markMounting();
  instance.markActive();

  return instance;
}

function makeContainer() {
  const div = document.createElement("div");
  return div;
}

describe("ToolUIRendererManager", () => {
  let registry: ToolUIRegistryImpl;

  beforeEach(() => {
    registry = new ToolUIRegistryImpl();
  });

  it("does nothing if no factory is registered", () => {
    const manager = new ToolUIRendererManager({
      registry,
      createSandbox: vi.fn(),
    });

    const instance = makeInstance();
    const container = makeContainer();

    manager.mount(instance, container);

    expect(manager.list()).toHaveLength(0);
  });

  it("does nothing if factory returns empty output", () => {
    registry.register({
      toolName: "get_weather",
      factory: () => ({ kind: "empty" }),
    });

    const manager = new ToolUIRendererManager({
      registry,
      createSandbox: vi.fn(),
    });

    const instance = makeInstance();
    const container = makeContainer();

    manager.mount(instance, container);

    expect(manager.list()).toHaveLength(0);
  });

  it("creates a renderer session when output exists", () => {
    registry.register({
      toolName: "get_weather",
      factory: () => ({
        kind: "react",
        element: "<Weather />",
      }),
    });

    const manager = new ToolUIRendererManager({
      registry,
      createSandbox: vi.fn(),
    });

    const instance = makeInstance();
    const container = makeContainer();

    manager.mount(instance, container);

    const sessions = manager.list();

    expect(sessions).toHaveLength(1);

    const session = sessions[0];

    expect(session!.instance).toBe(instance);
    expect(session!.container).toBe(container);
    expect(session!.output.kind).toBe("react");
  });

  it("does not create duplicate sessions for same instance", () => {
    registry.register({
      toolName: "get_weather",
      factory: () => ({
        kind: "react",
        element: "<Weather />",
      }),
    });

    const manager = new ToolUIRendererManager({
      registry,
      createSandbox: vi.fn(),
    });

    const instance = makeInstance();
    const container = makeContainer();

    manager.mount(instance, container);
    manager.mount(instance, container);
    manager.mount(instance, container);

    expect(manager.list()).toHaveLength(1);
  });

  it("creates sandbox and mounts when output is html", async () => {
    const mountSpy = vi.fn();
    const updateSpy = vi.fn();
    const unmountSpy = vi.fn();

    const sandbox: ToolUISandbox = {
      type: "mock",
      mount: mountSpy,
      update: updateSpy,
      unmount: unmountSpy,
    };

    const createSandbox = vi.fn(() => sandbox);

    registry.register({
      toolName: "get_weather",
      factory: () => ({
        kind: "html",
        html: "<div>Hello</div>",
      }),
    });

    const manager = new ToolUIRendererManager({
      registry,
      createSandbox,
    });

    const instance = makeInstance();
    const container = makeContainer();

    manager.mount(instance, container);

    expect(createSandbox).toHaveBeenCalledTimes(1);
    expect(mountSpy).toHaveBeenCalledTimes(1);

    const sessions = manager.list();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.sandbox).toBe(sandbox);
  });

  it("updates existing session and calls sandbox.update", async () => {
    const mountSpy = vi.fn();
    const updateSpy = vi.fn();
    const unmountSpy = vi.fn();

    const sandbox: ToolUISandbox = {
      type: "mock",
      mount: mountSpy,
      update: updateSpy,
      unmount: unmountSpy,
    };

    const createSandbox = vi.fn(() => sandbox);

    let output: ToolUIRenderOutput = {
      kind: "html",
      html: "<div>One</div>",
    };

    registry.register({
      toolName: "get_weather",
      factory: () => output,
    });

    const manager = new ToolUIRendererManager({
      registry,
      createSandbox,
    });

    const instance = makeInstance();
    const container = makeContainer();

    manager.mount(instance, container);

    // change output
    output = {
      kind: "html",
      html: "<div>Two</div>",
    };

    manager.update(instance);

    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it("unmount cleans sandbox and container", () => {
    const mountSpy = vi.fn();
    const updateSpy = vi.fn();
    const unmountSpy = vi.fn();

    const sandbox: ToolUISandbox = {
      type: "mock",
      mount: mountSpy,
      update: updateSpy,
      unmount: unmountSpy,
    };

    const createSandbox = vi.fn(() => sandbox);

    registry.register({
      toolName: "get_weather",
      factory: () => ({
        kind: "html",
        html: "<div>Hello</div>",
      }),
    });

    const manager = new ToolUIRendererManager({
      registry,
      createSandbox,
    });

    const instance = makeInstance();
    const container = makeContainer();

    container.innerHTML = "<p>before</p>";

    manager.mount(instance, container);
    manager.unmount(instance);

    expect(unmountSpy).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe("");
    expect(manager.list()).toHaveLength(0);
  });

  it("react output does not create sandbox", () => {
    const createSandbox = vi.fn();

    registry.register({
      toolName: "get_weather",
      factory: () => ({
        kind: "react",
        element: "<Weather />",
      }),
    });

    const manager = new ToolUIRendererManager({
      registry,
      createSandbox,
    });

    const instance = makeInstance();
    const container = makeContainer();

    manager.mount(instance, container);

    expect(createSandbox).not.toHaveBeenCalled();

    const session = manager.list()[0];
    expect(session!.sandbox).toBeUndefined();
  });

  it("list returns all active sessions", () => {
    registry.register({
      toolName: "get_weather",
      factory: () => ({
        kind: "react",
        element: "<Weather />",
      }),
    });

    const manager = new ToolUIRendererManager({
      registry,
      createSandbox: vi.fn(),
    });

    const instance1 = makeInstance("call-1");
    const instance2 = makeInstance("call-2");

    const c1 = makeContainer();
    const c2 = makeContainer();

    manager.mount(instance1, c1);
    manager.mount(instance2, c2);

    const list = manager.list();

    expect(list).toHaveLength(2);

    const ids = list.map((s) => s.instance.id).sort();
    expect(ids).toEqual(["call-1", "call-2"]);
  });
});
