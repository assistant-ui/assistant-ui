import { describe, expect, it } from "vitest";
import { toJSONSchema, toToolsJSONSchema } from "./schema-utils";
import type { Tool } from "./tool-types";

describe("toJSONSchema", () => {
  it("converts StandardSchemaV1 with ~standard.toJSONSchema", () => {
    const mockStandardSchema = {
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: () => ({ value: {} }),
        toJSONSchema: () => ({
          type: "object",
          properties: { name: { type: "string" } },
        }),
      },
    };

    const result = toJSONSchema(mockStandardSchema);
    expect(result).toEqual({
      type: "object",
      properties: { name: { type: "string" } },
    });
  });

  it("converts object with toJSONSchema() method", () => {
    const schemaWithMethod = {
      toJSONSchema: () => ({
        type: "object",
        properties: { age: { type: "number" } },
      }),
    };

    const result = toJSONSchema(schemaWithMethod as never);
    expect(result).toEqual({
      type: "object",
      properties: { age: { type: "number" } },
    });
  });

  it("converts object with toJSON() method", () => {
    const schemaWithToJSON = {
      toJSON: () => ({
        type: "object",
        properties: { active: { type: "boolean" } },
      }),
    };

    const result = toJSONSchema(schemaWithToJSON as never);
    expect(result).toEqual({
      type: "object",
      properties: { active: { type: "boolean" } },
    });
  });

  it("passes through plain JSONSchema7", () => {
    const plainSchema = {
      type: "object" as const,
      properties: {
        email: { type: "string" as const, format: "email" },
      },
      required: ["email"],
    };

    const result = toJSONSchema(plainSchema);
    expect(result).toEqual(plainSchema);
  });

  it("prioritizes StandardSchema over toJSONSchema method", () => {
    const mixedSchema = {
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: () => ({ value: {} }),
        toJSONSchema: () => ({ type: "string", description: "from standard" }),
      },
      toJSONSchema: () => ({ type: "number", description: "from method" }),
    };

    const result = toJSONSchema(mixedSchema);
    expect(result).toEqual({ type: "string", description: "from standard" });
  });

  it("prioritizes toJSONSchema over toJSON method", () => {
    const mixedSchema = {
      toJSONSchema: () => ({
        type: "string",
        description: "from toJSONSchema",
      }),
      toJSON: () => ({ type: "number", description: "from toJSON" }),
    };

    const result = toJSONSchema(mixedSchema as never);
    expect(result).toEqual({
      type: "string",
      description: "from toJSONSchema",
    });
  });

  it("falls back to plain schema when StandardSchema has no toJSONSchema", () => {
    const schemaWithoutMethod = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({ value: {} }),
        // no toJSONSchema method
      },
      type: "object" as const,
      properties: {},
    };

    const result = toJSONSchema(schemaWithoutMethod);
    // Should return the object as-is since ~standard.toJSONSchema is not a function
    expect(result).toEqual(schemaWithoutMethod);
  });
});

describe("toToolsJSONSchema", () => {
  describe("filtering", () => {
    it("excludes disabled tools by default", () => {
      const tools: Record<string, Tool> = {
        enabledTool: {
          description: "Enabled tool",
          parameters: { type: "object", properties: {} },
        },
        disabledTool: {
          disabled: true,
          description: "Disabled tool",
          parameters: { type: "object", properties: {} },
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result).toHaveProperty("enabledTool");
      expect(result).not.toHaveProperty("disabledTool");
    });

    it("excludes backend tools by default", () => {
      const tools: Record<string, Tool> = {
        frontendTool: {
          type: "frontend",
          description: "Frontend tool",
          parameters: { type: "object", properties: {} },
        },
        backendTool: {
          type: "backend",
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result).toHaveProperty("frontendTool");
      expect(result).not.toHaveProperty("backendTool");
    });

    it("includes frontend tools", () => {
      const tools: Record<string, Tool> = {
        myTool: {
          type: "frontend",
          description: "A frontend tool",
          parameters: { type: "object", properties: { x: { type: "number" } } },
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result).toEqual({
        myTool: {
          description: "A frontend tool",
          parameters: { type: "object", properties: { x: { type: "number" } } },
        },
      });
    });

    it("includes human tools", () => {
      const tools: Record<string, Tool> = {
        humanTool: {
          type: "human",
          description: "A human tool",
          parameters: { type: "object", properties: {} },
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result).toHaveProperty("humanTool");
    });

    it("excludes tools without parameters", () => {
      const tools: Record<string, Tool> = {
        withParams: {
          description: "With params",
          parameters: { type: "object", properties: {} },
        },
        withoutParams: {
          type: "backend",
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result).toHaveProperty("withParams");
      expect(result).not.toHaveProperty("withoutParams");
    });

    it("respects custom filter function", () => {
      const tools: Record<string, Tool> = {
        tool_a: {
          disabled: true,
          parameters: { type: "object", properties: {} },
        },
        tool_b: {
          type: "backend",
        },
        tool_c: {
          parameters: { type: "object", properties: {} },
        },
      };

      // Custom filter that includes all tools regardless of disabled/backend
      const result = toToolsJSONSchema(tools, {
        filter: () => true,
      });

      // tool_a and tool_c have parameters, tool_b does not
      expect(result).toHaveProperty("tool_a");
      expect(result).not.toHaveProperty("tool_b"); // still excluded due to no parameters
      expect(result).toHaveProperty("tool_c");
    });

    it("custom filter receives name and tool", () => {
      const tools: Record<string, Tool> = {
        prefixed_tool: {
          description: "Should include",
          parameters: { type: "object", properties: {} },
        },
        other_tool: {
          description: "Should exclude",
          parameters: { type: "object", properties: {} },
        },
      };

      const result = toToolsJSONSchema(tools, {
        filter: (name, tool) =>
          name.startsWith("prefixed_") && tool.description !== undefined,
      });

      expect(result).toHaveProperty("prefixed_tool");
      expect(result).not.toHaveProperty("other_tool");
    });
  });

  describe("output format", () => {
    it("includes description when present", () => {
      const tools: Record<string, Tool> = {
        myTool: {
          description: "This is my tool",
          parameters: { type: "object", properties: {} },
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result.myTool).toEqual({
        description: "This is my tool",
        parameters: { type: "object", properties: {} },
      });
    });

    it("omits description when absent", () => {
      const tools: Record<string, Tool> = {
        myTool: {
          parameters: { type: "object", properties: {} },
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result.myTool).toEqual({
        parameters: { type: "object", properties: {} },
      });
      expect(result.myTool).not.toHaveProperty("description");
    });

    it("omits description when empty string", () => {
      const tools: Record<string, Tool> = {
        myTool: {
          description: "",
          parameters: { type: "object", properties: {} },
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result.myTool).not.toHaveProperty("description");
    });

    it("converts parameters via toJSONSchema", () => {
      const mockStandardSchema = {
        "~standard": {
          version: 1 as const,
          vendor: "test",
          validate: () => ({ value: {} }),
          toJSONSchema: () => ({
            type: "object",
            properties: { converted: { type: "boolean" } },
          }),
        },
      };

      const tools: Record<string, Tool> = {
        myTool: {
          description: "Test",
          parameters: mockStandardSchema,
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result.myTool!.parameters).toEqual({
        type: "object",
        properties: { converted: { type: "boolean" } },
      });
    });
  });

  describe("edge cases", () => {
    it("returns empty object for undefined tools", () => {
      const result = toToolsJSONSchema(undefined);
      expect(result).toEqual({});
    });

    it("returns empty object for empty tools", () => {
      const result = toToolsJSONSchema({});
      expect(result).toEqual({});
    });

    it("returns empty object when all tools are filtered out", () => {
      const tools: Record<string, Tool> = {
        disabled1: {
          disabled: true,
          parameters: { type: "object", properties: {} },
        },
        disabled2: {
          disabled: true,
          parameters: { type: "object", properties: {} },
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result).toEqual({});
    });

    it("handles tools with undefined type (defaults to frontend behavior)", () => {
      const tools: Record<string, Tool> = {
        myTool: {
          // no type specified
          description: "Tool without type",
          parameters: { type: "object", properties: {} },
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(result).toHaveProperty("myTool");
    });

    it("handles multiple tools correctly", () => {
      const tools: Record<string, Tool> = {
        tool_1: {
          description: "First tool",
          parameters: { type: "object", properties: { a: { type: "string" } } },
        },
        tool_2: {
          description: "Second tool",
          parameters: { type: "object", properties: { b: { type: "number" } } },
        },
        tool_3: {
          disabled: true,
          parameters: { type: "object", properties: {} },
        },
      };

      const result = toToolsJSONSchema(tools);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty("tool_1");
      expect(result).toHaveProperty("tool_2");
      expect(result).not.toHaveProperty("tool_3");
    });
  });
});
