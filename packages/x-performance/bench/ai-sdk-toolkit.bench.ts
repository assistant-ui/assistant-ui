import { AISDKToolkit } from "@assistant-ui/ai-sdk";
import { describe, inject, test } from "vitest";

const makeSchema = (index: number) => ({
  toJSONSchema: () => ({
    type: "object",
    properties: Object.fromEntries(
      Array.from({ length: 8 }, (_, propertyIndex) => [
        `field_${index}_${propertyIndex}`,
        {
          type: "object",
          properties: {
            value: { type: "string" },
            enabled: { type: "boolean" },
          },
          required: ["value"],
        },
      ]),
    ),
  }),
});

const makeToolkit = (size: number) =>
  new AISDKToolkit({
    toolkit: Object.fromEntries(
      Array.from({ length: size }, (_, index) => [
        `tool_${index}`,
        {
          type: "backend",
          parameters: makeSchema(index),
          execute: async () => null,
        },
      ]),
    ) as never,
  });

describe("@assistant-ui/ai-sdk: cached static toolkit", () => {
  for (const size of [20, 200]) {
    test(`${size} tools`, async ({ bench }) => {
      const toolkit = makeToolkit(size);
      await toolkit.tools();

      await bench(`${size} tools`, async () => {
        await toolkit.tools();
      }).run(inject("benchSampling"));
    });
  }
});
