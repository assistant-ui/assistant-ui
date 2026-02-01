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
  return document.createElement("div");
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

    manager.mount(makeInstance(), makeContainer());
    expect(manager.list()).toHaveLength(0);
  });

  it("creates a session but does not render if factory returns empty output", () => {
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

    const sessions = manager.list();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.output.kind).toBe("empty");
    expect(sessions[0]!.sandbox).toBeUndefined();
    expect(container.innerHTML).toBe("");
  });

  it("creates sandbox and mounts when output is html", () => {
    const mount = vi.fn();
    const sandbox: ToolUISandbox = {
      type: "mock",
      mount,
      update: vi.fn(),
      unmount: vi.fn(),
    };

    registry.register({
      toolName: "get_weather",
      factory: () => ({
        kind: "html",
        html: "<div>Hello</div>",
      }),
    });

    const manager = new ToolUIRendererManager({
      registry,
      createSandbox: () => sandbox,
    });

    manager.mount(makeInstance(), makeContainer());

    expect(mount).toHaveBeenCalledTimes(1);
    expect(manager.list()).toHaveLength(1);
  });

  it("updates existing session and calls sandbox.update", () => {
    const update = vi.fn();
    const sandbox: ToolUISandbox = {
      type: "mock",
      mount: vi.fn(),
      update,
      unmount: vi.fn(),
    };

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
      createSandbox: () => sandbox,
    });

    const instance = makeInstance();
    manager.mount(instance, makeContainer());

    output = {
      kind: "html",
      html: "<div>Two</div>",
    };

    manager.update(instance);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("unmount cleans sandbox and container", () => {
    const unmount = vi.fn();
    const sandbox: ToolUISandbox = {
      type: "mock",
      mount: vi.fn(),
      update: vi.fn(),
      unmount,
    };

    registry.register({
      toolName: "get_weather",
      factory: () => ({
        kind: "html",
        html: "<div>Hello</div>",
      }),
    });

    const manager = new ToolUIRendererManager({
      registry,
      createSandbox: () => sandbox,
    });

    const instance = makeInstance();
    const container = makeContainer();

    container.innerHTML = "<p>before</p>";

    manager.mount(instance, container);
    manager.unmount(instance);

    expect(unmount).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe("");
    expect(manager.list()).toHaveLength(0);
  });
});
