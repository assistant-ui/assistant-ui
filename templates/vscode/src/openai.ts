import { createOpenAI } from "@ai-sdk/openai";

// Without an apiKey the provider reads OPENAI_API_KEY from the environment.
export let openai = createOpenAI();

export const setOpenAIApiKey = (apiKey: string | undefined) => {
  openai = createOpenAI(apiKey ? { apiKey } : {});
};
