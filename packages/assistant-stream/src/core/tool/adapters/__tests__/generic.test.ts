import { describe, it, expect } from "vitest";
import { genericFallbackAdapter } from "../generic";
import type { Tool } from "../../tool-types";

const stubTool = (): Tool<any, any> =>
  ({
    description: "stub",
    parameters: { type: "object", properties: {} },
  }) as unknown as Tool<any, any>;

describe("genericFallbackAdapter", () => {
  describe("adapter id", () => {
    it("includes the adapterId in the id field", () => {
      const adapter = genericFallbackAdapter({ adapterId: "my-adapter" });
      expect(adapter.id).toBe("generic-fallback:my-adapter");
    });
  });

  describe("discovery wrapper injection", () => {
    it("injects aui_discover_tools and aui_run_dynamic_tool", () => {
      const adapter = genericFallbackAdapter({ adapterId: "test-wrappers" });
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: { deferredTool: stubTool() },
      });

      expect(result.tools).toHaveProperty("aui_discover_tools");
      expect(result.tools).toHaveProperty("aui_run_dynamic_tool");
    });

    it("passes eager (non-deferred) tools through to the wire payload", () => {
      const adapter = genericFallbackAdapter({ adapterId: "test-core-pass" });
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: { deferredTool: stubTool() },
      });

      expect(result.tools).toHaveProperty("coreTool");
    });

    it("does NOT include deferred tools in the wire payload", () => {
      const adapter = genericFallbackAdapter({
        adapterId: "test-deferred-omitted",
      });
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: { deferredTool: stubTool() },
      });

      expect(result.tools).not.toHaveProperty("deferredTool");
    });

    it("handles undefined core tools", () => {
      const adapter = genericFallbackAdapter({ adapterId: "test-undef-core" });
      const result = adapter.format({
        tools: undefined,
        deferredTools: { deferredTool: stubTool() },
      });

      expect(result.tools).toHaveProperty("aui_discover_tools");
      expect(result.tools).toHaveProperty("aui_run_dynamic_tool");
      expect(result.tools).not.toHaveProperty("deferredTool");
    });

    it("omits wrappers when there are no deferred tools", () => {
      const adapter = genericFallbackAdapter({
        adapterId: "test-undef-deferred",
      });
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: undefined,
      });

      expect(result.tools).toHaveProperty("coreTool");
      expect(result.tools).not.toHaveProperty("aui_discover_tools");
      expect(result.tools).not.toHaveProperty("aui_run_dynamic_tool");
    });

    it("wrapper tools have the expected schema shape", () => {
      const adapter = genericFallbackAdapter({ adapterId: "test-schema" });
      const result = adapter.format({
        tools: undefined,
        deferredTools: { deferredTool: stubTool() },
      });

      const discover = result.tools["aui_discover_tools"] as {
        description: string;
        parameters: { required: string[] };
      };
      expect(discover.description).toContain("Search for application tools");
      expect(discover.parameters.required).toContain("query");

      const run = result.tools["aui_run_dynamic_tool"] as {
        description: string;
        parameters: { required: string[] };
      };
      expect(run.description).toContain("Execute a previously-discovered tool");
      expect(run.parameters.required).toContain("toolName");
      expect(run.parameters.required).toContain("args");
    });

    it("does not emit extraHeaders or extraBody", () => {
      const adapter = genericFallbackAdapter({ adapterId: "test-no-extras" });
      const result = adapter.format({
        tools: { coreTool: stubTool() },
        deferredTools: undefined,
      });

      expect(result.extraHeaders).toBeUndefined();
      expect(result.extraBody).toBeUndefined();
    });
  });
});
