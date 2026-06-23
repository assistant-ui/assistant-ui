"use generative";

import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";

export default defineToolkit({
  get_weather: {
    description: "Get the current weather for a city",
    parameters: z.object({
      location: z.string().describe("The city to get weather for"),
      unit: z
        .enum(["celsius", "fahrenheit"])
        .optional()
        .describe("Temperature unit"),
    }),
    execute: async ({ location, unit = "celsius" }) => {
      "use client";

      console.log(`Getting weather for ${location} in ${unit}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const temp = Math.floor(Math.random() * 30) + 10;
      const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"];
      const condition =
        conditions[Math.floor(Math.random() * conditions.length)];

      return {
        location,
        temperature: temp,
        unit,
        condition,
        humidity: Math.floor(Math.random() * 40) + 40,
        windSpeed: Math.floor(Math.random() * 20) + 5,
      };
    },
    streamCall: async (reader) => {
      "use client";

      console.log("streamCall", reader);
      const city = await reader.args.get("location");
      console.log("location", city);

      const args = await reader.args.get();
      console.log("args", args);

      const result = await reader.response.get();
      console.log("result", result);
    },
    renderText: {
      running: ({ args }) => `Getting weather for ${args.location ?? "..."}`,
      complete: ({ args, result }) =>
        result
          ? `${args.location}: ${result.temperature}° ${result.unit}, ${result.condition}`
          : "Weather lookup complete",
    },
  },
});
