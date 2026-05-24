import { describe, it, expect } from "vitest";
import { injectDiscoveryWrappers } from "../wrappers";
import type { Tool } from "../tool-types";

const stubTool = (): Tool<any, any> =>
  ({
    description: "stub",
    parameters: { type: "object", properties: {} },
  }) as unknown as Tool<any, any>;

describe("injectDiscoveryWrappers", () => {
  describe("wrapper tool names", () => {
    it("includes aui_discover_tools", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: undefined,
        deferredTools: undefined,
      });
      expect(result).toHaveProperty("aui_discover_tools");
    });

    it("includes aui_run_dynamic_tool", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: undefined,
        deferredTools: undefined,
      });
      expect(result).toHaveProperty("aui_run_dynamic_tool");
    });
  });

  describe("eager tool passthrough", () => {
    it("includes eager tools alongside wrappers", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: { myCoreTool: stubTool() },
        deferredTools: undefined,
      });

      expect(result).toHaveProperty("myCoreTool");
      expect(result).toHaveProperty("aui_discover_tools");
      expect(result).toHaveProperty("aui_run_dynamic_tool");
    });

    it("includes multiple eager tools", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: { toolA: stubTool(), toolB: stubTool() },
        deferredTools: { deferredC: stubTool() },
      });

      expect(result).toHaveProperty("toolA");
      expect(result).toHaveProperty("toolB");
    });
  });

  describe("deferred tools are excluded", () => {
    it("does not include deferred tools in the output", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: { core: stubTool() },
        deferredTools: {
          deferred1: stubTool(),
          deferred2: stubTool(),
        },
      });

      expect(result).not.toHaveProperty("deferred1");
      expect(result).not.toHaveProperty("deferred2");
    });

    it("works with only deferred tools (no core tools)", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: undefined,
        deferredTools: { someDeferred: stubTool() },
      });

      expect(result).not.toHaveProperty("someDeferred");
      expect(result).toHaveProperty("aui_discover_tools");
      expect(result).toHaveProperty("aui_run_dynamic_tool");
    });
  });

  describe("aui_discover_tools schema", () => {
    it("has a description mentioning tool search", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: undefined,
        deferredTools: undefined,
      });
      const discover = result["aui_discover_tools"] as {
        description: string;
        parameters: { required: string[]; properties: Record<string, unknown> };
      };
      expect(discover.description).toBeTruthy();
      expect(discover.description.toLowerCase()).toContain("search");
    });

    it("requires 'query' parameter", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: undefined,
        deferredTools: undefined,
      });
      const discover = result["aui_discover_tools"] as {
        parameters: { required: string[]; properties: Record<string, unknown> };
      };
      expect(discover.parameters.required).toContain("query");
    });

    it("has optional 'max' parameter", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: undefined,
        deferredTools: undefined,
      });
      const discover = result["aui_discover_tools"] as {
        parameters: { properties: Record<string, unknown> };
      };
      expect(discover.parameters.properties).toHaveProperty("max");
    });
  });

  describe("aui_run_dynamic_tool schema", () => {
    it("has a description mentioning execution", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: undefined,
        deferredTools: undefined,
      });
      const run = result["aui_run_dynamic_tool"] as {
        description: string;
        parameters: { required: string[] };
      };
      expect(run.description).toBeTruthy();
      expect(run.description.toLowerCase()).toContain("execut");
    });

    it("requires 'toolName' and 'args' parameters", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: undefined,
        deferredTools: undefined,
      });
      const run = result["aui_run_dynamic_tool"] as {
        parameters: { required: string[] };
      };
      expect(run.parameters.required).toContain("toolName");
      expect(run.parameters.required).toContain("args");
    });
  });

  describe("tool name sorting", () => {
    it("eager tool names are sorted (stable for prompt caching)", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: { zebra: stubTool(), apple: stubTool(), mango: stubTool() },
        deferredTools: undefined,
      });
      const keys = Object.keys(result);
      // Eager tools should be sorted; wrappers are added after
      expect(keys.indexOf("apple")).toBeLessThan(keys.indexOf("mango"));
      expect(keys.indexOf("mango")).toBeLessThan(keys.indexOf("zebra"));
    });
  });

  describe("handles empty inputs", () => {
    it("works with both tools and deferredTools undefined", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: undefined,
        deferredTools: undefined,
      });
      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty("aui_discover_tools");
      expect(result).toHaveProperty("aui_run_dynamic_tool");
    });

    it("works with empty objects", () => {
      const result = injectDiscoveryWrappers({
        adapterId: "test",
        tools: {},
        deferredTools: {},
      });
      expect(result).toHaveProperty("aui_discover_tools");
      expect(result).toHaveProperty("aui_run_dynamic_tool");
    });
  });
});
