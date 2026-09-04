import { defineToolkit, tool } from "../toolkit";

export const weather = defineToolkit({
  name: "weather",
  version: "1.2.3",
  description: "Weather lookups.",
  tools: {
    getWeather: tool({
      description: "Get the current weather for a location.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name." },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] },
          days: { type: "integer", description: "Forecast length." },
          verbose: { type: "boolean" },
        },
        required: ["location"],
      },
      execute: (args: {
        location: string;
        unit?: string;
        days?: number;
        verbose?: boolean;
      }) => ({
        location: args.location,
        unit: args.unit ?? "celsius",
        days: args.days ?? 1,
        verbose: args.verbose ?? false,
        temperature: 21,
      }),
    }),
    fail: tool({
      description: "Always throws.",
      parameters: { type: "object", properties: {} },
      execute: () => {
        throw new Error("boom");
      },
    }),
  },
});
