import { describe, expect, expectTypeOf, it } from "vitest";
import type { Tool } from "assistant-stream";
import type { AsyncIterableStream } from "assistant-stream/utils";
import { tool } from "./tool";

type TestStandardSchema<TInput> = {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: "test";
    readonly types?: {
      readonly input: TInput;
      readonly output: TInput;
    };
    readonly validate: (value: unknown) => { readonly value: TInput };
  };
};

const checkStandardSchemaInference = () => {
  const weatherSchema = {} as TestStandardSchema<{
    city: string;
    unit?: "c" | "f";
    tags: string[];
  }>;

  const getWeather = tool({
    type: "frontend",
    parameters: weatherSchema,
    execute: async (args) => {
      expectTypeOf(args.city).toEqualTypeOf<string>();
      expectTypeOf(args.unit).toEqualTypeOf<"c" | "f" | undefined>();
      expectTypeOf(args.tags).toEqualTypeOf<string[]>();
      // @ts-expect-error unknown schema fields should not be accepted
      void args.missing;

      return `Weather in ${args.city}`;
    },
    streamCall: async (reader) => {
      const city = await reader.args.get("city");
      expectTypeOf(city).toEqualTypeOf<string>();
      expectTypeOf(reader.args.forEach("tags")).toEqualTypeOf<
        AsyncIterableStream<string>
      >();
      // @ts-expect-error unknown argument paths should not be accepted
      reader.args.get("missing");
    },
    toModelOutput: ({ input }) => {
      expectTypeOf(input.city).toEqualTypeOf<string>();
      expectTypeOf(input.unit).toEqualTypeOf<"c" | "f" | undefined>();
      return [{ type: "text", text: input.city }];
    },
  });

  expectTypeOf(getWeather).toEqualTypeOf<
    Tool<
      {
        city: string;
        unit?: "c" | "f";
        tags: string[];
      },
      string
    >
  >();
};
expectTypeOf(checkStandardSchemaInference).toEqualTypeOf<() => void>();

const checkUnknownStandardSchemaInputFallsBackToRecord = () => {
  const unknownSchema = {} as TestStandardSchema<unknown>;

  const passthrough = tool({
    type: "frontend",
    parameters: unknownSchema,
    execute: async (args) => {
      expectTypeOf(args).toEqualTypeOf<Record<string, unknown>>();
      return args;
    },
  });

  expectTypeOf(passthrough).toEqualTypeOf<
    Tool<Record<string, unknown>, Record<string, unknown>>
  >();
};
expectTypeOf(checkUnknownStandardSchemaInputFallsBackToRecord).toEqualTypeOf<
  () => void
>();

const checkExplicitJsonSchemaTypesStillWork = () => {
  const getWeather = tool<{ city: string }, string>({
    type: "frontend",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
    execute: async ({ city }) => city,
  });

  expectTypeOf(getWeather).toEqualTypeOf<Tool<{ city: string }, string>>();
};
expectTypeOf(checkExplicitJsonSchemaTypesStillWork).toEqualTypeOf<() => void>();

describe("tool", () => {
  it("returns the tool definition at runtime", () => {
    const definition = {
      type: "frontend" as const,
      parameters: { type: "object" as const, properties: {} },
    };

    expect(tool(definition)).toBe(definition);
  });
});
