import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ToolResponse, type Tool } from "assistant-stream";
import {
  defaultWebMcpFilter,
  toMcpContent,
  toWebMcpTool,
} from "./convertTools";

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

const descriptorFor = (
  overrides: Partial<Tool<any, any>> = {},
  lifecycleSignal?: AbortSignal,
) => toWebMcpTool("t", () => frontendTool(overrides), lifecycleSignal);

const text = (value: string) => ({ type: "text", text: value });

describe("defaultWebMcpFilter", () => {
  it.for([
    ["exposes an enabled frontend tool", {}, true],
    ["hides a backend tool", { type: "backend" }, false],
    ["hides a frontend tool with no execute", { execute: undefined }, false],
    ["hides a disabled frontend tool", { disabled: true }, false],
    ["exposes a tool authored without a type", { type: undefined }, true],
    [
      "hides a type-less tool with no execute",
      { type: undefined, execute: undefined },
      false,
    ],
  ] as const)("%s", ([, overrides, expected]) => {
    expect(defaultWebMcpFilter("t", frontendTool(overrides as any))).toBe(
      expected,
    );
  });
});

describe("toWebMcpTool descriptor", () => {
  it("projects name, description, and the input schema", () => {
    const descriptor = toWebMcpTool("get_weather", () => frontendTool());
    expect(descriptor.name).toBe("get_weather");
    expect(descriptor.description).toBe("Get the weather for a city.");
    expect(descriptor.inputSchema).toEqual(jsonSchema);

    expect(
      descriptorFor({ parameters: z.object({ city: z.string() }) }).inputSchema,
    ).toMatchObject(jsonSchema);

    const bare = descriptorFor({
      description: undefined,
      parameters: undefined,
    });
    expect(bare.description).toBe("");
    expect(bare.inputSchema).toEqual({ type: "object", properties: {} });
  });

  it("throws at construction for a schema that cannot convert", () => {
    const badSchema = {
      "~standard": { version: 1, validate: () => ({ issues: undefined }) },
    };
    expect(() => descriptorFor({ parameters: badSchema as any })).toThrow();
  });
});

describe("toWebMcpTool execute", () => {
  it("passes the arguments through, defaulting missing arguments to {}", async () => {
    const execute = vi.fn(async () => "Sunny in Paris");
    const descriptor = descriptorFor({ execute, parameters: undefined });

    const result = await descriptor.execute({ city: "Paris" });
    expect(execute).toHaveBeenCalledWith(
      { city: "Paris" },
      expect.objectContaining({ toolCallId: expect.any(String) }),
    );
    expect(result).toEqual({ content: [text("Sunny in Paris")] });

    await descriptor.execute(undefined);
    expect(execute).toHaveBeenLastCalledWith({}, expect.anything());
  });

  it.for([
    ["serializes a non-string result", { ok: true }, '{"ok":true}'],
    [
      "falls back to String() for an unserializable result",
      Symbol("opaque"),
      "Symbol(opaque)",
    ],
  ] as const)("%s", async ([, value, expected]) => {
    const result = await descriptorFor({
      execute: async () => value,
    }).execute({});
    expect(result).toEqual({ content: [text(expected)] });
  });

  it("reports a thrown value as an error result", async () => {
    const throwing = (value: unknown) =>
      descriptorFor({
        execute: async () => {
          throw value;
        },
      });
    await expect(throwing(new Error("boom")).execute({})).resolves.toEqual({
      isError: true,
      content: [text("boom")],
    });
    await expect(throwing("raw string boom").execute({})).resolves.toEqual({
      isError: true,
      content: [text("raw string boom")],
    });
    await expect(throwing({ code: 500 }).execute({})).resolves.toEqual({
      isError: true,
      content: [text("[object Object]")],
    });

    const circular: Record<string, unknown> = { a: 1 };
    circular["self"] = circular;
    const unserializable = await descriptorFor({
      execute: async () => circular,
    }).execute({});
    expect(unserializable.isError).toBe(true);
  });

  it("reports an error when a published tool has no client-side execute", async () => {
    await expect(
      descriptorFor({ execute: undefined }).execute({}),
    ).resolves.toEqual({
      isError: true,
      content: [text('Tool "t" has no client-side implementation.')],
    });
  });

  it("projects values JSON cannot serialize but that have a string form", async () => {
    await expect(
      descriptorFor({ execute: async () => 9007199254740993n }).execute({}),
    ).resolves.toEqual({ content: [text("9007199254740993")] });
    await expect(
      descriptorFor({ execute: async () => Symbol("ticket") }).execute({}),
    ).resolves.toEqual({ content: [text("Symbol(ticket)")] });
  });

  it("rejects human input requests", async () => {
    const result = await descriptorFor({
      execute: async (_args: unknown, context: any) => await context.human(),
    }).execute({});
    expect(result).toEqual({
      isError: true,
      content: [text("human input not supported in WebMCP context")],
    });
  });
});

describe("toWebMcpTool schema validation", () => {
  const zodTool = (overrides: Partial<Tool<any, any>> = {}) =>
    descriptorFor({
      parameters: z.object({ city: z.string() }),
      ...overrides,
    });

  it("runs execute unchanged when the arguments validate", async () => {
    const execute = vi.fn(async () => "ok");
    const result = await zodTool({ execute }).execute({ city: "Paris" });
    expect(execute).toHaveBeenCalledWith({ city: "Paris" }, expect.anything());
    expect(result).toEqual({ content: [text("ok")] });
  });

  it("returns a validation error when the arguments do not validate", async () => {
    const execute = vi.fn(async () => "ok");
    const result = await zodTool({ execute }).execute({ city: 42 });
    expect(execute).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      text: expect.stringContaining("Function parameter validation failed."),
    });
  });

  it("hands invalid arguments to experimental_onSchemaValidationError", async () => {
    const execute = vi.fn(async () => "ok");
    const result = await zodTool({
      execute,
      experimental_onSchemaValidationError: async () => "recovered",
    }).execute({ city: 42 });
    expect(execute).not.toHaveBeenCalled();
    expect(result).toEqual({ content: [text("recovered")] });
  });

  it("awaits a validator that returns a non-Promise thenable", async () => {
    const execute = vi.fn(async () => "ok");
    const schema = z.object({ city: z.string() });
    (schema as any)["~standard"] = {
      ...schema["~standard"],
      validate: () => ({
        then: (resolve: (value: { issues: unknown[] }) => void) => {
          resolve({ issues: [{ message: "cross-realm" }] });
        },
      }),
    };

    const result = await descriptorFor({ execute, parameters: schema }).execute(
      { city: 42 },
    );
    expect(execute).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      text: expect.stringContaining("cross-realm"),
    });
  });

  it("awaits an async Standard Schema validation", async () => {
    const execute = vi.fn(async () => "ok");
    const schema = z.object({ city: z.string() });
    const sync = schema["~standard"].validate;
    (schema as any)["~standard"] = {
      ...schema["~standard"],
      validate: async (value: unknown) => sync(value),
    };

    const result = await descriptorFor({ execute, parameters: schema }).execute(
      { city: 42 },
    );
    expect(execute).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
  });
});

describe("toWebMcpTool cancellation", () => {
  it("refuses to run once its lifecycle signal is aborted", async () => {
    const execute = vi.fn(async () => "never");
    const controller = new AbortController();
    controller.abort();
    const result = await descriptorFor({ execute }, controller.signal).execute(
      {},
    );
    expect(execute).not.toHaveBeenCalled();
    expect(result).toEqual({
      isError: true,
      content: [text('Tool "t" is no longer registered')],
    });
  });

  it("refuses to run when the caller signal is already aborted", async () => {
    const execute = vi.fn(async () => "never");
    const controller = new AbortController();
    controller.abort();
    const result = await descriptorFor({ execute }).execute(
      {},
      { signal: controller.signal },
    );
    expect(execute).not.toHaveBeenCalled();
    expect(result).toEqual({
      isError: true,
      content: [text("Tool execution was cancelled.")],
    });
  });

  it("merges the caller signal with the lifecycle signal", async () => {
    const lifecycle = new AbortController();
    const caller = new AbortController();
    const descriptor = descriptorFor(
      {
        execute: async (_args: unknown, context: any) =>
          new Promise((_resolve, reject) => {
            context.abortSignal.addEventListener("abort", () =>
              reject(new Error("aborted")),
            );
          }),
      },
      lifecycle.signal,
    );

    const pending = descriptor.execute({}, { signal: caller.signal });
    lifecycle.abort();
    await expect(pending).resolves.toEqual({
      isError: true,
      content: [text("aborted")],
    });
  });

  it("returns an error result when the caller signal cannot be merged", async () => {
    const execute = vi.fn(async () => "never");
    const foreignSignal = {
      aborted: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as AbortSignal;

    const result = await descriptorFor(
      { execute },
      new AbortController().signal,
    ).execute({}, { signal: foreignSignal });
    expect(result.isError).toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("toMcpContent", () => {
  const options = { tool: frontendTool(), toolCallId: "1", args: {} };

  it.for([
    ["text parts", [{ type: "text", text: "hello" }], [text("hello")]],
    [
      "image file parts",
      [{ type: "file", data: "AAA", mediaType: "image/png" }],
      [{ type: "image", data: "AAA", mimeType: "image/png" }],
    ],
    [
      "image file parts with no data",
      [{ type: "file", mediaType: "image/png" }],
      [{ type: "image", data: "", mimeType: "image/png" }],
    ],
    [
      "non-image file parts",
      [{ type: "file", data: "raw", mediaType: "text/plain" }],
      [text("raw")],
    ],
    [
      "unknown parts",
      [{ type: "reasoning", text: "why" }],
      [text('{"type":"reasoning","text":"why"}')],
    ],
  ] as const)("maps %s", async ([, modelContent, expected]) => {
    const response = await toMcpContent(
      new ToolResponse({ result: "r", modelContent: modelContent as any }),
      options,
    );
    expect(response).toEqual({ content: expected });
  });

  it("marks an error response, with or without an explicit modelContent", async () => {
    await expect(
      toMcpContent(
        new ToolResponse({
          result: "r",
          isError: true,
          modelContent: [{ type: "text", text: "failed" }],
        }),
        options,
      ),
    ).resolves.toEqual({ isError: true, content: [text("failed")] });

    await expect(
      toMcpContent(
        new ToolResponse({ result: "went wrong", isError: true }),
        options,
      ),
    ).resolves.toEqual({ isError: true, content: [text("went wrong")] });
  });

  it("projects a successful result through toModelOutput", async () => {
    const toModelOutput = vi.fn(async () => [
      { type: "text", text: "projected" },
    ]);
    const response = await toMcpContent("raw", {
      ...options,
      tool: frontendTool({ toModelOutput } as any),
    });
    expect(toModelOutput).toHaveBeenCalledWith({
      toolCallId: "1",
      input: {},
      output: "raw",
    });
    expect(response).toEqual({ content: [text("projected")] });
  });

  it("falls back to the default projection when toModelOutput throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await toMcpContent("raw", {
      ...options,
      tool: frontendTool({
        toModelOutput: () => {
          throw new Error("bad projection");
        },
      } as any),
    });
    expect(response).toEqual({ content: [text("raw")] });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
