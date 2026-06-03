import { describe, it, expect, expectTypeOf } from "vitest";
import type { AsyncIterableStream } from "assistant-stream/utils";
import { defineToolkit } from "./define-toolkit";
import { hitl, hitlTool } from "./hitl";
import { providerTool } from "./provider-tool";
import { stubTool } from "./stub-tool";
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
  it("defineToolkit throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => defineToolkit({})).toThrow(/no runtime implementation/);
  });

  it("hitlTool throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => hitlTool()).toThrow(/no runtime implementation/);
  });

  it("hitl remains a compatibility alias", () => {
    expect(hitl).toBe(hitlTool);
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
});
