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
      () => frontendTool(),
      approveAllGate,
    );
    expect(descriptor.name).toBe("get_weather");
    expect(descriptor.description).toBe("Get the weather for a city.");
    expect(descriptor.inputSchema).toEqual(jsonSchema);
  });

  it("converts a Zod v4 schema to JSON Schema", () => {
    const descriptor = toWebMcpTool(
      "get_weather",
      () => frontendTool({ parameters: z.object({ city: z.string() }) }),
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
      () => frontendTool({ description: undefined, parameters: undefined }),
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
      () => frontendTool({ execute }),
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
      () =>
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
      () =>
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
      () => frontendTool({ execute }),
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
      () => frontendTool({ execute }),
      expiringGate,
    );

    await expect(descriptor.execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: 'Tool call approval for "t" expired' }],
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects args failing Standard Schema validation without running the tool", async () => {
    const execute = vi.fn(async () => "never");
    const descriptor = toWebMcpTool(
      "t",
      () =>
        frontendTool({
          parameters: z.object({ city: z.string() }),
          execute,
        }),
      approveAllGate,
    );

    const result = await descriptor.execute({ city: 42 });
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("validation failed"),
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("routes validation failures to experimental_onSchemaValidationError when present", async () => {
    const execute = vi.fn(async () => "never");
    const onSchemaValidationError = vi.fn(async () => "recovered");
    const descriptor = toWebMcpTool(
      "t",
      () =>
        frontendTool({
          parameters: z.object({ city: z.string() }),
          execute,
          experimental_onSchemaValidationError: onSchemaValidationError,
        } as Partial<Tool<any, any>>),
      approveAllGate,
    );

    const result = await descriptor.execute({ city: 42 });
    expect(result).toEqual({ content: [{ type: "text", text: "recovered" }] });
    expect(onSchemaValidationError).toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not execute when the signal is already aborted after approval", async () => {
    const execute = vi.fn(async () => "ran");
    const controller = new AbortController();
    controller.abort();
    const descriptor = toWebMcpTool(
      "t",
      () => frontendTool({ execute }),
      approveAllGate,
    );

    await expect(
      descriptor.execute({}, { signal: controller.signal }),
    ).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "Tool execution was cancelled." }],
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
      () => frontendTool({ execute }),
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
      () => frontendTool({ execute }),
      cancellingGate,
    );

    await expect(descriptor.execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: 'Tool call approval for "t" cancelled' }],
    });
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("toWebMcpTool lifecycle signal", () => {
  it("refuses to run once the registration is disposed", async () => {
    const execute = vi.fn(async () => "ran");
    const lifecycle = new AbortController();
    const descriptor = toWebMcpTool(
      "t",
      () => frontendTool({ execute }),
      approveAllGate,
      lifecycle.signal,
    );
    lifecycle.abort();

    await expect(descriptor.execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: 'Tool "t" is no longer registered' }],
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("cancels an in-flight approval when the registration is disposed", async () => {
    const execute = vi.fn(async () => "ran");
    const lifecycle = new AbortController();
    const pendingGate: WebMcpApprovalGate = ({ abortSignal }) =>
      new Promise((resolve) => {
        abortSignal?.addEventListener("abort", () =>
          resolve({ approved: false, resolution: "cancelled" }),
        );
      });
    const descriptor = toWebMcpTool(
      "t",
      () => frontendTool({ execute }),
      pendingGate,
      lifecycle.signal,
    );

    const call = descriptor.execute({});
    lifecycle.abort();

    await expect(call).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: 'Tool call approval for "t" cancelled' }],
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("merges the caller signal with the lifecycle signal for the running tool", async () => {
    const controller = new AbortController();
    const lifecycle = new AbortController();
    let seen: AbortSignal | undefined;
    const descriptor = toWebMcpTool(
      "t",
      () =>
        frontendTool({
          execute: async (_args, context) => {
            seen = context.abortSignal;
            return "ok";
          },
        }),
      approveAllGate,
      lifecycle.signal,
    );

    await descriptor.execute({}, { signal: controller.signal });
    expect(seen!.aborted).toBe(false);
    lifecycle.abort();
    expect(seen!.aborted).toBe(true);
  });
});

describe("toWebMcpTool hostile inputs", () => {
  const throwing = (thrown: unknown) =>
    toWebMcpTool(
      "t",
      () =>
        frontendTool({
          execute: async () => {
            throw thrown;
          },
        }),
      approveAllGate,
    );

  it("stringifies a thrown non-Error value into the error result", async () => {
    await expect(throwing("raw string boom").execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "raw string boom" }],
    });
    await expect(throwing(null).execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "null" }],
    });
    await expect(throwing({ code: 500 }).execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "[object Object]" }],
    });
  });

  it("turns a non-serializable result into an error result", async () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular["self"] = circular;
    const descriptor = toWebMcpTool(
      "t",
      () => frontendTool({ execute: async () => circular }),
      approveAllGate,
    );

    const result = await descriptor.execute({});
    expect(result.isError).toBe(true);
  });

  it("throws at descriptor construction for a schema that cannot convert", () => {
    const badSchema = {
      "~standard": { version: 1, validate: () => ({ issues: undefined }) },
    };
    expect(() =>
      toWebMcpTool(
        "t",
        () => frontendTool({ parameters: badSchema as any }),
        approveAllGate,
      ),
    ).toThrow(/Could not convert schema/);
  });

  it("surfaces a throwing validate as an error result without running the tool", async () => {
    const schema = z.object({ city: z.string() });
    vi.spyOn(schema["~standard"], "validate").mockImplementation(() => {
      throw new Error("validate exploded");
    });
    const execute = vi.fn(async () => "never");
    const descriptor = toWebMcpTool(
      "t",
      () => frontendTool({ parameters: schema as any, execute }),
      approveAllGate,
    );

    const result = await descriptor.execute({ city: "x" });
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ text: "validate exploded" });
    expect(execute).not.toHaveBeenCalled();
    vi.restoreAllMocks();
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

  it("normalizes an undefined result to the canonical placeholder", async () => {
    await expect(toMcpContent(undefined, context)).resolves.toEqual({
      content: [{ type: "text", text: "<no result>" }],
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

  it("projects a successful ToolResponse without modelContent through toModelOutput", async () => {
    const tool = frontendTool({
      toModelOutput: async ({ output }) => {
        expect(output).toEqual({ secret: "raw" });
        return [{ type: "text", text: "redacted" }];
      },
    });
    const response = new ToolResponse({ result: { secret: "raw" } });

    await expect(
      toMcpContent(response, { tool, toolCallId: "c", args: {} }),
    ).resolves.toEqual({
      content: [{ type: "text", text: "redacted" }],
    });
  });

  it("does not run toModelOutput for a ToolResponse error", async () => {
    const toModelOutput = vi.fn(async () => [
      { type: "text" as const, text: "never" },
    ]);
    const tool = frontendTool({ toModelOutput });
    const response = new ToolResponse({ result: "failed", isError: true });

    await expect(
      toMcpContent(response, { tool, toolCallId: "c", args: {} }),
    ).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: "failed" }],
    });
    expect(toModelOutput).not.toHaveBeenCalled();
  });

  it("falls back to the default projection when toModelOutput throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tool = frontendTool({
      toModelOutput: async () => {
        throw new Error("projection failed");
      },
    });

    await expect(
      toMcpContent("done", { tool, toolCallId: "c", args: {} }),
    ).resolves.toEqual({
      content: [{ type: "text", text: "done" }],
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("toModelOutput threw"),
      expect.anything(),
    );
    warn.mockRestore();
  });

  it("does not throw on modelContent parts with missing fields", async () => {
    const missingData = new ToolResponse({
      result: "r",
      modelContent: [{ type: "file", mediaType: "image/png" } as any],
    });
    await expect(toMcpContent(missingData, context)).resolves.toMatchObject({
      content: [{ type: "image" }],
    });

    const missingText = new ToolResponse({
      result: "r",
      modelContent: [{ type: "text" } as any],
    });
    await expect(toMcpContent(missingText, context)).resolves.toEqual({
      content: [{ type: "text", text: "" }],
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
