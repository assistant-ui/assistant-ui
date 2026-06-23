"use generative";

import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";

export default defineToolkit({
  get_current_weather: {
    description: "Get the current weather",
    parameters: z.object({
      city: z.string(),
    }),
    execute: async ({ city }) => {
      return `The weather in ${city} is sunny`;
    },
  },
});
