import { describe, it, expect } from "vitest";
import { ToolUIRegistryImpl } from "../registry/registry";
import type { ToolUIFactory, ToolUIFactoryProps } from "../registry/types";

describe("ToolUIRegistry", () => {
  const makeFactory = (_name: string): ToolUIFactory => {
    return (_props: ToolUIFactoryProps) => ({
      kind: "empty",
    });
  };

  it("registers and resolves a tool UI factory", () => {
    const registry = new ToolUIRegistryImpl();

    const factory = makeFactory("weather");

    registry.register({
      toolName: "get_weather",
      factory,
    });

    const resolved = registry.resolve("get_weather");

    expect(resolved).toBe(factory);
  });

  it("returns undefined for unknown tool", () => {
    const registry = new ToolUIRegistryImpl();

    const resolved = registry.resolve("unknown_tool");

    expect(resolved).toBeUndefined();
  });

  it("throws when registering the same tool twice", () => {
    const registry = new ToolUIRegistryImpl();

    const factory1 = makeFactory("one");
    const factory2 = makeFactory("two");

    registry.register({
      toolName: "get_weather",
      factory: factory1,
    });

    expect(() => {
      registry.register({
        toolName: "get_weather",
        factory: factory2,
      });
    }).toThrow(/already registered/i);
  });

  it("unregisters a tool correctly", () => {
    const registry = new ToolUIRegistryImpl();

    const factory = makeFactory("weather");

    registry.register({
      toolName: "get_weather",
      factory,
    });

    expect(registry.resolve("get_weather")).toBe(factory);

    registry.unregister("get_weather");

    expect(registry.resolve("get_weather")).toBeUndefined();
  });

  it("list returns all registered entries", () => {
    const registry = new ToolUIRegistryImpl();

    const factoryA = makeFactory("a");
    const factoryB = makeFactory("b");

    registry.register({
      toolName: "tool_a",
      factory: factoryA,
    });

    registry.register({
      toolName: "tool_b",
      factory: factoryB,
    });

    const list = registry.list();

    expect(list).toHaveLength(2);

    const names = list.map((e) => e.toolName).sort();
    expect(names).toEqual(["tool_a", "tool_b"]);

    const entryA = list.find((e) => e.toolName === "tool_a")!;
    const entryB = list.find((e) => e.toolName === "tool_b")!;

    expect(entryA.factory).toBe(factoryA);
    expect(entryB.factory).toBe(factoryB);
  });

  it("is isolated per registry instance", () => {
    const registry1 = new ToolUIRegistryImpl();
    const registry2 = new ToolUIRegistryImpl();

    const factory = makeFactory("weather");

    registry1.register({
      toolName: "get_weather",
      factory,
    });

    expect(registry1.resolve("get_weather")).toBe(factory);
    expect(registry2.resolve("get_weather")).toBeUndefined();
  });

  it("calls factory with correct props shape", () => {
    const registry = new ToolUIRegistryImpl();

    let receivedProps: ToolUIFactoryProps | null = null;

    const factory: ToolUIFactory = (props) => {
      receivedProps = props;
      return { kind: "empty" };
    };

    registry.register({
      toolName: "get_weather",
      factory,
    });

    const resolved = registry.resolve("get_weather")!;

    const props: ToolUIFactoryProps = {
      id: "call-1",
      lifecycle: "active",
      context: {
        toolCallId: "call-1",
        toolName: "get_weather",
        args: { city: "SF" },
      },
      result: { temp: 20 },
    };

    resolved(props);

    expect(receivedProps).toEqual(props);
  });
});
