import { describe, it, expect, expectTypeOf } from "vitest";
import type { AsyncIterableStream } from "assistant-stream/utils";
import { defineToolkit } from "./define-toolkit";
import { hitl, hitlTool, humanTool } from "./human-tool";
import { providerTool } from "./provider-tool";
import { stubTool } from "./stub-tool";
import { externalTool } from "./external-tool";
import type { ToolkitDefinition } from "./toolbox";

type TestStandardSchema<T> = {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: "test";
    readonly types?: {
      readonly input: T;
      readonly output: T;
    };
    readonly validate: (value: unknown) => { readonly value: T };
  };
};

const checkDefineToolkitTypes = () => {
  defineToolkit({
    search: {
      parameters: {} as TestStandardSchema<{
        query: string;
        limit?: number;
        tags: string[];
      }>,
      execute: async ({
        query,
        limit,
      }: {
        query: string;
        limit?: number;
        tags: string[];
      }) => ({
        ids: [query],
        count: limit ?? 0,
      }),
      streamCall: async (reader) => {
        const query = await reader.args.get("query");
        expectTypeOf(query).toEqualTypeOf<string>();

        expectTypeOf(reader.args.streamValues("query")).toEqualTypeOf<
          AsyncIterableStream<string>
        >();
        expectTypeOf(reader.args.streamText("query")).toEqualTypeOf<
          AsyncIterableStream<unknown>
        >();
        expectTypeOf(reader.args.forEach("tags")).toEqualTypeOf<
          AsyncIterableStream<string>
        >();

        const response = await reader.response.get();
        expectTypeOf(response.result).toEqualTypeOf<unknown>();

        // @ts-expect-error unknown argument paths should not be accepted
        reader.args.get("missing");
      },
    },
  });
};
expectTypeOf(checkDefineToolkitTypes).toEqualTypeOf<() => void>();

const checkToolkitDefinitionTypes = () => {
  ({
    invalidMcp: {
      // @ts-expect-error MCP-shaped tools cannot also declare an execute callback
      server: { type: "http", url: "https://example.com/mcp" },
      execute: async () => "invalid",
    },
  }) satisfies ToolkitDefinition;
};
expectTypeOf(checkToolkitDefinitionTypes).toEqualTypeOf<() => void>();

describe("use-generative markers", () => {
  it("defineToolkit returns the toolkit at runtime", () => {
    const toolkit = {};
    expect(defineToolkit(toolkit)).toBe(toolkit);
  });

  it("humanTool throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => humanTool()).toThrow(/no runtime implementation/);
  });

  it("hitlTool and hitl remain compatibility aliases", () => {
    expect(hitlTool).toBe(humanTool);
    expect(hitl).toBe(humanTool);
  });

  it("providerTool throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() =>
      providerTool({
        providerId: "openai.web_search_preview",
        args: {},
      }),
    ).toThrow(/no runtime implementation/);
  });

  it("stubTool throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => stubTool()).toThrow(/no runtime implementation/);
  });

  it("externalTool throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => externalTool()).toThrow(/no runtime implementation/);
  });
});
