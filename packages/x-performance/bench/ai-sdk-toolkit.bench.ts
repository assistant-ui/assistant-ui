import { AISDKToolkit } from "@assistant-ui/ai-sdk";
import { bench, describe } from "vitest";

const makeToolkit = (size: number) =>
  Object.fromEntries(
    Array.from({ length: size }, (_, index) => [
      `tool_${index}`,
      {
        type: "backend",
        description: `Tool ${index}`,
        parameters: {
          toJSONSchema: () => ({
            type: "object",
            properties: Object.fromEntries(
              Array.from({ length: 20 }, (_, propertyIndex) => [
                `property_${propertyIndex}`,
                { type: "string" },
              ]),
            ),
          }),
        },
        execute: async () => null,
      },
    ]),
  ) as never;

const SIZES = [10, 100];
const reusedToolkits = new Map(
  SIZES.map((size) => [size, new AISDKToolkit({ toolkit: makeToolkit(size) })]),
);
await Promise.all(
  [...reusedToolkits.values()].map((toolkit) => toolkit.tools()),
);

describe("ai-sdk: reuse converted AISDKToolkit schemas", () => {
  for (const size of SIZES) {
    bench(`${size} static tools`, async () => {
      await reusedToolkits.get(size)!.tools();
    });
  }
});

describe("ai-sdk: convert fresh AISDKToolkit schemas", () => {
  for (const size of SIZES) {
    bench(`${size} static tools`, async () => {
      await new AISDKToolkit({ toolkit: makeToolkit(size) }).tools();
    });
  }
});
