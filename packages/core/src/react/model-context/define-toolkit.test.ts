import { describe, it, expect } from "vitest";
import { defineToolkit } from "./define-toolkit";
import { hitl, hitlTool } from "./hitl";
import { providerTool } from "./provider-tool";

const expectType = <T>(_value: T) => {};

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
      }>,
      execute: async ({ query, limit }: { query: string; limit?: number }) => ({
        ids: [query],
        count: limit ?? 0,
      }),
      streamCall: async (reader) => {
        const query = await reader.args.get("query");
        expectType<string>(query);

        const response = await reader.response.get();
        expectType<unknown>(response.result);

        // @ts-expect-error unknown argument paths should not be accepted
        reader.args.get("missing");
      },
    },
  });
};
void checkDefineToolkitTypes;

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
});
