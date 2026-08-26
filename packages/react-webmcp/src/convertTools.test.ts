import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ToolResponse, type Tool } from "assistant-stream";
import type { WebMcpApprovalGate } from "./approval-gate";
import {
  defaultWebMcpFilter,
  toMcpContent,
  toWebMcpTool,
} from "./convertTools";

const approveAllGate: WebMcpApprovalGate = async () => ({ approved: true });

const jsonSchema = {
  type: "object",
  properties: { city: { type: "string" } },
  required: ["city"],
} as const;

const frontendTool = (
  overrides: Partial<Tool<any, any>> = {},
): Tool<any, any> =>
  ({
    type: "frontend",
    description: "Get the weather for a city.",
    parameters: jsonSchema,
    execute: async ({ city }: { city: string }) => `Sunny in ${city}`,
    ...overrides,
  }) as Tool<any, any>;

describe("toWebMcpTool", () => {
  it("projects name, description, and a raw JSON Schema", () => {
    const descriptor = toWebMcpTool(
      "get_weather",
      frontendTool(),
      approveAllGate,
    );
    expect(descriptor.name).toBe("get_weather");
    expect(descriptor.description).toBe("Get the weather for a city.");
    expect(descriptor.inputSchema).toEqual(jsonSchema);
  });

  it("converts a Zod v4 schema to JSON Schema", () => {
    const descriptor = toWebMcpTool(
      "get_weather",
      frontendTool({ parameters: z.object({ city: z.string() }) }),
      approveAllGate,
    );
    expect(descriptor.inputSchema).toMatchObject({
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    });
  });

  it("defaults a missing description to an empty string and a missing schema to an empty object schema", () => {
    const descriptor = toWebMcpTool(
      "bare",
      frontendTool({ description: undefined, parameters: undefined }),
      approveAllGate,
    );
    expect(descriptor.description).toBe("");
    expect(descriptor.inputSchema).toEqual({
      type: "object",
      properties: {},
    });
  });

  it("executes the tool with args, a toolCallId, an abortSignal, and a rejecting human channel", async () => {
    const execute = vi.fn(async (_args: unknown, context: any) => {
      expect(typeof context.toolCallId).toBe("string");
      expect(context.abortSignal).toBeInstanceOf(AbortSignal);
      await expect(context.human({})).rejects.toThrow(
        "human input not supported in WebMCP context",
      );
      return "done";
    });
    const descriptor = toWebMcpTool(
      "t",
      frontendTool({ execute }),
      approveAllGate,
    );

    const result = await descriptor.execute({ city: "Berlin" });
    expect(execute).toHaveBeenCalledWith({ city: "Berlin" }, expect.anything());
    expect(result).toEqual({ content: [{ type: "text", text: "done" }] });
  });

  it("passes the agent-supplied signal through to the tool", async () => {
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    const descriptor = toWebMcpTool(
      "t",
      frontendTool({
        execute: async (_args, context) => {
          seen = context.abortSignal;
          return "ok";
        },
      }),
      approveAllGate,
    );

    await descriptor.execute({}, { signal: controller.signal });
    expect(seen).toBe(controller.signal);
  });

  it("maps a thrown error to an isError result", async () => {
    const descriptor = toWebMcpTool(
      "t",
      frontendTool({
        execute: async () => {
          throw new Error("boom");
        },
      }),
      approveAllGate,
    );

    await expect(descriptor.execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "boom" }],
    });
  });

  it("maps a declined approval to an error result without running the tool", async () => {
    const execute = vi.fn(async () => "never");
    const decliningGate: WebMcpApprovalGate = async () => ({
      approved: false,
      reason: "not now",
    });
    const descriptor = toWebMcpTool(
      "t",
      frontendTool({ execute }),
      decliningGate,
    );

    await expect(descriptor.execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: 'User declined tool call "t": not now' }],
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("maps an expired approval to an error result with expired wording", async () => {
    const execute = vi.fn(async () => "never");
    const expiringGate: WebMcpApprovalGate = async () => ({
      approved: false,
      resolution: "expired",
    });
    const descriptor = toWebMcpTool(
      "t",
      frontendTool({ execute }),
      expiringGate,
    );

    await expect(descriptor.execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: 'Tool call approval for "t" expired' }],
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("maps a throwing approval gate to an isError result without running the tool", async () => {
    const execute = vi.fn(async () => "never");
    const throwingGate: WebMcpApprovalGate = async () => {
      throw new Error("approval predicate exploded");
    };
    const descriptor = toWebMcpTool(
      "t",
      frontendTool({ execute }),
      throwingGate,
    );

    await expect(descriptor.execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "approval predicate exploded" }],
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("maps a cancelled approval to an error result with cancelled wording", async () => {
    const execute = vi.fn(async () => "never");
    const cancellingGate: WebMcpApprovalGate = async () => ({
      approved: false,
      resolution: "cancelled",
    });
    const descriptor = toWebMcpTool(
      "t",
      frontendTool({ execute }),
      cancellingGate,
    );

    await expect(descriptor.execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: 'Tool call approval for "t" cancelled' }],
    });
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("defaultWebMcpFilter", () => {
  it("keeps enabled frontend tools with an execute function", () => {
    expect(defaultWebMcpFilter("t", frontendTool())).toBe(true);
  });

  it("excludes backend, human, disabled, and execute-less tools", () => {
    expect(defaultWebMcpFilter("t", { type: "backend" } as Tool)).toBe(false);
    expect(
      defaultWebMcpFilter("t", {
        type: "human",
        parameters: jsonSchema,
      } as unknown as Tool),
    ).toBe(false);
    expect(defaultWebMcpFilter("t", frontendTool({ disabled: true }))).toBe(
      false,
    );
    expect(defaultWebMcpFilter("t", frontendTool({ execute: undefined }))).toBe(
      false,
    );
  });
});

describe("toMcpContent", () => {
  const context = { tool: frontendTool(), toolCallId: "call-1", args: {} };

  it("maps a string result to text content", async () => {
    await expect(toMcpContent("hello", context)).resolves.toEqual({
      content: [{ type: "text", text: "hello" }],
    });
  });

  it("stringifies a non-string result", async () => {
    await expect(toMcpContent({ ok: true }, context)).resolves.toEqual({
      content: [{ type: "text", text: '{"ok":true}' }],
    });
  });

  it("stringifies an undefined result without throwing", async () => {
    await expect(toMcpContent(undefined, context)).resolves.toEqual({
      content: [{ type: "text", text: "undefined" }],
    });
  });

  it("uses explicit modelContent from a ToolResponse", async () => {
    const response = new ToolResponse({
      result: { hidden: true },
      modelContent: [
        { type: "text", text: "visible" },
        { type: "file", data: "abc123", mediaType: "image/png" },
        { type: "file", data: "pdfdata", mediaType: "application/pdf" },
      ],
    });
    await expect(toMcpContent(response, context)).resolves.toEqual({
      content: [
        { type: "text", text: "visible" },
        { type: "image", data: "abc123", mimeType: "image/png" },
        { type: "text", text: "pdfdata" },
      ],
    });
  });

  it("derives content from the result when a ToolResponse has no modelContent", async () => {
    const response = new ToolResponse({ result: { value: 1 } });
    await expect(toMcpContent(response, context)).resolves.toEqual({
      content: [{ type: "text", text: '{"value":1}' }],
    });
  });

  it("marks a ToolResponse error as an error result", async () => {
    const response = new ToolResponse({ result: "failed", isError: true });
    await expect(toMcpContent(response, context)).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "failed" }],
    });
  });

  it("uses the tool's toModelOutput when present", async () => {
    const tool = frontendTool({
      toModelOutput: async ({ toolCallId, input, output }) => {
        expect(toolCallId).toBe("call-1");
        expect(input).toEqual({ city: "Berlin" });
        expect(output).toEqual({ temperature: 20 });
        return [{ type: "text", text: "20 degrees" }];
      },
    });
    await expect(
      toMcpContent(
        { temperature: 20 },
        { tool, toolCallId: "call-1", args: { city: "Berlin" } },
      ),
    ).resolves.toEqual({
      content: [{ type: "text", text: "20 degrees" }],
    });
  });

  it("prefers ToolResponse modelContent over toModelOutput", async () => {
    const toModelOutput = vi.fn(async () => [
      { type: "text" as const, text: "from toModelOutput" },
    ]);
    const tool = frontendTool({ toModelOutput });
    const response = new ToolResponse({
      result: "r",
      modelContent: [{ type: "text", text: "explicit" }],
    });
    await expect(
      toMcpContent(response, { tool, toolCallId: "c", args: {} }),
    ).resolves.toEqual({
      content: [{ type: "text", text: "explicit" }],
    });
    expect(toModelOutput).not.toHaveBeenCalled();
  });
});
