import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  OPENAI_API_KEY: {
    schema: (value) => value,
  },
});
