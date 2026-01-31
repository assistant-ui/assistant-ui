import { describe, it, expect } from "vitest";
import { ToolUIInstanceImpl } from "../core/instance";
import type { ToolUICallContext } from "../core/instance";

describe("ToolUIInstance", () => {
  const baseContext: ToolUICallContext = {
    toolCallId: "call-1",
    toolName: "get_weather",
    args: { city: "SF" },
  };

  it("initializes with correct initial state", () => {
    const instance = new ToolUIInstanceImpl("call-1", baseContext);

    const state = instance.getState();

    expect(state.id).toBe("call-1");
    expect(state.context).toBe(baseContext);
    expect(state.lifecycle).toBe("created");
    expect(state.result).toBeUndefined();
    expect(state.output).toBeUndefined();
  });

  it("follows the full valid lifecycle sequence", () => {
    const instance = new ToolUIInstanceImpl("call-1", baseContext);

    // created to  resolved
    instance.resolve();
    expect(instance.getState().lifecycle).toBe("resolved");

    // resolved to mounting
    instance.markMounting();
    expect(instance.getState().lifecycle).toBe("mounting");

    // mounting to active
    instance.markActive();
    expect(instance.getState().lifecycle).toBe("active");

    // active to updating
    instance.markUpdating();
    expect(instance.getState().lifecycle).toBe("updating");

    // updating to active
    instance.markActive();
    expect(instance.getState().lifecycle).toBe("active");

    // active to closing to closed
    instance.close();
    expect(instance.getState().lifecycle).toBe("closed");
  });

  it("throws on invalid lifecycle transitions", () => {
    const instance = new ToolUIInstanceImpl("call-1", baseContext);

    // created to active is invalid
    expect(() => instance.markActive()).toThrow();

    // Move to active properly
    instance.resolve();
    instance.markMounting();
    instance.markActive();

    // active to resolved is invalid
    expect(() => instance.resolve()).toThrow();

    // active to closed directly is invalid (must go through closing)
    expect(() => {
      (instance as any)._transition("closed");
    }).toThrow();
  });

  it("stores and exposes result correctly", () => {
    const instance = new ToolUIInstanceImpl("call-1", baseContext);

    instance.resolve();
    instance.markMounting();
    instance.markActive();

    const result = { temperature: 22, unit: "C" };

    instance.setResult(result);

    const state = instance.getState();
    expect(state.result).toEqual(result);
  });

  it("stores and exposes output correctly", () => {
    const instance = new ToolUIInstanceImpl("call-1", baseContext);

    const output = { kind: "html", html: "<b>Hello</b>" };

    instance.setOutput(output);

    const state = instance.getState();
    expect(state.output).toEqual(output);
  });

  it("creates a new immutable state object on each transition", () => {
    const instance = new ToolUIInstanceImpl("call-1", baseContext);

    const state1 = instance.getState();

    instance.resolve();
    const state2 = instance.getState();

    instance.markMounting();
    const state3 = instance.getState();

    expect(state1).not.toBe(state2);
    expect(state2).not.toBe(state3);
  });

  it("ends in closed state after close()", () => {
    const instance = new ToolUIInstanceImpl("call-1", baseContext);

    instance.resolve();
    instance.markMounting();
    instance.markActive();

    instance.close();

    const state = instance.getState();
    expect(state.lifecycle).toBe("closed");
  });
});
