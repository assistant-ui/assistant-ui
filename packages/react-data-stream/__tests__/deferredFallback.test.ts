import { describe, it, expect } from "vitest";
import { injectDiscoveryWrappers } from "assistant-stream";
import type { Tool } from "assistant-stream";

const stubTool = (): Tool<any, any> =>
  ({
    description: "stub",
    parameters: { type: "object", properties: {} },
  }) as unknown as Tool<any, any>;

describe("react-data-stream deferred tools fallback", () => {
  it("includes eager core tools in request body", () => {
    const core: Record<string, Tool> = { coreTool: stubTool() };
    const deferred: Record<string, Tool> = { deferredTool: stubTool() };

    const tools = injectDiscoveryWrappers({
      adapterId: "react-data-stream",
      tools: core,
      deferredTools: deferred,
    });

    expect(tools).toHaveProperty("coreTool");
  });

  it("does NOT include deferred tools in request body", () => {
    const core: Record<string, Tool> = { coreTool: stubTool() };
    const deferred: Record<string, Tool> = { deferredTool: stubTool() };

    const tools = injectDiscoveryWrappers({
      adapterId: "react-data-stream",
      tools: core,
      deferredTools: deferred,
    });

    expect(tools).not.toHaveProperty("deferredTool");
  });

  it("injects aui_discover_tools wrapper", () => {
    const tools = injectDiscoveryWrappers({
      adapterId: "react-data-stream",
      tools: undefined,
      deferredTools: { deferredTool: stubTool() },
    });

    expect(tools).toHaveProperty("aui_discover_tools");
  });

  it("injects aui_run_dynamic_tool wrapper", () => {
    const tools = injectDiscoveryWrappers({
      adapterId: "react-data-stream",
      tools: undefined,
      deferredTools: { deferredTool: stubTool() },
    });

    expect(tools).toHaveProperty("aui_run_dynamic_tool");
  });

  it("produces byte-stable output across identical calls (cache invariant)", () => {
    const core: Record<string, Tool> = { coreTool: stubTool() };
    const deferred: Record<string, Tool> = { deferredTool: stubTool() };

    const result1 = injectDiscoveryWrappers({
      adapterId: "react-data-stream",
      tools: core,
      deferredTools: deferred,
    });
    const result2 = injectDiscoveryWrappers({
      adapterId: "react-data-stream",
      tools: core,
      deferredTools: deferred,
    });

    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });
});
